import * as vscode from "vscode";
import { RemoveTestSuite, TargetName } from "./types";
import { prefixesOf, TestItemPath } from "./util";

export function removeTestItem(
  testController: vscode.TestController,
  targetName: TargetName,
  event: RemoveTestSuite
): void {
  const { fullyQualifiedClassName } = event;

  function removeTestItemLoop(
    parent: vscode.TestItem,
    testPrefix: TestItemPath | null
  ): void {
    if (testPrefix) {
      const child = parent.children.get(testPrefix.id);
      if (child) {
        removeTestItemLoop(child, testPrefix.next());
        if (child.children.size === 0) {
          parent.children.delete(child.id);
        }
      }
    } else {
      parent.children.delete(fullyQualifiedClassName);
    }
  }

  const buildTargetItem = testController.items.get(targetName);
  if (buildTargetItem) {
    const testPath = prefixesOf(event.fullyQualifiedClassName);
    removeTestItemLoop(buildTargetItem, testPath);
    if (buildTargetItem.children.size === 0) {
      testController.items.delete(buildTargetItem.id);
    }
  }
}
