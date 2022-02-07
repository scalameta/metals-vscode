import * as vscode from "vscode";
import { testCache } from "./test-cache";
import { TargetName, TargetUri, AddTestCases, TestItemMetadata } from "./types";
import { prefixesOf, toVscodeRange } from "./util";

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
  event: AddTestCases
): void {
  //
  function addTestCasesLoop(parent: vscode.TestItem, testPath: string[]): void {
    if (testPath.length > 0) {
      const [currentId, ...restOfIds] = testPath;
      const child = parent.children.get(currentId);
      if (child) {
        addTestCasesLoop(child, restOfIds);
      } else {
        console.error(
          "Cannot find test item for " + event.fullyQualifiedClassName
        );
      }
    } else {
      parent.children.forEach((c) => testCache.deleteMetadata(c));
      parent.children.replace([]);
      for (const { location, name } of event.testCases) {
        const parsedUri = vscode.Uri.parse(location.uri);
        const parsedRange = toVscodeRange(location.range);
        const id = `${parent.id}.${name}`;
        const testItem = testController.createTestItem(id, name, parsedUri);
        testItem.range = parsedRange;
        const data: TestItemMetadata = {
          kind: "testcase",
          targetName,
          targetUri,
        };
        testCache.setMetadata(testItem, data);
        parent.children.add(testItem);
      }
    }
  }

  const buildTargetItem = testController.items.get(targetName);
  if (buildTargetItem) {
    const testPath = prefixesOf(event.fullyQualifiedClassName, true);
    addTestCasesLoop(buildTargetItem, testPath);
  }
}
