import * as vscode from "vscode";
import { Location } from "vscode-languageclient/node";
import { newtype } from "../util";

export type TargetName = newtype<string, "targetName">;
export type TargetUri = newtype<string, "targetUri">;
export type ClassName = newtype<string, "className">;
export type FullyQualifiedClassName = newtype<
  string,
  "fullyQualifiedClassName"
>;
export type TestName = newtype<string, "testName">;
export type SuiteName = newtype<string, "suiteName">;

/**
 * Additional information about tests which is stored in map and retrieved when test is scheduled to run.
 */
export interface BuildTargetMetadata {
  kind: "project" | "package" | "suite" | "testcase";
  targetName: TargetName;
  targetUri: TargetUri;
}

/**
 * Information about test classes which is returned by Metals Language Server
 */
export interface BuildTargetUpdate {
  targetName: TargetName;
  targetUri: TargetUri;
  events: TestExplorerEvent[];
}
export type TestExplorerEvent = RemoveTestSuite | AddTestSuite | AddTestCases;

interface BaseTestExplorerEvent {
  fullyQualifiedClassName: FullyQualifiedClassName;
  className: ClassName;
}
export interface RemoveTestSuite extends BaseTestExplorerEvent {
  kind: "removeSuite";
}

export interface AddTestSuite extends BaseTestExplorerEvent {
  kind: "addSuite";
  symbol: string;
  location: Location;
  canResolveChildren: boolean;
}

export interface AddTestCases extends BaseTestExplorerEvent {
  kind: "addTestCases";
  testCases: TestCaseEntry[];
}

export interface TestCaseEntry {
  name: string;
  location: Location;
}

/**
 * Subset of https://microsoft.github.io/debug-adapter-protocol/specification#Events_Output
 * For our purposes we only care about testResult event which is used to pass information about test results from DAP server to the client.
 **/
export type DapEvent =
  | {
      event: "testResult";
      body: {
        category: "testResult";
        data: TestSuiteResult;
      };
    }
  | {
      event: "output" | "exited" | "terminated";
      body: {
        category: "console" | "stdout" | "stderr" | string;
        output: string;
      };
    };

/**
 * Test execution result which comes from DAP
 */
export interface TestSuiteResult {
  suiteName: SuiteName;
  duration: number;
  tests: SingleTestResult[];
}

export type SingleTestResult = Passed | Failed | Skipped;

interface Skipped {
  kind: "skipped";
  testName: TestName;
}

interface Passed {
  kind: "passed";
  testName: TestName;
  duration: number;
}

export interface Failed {
  kind: "failed";
  testName: TestName;
  duration: number;
  error: string;
}

/**
 * Describes actions from vscode.TestRun
 */
export interface TestRunActions {
  failed?(
    test: vscode.TestItem,
    message: vscode.TestMessage | readonly vscode.TestMessage[],
    duration?: number
  ): void;
  passed?(test: vscode.TestItem, duration?: number): void;
  skipped?(test: vscode.TestItem): void;
}
