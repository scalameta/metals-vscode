import * as vscode from "vscode";
import { UpdateSuiteLocation, FolderUri } from "./types";
import { prefixesOf, TestItemPath, toVscodeRange } from "./util";
import { TargetUri } from "../types";

/**
 *
 * Depending on fully qualified name traverse Test Explorer hierarchy
 * and find suites for which range should be updated.
 *
 * Assumes that path from root to the leaf exists.
 */
export function updateTestSuiteLocation(
  testController: vscode.TestController,
  targetUri: TargetUri,
  folderUri: FolderUri,
  event: UpdateSuiteLocation
): void {
  function updateTestSuiteLocationLoop(
    parent: vscode.TestItem,
    testPrefix: TestItemPath | null
  ): void {
    if (testPrefix) {
      const child = parent.children.get(testPrefix.id);
      if (child) {
        updateTestSuiteLocationLoop(child, testPrefix.next());
      } else {
        console.error(
          "Cannot find test item for " + event.fullyQualifiedClassName
        );
      }
    } else {
      const parsedRange = toVscodeRange(event.location.range);
      parent.range = parsedRange;
    }
  }

  const workspaceFolderItem = testController.items.get(folderUri);
  if (workspaceFolderItem) {
    const buildTargetItem = workspaceFolderItem.children.get(targetUri);
    if (buildTargetItem) {
      const testPath = prefixesOf(event.fullyQualifiedClassName, true);
      updateTestSuiteLocationLoop(buildTargetItem, testPath);
    }
  }
}
