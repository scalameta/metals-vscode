import * as vscode from "vscode";
import { ServerOptions } from "./interfaces/ServerOptions";
import { JavaConfig } from "./getJavaConfig";
import { Executable } from "vscode-languageclient/node";

export function getServerOptions(
  metalsClasspath: string,
  serverProperties: string[],
  clientName: string,
  javaConfig: JavaConfig,
  requiredVmOptions: string[] = [],
  activeClientExtensions: string[] = [],
): ServerOptions {
  const baseProperties = [
    "-Xss4m",
    "-Xms100m",
    // For openjdk/jol support
    "-Djol.magicFieldOffset=true",
    "-Djol.tryWithSudo=true",
    "-Djdk.attach.allowAttachSelf",
    // For LMDB support
    "--add-opens=java.base/java.nio=ALL-UNNAMED",
    "--add-opens=java.base/sun.nio.ch=ALL-UNNAMED",
    // For Java support
    "--add-exports=jdk.compiler/com.sun.tools.javac.model=ALL-UNNAMED",
    "--add-exports=jdk.compiler/com.sun.tools.javac.api=ALL-UNNAMED",
    "--add-exports=jdk.compiler/com.sun.tools.javac.tree=ALL-UNNAMED",
    "--add-exports=jdk.compiler/com.sun.tools.javac.util=ALL-UNNAMED",
    "--add-exports=jdk.compiler/com.sun.tools.javac.code=ALL-UNNAMED"
  ];

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

  const argsEscaped = launchArgs.map((arg) =>
    arg.includes(" ") ? `"${arg}"` : arg
  );
  const env = () => ({
    ...process.env,
    ...javaConfig.extraEnv,
    METALS_COMMAND: javaConfig.javaPath,
    METALS_ARGS: argsEscaped.join(" ")
  });

  const run: Executable = {
    command: javaConfig.javaPath,
    args: launchArgs,
    options: { env: env() }
  };

  const launchCommand = vscode.workspace
    .getConfiguration("metals")
    .get<Executable>("launchCommand");
  if (launchCommand) {
    if (!launchCommand.options) {
      launchCommand.options = {};
    }
    return {
      run: {
        ...launchCommand,
        options: {
          ...launchCommand.options,
          env: env()
        }
      },
      debug: run
    };
  }

  return {
    run,
    debug: run
  };
}
