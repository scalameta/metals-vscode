import { getJavaOptions } from "./getJavaOptions";
import * as path from "path";

export interface JavaConfig {
  javaOptions: string[];
  javaPath: string;
  coursier: string;
  coursierMirrorFilePath: string | undefined;
  extraEnv: {
    [k: string]: string | undefined;
  };
}

interface GetJavaConfigOptions {
  workspaceRoot: string | undefined;
  javaHome: string;
  coursier: string;
  coursierMirrorFilePath: string | undefined;
  customRepositories: string[] | undefined;
}

export function getJavaConfig({
  workspaceRoot,
  javaHome,
  coursier,
  coursierMirrorFilePath,
  customRepositories = [],
}: GetJavaConfigOptions): JavaConfig {
  const javaOptions = getJavaOptions(workspaceRoot);
  const javaPath = path.join(javaHome, "bin", "java");

  const coursierRepositories =
    customRepositories.length > 0
      ? { COURSIER_REPOSITORIES: customRepositories.join("|") }
      : {};
  const coursierMirrors = coursierMirrorFilePath
    ? { COURSIER_MIRRORS: coursierMirrorFilePath }
    : {};

  const extraEnv = {
    ...coursierRepositories,
    ...coursierMirrors,
  };

  return {
    javaOptions,
    javaPath,
    coursier,
    coursierMirrorFilePath,
    extraEnv,
  };
}
