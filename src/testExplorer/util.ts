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

// https://www.typescriptlang.org/docs/handbook/2/functions.html#function-overloads

// prettier-ignore
export function refineTestItem(kind: "project",  test: vscode.TestItem, targetUri: TargetUri, targetName: TargetName): ProjectMetalsTestItem;
// prettier-ignore
export function refineTestItem(kind: "package",  test: vscode.TestItem, targetUri: TargetUri, targetName: TargetName, parent: vscode.TestItem): PackageMetalsTestItem;
// prettier-ignore
export function refineTestItem(kind: "suite",    test: vscode.TestItem, targetUri: TargetUri, targetName: TargetName, parent: vscode.TestItem): SuiteMetalsTestItem;
// prettier-ignore
export function refineTestItem(kind: "testcase", test: vscode.TestItem, targetUri: TargetUri, targetName: TargetName, parent: vscode.TestItem): TestCaseMetalsTestItem;
/**
 * Refine vscode.TestItem by extending it with additional metadata needed for test runs.
 * In order to handle all 4 cases with minimal boilerplate and casting reduced to the minimum this function is overloaded
 * for all 4 cases. Thanks to the overloading we can achieve mediocre type safety:
 * - project kind doesn't need parent
 * - return types are narrowed down
 * while, at the same time, we are doing casting.
 */
export function refineTestItem(
  kind: MetalsTestItemKind,
  test: vscode.TestItem,
  targetUri: TargetUri,
  targetName: TargetName,
  parent?: vscode.TestItem
): MetalsTestItem {
  const cast = test as MetalsTestItem;
  cast._metalsKind = kind;
  cast._metalsTargetName = targetName;
  cast._metalsTargetUri = targetUri;
  if (kind !== "project") {
    cast._metalsParent = parent as MetalsTestItem | undefined;
  }
  return cast;
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
