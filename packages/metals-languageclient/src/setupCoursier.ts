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
import { findOnPath } from "./util";

const coursierVersion = "v2.1.8";
// https://github.com/coursier/launchers contains only launchers with the most recent version
// to get `coursierVersion` (above) we reference a specific commit
const coursierCommit = "11b428f35ca84a598ca30cce1c35ae4f375e5ee3";

export async function setupCoursier(
  javaVersion: JavaVersion,
  coursierFetchPath: string,
  extensionPath: string,
  output: OutputChannel
): Promise<{ coursier: string; javaHome: string }> {
  const handleOutput = (out: Buffer) => {
    const msg = out.toString().trim();
    output.appendLine("Coursier: " + msg);
  };

  const resolveCoursier = async () => {
    const isWindows = process.platform === "win32";
    const defaultCoursier = isWindows
      ? path.resolve(coursierFetchPath, "cs.exe")
      : path.resolve(coursierFetchPath, "cs");
    const possibleCoursier: string | undefined = await validateCoursier(
      defaultCoursier
    );

    if (possibleCoursier) return possibleCoursier;

    output.appendLine(`Fetching coursier`);

    return fetchCoursier(coursierFetchPath, handleOutput)
      .then(() => defaultCoursier)
      .catch((_) => {
        output.appendLine(
          "Failed to fetch coursier. You may want to try installing coursier manually and adding it to PATH."
        );
        output.appendLine(
          "Will try to use jar based coursier if Java is available on the machine."
        );
        return undefined;
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

  var coursier = await resolveCoursier();
  output.appendLine(`Using coursier located at ${coursier}`);

  var javaHome = await getJavaHome(javaVersion, output);

  if (!javaHome && coursier) {
    output.appendLine(
      `No installed java with version ${javaVersion} found. Will fetch one using coursier.`
    );
    javaHome = await resolveJavaHomeWithCoursier(coursier);
  }

  output.appendLine(`Using Java Home: ${javaHome}`);

  /* If we couldn't download coursier, but we have Java
   * we can still fall back to jar based launcher.
   */
  if (!coursier && javaHome) {
    coursier = path.join(extensionPath, "./coursier-fallback.jar");
  }

  if (javaHome && coursier) return { coursier, javaHome };
  else
    throw Error(
      `Cannot resolve Java home or coursier, JAVA_HOME should exist with a version of at least ${javaVersion}.` +
        `Alternatively, you can reduce the requirement using "metals.javaVersion" setting.`
    );
}

export async function validateCoursier(
  defaultCoursier?: string | undefined
): Promise<string | undefined> {
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

  const possibleCoursier = findOnPath(["cs", "coursier"]);
  return (
    (possibleCoursier && (await validate(possibleCoursier))) ||
    (await validateDefault())
  );
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
