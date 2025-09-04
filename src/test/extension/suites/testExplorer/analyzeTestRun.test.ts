import * as assert from "assert";
import * as vscode from "vscode";
import { analyzeTestRun } from "../../../../testExplorer/analyzeTestRun";
import {
  SuiteName,
  TestName,
  TestRunActions,
  TestSuiteResult,
} from "../../../../testExplorer/types";
import { refineRunnableTestItem } from "../../../../testExplorer/util";
import { buildTarget } from "./util";

const [targetName, targetUri] = buildTarget("app", "");

const passed: TestSuiteResult[] = [
  {
    suiteName: "TestSuite" as SuiteName,
    duration: 100,
    tests: [
      { kind: "passed", testName: "TestSuite.test1" as TestName, duration: 10 },
      { kind: "passed", testName: "TestSuite.test2" as TestName, duration: 90 },
    ],
  },
];

const failed: TestSuiteResult[] = [
  {
    suiteName: "TestSuite" as SuiteName,
    duration: 100,
    tests: [
      {
        kind: "failed",
        testName: "TestSuite.test1" as TestName,
        error: "Error",
        duration: 10,
        location: { file: "file://test", line: 1 },
      },
      { kind: "passed", testName: "TestSuite.test2" as TestName, duration: 90 },
      { kind: "skipped", testName: "TestSuite.test3" as TestName },
    ],
  },
];

interface TestResults {
  readonly passed: { id: string; duration?: number }[];
  readonly failed: {
    id: string;
    duration?: number;
    msg: vscode.TestMessage | readonly vscode.TestMessage[];
  }[];
  readonly skipped: { id: string }[];
}

function getRunActions(): [TestRunActions, TestResults] {
  const results: TestResults = { passed: [], failed: [], skipped: [] };

  const actions: TestRunActions = {
    failed: (
      test: vscode.TestItem,
      msg: vscode.TestMessage | readonly vscode.TestMessage[],
      duration?: number,
    ) => {
      results.failed.push({ id: test.id, duration, msg });
    },

    passed: (test: vscode.TestItem, duration?: number) => {
      results.passed.push({ id: test.id, duration });
    },

    skipped: (test: vscode.TestItem) => {
      results.skipped.push({ id: test.id });
    },
  };

  return [actions, results];
}

function arrayEqual<T>(actual: T[], expected: T[]): void {
  assert.deepEqual(actual, expected);
}

suite("Analyze tests results", () => {
  const testController = vscode.tests.createTestController(
    "testController",
    "Test Explorer",
  );

  test("suite passed", () => {
    const [action, results] = getRunActions();
    const testItem = testController.createTestItem("TestSuite", "TestSuite");
    const refined = refineRunnableTestItem(
      "suite",
      testItem,
      targetUri,
      targetName,
      testItem,
    );
    analyzeTestRun(action, [refined], passed);
    arrayEqual(results.failed, []);
    arrayEqual(results.skipped, []);
    arrayEqual(results.passed, [{ id: "TestSuite", duration: 100 }]);
  });

  // Suite doesn't have testcases - errors which comes from testcases
  // should be shown as an array of suite errors
  test("suite failed", () => {
    const [action, results] = getRunActions();
    const testItem = testController.createTestItem("TestSuite", "TestSuite");
    const refined = refineRunnableTestItem(
      "suite",
      testItem,
      targetUri,
      targetName,
      testItem,
    );

    analyzeTestRun(action, [refined], failed);
    arrayEqual(results.failed, [
      {
        id: "TestSuite",
        duration: 100,
        msg: [
          {
            message: "Error",
            location: new vscode.Location(
              vscode.Uri.parse("file://test"),
              new vscode.Position(1, 0),
            ),
          },
        ],
      },
    ]);
    arrayEqual(results.skipped, []);
    arrayEqual(results.passed, []);
  });

  test("suite with testcases", () => {
    const [action, results] = getRunActions();
    const testItem = testController.createTestItem("TestSuite", "TestSuite");
    const refined = refineRunnableTestItem(
      "suite",
      testItem,
      targetUri,
      targetName,
      testItem,
    );
    const child1 = testController.createTestItem("test1", "test1");
    const child2 = testController.createTestItem("test2", "test2");
    const child3 = testController.createTestItem("test3", "test3");
    testItem.children.replace([
      refineRunnableTestItem(
        "testcase",
        child1,
        targetUri,
        targetName,
        refined,
      ),
      refineRunnableTestItem(
        "testcase",
        child2,
        targetUri,
        targetName,
        refined,
      ),
      refineRunnableTestItem(
        "testcase",
        child3,
        targetUri,
        targetName,
        refined,
      ),
    ]);

    analyzeTestRun(action, [refined], failed);
    arrayEqual(results.failed, [
      {
        id: "test1",
        duration: 10,
        msg: {
          message: "Error",
          location: new vscode.Location(
            vscode.Uri.parse("file://test"),
            new vscode.Position(1, 0),
          ),
        },
      },
    ]);
    arrayEqual(results.passed, [{ id: "test2", duration: 90 }]);
    arrayEqual(results.skipped, [{ id: "test3" }]);
  });

  test("testcase", () => {
    const [action, results] = getRunActions();
    const testItem = testController.createTestItem("TestSuite", "TestSuite");
    const refined = refineRunnableTestItem(
      "suite",
      testItem,
      targetUri,
      targetName,
      testItem,
    );
    const child1 = testController.createTestItem("test1", "test1");
    const child2 = testController.createTestItem("test2", "test2");
    const child3 = testController.createTestItem("test3", "test3");
    const refinedChild = refineRunnableTestItem(
      "testcase",
      child1,
      targetUri,
      targetName,
      refined,
    );
    [
      refinedChild,
      refineRunnableTestItem(
        "testcase",
        child2,
        targetUri,
        targetName,
        refined,
      ),
      refineRunnableTestItem(
        "testcase",
        child3,
        targetUri,
        targetName,
        refined,
      ),
    ].forEach((c) => refined.children.add(c));

    analyzeTestRun(action, [refinedChild], failed);
    arrayEqual(results.failed, [
      {
        id: "test1",
        duration: 10,
        msg: {
          message: "Error",
          location: new vscode.Location(
            vscode.Uri.parse("file://test"),
            new vscode.Position(1, 0),
          ),
        },
      },
    ]);
    arrayEqual(results.passed, []);
    arrayEqual(results.skipped, []);
  });
});
