import * as semver from "semver";
import { ChildProcessPromise, spawn } from "promisify-child-process";
import { JavaConfig } from "./getJavaConfig";

interface FetchMetalsOptions {
  serverVersion: string;
  serverProperties: string[];
  javaConfig: JavaConfig;
}

export function fetchMetals({
  serverVersion,
  serverProperties,
  javaConfig: { javaPath, javaOptions, extraEnv, coursierPath },
}: FetchMetalsOptions): ChildProcessPromise {
  const fetchProperties = serverProperties.filter(
    (p) => !p.startsWith("-agentlib")
  );

  const serverDependency = calcServerDependency(serverVersion);
  return spawn(
    javaPath,
    [
      ...javaOptions,
      ...fetchProperties,
      "-Dfile.encoding=UTF-8",
      "-jar",
      coursierPath,
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
    ],
    {
      env: {
        COURSIER_NO_TERM: "true",
        ...extraEnv,
        ...process.env,
      },
      stdio: ["ignore"], // Due to Issue: #219
    }
  );
}

export function calcServerDependency(serverVersion: string): string {
  const binaryVersion = semver.gt(serverVersion, "0.11.2") ? "2.13" : "2.12";
  return serverVersion.includes(":")
    ? serverVersion
    : `org.scalameta:metals_${binaryVersion}:${serverVersion}`;
}
