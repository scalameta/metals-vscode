import * as semver from "semver";
import { ChildProcessPromise, spawn } from "promisify-child-process";
import { JavaConfig } from "./getJavaConfig";
import { OutputChannel } from "./interfaces/OutputChannel";
import { convertToCoursierProperties } from "./getJavaOptions";

interface FetchMetalsOptions {
  serverVersion: string;
  serverProperties: string[];
  javaConfig: JavaConfig;
  outputChannel: OutputChannel;
}

/**
 * Without the additional object, the promises will be flattened and
 * we will not be able to stream the output.
 */
interface PackedChildPromise {
  promise: ChildProcessPromise;
}

export async function fetchMetals({
  serverVersion,
  serverProperties,
  javaConfig: { javaOptions, coursier, extraEnv, javaPath },
  outputChannel
}: FetchMetalsOptions): Promise<PackedChildPromise> {
  const serverDependency = calcServerDependency(serverVersion);

  const fetchProperties = serverProperties.filter(
    (p) => !p.startsWith("-agentlib")
  );
  if (fetchProperties.length != serverProperties.length) {
    outputChannel.appendLine(
      'Ignoring "-agentlib" option when fetching Metals with Coursier'
    );
  }

  const coursierArgs = [
    "fetch",
    "-p",
    "--ttl",
    // Use infinite ttl to avoid redundant "Checking..." logs when using SNAPSHOT
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
    "-p"
  ];

  const environment = {
    env: {
      ...process.env,
      ...extraEnv
    }
  };

  if (coursier.endsWith(".jar")) {
    const jarArgs = [
      ...javaOptions,
      ...fetchProperties,
      "-Dfile.encoding=UTF-8",
      "-jar",
      coursier
    ].concat(coursierArgs);
    return { promise: spawn(javaPath, jarArgs, environment) };
  } else {
    const javaArgs: Array<string> = convertToCoursierProperties(
      javaOptions.concat(["-Dfile.encoding=UTF-8"]).concat(fetchProperties),
      false
    );

    return {
      promise: spawn(coursier, javaArgs.concat(coursierArgs), environment)
    };
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
