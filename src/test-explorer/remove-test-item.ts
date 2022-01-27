import * as vscode from "vscode";
import { testCache } from "./test-cache";
import { RemoveTestSuite, TargetName } from "./types";
import { prefixesOf } from "./util";

export function removeTestItem(
  testController: vscode.TestController,
  targetName: TargetName,
  event: RemoveTestSuite
): void {
  const { fullyQualifiedClassName } = event;

  function removeTestItemLoop(
    parent: vscode.TestItem,
    parentsIds: string[]
  ): void {
    if (parentsIds.length > 0) {
      const [currentId, ...restOfIds] = parentsIds;
      const child = parent.children.get(currentId);
      if (child) {
        removeTestItemLoop(child, restOfIds);
        if (child.children.size === 0) {
          testCache.deleteMetadata(child);
          parent.children.delete(child.id);
        }
      }
    } else {
      parent.children.delete(fullyQualifiedClassName);
    }
  }

  const buildTargetItem = testController.items.get(targetName);
  if (buildTargetItem) {
    const testIds = prefixesOf(event.fullyQualifiedClassName);
    removeTestItemLoop(buildTargetItem, testIds);
    if (buildTargetItem.children.size === 0) {
      testCache.deleteMetadata(buildTargetItem);
      testController.items.delete(buildTargetItem.id);
    }
  }
}
