import * as vscode from "vscode";
import { TargetUri } from "../types";
import { AddTestSuite, TargetName, FolderName, FolderUri } from "./types";
import {
  prefixesOf,
  TestItemPath,
  refineRunnableTestItem,
  refineTestItem,
  toVscodeRange,
} from "./util";

/**
 * Add test suite to the Test Explorer.
 *
 * Depending on fully qualified name traverse Test Explorer hierarchy,
 * creating intermediate test items if necessary, and find test item for which
 * a newly created test suite item should be added.
 *
 * If test item already exists do nothing
 */
export function addTestSuite(
  testController: vscode.TestController,
  targetName: TargetName,
  targetUri: TargetUri,
  folderName: FolderName,
  folderUri: FolderUri,
  event: AddTestSuite
): void {
  const workspaceFolderItem = getOrCreateWorkspaceFolderItem(
    testController,
    folderName,
    folderUri
  );

  const buildTargetItem = getOrCreateBuildTargetItem(
    testController,
    workspaceFolderItem,
    targetUri,
    targetName
  );

  function addTestSuiteLoop(
    parent: vscode.TestItem,
    testPrefix: TestItemPath | null
  ) {
    if (testPrefix) {
      const child = parent.children.get(testPrefix.id);
      if (child) {
        addTestSuiteLoop(child, testPrefix.next());
      } else {
        const { id, label } = testPrefix;
        const packageNode = testController.createTestItem(id, label);
        refineTestItem("package", packageNode, parent);
        parent.children.add(packageNode);
        addTestSuiteLoop(packageNode, testPrefix.next());
      }
    } else {
      const { className, location, fullyQualifiedClassName } = event;

      const parsedUri = vscode.Uri.parse(location.uri);
      const parsedRange = toVscodeRange(location.range);
      const testItem = testController.createTestItem(
        fullyQualifiedClassName,
        className,
        parsedUri
      );
      refineRunnableTestItem("suite", testItem, targetUri, targetName, parent);
      // if canResolveChildren is true then test item is shown as expandable in the Test Explorer view
      testItem.canResolveChildren = event.canResolveChildren;
      testItem.range = parsedRange;
      parent.children.add(testItem);
    }
  }

  const testPath = prefixesOf(event.fullyQualifiedClassName);
  addTestSuiteLoop(buildTargetItem, testPath);
}

/**
 * Create and add test item for a build target (first request)
 * or get already created (subsequent requests)
 */
function getOrCreateBuildTargetItem(
  testController: vscode.TestController,
  workspaceFolderItem: vscode.TestItem,
  targetUri: TargetUri,
  targetName: TargetName
): vscode.TestItem {
  const buildTarget = workspaceFolderItem.children.get(targetUri);
  if (buildTarget) {
    return buildTarget;
  }

  const createdNode = testController.createTestItem(targetUri, targetName);
  refineTestItem("module", createdNode, workspaceFolderItem);
  workspaceFolderItem.children.add(createdNode);

  return createdNode;
}

/**
 * Create and add test item for a workspace folder (first request)
 * or get already created (subsequent requests)
 */
function getOrCreateWorkspaceFolderItem(
  testController: vscode.TestController,
  folderName: FolderName,
  folderUri: FolderUri
): vscode.TestItem {
  const workspaceFolder = testController.items.get(folderUri);
  if (workspaceFolder) {
    return workspaceFolder;
  }

  const createdNode = testController.createTestItem(folderUri, folderName);
  refineTestItem("workspaceFolder", createdNode);
  testController.items.add(createdNode);

  return createdNode;
}
