import * as vscode from "vscode";
import { AddTestCases, TargetName, TargetUri } from "./types";
import { prefixesOf, refineTestItem, toVscodeRange } from "./util";

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
      parent.children.replace([]);
      for (const { location, name } of event.testCases) {
        const parsedUri = vscode.Uri.parse(location.uri);
        const parsedRange = toVscodeRange(location.range);
        const id = `${parent.id}.${name}`;
        const testItem = testController.createTestItem(id, name, parsedUri);
        refineTestItem(testItem, "testcase", targetUri, targetName, parent);
        testItem.range = parsedRange;
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
