import * as assert from "assert";
import * as vscode from "vscode";
import { analyzeTestRun } from "../../../../test-explorer/analyze-test-run";
import {
  SuiteName,
  TestName,
  TestRunActions,
  TestSuiteResult,
} from "../../../../test-explorer/types";

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
      duration?: number
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

suite.only("Analyze tests results", () => {
  const testController = vscode.tests.createTestController(
    "testController",
    "Test Explorer"
  );

  test("suite passed", () => {
    const [action, results] = getRunActions();
    const testItem = testController.createTestItem("TestSuite", "TestSuite");
    analyzeTestRun(action, [testItem], passed);
    arrayEqual(results.failed, []);
    arrayEqual(results.skipped, []);
    arrayEqual(results.passed, [{ id: "TestSuite", duration: 100 }]);
  });

  // Suite doesn't have testcases - errors which comes from testcases
  // should be shown as an array of suite errors
  test("suite failed", () => {
    const [action, results] = getRunActions();
    const testItem = testController.createTestItem("TestSuite", "TestSuite");

    analyzeTestRun(action, [testItem], failed);
    arrayEqual(results.failed, [
      { id: "TestSuite", duration: 100, msg: [{ message: "Error" }] },
    ]);
    arrayEqual(results.skipped, []);
    arrayEqual(results.passed, []);
  });

  test("suite with testcases", () => {
    const [action, results] = getRunActions();
    const testItem = testController.createTestItem("TestSuite", "TestSuite");
    testItem.children.replace([
      testController.createTestItem("TestSuite.test1", "test1"),
      testController.createTestItem("TestSuite.test2", "test2"),
      testController.createTestItem("TestSuite.test3", "test3"),
    ]);

    analyzeTestRun(action, [testItem], failed);
    arrayEqual(results.failed, [
      {
        id: "TestSuite.test1",
        duration: 10,
        msg: { message: "Error" },
      },
    ]);
    arrayEqual(results.passed, [{ id: "TestSuite.test2", duration: 90 }]);
    arrayEqual(results.skipped, [{ id: "TestSuite.test3" }]);
  });

  test.only("testcase", () => {
    const [action, results] = getRunActions();
    const testItem = testController.createTestItem("TestSuite", "TestSuite");
    const child = testController.createTestItem("TestSuite.test1", "test1");
    [
      child,
      testController.createTestItem("TestSuite.test2", "test2"),
      testController.createTestItem("TestSuite.test3", "test3"),
    ].forEach((c) => testItem.children.add(c));

    analyzeTestRun(action, [testItem], failed);
    arrayEqual(results.failed, [
      {
        id: "TestSuite.test1",
        duration: 10,
        msg: { message: "Error" },
      },
    ]);
    arrayEqual(results.passed, [{ id: "TestSuite.test2", duration: 90 }]);
    arrayEqual(results.skipped, [{ id: "TestSuite.test3" }]);
  });
});
