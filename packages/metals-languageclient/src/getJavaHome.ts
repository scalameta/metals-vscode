import { TaskEither, chain } from "fp-ts/lib/TaskEither";
import * as TE from "fp-ts/lib/TaskEither";
import * as E from "fp-ts/lib/Either";
import { pipe } from "fp-ts/lib/function";
import _locateJavaHome from "@viperproject/locate-java-home";
import * as semver from "semver";
import {
  ILocateJavaHomeOptions,
  IJavaHomeInfo,
} from "@viperproject/locate-java-home/js/es5/lib/interfaces";
import { toPromise } from "./util";
//import os from "os";
import fs from "fs";
import path from "path";

/**
 * Computes the user's Java Home path, using various strategies:
 *
 * - explicitly configured value
 * - JAVA_HOME environment variable
 * - realpath for `java` if it's presented in PATH enviroment variable
 * - the most recent compatible Java version found on the computer
 *   (with a preference for JDK over JRE)
 *
 * @param configuredJavaHome metals.javaHome value as read from the configuration
 */
export function getJavaHome(
  configuredJavaHome: string | undefined
): Promise<string> {
  return toPromise(
    pipe(fromConfig(configuredJavaHome), TE.orElse(fromEnv), TE.orElse(locate))
  );
}

function fromConfig(
  configuredJavaHome: string | undefined
): TaskEither<unknown, string> {
  if (
    typeof configuredJavaHome === "string" &&
    configuredJavaHome.trim() !== ""
  ) {
    return TE.right(configuredJavaHome);
  } else {
    return TE.left({});
  }
}

function fromEnv(): TaskEither<unknown, string> {
  const javaHome = process.env["JAVA_HOME"];
  return javaHome ? TE.right(javaHome) : TE.left({});
}

function locate(): TaskEither<Error, string> {
  return pipe(
    locateJavaHome({ version: ">=1.8 <=17" }),
    chain((javaHomes) => {
      if (!javaHomes || javaHomes.length === 0) {
        return TE.left(new Error("No suitable Java version found"));
      } else {
        const jdkHomes = javaHomes.filter((j) => j.isJDK);
        const fromBinPath = matchesBinFromPath(jdkHomes);
        const jdkHome = fromBinPath ? fromBinPath : latestJdk(jdkHomes);
        if (jdkHome) {
          return TE.right(jdkHome.path);
        } else {
          return TE.right(javaHomes[0].path);
        }
      }
    })
  );
}

function matchesBinFromPath(
  jdkHomes: IJavaHomeInfo[]
): IJavaHomeInfo | undefined {
  const value = process.env["PATH"];
  if (value && jdkHomes.length > 0) {
    const result = value
      .split(path.delimiter)
      .map((p) => path.join(p, "java"))
      .filter((p) => fs.existsSync(p));

    if (result.length > 0) {
      const realpath = fs.realpathSync(result[0]);
      const matched = jdkHomes.find((home) => {
        const javaBin = path.join(home.path, "bin", "java");
        return javaBin == realpath;
      });
      return matched;
    } else {
      return undefined;
    }
  } else {
    return undefined;
  }
}

function latestJdk(jdkHomes: IJavaHomeInfo[]): IJavaHomeInfo | undefined {
  if (jdkHomes.length > 0) {
    return jdkHomes.sort((a, b) => {
      const byVersion = -semver.compare(a.version, b.version);
      if (byVersion === 0) return b.security - a.security;
      else return byVersion;
    })[0];
  } else {
    return undefined;
  }
}

function locateJavaHome(
  opts: ILocateJavaHomeOptions
): TaskEither<Error, IJavaHomeInfo[] | undefined> {
  return () =>
    new Promise((resolve) =>
      _locateJavaHome(opts, (err, res) =>
        err != null ? resolve(E.left(err)) : resolve(E.right(res))
      )
    );
}
