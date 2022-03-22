import * as vscode from "vscode";
import { Range } from "vscode-languageclient/node";
import {
  MetalsTestItem,
  MetalsTestItemKind,
  PackageMetalsTestItem,
  ProjectMetalsTestItem,
  SuiteMetalsTestItem,
  TargetName,
  TargetUri,
  TestCaseMetalsTestItem,
} from "./types";

// prettier-ignore
export function refineTestItem(test: vscode.TestItem, kind: "project", targetUri: TargetUri, targetName: TargetName): ProjectMetalsTestItem;
// prettier-ignore
export function refineTestItem(test: vscode.TestItem, kind: "package", targetUri: TargetUri, targetName: TargetName, parent: vscode.TestItem): PackageMetalsTestItem;
// prettier-ignore
export function refineTestItem(test: vscode.TestItem, kind: "suite", targetUri: TargetUri, targetName: TargetName, parent: vscode.TestItem): SuiteMetalsTestItem;
// prettier-ignore
export function refineTestItem(test: vscode.TestItem, kind: "testcase", targetUri: TargetUri, targetName: TargetName, parent: vscode.TestItem): TestCaseMetalsTestItem;
// prettier-ignore
export function refineTestItem(
  test: vscode.TestItem,
  kind: MetalsTestItemKind,
  targetUri: TargetUri,
  targetName: TargetName,
  parent?: vscode.TestItem
): MetalsTestItem {
  const cast = test as MetalsTestItem;
  casted._metalsKind = kind;
  casted._metalsTargetName = targetName;
  casted._metalsTargetUri = targetUri;
  if (kind !== "project") {
    casted._metalsParent = parent as MetalsTestItem | undefined
  }
  return casted;
}

export function toVscodeRange(range: Range): vscode.Range {
  return new vscode.Range(
    range.start.line,
    range.start.character,
    range.end.line,
    range.end.character
  );
}

export function gatherTestItems(
  testCollection: vscode.TestItemCollection
): MetalsTestItem[] {
  const tests: MetalsTestItem[] = [];
  testCollection.forEach((test) => tests.push(test as MetalsTestItem));
  return tests;
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
