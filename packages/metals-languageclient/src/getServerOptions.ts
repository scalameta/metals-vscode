import { ServerOptions } from "./interfaces/ServerOptions";
import { JavaConfig } from "./getJavaConfig";

interface GetServerOptions {
  metalsClasspath: string;
  serverProperties: string[] | undefined;
  clientName: string;
  doctorFormat: "html" | "json";
  javaConfig: JavaConfig;
}

export function getServerOptions({
  metalsClasspath,
  serverProperties = [],
  clientName,
  doctorFormat,
  javaConfig: { javaOptions, javaPath, extraEnv }
}: GetServerOptions): ServerOptions {
  const baseProperties = [
    `-Dmetals.client=${clientName}`,
    `-Dmetals.doctor-format=${doctorFormat}`,
    "-Xss4m",
    "-Xms100m"
  ];
  const mainArgs = ["-classpath", metalsClasspath, "scala.meta.metals.Main"];

  // let user properties override base properties
  const launchArgs = [
    ...baseProperties,
    ...javaOptions,
    ...serverProperties,
    ...mainArgs
  ];

  const env = { ...process.env, ...extraEnv };

  return {
    run: { command: javaPath, args: launchArgs, options: { env } },
    debug: { command: javaPath, args: launchArgs, options: { env } }
  };
}
