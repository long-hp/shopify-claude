#!/usr/bin/env python3
"""
audit-static.py — Deterministic health checks for the `.claude/` system.

Outputs a JSON document on stdout with per-category findings. Read alongside
the workflow in `.claude/skills/system-upgrade/SKILL.md`. Scoring rules are
documented in `.claude/skills/system-upgrade/references/rubric.md`.

Usage:
    python .claude/skills/system-upgrade/scripts/audit-static.py            # JSON
    python .claude/skills/system-upgrade/scripts/audit-static.py --human    # short human summary
    python .claude/skills/system-upgrade/scripts/audit-static.py --repo-root /path/to/repo

The script never modifies anything. It is safe to run repeatedly.

Python 3.8+, standard library only.
"""

from __future__ import annotations

import argparse
import datetime as dt
import json
import os
import re
import shutil
import subprocess
import sys
from pathlib import Path
from typing import Any

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

PATH_PREFIXES = (".claude/", "src/", ".agent-state/", "theme-config/", "html/", "shopify/")

# Single uppercase letter or all-caps short word in a path segment → template placeholder
# (e.g. "preset-N.js", "PROGRESS-<YYYY-Q>.md", "scripts/X.py", "<skill>")
_PLACEHOLDER_RE = re.compile(
    r"[<>{}]"                        # angle / curly braces are explicit placeholders
    r"|(?<![A-Za-z])[A-Z](?![A-Za-z])"  # bare single capital letter (e.g. /X. or -N. or _Y/)
)


def is_placeholder_path(p: str) -> bool:
    """Heuristic: paths with `<…>` / `{…}` / bare single-capital segments are templates,
    not real on-disk references. Skip them so we don't emit noise findings."""
    return bool(_PLACEHOLDER_RE.search(p))


def find_repo_root(start: Path) -> Path:
    """Walk up from `start` until a `.git` directory is found. Fallback: cwd."""
    p = start.resolve()
    while p != p.parent:
        if (p / ".git").exists():
            return p
        p = p.parent
    return Path.cwd().resolve()


def parse_frontmatter(text: str) -> tuple[dict[str, str] | None, int]:
    """
    Parse a simple YAML-ish frontmatter at the top of a markdown file.
    Returns (dict, body_start_line). Only string scalars supported (multi-line
    values are joined into a single string). Returns (None, 0) if no
    frontmatter present.
    """
    lines = text.split("\n")
    if not lines or lines[0].strip() != "---":
        return None, 0
    body_start = None
    for i in range(1, len(lines)):
        if lines[i].strip() == "---":
            body_start = i + 1
            break
    if body_start is None:
        return None, 0

    fm: dict[str, str] = {}
    current_key: str | None = None
    for raw in lines[1 : body_start - 1]:
        stripped = raw.rstrip()
        if not stripped:
            continue
        m = re.match(r"^([A-Za-z_][\w-]*)\s*:\s*(.*)$", stripped)
        if m and not raw.startswith((" ", "\t")):
            current_key, val = m.group(1), m.group(2)
            fm[current_key] = val
        elif current_key is not None:
            fm[current_key] = (fm[current_key] + " " + stripped.strip()).strip()
    return fm, body_start


def extract_inline_code_tokens(text: str) -> list[tuple[str, int]]:
    """Return (token, line_no) pairs for every backtick-delimited inline-code span."""
    out: list[tuple[str, int]] = []
    for lineno, line in enumerate(text.split("\n"), start=1):
        for m in re.finditer(r"`([^`\n]+)`", line):
            out.append((m.group(1), lineno))
    return out


def looks_like_path(tok: str) -> bool:
    return any(tok.startswith(p) for p in PATH_PREFIXES) and "/" in tok


def resolve_path_or_glob(repo_root: Path, raw_path: str) -> bool:
    """Resolve a path. If it contains `*`, treat as glob and test for any match."""
    p = raw_path.strip().rstrip(".,;:)")
    if "*" in p:
        return any(repo_root.glob(p))
    return (repo_root / p).exists()


def add_finding(
    bucket: list[dict[str, Any]],
    severity: str,
    type_: str,
    detail: str,
    *,
    skill: str | None = None,
    file: str | None = None,
    line: int | None = None,
) -> None:
    bucket.append(
        {
            "severity": severity,
            "type": type_,
            "skill": skill,
            "file": file,
            "line": line,
            "detail": detail,
        }
    )


# ---------------------------------------------------------------------------
# Category: skills
# ---------------------------------------------------------------------------

def check_skills(repo_root: Path) -> dict[str, Any]:
    findings: list[dict[str, Any]] = []
    skills_dir = repo_root / ".claude" / "skills"
    if not skills_dir.exists():
        add_finding(findings, "critical", "no_skills_dir", "No `.claude/skills/` directory found.")
        return {"score_base": 100, "findings": findings, "skill_count": 0}

    skill_count = 0
    for skill_path in sorted(skills_dir.iterdir()):
        if not skill_path.is_dir():
            continue
        skill_count += 1
        name = skill_path.name
        skill_md = skill_path / "SKILL.md"
        if not skill_md.exists():
            add_finding(
                findings,
                "critical",
                "missing_skill_md",
                f"Skill `{name}` has no SKILL.md.",
                skill=name,
                file=str(skill_md.relative_to(repo_root)),
            )
            continue

        text = skill_md.read_text(encoding="utf-8", errors="replace")
        fm, body_start = parse_frontmatter(text)
        rel = str(skill_md.relative_to(repo_root))

        if fm is None:
            add_finding(
                findings,
                "critical",
                "missing_frontmatter",
                f"SKILL.md for `{name}` has no YAML frontmatter.",
                skill=name,
                file=rel,
            )
            continue

        # name field
        fm_name = fm.get("name", "").strip()
        if not fm_name:
            add_finding(findings, "critical", "missing_name", f"Frontmatter missing `name`.", skill=name, file=rel)
        elif fm_name != name:
            add_finding(
                findings,
                "critical",
                "name_dir_mismatch",
                f"Frontmatter `name: {fm_name}` does not match dir `{name}`.",
                skill=name,
                file=rel,
            )

        # description
        desc = fm.get("description", "").strip()
        if not desc:
            add_finding(findings, "critical", "missing_description", "Frontmatter missing `description`.", skill=name, file=rel)
        else:
            if len(desc) < 80:
                add_finding(
                    findings,
                    "major",
                    "short_description",
                    f"Description is only {len(desc)} chars — weak triggering signal.",
                    skill=name,
                    file=rel,
                )
            if len(desc) > 2500:
                add_finding(
                    findings,
                    "minor",
                    "long_description",
                    f"Description is {len(desc)} chars — consider trimming, descriptions stay in context permanently.",
                    skill=name,
                    file=rel,
                )
            trigger_phrases = (
                "use when", "use whenever", "use at", "use for", "use to", "use this",
                "must be invoked", "invoke when", "invoke whenever", "invoked when",
                "trigger", "run when", "entry point", "before ",
            )
            if not any(p in desc.lower() for p in trigger_phrases):
                add_finding(
                    findings,
                    "minor",
                    "no_trigger_phrasing",
                    "Description lacks `Use when…` / `MUST be invoked…` style trigger phrasing.",
                    skill=name,
                    file=rel,
                )

        # body length
        body_lines = text.count("\n") - body_start + 1 if body_start else text.count("\n")
        if body_lines > 500:
            add_finding(
                findings,
                "major",
                "oversized_body",
                f"SKILL.md body is {body_lines} lines (> 500 limit). Push detail to references/.",
                skill=name,
                file=rel,
            )
        elif body_lines > 400:
            add_finding(
                findings,
                "minor",
                "long_body",
                f"SKILL.md body is {body_lines} lines (close to 500-line limit).",
                skill=name,
                file=rel,
            )

        # broken references inside SKILL.md body
        body_text = "\n".join(text.split("\n")[body_start:]) if body_start else text
        # match `references/foo.md`, `scripts/foo.py`, `assets/foo.X` only when inside backticks
        # OR as bare relative paths in lists / prose
        ref_pattern = re.compile(r"`(references/[^`]+|scripts/[^`]+|assets/[^`]+)`")
        for m in ref_pattern.finditer(body_text):
            ref = m.group(1).rstrip(".,;:)")
            # skip template-placeholder paths (`<name>`, `scripts/X.py`, `preset-N.js`)
            if is_placeholder_path(ref):
                continue
            target = skill_path / ref
            if target.exists():
                continue
            # path may be unqualified cross-skill reference — check if it resolves
            # anywhere else in the repo before treating as broken
            elsewhere = list(repo_root.glob(f".claude/skills/*/{ref}"))
            pre = body_text[: m.start()]
            line = pre.count("\n") + 1 + (body_start or 0)
            if elsewhere:
                others = ", ".join(p.parts[-3] for p in elsewhere)
                add_finding(
                    findings,
                    "minor",
                    "unqualified_cross_skill_ref",
                    f"`{ref}` not in `{name}/` but exists under: {others}. Qualify with full path.",
                    skill=name,
                    file=rel,
                    line=line,
                )
            else:
                sev = "critical" if ref.startswith("scripts/") else "major"
                add_finding(
                    findings,
                    sev,
                    "broken_skill_reference",
                    f"`{ref}` not found under `{name}/`.",
                    skill=name,
                    file=rel,
                    line=line,
                )

    return {"score_base": 100, "findings": findings, "skill_count": skill_count}


# ---------------------------------------------------------------------------
# Category: AGENT.md
# ---------------------------------------------------------------------------

def check_agent_md(repo_root: Path) -> dict[str, Any]:
    findings: list[dict[str, Any]] = []
    agent = repo_root / ".claude" / "AGENT.md"
    rel = ".claude/AGENT.md"
    if not agent.exists():
        add_finding(findings, "critical", "missing", "AGENT.md not found.", file=rel)
        return {"score_base": 100, "findings": findings}

    text = agent.read_text(encoding="utf-8", errors="replace")
    seen: set[str] = set()
    for tok, lineno in extract_inline_code_tokens(text):
        # ignore short tokens, glob-only patterns, command examples
        if " " in tok or "\t" in tok:
            continue
        if not looks_like_path(tok):
            continue
        if is_placeholder_path(tok):
            continue
        if tok in seen:
            continue
        seen.add(tok)
        if resolve_path_or_glob(repo_root, tok):
            continue
        # determine severity by prefix
        if tok.startswith(".claude/"):
            sev = "critical"
        else:
            sev = "major"
        add_finding(
            findings,
            sev,
            "broken_path_reference",
            f"`{tok}` does not resolve on disk.",
            file=rel,
            line=lineno,
        )

    # ensure every skill in .claude/skills/ is named at least once
    skills_dir = repo_root / ".claude" / "skills"
    if skills_dir.exists():
        for skill_path in skills_dir.iterdir():
            if not skill_path.is_dir():
                continue
            name = skill_path.name
            # look for backticked or hyphen-quoted skill name
            if not re.search(rf"`{re.escape(name)}`", text):
                add_finding(
                    findings,
                    "minor",
                    "skill_not_mentioned",
                    f"Skill `{name}` exists but is not referenced in AGENT.md skill catalog.",
                    skill=name,
                    file=rel,
                )

    return {"score_base": 100, "findings": findings}


# ---------------------------------------------------------------------------
# Category: hooks
# ---------------------------------------------------------------------------

def _iter_hook_commands(settings: Any):
    """Yield (event_name, command_string) tuples from a settings.json hooks block."""
    hooks = settings.get("hooks") if isinstance(settings, dict) else None
    if not isinstance(hooks, dict):
        return
    for event_name, entries in hooks.items():
        if not isinstance(entries, list):
            continue
        for entry in entries:
            if not isinstance(entry, dict):
                continue
            inner = entry.get("hooks", [])
            if isinstance(inner, list):
                for h in inner:
                    if isinstance(h, dict) and "command" in h:
                        yield event_name, h["command"]


def check_hooks(repo_root: Path) -> dict[str, Any]:
    findings: list[dict[str, Any]] = []
    settings_files = [
        repo_root / ".claude" / "settings.json",
        repo_root / ".claude" / "settings.local.json",
    ]

    found_any = False
    for sf in settings_files:
        if not sf.exists():
            continue
        found_any = True
        rel = str(sf.relative_to(repo_root))
        try:
            data = json.loads(sf.read_text(encoding="utf-8"))
        except json.JSONDecodeError as e:
            add_finding(findings, "critical", "invalid_json", f"{rel} is invalid JSON: {e}", file=rel)
            continue

        for event, cmd in _iter_hook_commands(data):
            # extract the first token of the command (the script/binary)
            cmd_str = cmd.strip()
            if not cmd_str:
                add_finding(findings, "major", "empty_command", f"Hook for `{event}` has empty command.", file=rel)
                continue
            # naively split — first token is the binary or path
            first = cmd_str.split()[0]
            # strip leading shell ops like `(` / `&&`
            first = first.lstrip("(")

            if first.startswith(".") or first.startswith("/"):
                # path — relative to repo root if not absolute
                p = (repo_root / first).resolve() if first.startswith(".") else Path(first)
                if not p.exists():
                    add_finding(
                        findings,
                        "critical",
                        "hook_command_missing",
                        f"Hook command `{first}` (event {event}) not found on disk.",
                        file=rel,
                    )
                else:
                    # check executable bit on script files
                    if p.suffix in (".sh", ".py", ".cjs", ".mjs", ".js") and not os.access(p, os.X_OK):
                        # for .py and .js it's OK to not be +x if invoked with interpreter,
                        # but cjs/mjs/sh are usually run directly — flag only those
                        if p.suffix in (".sh", ".cjs", ".mjs"):
                            add_finding(
                                findings,
                                "major",
                                "hook_not_executable",
                                f"Hook script `{first}` lacks +x permission.",
                                file=rel,
                            )
            else:
                # treat as command on PATH
                if not shutil.which(first):
                    add_finding(
                        findings,
                        "major",
                        "hook_command_not_on_path",
                        f"Hook command `{first}` (event {event}) not on PATH.",
                        file=rel,
                    )

    if not found_any:
        # no settings files at all — that's not necessarily an error, just nothing to check
        return {"score_base": 100, "findings": [], "files_checked": 0}
    return {"score_base": 100, "findings": findings, "files_checked": len([s for s in settings_files if s.exists()])}


# ---------------------------------------------------------------------------
# Category: MCP
# ---------------------------------------------------------------------------

def check_mcp(repo_root: Path) -> dict[str, Any]:
    findings: list[dict[str, Any]] = []
    mcp_file = repo_root / ".mcp.json"
    if not mcp_file.exists():
        return {"score_base": 100, "findings": [], "present": False}

    rel = ".mcp.json"
    try:
        data = json.loads(mcp_file.read_text(encoding="utf-8"))
    except json.JSONDecodeError as e:
        add_finding(findings, "critical", "invalid_json", f"{rel} is invalid JSON: {e}", file=rel)
        return {"score_base": 100, "findings": findings, "present": True}

    servers = data.get("mcpServers", {})
    if not isinstance(servers, dict):
        add_finding(findings, "critical", "invalid_shape", "`mcpServers` is not an object.", file=rel)
        return {"score_base": 100, "findings": findings, "present": True}

    for name, entry in servers.items():
        if not isinstance(entry, dict):
            add_finding(findings, "critical", "invalid_entry", f"MCP server `{name}` is not an object.", file=rel)
            continue
        has_command = "command" in entry
        has_url = "url" in entry
        if not (has_command or has_url):
            add_finding(
                findings,
                "critical",
                "mcp_no_command_or_url",
                f"MCP `{name}` has neither `command` nor `url`.",
                file=rel,
            )
            continue
        if has_command:
            cmd = entry["command"]
            if cmd.startswith("/") or cmd.startswith("."):
                p = (repo_root / cmd).resolve() if cmd.startswith(".") else Path(cmd)
                if not p.exists():
                    add_finding(findings, "major", "mcp_command_missing", f"MCP `{name}` command `{cmd}` not on disk.", file=rel)
            else:
                if not shutil.which(cmd):
                    add_finding(findings, "major", "mcp_command_not_on_path", f"MCP `{name}` command `{cmd}` not on PATH.", file=rel)
        if has_url:
            url = entry["url"]
            if not re.match(r"^https?://", url):
                add_finding(findings, "minor", "mcp_bad_url", f"MCP `{name}` URL `{url}` does not start with http(s)://.", file=rel)

    return {"score_base": 100, "findings": findings, "present": True, "server_count": len(servers)}


# ---------------------------------------------------------------------------
# Category: validators
# ---------------------------------------------------------------------------

def check_validators(repo_root: Path) -> dict[str, Any]:
    findings: list[dict[str, Any]] = []

    # validate-schema --all
    vs = repo_root / ".claude" / "skills" / "design-to-liquid" / "scripts" / "validate-schema.py"
    if not vs.exists():
        add_finding(findings, "critical", "validator_missing", "validate-schema.py not found.", file=str(vs))
    else:
        try:
            res = subprocess.run(
                [sys.executable, str(vs), "--all"],
                cwd=str(repo_root),
                capture_output=True,
                text=True,
                timeout=60,
            )
            if res.returncode != 0:
                # surface the first ~5 lines of stderr/stdout as detail
                out = (res.stdout or "") + (res.stderr or "")
                snippet = " | ".join(line.strip() for line in out.splitlines()[:5] if line.strip())[:400]
                add_finding(
                    findings,
                    "major",
                    "validate_schema_failing",
                    f"validate-schema.py --all exited {res.returncode}. First lines: {snippet}",
                    file=str(vs.relative_to(repo_root)),
                )
        except subprocess.TimeoutExpired:
            add_finding(findings, "major", "validate_schema_timeout", "validate-schema.py --all timed out (60s).", file=str(vs.relative_to(repo_root)))
        except Exception as e:
            add_finding(findings, "major", "validate_schema_error", f"Could not run validate-schema.py: {e}", file=str(vs.relative_to(repo_root)))

    # scan-inventory --help smoke test
    si = repo_root / ".claude" / "skills" / "planner" / "scripts" / "scan-inventory.py"
    if not si.exists():
        add_finding(findings, "minor", "scan_inventory_missing", "scan-inventory.py not found.", file=str(si))
    else:
        try:
            res = subprocess.run(
                [sys.executable, str(si), "--help"],
                cwd=str(repo_root),
                capture_output=True,
                text=True,
                timeout=15,
            )
            if res.returncode != 0:
                add_finding(findings, "minor", "scan_inventory_failing", f"scan-inventory.py --help exited {res.returncode}.", file=str(si.relative_to(repo_root)))
        except Exception as e:
            add_finding(findings, "minor", "scan_inventory_error", f"scan-inventory.py --help error: {e}", file=str(si.relative_to(repo_root)))

    return {"score_base": 100, "findings": findings}


# ---------------------------------------------------------------------------
# Category: state
# ---------------------------------------------------------------------------

def check_state(repo_root: Path) -> dict[str, Any]:
    findings: list[dict[str, Any]] = []
    state_dir = repo_root / ".agent-state"
    if not state_dir.exists():
        add_finding(findings, "major", "state_dir_missing", "`.agent-state/` directory not found.", file=".agent-state/")
        return {"score_base": 100, "findings": findings}

    progress = state_dir / "PROGRESS.md"
    plan = state_dir / "PLAN.md"
    inventory = state_dir / "INVENTORY.md"

    if not progress.exists():
        add_finding(findings, "major", "progress_missing", "PROGRESS.md not found.", file=".agent-state/PROGRESS.md")
    else:
        lines = progress.read_text(encoding="utf-8", errors="replace").count("\n") + 1
        if lines > 500:
            add_finding(
                findings,
                "major",
                "progress_oversized",
                f"PROGRESS.md is {lines} lines (> 500). Per AGENT.md growth policy, archive oldest sessions.",
                file=".agent-state/PROGRESS.md",
            )

    if not plan.exists():
        add_finding(findings, "major", "plan_missing", "PLAN.md not found.", file=".agent-state/PLAN.md")

    if not inventory.exists():
        add_finding(findings, "minor", "inventory_missing", "INVENTORY.md not found.", file=".agent-state/INVENTORY.md")
    else:
        # check freshness: latest src/sections mtime vs INVENTORY mtime
        sections_dir = repo_root / "src" / "sections"
        if sections_dir.exists():
            latest_section_mtime = 0.0
            for child in sections_dir.iterdir():
                if child.is_dir():
                    try:
                        latest_section_mtime = max(latest_section_mtime, child.stat().st_mtime)
                    except OSError:
                        pass
            inv_mtime = inventory.stat().st_mtime
            if latest_section_mtime > 0 and (latest_section_mtime - inv_mtime) > 14 * 86400:
                days = int((latest_section_mtime - inv_mtime) / 86400)
                add_finding(
                    findings,
                    "minor",
                    "inventory_stale",
                    f"INVENTORY.md is {days} days older than newest section. Run scan-inventory.py.",
                    file=".agent-state/INVENTORY.md",
                )

    return {"score_base": 100, "findings": findings}


# ---------------------------------------------------------------------------
# Scoring
# ---------------------------------------------------------------------------

DEDUCTION = {"critical": 25, "major": 10, "minor": 3}
WEIGHTS = {
    "skills": 20,
    "agent_md": 15,
    "hooks": 10,
    "mcp": 5,
    "validators": 10,
    "state": 15,
}  # shopify_drift (25) added by Claude in workflow step 3


def compute_score(category: dict[str, Any]) -> int:
    base = category.get("score_base", 100)
    for f in category.get("findings", []):
        base -= DEDUCTION.get(f["severity"], 0)
    return max(0, base)


# ---------------------------------------------------------------------------
# Distribution-repo awareness
# ---------------------------------------------------------------------------
#
# This `.claude/` system is maintained in its own portable repo and pulled into a
# host Shopify Liquid project. In that distribution repo the host-owned paths and
# scripts (`.agent-state/`, `theme-config/`, `shopify/`, `src/`, plus the build
# manifest `package.json`) don't exist yet — so the static checks would flag many
# "broken path" / "validator failed" findings that are EXPECTED, not defects.
# We detect that mode (no root `package.json`) and downgrade those findings to
# `info` (0 score deduction), so the score reflects the `.claude` system itself
# rather than the absent host project.

PROJECT_OWNED_PREFIXES = (".agent-state", "theme-config", "shopify", "src")


def _backticked_token(detail: str) -> str:
    m = re.match(r"\s*`([^`]+)`", detail or "")
    return m.group(1) if m else ""


def downgrade_project_owned(categories: dict[str, Any]) -> int:
    """Downgrade host-project-owned findings to `info` (0 deduction). Returns count."""
    n = 0
    for cat in categories.values():
        for f in cat.get("findings", []):
            if f.get("severity") == "info":
                continue
            tok = _backticked_token(f.get("detail", ""))
            owned = tok.startswith(PROJECT_OWNED_PREFIXES) or "header-pet" in tok
            rootless = "project root" in (f.get("detail", "") or "").lower()
            if owned or rootless:
                f["severity"] = "info"
                f["distribution_note"] = (
                    "project-owned (exists in the host Liquid project, not the .claude distribution repo)"
                )
                n += 1
    return n


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--human", action="store_true", help="Print a short human summary instead of JSON.")
    ap.add_argument("--repo-root", default=None, help="Path to repo root (defaults to nearest .git ancestor).")
    args = ap.parse_args()

    repo_root = Path(args.repo_root).resolve() if args.repo_root else find_repo_root(Path.cwd())

    categories = {
        "skills": check_skills(repo_root),
        "agent_md": check_agent_md(repo_root),
        "hooks": check_hooks(repo_root),
        "mcp": check_mcp(repo_root),
        "validators": check_validators(repo_root),
        "state": check_state(repo_root),
    }

    distribution_mode = not (repo_root / "package.json").exists()
    distribution_downgraded = downgrade_project_owned(categories) if distribution_mode else 0

    for name, cat in categories.items():
        cat["score"] = compute_score(cat)

    result = {
        "schema_version": 1,
        "run_at": dt.datetime.now(dt.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "repo_root": str(repo_root),
        "distribution_mode": distribution_mode,
        "distribution_downgraded": distribution_downgraded,
        "weights": WEIGHTS,
        "categories": categories,
    }

    if args.human:
        print(f"System audit @ {result['run_at']}  (repo: {repo_root})")
        print()
        for name, cat in categories.items():
            n = len(cat["findings"])
            mark = "✓" if n == 0 else f"⚠ {n}"
            print(f"  {name:<14} {cat['score']:>3}/100   {mark}")
        print()
        # show first 10 findings overall
        all_f = [(c, f) for c, cat in categories.items() for f in cat["findings"]]
        if all_f:
            print("First findings:")
            for cat_name, f in all_f[:10]:
                line = f"  [{f['severity']}] {cat_name}:{f['type']} — {f['detail']}"
                print(line)
            if len(all_f) > 10:
                print(f"  … and {len(all_f) - 10} more")
        return 0

    json.dump(result, sys.stdout, indent=2, ensure_ascii=False)
    sys.stdout.write("\n")
    return 0


if __name__ == "__main__":
    sys.exit(main())
