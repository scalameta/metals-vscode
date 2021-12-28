import * as vscode from "vscode";
import {
  Failed,
  SingleTestResult,
  SuiteName,
  TestRunActions,
  TestSuiteResult,
} from "./types";
import { ansicolor } from "ansicolor";

/**
 * Analyze results from TestRun and pass inform Test Controller about them.
 *
 * @param run Interface which corresponds to available actions in vscode.TestRun
 * @param tests which should have been run in this TestRun
 * @param testSuitesResult result which came back from DAP server
 * @param teardown cleanup logic which has to be called at the end of function
 */
export const analyzeTestRun = (
  run: TestRunActions,
  tests: vscode.TestItem[],
  testSuitesResults: TestSuiteResult[],
  teardown?: () => void
): void => {
  const results = createResultsMap(testSuitesResults);
  for (const test of tests) {
    const suiteName = test.id as SuiteName;
    const result = results.get(suiteName);
    if (result != null) {
      const duration = result.duration;
      const failed = result.tests.filter(isFailed);
      if (failed.length > 0) {
        const msg = extractErrorMessages(failed);
        run.failed?.(test, msg, duration);
      } else {
        run.passed?.(test, duration);
      }
    } else {
      run.skipped?.(test);
    }
  }
  teardown?.();
};

function isFailed(result: SingleTestResult): result is Failed {
  return result.kind === "failed";
}

/**
 * Transforms array of suite results into mapping between suite name and suite result
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
 * Extract error messages for array of failed tests and map them to the TestMessage.
 * Messages can include ANSI escape sequences such as colors, but they have to be stripped
 * because vscode test explorer doesn't support ANSI color codes.
 */
function extractErrorMessages(failed: Failed[]): vscode.TestMessage[] {
  const msg = failed
    .map((t) => ansicolor.strip(t.error))
    .map((message) => ({ message }));
  return msg;
}
