import * as vscode from "vscode";
import { TargetUri } from "../types";
import { AddTestSuite, TargetName } from "./types";
import {
  prefixesOf,
  refineTestItem,
  TestItemPath,
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
  event: AddTestSuite
): void {
  const buildTargetItem = getOrCreateBuildTargetItem(
    testController,
    targetName,
    targetUri
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
        refineTestItem("package", packageNode, targetUri, targetName, parent);
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
      refineTestItem("suite", testItem, targetUri, targetName, parent);
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
  targetName: TargetName,
  targetUri: TargetUri
): vscode.TestItem {
  const buildTarget = testController.items.get(targetName);
  if (buildTarget) {
    return buildTarget;
  }

  const createdNode = testController.createTestItem(targetName, targetName);
  refineTestItem("project", createdNode, targetUri, targetName);
  testController.items.add(createdNode);

  return createdNode;
}
