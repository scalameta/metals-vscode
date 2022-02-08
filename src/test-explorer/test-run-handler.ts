import { ServerCommands } from "metals-languageclient";
import * as vscode from "vscode";
import {
  CancellationToken,
  commands,
  TestController,
  TestRunRequest,
} from "vscode";
import { debugServerFromUri, DebugSession } from "../scalaDebugger";
import { analyzeTestRun } from "./analyze-test-run";
import { testCache } from "./test-cache";
import {
  DapEvent,
  ScalaTestSelection,
  ScalaTestSuiteSelection,
  TargetUri,
  TestItemMetadata,
  TestSuiteRun,
} from "./types";

// this id is used to mark DAP sessions created by TestController
// thanks to that debug tracker knows which requests it should track and gather results
export const testRunnerId = "scala-dap-test-runner";

/**
 * Register tracker which tracks all DAP sessions which are started with @constant {testRunnerId} kind.
 * Dap sends execution result for every suite included in TestRun in a special event of kind 'testResult'.
 * Tracker has to capture these events and store them all in map under debug session id as a key.
 */
vscode.debug.registerDebugAdapterTrackerFactory("scala", {
  createDebugAdapterTracker(session) {
    if (session.configuration.kind === testRunnerId) {
      return {
        onWillStartSession: () => testCache.setEmptySuiteResultsFor(session.id),
        onDidSendMessage: (msg: DapEvent) => {
          if (
            msg.event === "testResult" &&
            msg.body.category === "testResult"
          ) {
            testCache.addSuiteResult(session.id, msg.body.data);
          }
        },
      };
    }
  },
});

/**
 * runHandler is a function which is called to start a TestRun.
 * Depending on the run profile it may be ordinary run or a debug TestRun.
 * It creates run queue which contains test supposed to be run and then,
 * for each entry it creates & run a debug session.
 */
export async function runHandler(
  testController: TestController,
  noDebug: boolean,
  afterFinished: () => void,
  request: TestRunRequest,
  token: CancellationToken
): Promise<void> {
  const run = testController.createTestRun(request);
  const queue = createRunQueue(request);

  for (const { test, data } of queue) {
    if (token.isCancellationRequested) {
      run.skipped(test);
    } else if (data.kind === "testcase" && test.parent) {
      await runDebugSession(run, noDebug, data.targetUri, {
        root: test.parent,
        suites: [{ suiteItem: test.parent, testCases: [test] }],
      });
    } else {
      const suitesItems = testCache.getTestItemChildren(test);
      await runDebugSession(run, noDebug, data.targetUri, {
        root: test,
        suites: suitesItems.map((suite) => ({
          suiteItem: suite,
          testCases: [],
        })),
      });
    }
  }
  run.end();
  afterFinished();
}

/**
 *  User can start 3 different kind of test runs:
 * - run a whole build target/package
 * - run a whole test suite
 * - run a single test case
 * This interface describes all these runs and allows to process them in unified way.
 * @param root test item which was clicked by the user, can be test case/suite/package
 * @param suites suites which are included in this run
 */
export interface RunParams {
  root: vscode.TestItem;
  suites: TestSuiteRun[];
}

/**
 * @param noDebug determines if debug session will be started as a debug or normal run
 */
async function runDebugSession(
  run: vscode.TestRun,
  noDebug: boolean,
  targetUri: TargetUri,
  runParams: RunParams
): Promise<void> {
  const { root, suites } = runParams;
  try {
    suites.forEach((suite) => {
      suite.suiteItem.children.forEach((child) => run.started(child));
      run.started(suite.suiteItem);
    });
    await commands.executeCommand("workbench.action.files.save");
    const testSuiteSelection: ScalaTestSuiteSelection[] = runParams.suites.map(
      (suite) => ({
        className: suite.suiteItem.id,
        tests: suite.testCases.map((test) => test.label),
      })
    );
    const session = await createDebugSession(targetUri, testSuiteSelection);
    if (!session) {
      return;
    }
    const wasStarted = await startDebugging(session, noDebug);
    if (!wasStarted) {
      vscode.window.showErrorMessage("Debug session not started");
      run.failed(root, { message: "Debug session not started" });
      return;
    }
    await analyzeResults(run, suites);
  } catch (error) {
    console.error(error);
  }
}

/**
 * Loop through all included tests in request and add them to our queue if they are not excluded explicitly
 */
function createRunQueue(
  request: vscode.TestRunRequest
): { test: vscode.TestItem; data: TestItemMetadata }[] {
  const queue: { test: vscode.TestItem; data: TestItemMetadata }[] = [];

  if (request.include) {
    const excludes = new Set(request.exclude ?? []);
    for (const test of request.include) {
      if (!excludes.has(test)) {
        const testData = testCache.getMetadata(test);
        if (testData != null) {
          queue.push({ test, data: testData });
        }
      }
    }
  }
  return queue;
}

/**
 * Creates a debug session via Metals DebugAdapterStart command.
 * dataKind and data are determined by BSP debug request method.
 */
async function createDebugSession(
  targetUri: TargetUri,
  classes: ScalaTestSuiteSelection[]
): Promise<DebugSession | undefined> {
  const debugSessionParams: ScalaTestSelection = {
    target: { uri: targetUri },
    classes,
    jvmOptions: [],
    env: {},
  };
  return vscode.commands.executeCommand<DebugSession>(
    ServerCommands.DebugAdapterStart,
    debugSessionParams
  );
}

/**
 * Starts interacting with created debug session.
 * kind is set to the testRunnerId. It helps to differentiate debug session which were started by Test Explorer.
 * These sessions are tracked by a vscode.debug.registerDebugAdapterTrackerFactory, which capture special event
 * containing information about test suite execution.
 */
async function startDebugging(session: DebugSession, noDebug: boolean) {
  const port = debugServerFromUri(session.uri).port;
  const configuration: vscode.DebugConfiguration = {
    type: "scala",
    name: session.name,
    noDebug,
    request: "launch",
    debugServer: port,
    kind: testRunnerId,
  };
  return vscode.debug.startDebugging(undefined, configuration);
}

/**
 * Analyze test results when debug session ends.
 * Retrieves test suite results for current debus session gathered by DAP tracker and passes
 * them to the analyzer function. After analysis ends, results are cleaned.
 */
async function analyzeResults(run: vscode.TestRun, suites: TestSuiteRun[]) {
  return new Promise<void>((resolve) => {
    const disposable = vscode.debug.onDidTerminateDebugSession(
      (session: vscode.DebugSession) => {
        const testSuitesResult = testCache.getSuiteResultsFor(session.id) ?? [];

        // disposes current subscription and removes data from result map
        const teardown = () => {
          disposable.dispose();
          testCache.clearSuiteResultsFor(session.id);
        };

        // analyze current TestRun
        analyzeTestRun(run, suites, testSuitesResult, teardown);
        return resolve();
      }
    );
  });
}
