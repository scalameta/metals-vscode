import * as vscode from "vscode";
import { Location } from "vscode-languageclient/node";
import { newtype } from "../util";

export type TargetName = newtype<string, "targetName">;
export type TargetUri = newtype<string, "targetUri">;
export type ClassName = newtype<string, "className">;
export type FullyQualifiedName = newtype<string, "fullyQualifiedName">;
export type TestName = newtype<string, "testName">;
export type SuiteName = newtype<string, "suiteName">;

/**
 * Additional information about tests which is stored in map and retrieved when test is scheduled to run.
 */
export interface TestItemMetadata {
  kind: "project" | "package" | "suite";
  targetName: TargetName;
  targetUri: TargetUri;
}

/**
 * Information about test classes which is returned by Metals Language Server
 */
export interface SuiteDiscovery {
  targetName: TargetName;
  targetUri: TargetUri;
  discovered: TestDiscoveryResult[];
}

export type TestDiscoveryResult = SuiteDiscovery | PackageDiscovery;

export interface SuiteDiscovery {
  kind: "suite";
  className: ClassName;
  fullyQualifiedName: FullyQualifiedName;
  location: Location;
}

export interface PackageDiscovery {
  kind: "package";
  prefix: string;
  children: TestDiscoveryResult[];
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
