import { TaskEither, chain } from "fp-ts/lib/TaskEither";
import * as TE from "fp-ts/lib/TaskEither";
import * as E from "fp-ts/lib/Either";
import { pipe } from "fp-ts/lib/pipeable";
import _locateJavaHome from "locate-java-home";
import * as semver from "semver";
import {
  ILocateJavaHomeOptions,
  IJavaHomeInfo,
} from "locate-java-home/js/es5/lib/interfaces";
import { toPromise } from "./util";

/**
 * Computes the user's Java Home path, using various strategies:
 *
 * - explicitly configured value
 * - JAVA_HOME environment variable
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
        javaHomes.sort((a, b) => {
          const byVersion = -semver.compare(a.version, b.version);
          if (byVersion === 0) return b.security - a.security;
          else return byVersion;
        });
        const jdkHome = javaHomes.find((j) => j.isJDK);
        if (jdkHome) {
          return TE.right(jdkHome.path);
        } else {
          return TE.right(javaHomes[0].path);
        }
      }
    })
  );
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
