import { ansicolor } from "ansicolor";
import * as vscode from "vscode";
import {
  Failed,
  SingleTestResult,
  SuiteName,
  TestName,
  TestRunActions,
  TestSuiteResult,
  TestSuiteRun,
} from "./types";
import { testItemCollectionToArray } from "./util";

/**
 * Analyze results from TestRun and pass inform Test Controller about them.
 *
 * @param run Interface which corresponds to available actions in vscode.TestRun
 * @param targetName target name for which TestRun was created
 * @param testSuites which should have been run in this TestRun
 * @param testSuitesResult result which came back from DAP server
 * @param teardown cleanup logic which has to be called at the end of function
 */
export function analyzeTestRun(
  run: TestRunActions,
  suites: TestSuiteRun[],
  testSuitesResults: TestSuiteResult[],
  teardown?: () => void
): void {
  const results = createResultsMap(testSuitesResults);
  for (const { suiteItem, testCases } of suites) {
    const suiteName = suiteItem.id as SuiteName;
    const result = results.get(suiteName);
    if (result != null) {
      // if suite run contains test cases (run was started for (single) test case)
      if (testCases.length > 0) {
        analyzeTestCases(run, result, testCases);
      }
      // if test suite has children (test cases) do a more fine-grained analyze of results.
      // run was started for whole suite which has children (e.g. junit one)
      else if (suiteItem.children.size > 0) {
        const items = testItemCollectionToArray(suiteItem.children);
        analyzeTestCases(run, result, items);
      } else {
        analyzeTestSuite(run, result, suiteItem);
      }
    } else {
      run.skipped?.(suiteItem);
    }
  }
  teardown?.();
}

/**
 * Transforms array of suite results into mapping between suite name and suite result.
 */
function createResultsMap(
  testSuitesResults: TestSuiteResult[]
): Map<SuiteName, TestSuiteResult> {
  const resultsTuples: [SuiteName, TestSuiteResult][] = testSuitesResults.map(
    (result) => [result.suiteName, result]
  );
  const results = new Map(resultsTuples);
  return results;
}

/**
 * Analyze result of each test case from the test suite independently.
 */
function analyzeTestCases(
  run: TestRunActions,
  result: TestSuiteResult,
  testCases: vscode.TestItem[]
) {
  const testCasesResults = createTestCasesMap(result);
  testCases.forEach((test) => {
    const testCaseResult = testCasesResults.get(test.id as TestName);

    if (testCaseResult?.kind === "passed") {
      run.passed?.(test, testCaseResult.duration);
    } else if (testCaseResult?.kind === "failed") {
      const errorMsg = toTestMessage(testCaseResult.error);
      run.failed?.(test, errorMsg, testCaseResult.duration);
    } else {
      run.skipped?.(test);
    }
  });
}

/**
 * Transforms suite result into mapping between test case name and its result.
 */
function createTestCasesMap(
  testSuiteResult: TestSuiteResult
): Map<TestName, SingleTestResult> {
  const tuples: [TestName, SingleTestResult][] = testSuiteResult.tests.map(
    (test) => [test.testName, test]
  );
  const testCasesResult = new Map(tuples);
  return testCasesResult;
}

/**
 * Analyze suite result treating test cases as whole, one entity.
 * If one of them fails, the whole suite fails.
 */
function analyzeTestSuite(
  run: TestRunActions,
  result: TestSuiteResult,
  testSuite: vscode.TestItem
) {
  const failed = result.tests.filter(isFailed);
  if (failed.length > 0) {
    const msg = extractErrorMessages(failed);
    run.failed?.(testSuite, msg, result.duration);
  } else {
    run.passed?.(testSuite, result.duration);
  }
}

function isFailed(result: SingleTestResult): result is Failed {
  return result.kind === "failed";
}

/**
 * Extract error messages for array of failed tests and map them to the TestMessage.
 * Messages can include ANSI escape sequences such as colors, but they have to be stripped
 * because vscode test explorer doesn't support ANSI color codes.
 */
function extractErrorMessages(failed: Failed[]): vscode.TestMessage[] {
  const messages = failed.map((entry) => toTestMessage(entry.error));
  return messages;
}

function toTestMessage(error: string): vscode.TestMessage {
  return { message: ansicolor.strip(error) };
}
