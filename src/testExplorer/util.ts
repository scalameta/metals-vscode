import * as vscode from "vscode";
import { Range } from "vscode-languageclient/node";
import {
  FullyQualifiedClassName,
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
 * In order to handle all 4 cases with minimal boilerplate and casting reduced to the minimum as this function is overloaded
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
 * @member id - fully qualified name of testItem
 * @member label - last part of fully qualified name
 * @member next - returns next prefix, if it exists.
 * If fully qualified named was traversed (last part was reached) returns null
 *
 * next calls for 'a.b.c.d.TestSuite' will yield
 * - {id: a, label: a}
 * - {id: a.b, label: b}
 * - {id: a.b.c, label: c}
 * - {id: a.b.c.d, label: d}
 * - {id: a.b.c.d.TestSuite, label: TestSuite} (if prefixesOf was called with includeSelf = true)
 * - null
 */
export interface TestItemPath {
  readonly id: string;
  readonly label: string;
  readonly next: () => TestItemPath | null;
}

/**
 * Generate prefixes of fully qualified name for test items
 * includeSelf = false :
 * 'a.b.c.d.TestSuite' -> ['a', 'a.b', 'a.b.c', 'a.b.c.d']
 * includeSelf = true :
 * 'a.b.c.d.TestSuite' -> ['a', 'a.b', 'a.b.c', 'a.b.c.d', 'a.b.c.d.TestSuite']
 */
export function prefixesOf(
  fullyQualifiedName: FullyQualifiedClassName,
  includeSelf = false
): TestItemPath | null {
  const partitioned = fullyQualifiedName.split(".");
  const parts = includeSelf
    ? partitioned
    : partitioned.slice(0, partitioned.length - 1);
  const prefixes: string[] = [];
  for (const part of parts) {
    const lastOpt = prefixes[prefixes.length - 1];
    const prefix = lastOpt ? `${lastOpt}.${part}` : part;
    prefixes.push(prefix);
  }

  function makeTestPrefix(
    idx: number,
    parts: string[],
    prefixes: string[]
  ): TestItemPath | null {
    if (prefixes[idx] != null) {
      return {
        id: prefixes[idx],
        label: parts[idx],
        next: () => makeTestPrefix(idx + 1, parts, prefixes),
      };
    } else {
      return null;
    }
  }

  return makeTestPrefix(0, parts, prefixes);
}
