import * as semver from "semver";
import { ChildProcessPromise, spawn } from "promisify-child-process";
import { JavaConfig } from "./getJavaConfig";

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

export async function fetchMetals({
  serverVersion,
  serverProperties,
  javaConfig: { javaOptions, coursier, extraEnv },
}: FetchMetalsOptions): Promise<PackedChildPromise> {
  const serverDependency = calcServerDependency(serverVersion);

  const fetchProperties = serverProperties.filter((p) => !p.startsWith("-agentlib"));
  const javaArgs = javaOptions.concat(fetchProperties).map((p) => `-J${p}`);

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
    "-p",
  ];

  const environment = {
    env: {
      ...process.env,
      ...extraEnv
    }
  };

  return { promise: spawn(coursier, javaArgs.concat(coursierArgs), environment) };
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
