import * as vscode from "vscode";
import { TargetUri } from "../types";
import { AddTestCases, TargetName, FolderUri } from "./types";
import {
  prefixesOf,
  refineRunnableTestItem,
  TestItemPath,
  toVscodeRange
} from "./util";

/**
 * Add test cases to the given test suite.
 *
 * Depending on fully qualified name traverse Test Explorer hierarchy
 * and find suites's test item for which test cases should be added.
 *
 * Assumes that path from root to the leaf exists.
 */
export function addTestCases(
  testController: vscode.TestController,
  targetName: TargetName,
  targetUri: TargetUri,
  folderUri: FolderUri,
  event: AddTestCases
): void {
  function addTestCasesLoop(
    parent: vscode.TestItem,
    testPrefix: TestItemPath | null
  ): void {
    if (testPrefix) {
      const child = parent.children.get(testPrefix.id);
      if (child) {
        addTestCasesLoop(child, testPrefix.next());
      } else {
        console.error(
          "Cannot find test item for " + event.fullyQualifiedClassName
        );
      }
    } else {
      parent.children.replace([]);
      for (const { location, name, displayName } of event.testCases) {
        const parsedUri = vscode.Uri.parse(location.uri);
        const parsedRange = toVscodeRange(location.range);
        const testItem = testController.createTestItem(
          name,
          displayName || name,
          parsedUri
        );
        refineRunnableTestItem(
          "testcase",
          testItem,
          targetUri,
          targetName,
          parent
        );
        testItem.range = parsedRange;
        parent.children.add(testItem);
      }
    }
  }
  const workspaceFolderItem = testController.items.get(folderUri);
  if (workspaceFolderItem) {
    const buildTargetItem = workspaceFolderItem.children.get(targetUri);
    if (buildTargetItem) {
      const testPath = prefixesOf(event.fullyQualifiedClassName, true);
      addTestCasesLoop(buildTargetItem, testPath);
    }
  }
}
