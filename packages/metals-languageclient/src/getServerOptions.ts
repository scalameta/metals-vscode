import { ServerOptions } from "./interfaces/ServerOptions";
import { JavaConfig } from "./getJavaConfig";
import * as fs from "fs";
import * as path from "path";

interface GetServerOptions {
  metalsClasspath: string;
  serverProperties: string[] | undefined;
  clientName?: string;
  javaConfig: JavaConfig;
}

function parse(v: string): number | undefined {
  const numbers = v.split("-")[0].split(".").slice(0, 2);

  if (numbers.length >= 2 && numbers[0] == "1") return parseInt(numbers[1]);
  else if (numbers.length >= 1) return parseInt(numbers[0]);
  else return undefined;
}

function getJavaVersion(javaHome: string): number | undefined {
  const dirs = [
    path.join(javaHome, "release"),
    path.join(path.dirname(javaHome), "release"),
  ];

  const fromReleaseFile = dirs
    .filter((d) => fs.existsSync(d))
    .map((d) => {
      const fileContents = fs.readFileSync(d, {
        encoding: "utf-8",
      });
      const javaVersionString = fileContents
        .toString()
        .split(/\r?\n/)
        .find((s) => s.startsWith("JAVA_VERSION"));
      const regexp = /JAVA_VERSION="(.*)"/;
      const versionNumber = regexp.exec(javaVersionString!)![1];

      return parse(versionNumber);
    });

  if (fromReleaseFile.length > 0) {
    return fromReleaseFile[0];
  } else {
    return undefined;
  }
}

export function getServerOptions({
  metalsClasspath,
  serverProperties = [],
  clientName,
  javaConfig: { javaOptions, javaHome, javaPath, extraEnv },
}: GetServerOptions): ServerOptions {
  const baseProperties = ["-Xss4m", "-Xms100m"];

  if (clientName) {
    baseProperties.push(`-Dmetals.client=${clientName}`);
  }

  const mainArgs = ["-classpath", metalsClasspath, "scala.meta.metals.Main"];

  const javaVersion = getJavaVersion(javaHome);

  const addOpens =
    javaVersion !== undefined && javaVersion >= 17
      ? [
          "--add-opens=jdk.compiler/com.sun.tools.javac.code=ALL-UNNAMED",
          "--add-opens=jdk.compiler/com.sun.tools.javac.tree=ALL-UNNAMED",
          "--add-opens=jdk.compiler/com.sun.tools.javac.util=ALL-UNNAMED",
        ]
      : [];

  // let user properties override base properties
  const launchArgs = [
    ...baseProperties,
    ...addOpens,
    ...javaOptions,
    ...serverProperties,
    ...mainArgs,
  ];

  const env = () => ({ ...process.env, ...extraEnv });

  return {
    run: { command: javaPath, args: launchArgs, options: { env: env() } },
    debug: { command: javaPath, args: launchArgs, options: { env: env() } },
  };
}
