export interface DebugDiscoveryParams {
  path: string | undefined;
  mainClass: string | undefined;
  buildTarget: string | undefined;
  runType: RunType;
  args: string[] | undefined;
  jvmOptions: string[] | undefined;
  env: Map<string, string> | undefined;
  envFile: string | undefined;
}

export enum RunType {
  Run = "run",
  RunOrTestFile = "runOrTestFile",
  TestFile = "testFile",
  TestTarget = "testTarget",
}
