import {
  ChildProcessPromise,
  Output,
  PromisifySpawnOptions,
  spawn
} from "promisify-child-process";
import {
  JavaHome,
  JavaVersion,
  getJavaHome,
  validateJavaVersion
} from "./getJavaHome";
import { OutputChannel } from "./interfaces/OutputChannel";
import path from "path";
import fs from "fs";
import { findOnPath } from "./findOnPath";
import { convertToCoursierProperties } from "./getJavaOptions";

const coursierVersion = "v2.1.8";
// https://github.com/coursier/launchers contains only launchers with the most recent version
// to get `coursierVersion` (above) we reference a specific commit
const coursierCommit = "11b428f35ca84a598ca30cce1c35ae4f375e5ee3";

export async function setupCoursier(
  javaVersion: JavaVersion,
  javaHomeOverride: string | undefined,
  coursierFetchPath: string,
  extensionPath: string,
  output: OutputChannel,
  forceCoursierJar: boolean,
  serverProperties: string[]
): Promise<{ coursier: string; javaHome: JavaHome }> {
  const handleOutput = (out: Buffer) => {
    const msg = "\t" + out.toString().trim().split("\n").join("\n\t");
    output.appendLine(msg);
  };

  const resolveCoursier = async () => {
    const isWindows = process.platform === "win32";
    const defaultCoursier = isWindows
      ? path.resolve(coursierFetchPath, "cs.exe")
      : path.resolve(coursierFetchPath, "cs");
    const possibleCoursier: string | undefined =
      await validateCoursier(defaultCoursier);

    if (possibleCoursier) {
      return possibleCoursier;
    }

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
    const nonJvmServerProperties = convertToCoursierProperties(
      serverProperties,
      coursier.endsWith(".jar")
    );
    try {
      // This seems to throw on Windows despite the fact that the path exists
      await run(
        coursier,
        [
          "java",
          ...nonJvmServerProperties,
          "--jvm",
          `temurin:${javaVersion}`,
          "-version"
        ],
        handleOutput
      );
    } catch (err) {
      output.appendLine(`Error checking downloading java version: ${err}`);
    }

    const getJavaPath = spawn(
      coursier,
      [
        "java-home",
        ...nonJvmServerProperties,
        "--jvm",
        `temurin:${javaVersion}`
      ],
      {
        encoding: "utf8"
      }
    );

    getJavaPath.stderr?.on("data", (out: Buffer) => {
      const msg = out.toString().trim();
      output.appendLine("Errorr: " + msg);
    });

    return ((await getJavaPath).stdout as string).trim();
  };

  let coursier: string | undefined;
  if (forceCoursierJar) {
    coursier = undefined;
  } else {
    coursier = await resolveCoursier();
  }
  output.appendLine(`Using coursier located at ${coursier}`);

  let javaHome: JavaHome | undefined;

  if (javaHomeOverride) {
    javaHome = await validateJavaVersion(javaHomeOverride, javaVersion, output);
  } else {
    javaHome = await getJavaHome(javaVersion, output);
  }

  if (!javaHome && coursier) {
    output.appendLine(
      `No installed java with version ${javaVersion} found. Will fetch one using coursier:`
    );
    const coursierJavaHome = await resolveJavaHomeWithCoursier(coursier);
    const validatedJavaHome = await validateJavaVersion(
      coursierJavaHome,
      javaVersion,
      output
    );
    if (validatedJavaHome) {
      javaHome = validatedJavaHome;
    }
  }

  output.appendLine(`Using Java Home: ${javaHome?.path}`);

  /* If we couldn't download coursier, but we have Java
   * we can still fall back to jar based launcher.
   */
  if (!coursier && javaHome) {
    coursier = path.join(extensionPath, "coursier-fallback.jar");
  }

  if (javaHome && coursier) {
    return { coursier, javaHome };
  } else {
    throw Error(
      `Cannot resolve Java home or coursier, JAVA_HOME should exist with a version of at least ${javaVersion}.` +
        `Alternatively, you can reduce the requirement using "metals.javaVersion" setting and override the path using "metals.metalsJavaHome" setting.`
    );
  }
}

export async function validateCoursier(
  defaultCoursier?: string | undefined
): Promise<string | undefined> {
  const validate = async (coursier: string) => {
    try {
      const coursierVersion = await spawn(coursier, ["version"]);
      return coursierVersion.code == 0 ? coursier : undefined;
    } catch (_e) {
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
          shell: true
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
      "move cs-x86_64-pc-win32.exe cs.exe"
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
      cwd: coursierFetchPath
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
