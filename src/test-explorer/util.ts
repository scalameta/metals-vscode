import { Range } from "vscode-languageclient/node";
import * as vscode from "vscode";
import { TargetName } from "./types";

export function toVscodeRange(range: Range): vscode.Range {
  return new vscode.Range(
    range.start.line,
    range.start.character,
    range.end.line,
    range.end.character
  );
}

/**
 * Return n-1 prefixes of fully qualified name.
 * 'a.b.c.d.TestSuite' -> ['a', 'a.b', 'a.b.c', 'a.b.c.d']
 * 'a.b.c.d.TestSuite' is omitted on purpose
 */
export function prefixesOf(str: string): string[] {
  const parts = str.split(".");
  const prefixes: string[] = [];
  parts.forEach((_, idx) => prefixes.push(parts.slice(0, idx).join(".")));
  return prefixes.filter((p) => p.length > 0);
}
