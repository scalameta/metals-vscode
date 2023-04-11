import * as semver from "semver";
import path from "path";
import fs from "fs";
import { ChildProcessPromise, spawn } from "promisify-child-process";
import { JavaConfig } from "./getJavaConfig";
import { OutputChannel } from "./interfaces/OutputChannel";

interface FetchMetalsOptions {
  serverVersion: string;
  serverProperties: string[];
  javaConfig: JavaConfig;
}

/**
 * Without the additional object, the promises will be flattened and
 * we will not be able to stream the output.
 */
interface PackedChildPromise {
  promise: ChildProcessPromise;
}

export async function fetchMetals(
  {
    serverVersion,
    serverProperties,
    javaConfig: { javaPath, javaOptions, extraEnv, coursierPath },
  }: FetchMetalsOptions,
  output: OutputChannel
): Promise<PackedChildPromise> {
  const fetchProperties = serverProperties.filter(
    (p) => !p.startsWith("-agentlib")
  );
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

  const path = process.env["PATH"];
  let possibleCoursier: string | undefined;
  if (path) {
    possibleCoursier = await validateCoursier(path);
  }

  function spawnDefault(): ChildProcessPromise {
    return spawn(
      javaPath,
      [
        ...javaOptions,
        ...fetchProperties,
        "-Dfile.encoding=UTF-8",
        "-jar",
        coursierPath,
      ].concat(coursierArgs),
      {
        env: {
          COURSIER_NO_TERM: "true",
          ...extraEnv,
          ...process.env,
        },
      }
    );
  }

  if (possibleCoursier) {
    const coursier: string = possibleCoursier;
    output.appendLine(`Using coursier located at ${coursier}`);
    return {
      promise: spawn(coursier, coursierArgs),
    };
  } else {
    return { promise: spawnDefault() };
  }
}

export async function validateCoursier(
  pathEnv: string
): Promise<string | undefined> {
  const isWindows = process.platform === "win32";
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
  if (possibleCoursier) {
    const coursierVersion = await spawn(possibleCoursier, ["version"]);
    if (coursierVersion.code !== 0) {
      return undefined;
    } else {
      return possibleCoursier;
    }
  }
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
