import path from "path";
import { spawn } from "promisify-child-process";
import { OutputChannel } from "./interfaces/OutputChannel";
import { findOnPath } from "./util";
import { realpathSync } from "fs";

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
  return fromEnvValue || (await fromPath(javaVersion, outputChannel));
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
      const msg = "\t" + out.toString().trim().split("\n").join("\n\t");
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

export async function fromPath(
  javaVersion: JavaVersion,
  outputChannel: OutputChannel
): Promise<string | undefined> {
  let javaExecutable = findOnPath(["java"]);
  if (javaExecutable) {
    let realJavaPath = realpathSync(javaExecutable);
    outputChannel.appendLine(
      `Searching for Java on PATH. Found java executable under ${javaExecutable} that resolves to ${realJavaPath}`
    );
    const possibleJavaHome = path.dirname(path.dirname(realJavaPath));
    const isValid = await validateJavaVersion(
      possibleJavaHome,
      javaVersion,
      outputChannel
    );
    if (isValid) return possibleJavaHome;
    else {
      outputChannel.appendLine(
        `Java version doesn't match the required one of ${javaVersion}`
      );
    }
  }
}

export async function fromEnv(
  javaVersion: JavaVersion,
  outputChannel: OutputChannel
): Promise<string | undefined> {
  const javaHome = process.env["JAVA_HOME"];
  if (javaHome) {
    outputChannel.appendLine(
      `Checking Java in JAVA_HOME, which points to ${javaHome}`
    );
    const isValid = await validateJavaVersion(
      javaHome,
      javaVersion,
      outputChannel
    );
    if (isValid) return javaHome;
    else {
      outputChannel.appendLine(
        `Java version doesn't match the required one of ${javaVersion}`
      );
    }
  }

  return undefined;
}
