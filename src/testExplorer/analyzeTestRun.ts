import { ansicolor } from "ansicolor";
import * as vscode from "vscode";
import {
  Failed,
  RunnableMetalsTestItem,
  SingleTestResult,
  SuiteName,
  TestName,
  TestRunActions,
  TestSuiteResult,
} from "./types";
import { gatherTestItems } from "./util";

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
  tests: RunnableMetalsTestItem[],
  testSuitesResults: TestSuiteResult[],
  teardown?: () => void,
): void {
  const results = createResultsMap(testSuitesResults);
  for (const test of tests) {
    const kind = test._metalsKind;
    const suiteName =
      kind === "suite"
        ? (test.id as SuiteName)
        : (test._metalsParent.id as SuiteName);
    const result = results.get(suiteName);
    if (result != null) {
      // if suite run contains test cases (run was started for (single) test case)
      if (kind === "testcase") {
        analyzeTestCases(run, result, [test], test._metalsParent);
      }
      // if test suite has children (test cases) do a more fine-grained analyze of results.
      // run was started for whole suite which has children (e.g. junit one)
      else if (test.children.size > 0) {
        const items = gatherTestItems(test.children);
        analyzeTestCases(run, result, items, test);
      } else {
        analyzeTestSuite(run, result, test);
      }
    } else {
      run.skipped?.(test);
    }
  }
  teardown?.();
}

/**
 * Transforms array of suite results into mapping between suite name and suite result.
 */
function createResultsMap(
  testSuitesResults: TestSuiteResult[],
): Map<SuiteName, TestSuiteResult> {
  const resultsTuples: [SuiteName, TestSuiteResult][] = testSuitesResults.map(
    (result) => [result.suiteName, result],
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
  testCases: vscode.TestItem[],
  parent?: vscode.TestItem,
) {
  const parentName = parent?.id || "";
  const testCasesResults = createTestCasesMap(result, parentName);
  testCases.forEach((test) => {
    const name = test.id as TestName;
    const testCaseResult = testCasesResults.get(name);

    if (testCaseResult?.kind === "passed") {
      run.passed?.(test, testCaseResult.duration);
    } else if (testCaseResult?.kind === "failed") {
      const errorMsg = toTestMessage(testCaseResult);
      run.failed?.(test, errorMsg, testCaseResult.duration);
    } else {
      run.skipped?.(test);
    }
  });

  if (parent) {
    const tests = new Set(testCases.map((t) => t.id as TestName));
    const failed = Array.from(testCasesResults.entries())
      .filter(([name, _]) => !tests.has(name))
      .map(([_, result]) => result)
      .filter(isFailed);
    if (failed.length > 0) {
      const msg = extractErrorMessages(failed);
      run.failed?.(parent, msg, result.duration);
    }
  }
}

/**
 * Transforms suite result into mapping between test case name and its result.
 *
 * @param parentName test cases are prefixed with parent (suite) name.
 * However, some test frameworks like scalatest send results which are not prefixed, other like munit send prefixed results, etc.
 * To unify handling, make sure that all results starts with given parentName.
 */
function createTestCasesMap(
  testSuiteResult: TestSuiteResult,
  parentName: string,
): Map<TestName, SingleTestResult> {
  const tuples: [TestName, SingleTestResult][] = testSuiteResult.tests.map(
    (test) => {
      const name =
        parentName && test.testName.startsWith(parentName)
          ? test.testName.slice(parentName.length + 1)
          : test.testName;
      return [name as TestName, test];
    },
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
  testSuite: vscode.TestItem,
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
  const messages = failed.map((entry) => toTestMessage(entry));
  return messages;
}

function toTestMessage(failed: Failed): vscode.TestMessage {
  if (failed.location) {
    return {
      message: ansicolor.strip(failed.error),
      location: new vscode.Location(
        vscode.Uri.parse(failed.location.file),
        new vscode.Position(failed.location.line, 0),
      ),
    };
  }
  return { message: ansicolor.strip(failed.error) };
}
