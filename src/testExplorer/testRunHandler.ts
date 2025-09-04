import * as vscode from "vscode";
import { CancellationToken, TestController, TestRunRequest } from "vscode";
import { debugServerFromUri, DebugSession } from "../debugger/scalaDebugger";
import {
  ScalaTestSuitesDebugRequest,
  ScalaTestSuiteSelection,
} from "../debugger/types";
import { TargetUri } from "../types";
import { analyzeTestRun } from "./analyzeTestRun";
import {
  DapEvent,
  MetalsTestItem,
  RunnableMetalsTestItem,
  TestSuiteResult,
} from "./types";
import { gatherTestItems } from "./util";
import { ServerCommands } from "../interfaces/ServerCommands";

// this id is used to mark DAP sessions created by TestController
// thanks to that debug tracker knows which requests it should track and gather results
export const testRunnerId = "scala-dap-test-runner";

/**
 * Stores results from executed test suites.
 */
const suiteResults = new Map<string, TestSuiteResult[]>();

/**
 * Register tracker which tracks all DAP sessions which are started with @constant {testRunnerId} kind.
 * Dap sends execution result for every suite included in TestRun in a special event of kind 'testResult'.
 * Tracker has to capture these events and store them all in map under debug session id as a key.
 */
vscode.debug.registerDebugAdapterTrackerFactory("scala", {
  createDebugAdapterTracker(session) {
    if (session.configuration.kind === testRunnerId) {
      return {
        onWillStartSession: () => suiteResults.set(session.id, []),
        onDidSendMessage: (msg: DapEvent) => {
          if (
            msg.event === "testResult" &&
            msg.body.category === "testResult"
          ) {
            suiteResults.get(session.id)?.push(msg.body.data);
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
  token: CancellationToken,
  environmentVariables: () => Record<string, string>,
): Promise<void> {
  const run = testController.createTestRun(request);
  const includes = new Set((request.include as MetalsTestItem[]) ?? []);
  const excludes = new Set((request.exclude as MetalsTestItem[]) ?? []);
  const queue: RunnableMetalsTestItem[] = [];

  /**
   * Loop through all included tests in request and add them to our queue if they are not excluded explicitly.
   * The smallest runnable bit is a suite,
   * for bigger groups (package, module, workspaceFolder) we collect and run all the included suites.
   */
  function createRunQueue(tests: Iterable<MetalsTestItem>): void {
    for (const test of tests) {
      if (!excludes.has(test)) {
        const kind = test._metalsKind;
        if (
          kind === "workspaceFolder" ||
          kind === "module" ||
          kind === "package"
        ) {
          createRunQueue(gatherTestItems(test.children));
        } else if (kind === "suite") {
          run.started(test);
          queue.push(test);
          gatherTestItems(test.children).forEach((t) => run.started(t));
        } else if (kind === "testcase") {
          runParent(test);
          queue.push(test);
        }
      }
    }
  }

  function runParent(test: vscode.TestItem | undefined): void {
    if (test) {
      runParent(test.parent);
      run.started(test);
    }
  }

  createRunQueue(includes);

  const testSuiteSelection: ScalaTestSuiteSelection[] = queue.map((test) => {
    const kind = test._metalsKind;
    if (kind === "suite") {
      return {
        className: test.id,
        tests: [],
      };
    } else {
      return {
        className: test._metalsParent.id,
        tests: [test.id],
      };
    }
  });

  try {
    if (!token.isCancellationRequested && queue.length > 0) {
      const targetUri = queue[0]._metalsTargetUri;
      await runDebugSession(
        run,
        noDebug,
        targetUri,
        testSuiteSelection,
        queue,
        environmentVariables(),
      );
    }
  } finally {
    run.end();
    afterFinished();
  }
}

/**
 * @param noDebug determines if debug session will be started as a debug or normal run
 */
async function runDebugSession(
  run: vscode.TestRun,
  noDebug: boolean,
  targetUri: TargetUri,
  testSuiteSelection: ScalaTestSuiteSelection[],
  tests: RunnableMetalsTestItem[],
  environmentVariables: Record<string, string> = {},
): Promise<void> {
  const session = await createDebugSession(
    targetUri,
    testSuiteSelection,
    environmentVariables,
  );
  if (!session) {
    return;
  }
  const wasStarted = await startDebugging(session, noDebug);
  if (!wasStarted) {
    vscode.window.showErrorMessage("Debug session not started");
    return;
  }
  await analyzeResults(run, tests);
}

/**
 * Creates a debug session via Metals DebugAdapterStart command.
 * dataKind and data are determined by BSP debug request method.
 */
async function createDebugSession(
  targetUri: TargetUri,
  suites: ScalaTestSuiteSelection[],
  environmentVariables: Record<string, string> = {},
): Promise<DebugSession | undefined> {
  const debugSessionParams: ScalaTestSuitesDebugRequest = {
    target: { uri: targetUri },
    requestData: {
      suites,
      jvmOptions: [],
      environmentVariables: Object.entries(environmentVariables).map(
        ([key, value]) => `${key}=${value}`,
      ),
    },
  };
  return vscode.commands.executeCommand<DebugSession>(
    ServerCommands.DebugAdapterStart,
    debugSessionParams,
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
async function analyzeResults(
  run: vscode.TestRun,
  tests: RunnableMetalsTestItem[],
) {
  return new Promise<void>((resolve) => {
    const disposable = vscode.debug.onDidTerminateDebugSession(
      (session: vscode.DebugSession) => {
        const testSuitesResult = suiteResults.get(session.id) ?? [];

        // disposes current subscription and removes data from result map
        const teardown = () => {
          disposable.dispose();
          suiteResults.delete(session.id);
        };

        // analyze current TestRun
        analyzeTestRun(run, tests, testSuitesResult, teardown);
        run.end();
        return resolve();
      },
    );
  });
}
