import { ServerOptions } from "./interfaces/ServerOptions";
import { JavaConfig } from "./getJavaConfig";

export function getServerOptions(
  metalsClasspath: string,
  serverProperties: string[],
  clientName: string,
  javaConfig: JavaConfig,
  requiredVmOptions: string[] = [],
  activeClientExtensions: string[] = [],
): ServerOptions {
  const baseProperties = ["-Xss4m", "-Xms100m"];

  if (clientName) {
    baseProperties.push(`-Dmetals.client=${clientName}`);
    if (activeClientExtensions.length > 0) {
      baseProperties.push(
        `-Dmetals.client-extensions=${activeClientExtensions.join(",")}`,
      );
    }
  }

  const mainArgs = ["-classpath", metalsClasspath, "scala.meta.metals.Main"];

  // Required VM options from Metals JAR are added first,
  // then base properties, java options, and user server properties can override them
  const launchArgs = [
    ...requiredVmOptions,
    ...baseProperties,
    ...javaConfig.javaOptions,
    ...serverProperties,
    ...mainArgs,
  ];

  const env = () => ({ ...process.env, ...javaConfig.extraEnv });

  return {
    run: {
      command: javaConfig.javaPath,
      args: launchArgs,
      options: { env: env() },
    },
    debug: {
      command: javaConfig.javaPath,
      args: launchArgs,
      options: { env: env() },
    },
  };
}
