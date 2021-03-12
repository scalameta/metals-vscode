export interface DebugDiscoveryParms {
  path: string;
  runType: RunType;
}

export enum RunType {
  Run = "run",
  TestFile = "testFile",
  TestTarget = "testTarget",
}
