import { BuildTargetIdentifier, FullyQualifiedClassName } from "../types";

export interface OldScalaMainData {
  class: string;
  arguments: string[];
  jvmOptions: string[];
  environmentVariables: string[];
  shellCommand: undefined | string;
  classpath: undefined | string;
  javaBinary: undefined | string;
}

export interface ExtendedScalaMainData extends OldScalaMainData {
  shellCommand: string;
}

export type ScalaMainData = OldScalaMainData | ExtendedScalaMainData;

interface BaseScalaRunMain {
  data: ScalaMainData;
  dataKind: "scala-main-class";
  targets: BuildTargetIdentifier[];
}
export interface OldScalaRunMain extends BaseScalaRunMain {
  data: OldScalaMainData;
}
export interface ExtendedScalaRunMain extends BaseScalaRunMain {
  data: ExtendedScalaMainData;
}

export type ScalaRunMain = OldScalaRunMain | ExtendedScalaRunMain;
export interface ScalaTestSuitesDebugRequest {
  /** The build target that contains the test classes. */
  target: BuildTargetIdentifier;
  requestData: ScalaTestSuites;
}
export interface ScalaTestSuites {
  /** The fully qualified names of the test classes in this target and the tests in this test classes */
  suites: ScalaTestSuiteSelection[];
  /** The jvm options for the application. */
  jvmOptions: string[];
  /** The environment variables for the application. */
  environmentVariables: string[];
}

export interface ScalaTestSuiteSelection {
  /** The test class to run. */
  className: string;
  /** The selected tests to run. */
  tests: string[];
}

interface ScalaRunTestSuites {
  data: FullyQualifiedClassName[];
  dataKind: "scala-test-suite";
  targets: BuildTargetIdentifier[];
}

interface ScalaRunTestSuitesSelection {
  data: ScalaTestSuites[];
  dataKind: "scala-test-suites-selection";
  targets: BuildTargetIdentifier[];
}

type ScalaRunTests = ScalaRunTestSuites | ScalaRunTestSuitesSelection;

export type ScalaCodeLensesParams = ScalaRunMain | ScalaRunTests;
