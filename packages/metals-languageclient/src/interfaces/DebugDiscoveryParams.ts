export interface DebugDiscoveryParams {
  path: string;
  runType: RunType;
}

export enum RunType {
  Run = "run",
  RunOrTestFile = "runOrTestFile",
  TestFile = "testFile",
  TestTarget = "testTarget",
}
