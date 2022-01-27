import { Range } from "vscode-languageclient/node";
import * as vscode from "vscode";

export function toVscodeRange(range: Range): vscode.Range {
  return new vscode.Range(
    range.start.line,
    range.start.character,
    range.end.line,
    range.end.character
  );
}

/**
 * Return prefixes of fully qualified name.
 * includeSelf = false :
 * 'a.b.c.d.TestSuite' -> ['a', 'a.b', 'a.b.c', 'a.b.c.d']
 * includeSelf = true :
 * 'a.b.c.d.TestSuite' -> ['a', 'a.b', 'a.b.c', 'a.b.c.d', 'a.b.c.d.TestSuite']
 */
export function prefixesOf(str: string, includeSelf = false): string[] {
  const parts = str.split(".");
  const prefixes = parts
    .map((_, idx) => {
      const joined = parts.slice(0, idx).join(".");
      return joined;
    })
    .filter((p) => p.length > 0);
  return includeSelf ? [...prefixes, str] : prefixes;
}
