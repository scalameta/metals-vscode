#!/usr/bin/env python3
"""
Debug helper for the protobuf TextMate grammar.

Usage (from repo root):
  uv run --project protobuf/dev/tools/proto-grammar-tools python protobuf/dev/tools/proto-grammar-tools/debug_matches.py \
    --grammar protobuf/syntaxes/proto3.json \
    --file protobuf/dev/test/grammar/clean.test.proto \
    --repo-key rpcDeclaration
"""

from __future__ import annotations

import argparse
import json
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, Optional, Tuple

import regex as re  # uses the third-party 'regex' module (installed via uv)


@dataclass(frozen=True)
class RepoPattern:
    key: str
    kind: str  # "match" | "begin/end" | "patterns"
    raw: str


def _compile(pattern: str) -> re.Pattern:
    # VSCode TextMate uses Oniguruma; python-regex isn't identical,
    # but it is closer than the stdlib 're' and supports more syntax.
    return re.compile(pattern)


def _get_repo_entry(grammar: Dict[str, Any], key: str) -> Dict[str, Any]:
    repo = grammar.get("repository", {})
    if key not in repo:
        raise SystemExit(f"repo key not found: {key}. available keys: {', '.join(sorted(repo.keys()))}")
    entry = repo[key]
    if not isinstance(entry, dict):
        raise SystemExit(f"repo entry {key} is not an object")
    return entry


def _extract_pattern(entry: Dict[str, Any], key: str) -> RepoPattern:
    if "match" in entry:
        return RepoPattern(key=key, kind="match", raw=entry["match"])
    if "begin" in entry and "end" in entry:
        return RepoPattern(key=key, kind="begin/end", raw=f"begin={entry['begin']} end={entry['end']}")
    if "patterns" in entry:
        return RepoPattern(key=key, kind="patterns", raw="(has patterns array; no top-level match/begin/end)")
    return RepoPattern(key=key, kind="unknown", raw="(no match/begin/end/patterns)")


def _find_repo_match_pattern(entry: Dict[str, Any]) -> Optional[str]:
    if "match" in entry and isinstance(entry["match"], str):
        return entry["match"]
    return None


def scan_file(path: Path, compiled: re.Pattern) -> None:
    text = path.read_text(encoding="utf-8")
    lines = text.splitlines()
    for i, line in enumerate(lines, 1):
        m = compiled.search(line)
        if not m:
            continue
        span = m.span()
        groups = tuple(m.groups())
        print(f"{i:>4}: {line}")
        print(f"      match span={span} groups={groups}")


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--grammar", required=True, help="Path to TextMate grammar JSON (e.g. protobuf/syntaxes/proto3.json)")
    ap.add_argument("--file", required=True, help="Path to testcase file to scan (e.g. protobuf/dev/test/grammar/clean.test.proto)")
    ap.add_argument("--repo-key", required=True, help="Grammar repository key to debug (e.g. rpcDeclaration)")
    args = ap.parse_args()

    grammar_path = Path(args.grammar)
    file_path = Path(args.file)

    grammar = json.loads(grammar_path.read_text(encoding="utf-8"))
    entry = _get_repo_entry(grammar, args.repo_key)
    info = _extract_pattern(entry, args.repo_key)
    print(f"repo[{args.repo_key}]: kind={info.kind} raw={info.raw}")

    pattern = _find_repo_match_pattern(entry)
    if not pattern:
        raise SystemExit(f"repo[{args.repo_key}] has no 'match' pattern to run line-scan against.")

    compiled = _compile(pattern)
    print(f"compiled: {compiled}")
    scan_file(file_path, compiled)


if __name__ == "__main__":
    main()

