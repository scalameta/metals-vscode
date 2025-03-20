import { JavaHome } from "./getJavaHome";
import { getJavaOptions } from "./getJavaOptions";
import * as path from "path";

export interface JavaConfig {
  javaOptions: string[];
  javaPath: string;
  javaHome: JavaHome;
  coursier: string;
  coursierMirrorFilePath: string | undefined;
  extraEnv: {
    [k: string]: string | undefined;
  };
}

interface GetJavaConfigOptions {
  workspaceRoot: string | undefined;
  javaHome: JavaHome;
  coursier: string;
  coursierMirrorFilePath: string | undefined;
  customRepositories: string[] | undefined;
}

export function getJavaConfig({
  workspaceRoot,
  javaHome,
  coursier,
  coursierMirrorFilePath,
  customRepositories = []
}: GetJavaConfigOptions): JavaConfig {
  const javaOptions = getJavaOptions(workspaceRoot);
  const javaPath = path.join(javaHome.path, "bin", "java");

  const coursierRepositories =
    customRepositories.length > 0
      ? { COURSIER_REPOSITORIES: customRepositories.join("|") }
      : {};
  const coursierMirrors = coursierMirrorFilePath
    ? { COURSIER_MIRRORS: coursierMirrorFilePath }
    : {};

  const extraEnv = {
    ...coursierRepositories,
    ...coursierMirrors
  };

  return {
    javaOptions,
    javaPath,
    javaHome,
    coursier,
    coursierMirrorFilePath,
    extraEnv
  };
}
