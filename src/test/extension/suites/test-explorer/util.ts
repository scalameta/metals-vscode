import * as vscode from "vscode";
import { TargetName, TargetUri } from "../../../../test-explorer/types";

export function randomString(): string {
  return Math.random().toString(36).substring(2, 15);
}

export function buildTarget(
  targetName: string,
  targetUri: string
): [TargetName, TargetUri] {
  return [targetName, targetUri] as [TargetName, TargetUri];
}

function traverse(items: vscode.TestItemCollection): unknown[] {
  const testItems: unknown[] = [];
  items.forEach((c) => {
    testItems.push({
      id: c.id,
      label: c.label,
      children: traverse(c.children),
    });
  });
  return testItems;
}

export function prettyPrint(items: vscode.TestItemCollection): string {
  const result = traverse(items);
  return JSON.stringify(result, undefined, 2);
}

export function logPrettyPrinted(items: vscode.TestItemCollection): void {
  console.log(prettyPrint(items));
}
