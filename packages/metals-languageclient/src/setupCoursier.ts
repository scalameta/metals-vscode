import {
  ChildProcessPromise,
  Output,
  PromisifySpawnOptions,
  spawn,
} from "promisify-child-process";
import { JavaVersion, getJavaHome } from "./getJavaHome";
import { OutputChannel } from "./interfaces/OutputChannel";
import path from "path";
import fs from "fs";

const coursierVersion = "v2.1.8";
// https://github.com/coursier/launchers contains only launchers with the most recent version
// to get `coursierVersion` (above) we reference a specific commit
const coursierCommit = "11b428f35ca84a598ca30cce1c35ae4f375e5ee3";

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
    const isWindows = process.platform === "win32";
    const defaultCoursier = isWindows
      ? path.resolve(coursierFetchPath, "cs.exe")
      : path.resolve(coursierFetchPath, "cs");
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

  const resolveJavaHomeWithCoursier = async (coursier: string) => {
    await run(
      coursier,
      ["java", "--jvm", `temurin:${javaVersion}`, "-version"],
      handleOutput
    );

    const getJavaPath = spawn(coursier, ["java-home", "--jvm", javaVersion], {
      encoding: "utf8",
    });

    getJavaPath.stderr?.on("data", (out: Buffer) => {
      const msg = out.toString().trim();
      output.appendLine("Error: " + msg);
    });

    return ((await getJavaPath).stdout as string).trim();
  };

  const coursier = await resolveCoursier();
  output.appendLine(`Using coursier located at ${coursier}`);

  var javaHome = await getJavaHome(javaVersion, output);

  if (!javaHome) {
    output.appendLine(
      `No installed java with version ${javaVersion} found. Will fetch one using coursier.`
    );
    javaHome = await resolveJavaHomeWithCoursier(coursier);
  }

  output.appendLine(`Using Java Home: ${javaHome}`);

  return { coursier, javaHome };
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
    if (
      defaultCoursier &&
      fs.existsSync(defaultCoursier) &&
      fs.statSync(defaultCoursier).isFile()
    ) {
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
          shell: true,
        });
      };
      return acc ? acc.then(() => res()) : res();
    }, initValue);
    return (await out)?.code;
  }

  if (process.platform == "win32") {
    // Windows
    return runChainedCommands([
      `curl -fLo cs-x86_64-pc-win32.zip https://github.com/coursier/launchers/raw/${coursierCommit}/cs-x86_64-pc-win32.zip`,
      "tar -xf cs-x86_64-pc-win32.zip",
      "move cs-x86_64-pc-win32.exe cs.exe",
    ]);
  } else {
    const gzPath =
      process.platform == "darwin"
        ? // MacOS
          process.arch == "arm64"
          ? `https://github.com/VirtusLab/coursier-m1/releases/download/${coursierVersion}/cs-aarch64-apple-darwin.gz`
          : `https://github.com/coursier/launchers/raw/${coursierCommit}/cs-x86_64-apple-darwin.gz`
        : // Linux
        process.arch == "arm64"
        ? `https://github.com/VirtusLab/coursier-m1/releases/download/${coursierVersion}/cs-aarch64-pc-linux.gz`
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
