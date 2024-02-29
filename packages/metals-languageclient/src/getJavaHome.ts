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
import fs from "fs";
import path from "path";
import { spawn } from "promisify-child-process";
import { OutputChannel } from "./interfaces/OutputChannel";

export type JavaVersion = "11" | "17" | "21";

/**
 * Computes the user's Java Home path, using various strategies:
 *
 * - JAVA_HOME environment variable
 * - realpath for `java` if it's presented in PATH enviroment variable
 * - the most recent compatible Java version found on the computer
 *   (with a preference for JDK over JRE)
 *
 * @param javaVersion metals.javaVersion value as read from the configuration or default
 */
export async function getJavaHome(
  javaVersion: JavaVersion,
  outputChannel: OutputChannel
): Promise<string | undefined> {
  const fromEnvValue = await fromEnv(javaVersion, outputChannel);
  return fromEnvValue ? fromEnvValue : await locate(javaVersion);
}

const versionRegex = /\"\d\d/;
async function validateJavaVersion(
  javaHome: string,
  javaVersion: JavaVersion,
  outputChannel: OutputChannel
): Promise<boolean> {
  const javaBin = path.join(javaHome, "bin", "java");
  try {
    const javaVersionOut = spawn(javaBin, ["-version"], {
      encoding: "utf8",
    });

    javaVersionOut.stderr?.on("data", (out: Buffer) => {
      outputChannel.appendLine(`${javaBin} -version:`);
      const msg = out.toString().trim();
      outputChannel.appendLine(msg);
    });

    const javaInfoStr = (await javaVersionOut).stderr as string;
    const matches = javaInfoStr.match(versionRegex);
    if (matches) {
      return +matches[0].slice(1, 3) >= +javaVersion;
    }
  } catch (error) {
    outputChannel.appendLine(`failed while running ${javaBin} -version`);
    outputChannel.appendLine(`${error}`);
  }
  return false;
}

export async function fromEnv(
  javaVersion: JavaVersion,
  outputChannel: OutputChannel
): Promise<string | undefined> {
  const javaHome = process.env["JAVA_HOME"];
  if (javaHome) {
    const isValid = await validateJavaVersion(
      javaHome,
      javaVersion,
      outputChannel
    );
    if (isValid) return javaHome;
  }

  return undefined;
}

function locate(javaVersion: JavaVersion): Promise<undefined | string> {
  return toPromise(
    pipe(
      locateJavaHome({ version: `>=${javaVersion}` }),
      chain((javaHomes) => {
        if (!javaHomes || javaHomes.length === 0) {
          return TE.right(undefined);
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
    )
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
