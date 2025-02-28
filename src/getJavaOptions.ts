import * as fs from "fs";
import * as path from "path";
import { parse } from "shell-quote";

/**
 * Compute all the relevant Java options by combining:
 * - the `.jvmopts` file in the workspace root
 * - the `JAVA_OPTS` environment variable
 * - the `JAVA_FLAGS` environment variable
 *
 * @param workspaceRoot the workspace root path, if any
 */
export function getJavaOptions(workspaceRoot: string | undefined): string[] {
  const allOptions = [...fromEnv(), ...fromJvmoptsFile(workspaceRoot)];
  return allOptions.filter(isValidOption).map(sanitizeOption);
}

function sanitizeOption(option: string): string {
  return option.trim();
}

export function convertToCoursierProperties(
  serverProperties: string[],
  isCoursierJar: boolean
): string[] {
  // setting properties on windows native launcher doesn't work
  if (!isCoursierJar && process.platform == "win32") {
    return [];
  } else {
    return serverProperties
      .filter((prop) => isValidOption(prop))
      .map((prop) => {
        if (isCoursierJar) {
          return prop;
        } else {
          return "-J" + prop;
        }
      });
  }
}

function isValidOption(option: string): boolean {
  return (
    option.startsWith("-") &&
    // We care most about enabling options like HTTP proxy settings.
    // We don't include memory options because Metals does not have the same
    // memory requirements as for example the sbt build.
    !option.startsWith("-Xms") &&
    !option.startsWith("-Xmx") &&
    !option.startsWith("-Xss") &&
    !option.startsWith("-XX:") &&
    // Do not alter stdout that we capture when using Coursier
    option !== "-XX:+PrintCommandLineFlags"
  );
}

function fromJvmoptsFile(workspaceRoot: string | undefined): string[] {
  if (workspaceRoot) {
    const jvmoptsPath = path.join(workspaceRoot, ".jvmopts");
    if (fs.existsSync(jvmoptsPath)) {
      console.debug("Using JVM options set in " + jvmoptsPath);
      const raw = fs.readFileSync(jvmoptsPath, "utf8");
      return raw.match(/[^\r\n]+/g) || [];
    }
  }
  return [];
}

function fromEnv(): string[] {
  function parseEnvVariable(variable: string | undefined): string[] {
    if (variable) {
      console.debug("Using JAVA options set in JAVA_OPTS");
      return parse(variable).filter((entry): entry is string => {
        if (typeof entry === "string") {
          return true;
        } else {
          console.debug(`Ignoring unexpected JAVA_OPTS token: ${entry}`);
          return false;
        }
      });
    } else {
      return [];
    }
  }
  const javaOpts = parseEnvVariable(process.env.JAVA_OPTS);
  const javaFlags = parseEnvVariable(process.env.JAVA_FLAGS);
  return javaOpts.concat(javaFlags);
}
