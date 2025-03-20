import { ServerOptions } from "./interfaces/ServerOptions";
import { JavaConfig } from "./getJavaConfig";

export function getServerOptions(
  metalsClasspath: string,
  serverProperties: string[],
  clientName: string,
  javaConfig: JavaConfig
): ServerOptions {
  const baseProperties = ["-Xss4m", "-Xms100m"];

  if (clientName) {
    baseProperties.push(`-Dmetals.client=${clientName}`);
  }

  /**
   * GraalVM for JDK 17-20 prints additional warnings that breaks things.
   * Looks like JDK on Window is also affected.
   */
  const skipZGC =
    (+javaConfig.javaHome.version < 21 &&
      (javaConfig.javaHome.description.indexOf("GraalVM") > -1 ||
        process.platform == "win32")) ||
    process.platform == "openbsd";

  let filteredServerProperties = serverProperties;
  if (skipZGC) {
    filteredServerProperties = serverProperties.filter(function (prop) {
      return prop.indexOf("UseZGC") === -1;
    });
  }
  const mainArgs = ["-classpath", metalsClasspath, "scala.meta.metals.Main"];

  // let user properties override base properties
  const launchArgs = [
    ...baseProperties,
    ...javaConfig.javaOptions,
    ...filteredServerProperties,
    ...mainArgs
  ];

  const env = () => ({ ...process.env, ...javaConfig.extraEnv });

  return {
    run: {
      command: javaConfig.javaPath,
      args: launchArgs,
      options: { env: env() }
    },
    debug: {
      command: javaConfig.javaPath,
      args: launchArgs,
      options: { env: env() }
    }
  };
}
