import * as semver from "semver";
import path from "path";
import fs from "fs";
import {
  ChildProcessPromise,
  spawn,
  PromisifySpawnOptions,
  Output,
} from "promisify-child-process";
import { JavaConfig } from "./getJavaConfig";
import { OutputChannel } from "./interfaces/OutputChannel";

const coursierVersion = "v2.1.8";
const coursierCommit = "11b428f35ca84a598ca30cce1c35ae4f375e5ee3";

interface FetchMetalsOptions {
  serverVersion: string;
  javaConfig: JavaConfig;
}

export type JavaVersion = "8" | "11" | "17" | "21";

/**
 * Without the additional object, the promises will be flattened and
 * we will not be able to stream the output.
 */
interface PackedChildPromise {
  promise: ChildProcessPromise;
}

export async function setupCoursier(
  javaVersion: JavaVersion,
  coursierFetchPath: string,
  output: OutputChannel
): Promise<{ coursier: string; javaHome: string }> {
  const handleOutput = (out: Buffer) => {
    const msg = out.toString().trim();
    output.appendLine("Coursier: " + msg);
  };

  const resolveCoursier = async () => {
    const envPath = process.env["PATH"];
    const defaultCoursier = path.resolve(coursierFetchPath, "cs");
    const possibleCoursier: string | undefined = await validateCoursier(
      envPath,
      defaultCoursier
    );

    if (possibleCoursier) return possibleCoursier;

    output.appendLine(`Fetching coursier`);

    return fetchCoursier(coursierFetchPath, handleOutput)
      .then(() => defaultCoursier)
      .catch((err) => {
        output.appendLine(
          "Failed to fetch coursier. You may want to try installing coursier manually and adding it to PATH."
        );
        throw err;
      });
  };

  const resolveJavaHome = async (coursier: string) => {
    await run(
      coursier,
      ["java", "--jvm", javaVersion, "--setup"],
      handleOutput
    );

    const getJavaPath = await spawn(
      coursier,
      ["java-home", "--jvm", javaVersion],
      { encoding: "utf8" }
    );

    return (getJavaPath.stdout as string).trim();
  };

  const coursier = await resolveCoursier();
  output.appendLine(`Using coursier located at ${coursier}`);

  const javaHome = await resolveJavaHome(coursier);
  output.appendLine(`Using Java Home: ${javaHome}`);

  return { coursier, javaHome };
}

export async function fetchMetals({
  serverVersion,
  javaConfig: { coursier },
}: FetchMetalsOptions): Promise<PackedChildPromise> {
  const serverDependency = calcServerDependency(serverVersion);

  const coursierArgs = [
    "fetch",
    "-p",
    "--ttl",
    // Use infinite ttl to avoid redunant "Checking..." logs when using SNAPSHOT
    // versions. Metals SNAPSHOT releases are effectively immutable since we
    // never publish the same version twice.
    "Inf",
    serverDependency,
    "-r",
    "bintray:scalacenter/releases",
    "-r",
    "sonatype:public",
    "-r",
    "sonatype:snapshots",
    "-p",
  ];

  return { promise: spawn(coursier, coursierArgs) };
}

export async function validateCoursier(
  pathEnv?: string | undefined,
  defaultCoursier?: string | undefined
): Promise<string | undefined> {
  const isWindows = process.platform === "win32";
  const validate = async (coursier: string) => {
    try {
      const coursierVersion = await spawn(coursier, ["version"]);
      return coursierVersion.code == 0 ? coursier : undefined;
    } catch (e) {
      return undefined;
    }
  };

  const validateDefault = async () => {
    if (defaultCoursier && fs.statSync(defaultCoursier).isFile()) {
      return validate(defaultCoursier);
    } else {
      return undefined;
    }
  };

  if (pathEnv) {
    const possibleCoursier = pathEnv
      .split(path.delimiter)
      .flatMap((p) => {
        try {
          if (fs.statSync(p).isDirectory()) {
            return fs.readdirSync(p).map((sub) => path.resolve(p, sub));
          } else return [p];
        } catch (e) {
          return [];
        }
      })
      .find(
        (p) =>
          (!isWindows && p.endsWith(path.sep + "cs")) ||
          (!isWindows && p.endsWith(path.sep + "coursier")) ||
          (isWindows && p.endsWith(path.sep + "cs.bat")) ||
          (isWindows && p.endsWith(path.sep + "cs.exe"))
      );

    return (
      (possibleCoursier && (await validate(possibleCoursier))) ||
      (await validateDefault())
    );
  }

  return validateDefault();
}

export function calcServerDependency(serverVersion: string): string {
  if (serverVersion.includes(":")) {
    return serverVersion;
  } else {
    const use213 =
      semver.gt(serverVersion, "0.11.2") ||
      (serverVersion.startsWith("0.11.2") &&
        serverVersion.endsWith("SNAPSHOT"));
    const binaryVersion = use213 ? "2.13" : "2.12";
    return `org.scalameta:metals_${binaryVersion}:${serverVersion}`;
  }
}

export async function fetchCoursier(
  coursierFetchPath: string,
  handleOutput: (out: Buffer) => void
) {
  async function runChainedCommands(
    command: string[],
    initValue?: Promise<Output> | undefined
  ) {
    const out = command.reduce((acc, curr) => {
      const res = () => {
        const commandArr = curr.split(" ");
        return run(commandArr[0], commandArr.slice(1), handleOutput, {
          cwd: coursierFetchPath,
        });
      };
      return acc ? acc.then(() => res()) : res();
    }, initValue);
    return (await out)?.code;
  }

  if (process.platform == "win32") {
    // Windows
    return runChainedCommands([
      `curl -fLo cs-x86_64-pc-win32.zi https://github.com/coursier/launchers/raw/${coursierCommit}/cs-x86_64-pc-win32.zip`,
      "tar -xf cs-x86_64-pc-win32.zip",
      "move -xf cs-x86_64-pc-win32.exe cs.exe",
    ]);
  } else {
    const gzPath =
      process.platform == "darwin"
        ? // MacOS
          process.arch == "arm64"
          ? `https://github.com/VirtusLab/coursier-m1/releases/tag/${coursierVersion}/download/cs-aarch64-apple-darwin.gz`
          : `https://github.com/coursier/launchers/raw/${coursierCommit}/cs-x86_64-apple-darwin.gz`
        : // Linux
        process.arch == "arm64"
        ? `https://github.com/VirtusLab/coursier-m1/releases/tag/${coursierVersion}/download/cs-aarch64-pc-linux.gz`
        : `https://github.com/coursier/launchers/raw/${coursierCommit}/cs-x86_64-pc-linux.gz`;
    const command = `curl -fL ${gzPath} | gzip -d > cs && chmod +x cs`;
    const result = await run(command, undefined, handleOutput, {
      shell: true,
      cwd: coursierFetchPath,
    });
    return result.code;
  }
}

function run(
  command: string,
  args?: string[],
  handleOutput?: (out: Buffer) => void | undefined,
  options?: PromisifySpawnOptions | undefined
): ChildProcessPromise {
  const result = args ? spawn(command, args, options) : spawn(command, options);
  if (handleOutput) {
    result.stdout?.on("data", handleOutput);
    result.stderr?.on("data", handleOutput);
  }
  return result;
}
