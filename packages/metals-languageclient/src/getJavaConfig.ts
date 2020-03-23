import { getJavaOptions } from "./getJavaOptions";
import * as path from "path";

export interface JavaConfig {
  javaOptions: string[];
  javaPath: string;
  coursierPath: string;
  extraEnv: {
    [k: string]: string | undefined;
  };
}

interface GetJavaConfigOptions {
  workspaceRoot: string | undefined;
  javaHome: string;
  extensionPath: string;
  customRepositories: string[] | undefined;
}

export function getJavaConfig({
  workspaceRoot,
  javaHome,
  extensionPath,
  customRepositories = [],
}: GetJavaConfigOptions): JavaConfig {
  const javaOptions = getJavaOptions(workspaceRoot);
  const javaPath = path.join(javaHome, "bin", "java");
  const coursierPath = path.join(extensionPath, "./coursier");
  const extraEnv = {
    COURSIER_REPOSITORIES: customRepositories.join("|"),
  };

  return {
    javaOptions,
    javaPath,
    coursierPath,
    extraEnv,
  };
}
