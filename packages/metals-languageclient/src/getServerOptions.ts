import { ServerOptions } from "./interfaces/ServerOptions";
import { JavaConfig } from "./getJavaConfig";

interface GetServerOptions {
  metalsClasspath: string;
  serverProperties: string[] | undefined;
  clientName?: string;
  javaConfig: JavaConfig;
}

export function getServerOptions({
  metalsClasspath,
  serverProperties = [],
  clientName,
  javaConfig: { javaOptions, javaPath, extraEnv },
}: GetServerOptions): ServerOptions {
  const baseProperties = ["-Xss4m", "-Xms100m"];

  if (clientName) {
    baseProperties.push(`-Dmetals.client=${clientName}`);
  }

  const mainArgs = ["-classpath", metalsClasspath, "scala.meta.metals.Main"];

  // let user properties override base properties
  const launchArgs = [
    ...baseProperties,
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
