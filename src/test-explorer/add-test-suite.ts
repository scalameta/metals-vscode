import * as vscode from "vscode";
import { testCache } from "./test-cache";
import { TargetName, TargetUri, TestItemMetadata, AddTestSuite } from "./types";
import { prefixesOf, toVscodeRange } from "./util";

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

  function addTestSuiteLoop(parent: vscode.TestItem, testPath: string[]) {
    if (testPath.length > 0) {
      const [currentId, ...restOfIds] = testPath;
      const child = parent.children.get(currentId);
      if (child) {
        addTestSuiteLoop(child, restOfIds);
      } else {
        const packageNode = testController.createTestItem(currentId, currentId);
        parent.children.add(packageNode);

        const data: TestItemMetadata = {
          kind: "package",
          targetName,
          targetUri,
        };
        testCache.setMetadata(packageNode, data);
        addTestSuiteLoop(packageNode, restOfIds);
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
      // if canResolveChildren is true then test item is shown as expandable in the Test Explorer view
      testItem.canResolveChildren = event.canResolveChildren;
      testItem.range = parsedRange;
      const data: TestItemMetadata = {
        kind: "suite",
        targetName,
        targetUri,
      };
      testCache.setMetadata(testItem, data);
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

  const createdNode = testController.createTestItem(
    targetName,
    targetName,
    vscode.Uri.parse(targetUri)
  );
  testController.items.add(createdNode);

  const data: TestItemMetadata = {
    kind: "project",
    targetName,
    targetUri,
  };
  testCache.setMetadata(createdNode, data);

  return createdNode;
}
