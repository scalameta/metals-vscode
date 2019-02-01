import * as fs from "fs";
import * as path from "path";
import { workspace, OutputChannel } from "vscode";
import { parse } from "shell-quote";

function jvmOpts(outputChannel: OutputChannel): string[] {
  const jvmoptsPath = path.join(workspace.rootPath, ".jvmopts");
  if (fs.existsSync(jvmoptsPath)) {
    outputChannel.appendLine("Using JVM options set in " + jvmoptsPath);
    const raw = fs.readFileSync(jvmoptsPath, "utf8");
    return raw.match(/[^\r\n]+/g);
  }
  return [];
}

function javaOpts(outputChannel: OutputChannel): string[] {
  const javaOpts = process.env.JAVA_OPTS;
  if (javaOpts) {
    outputChannel.appendLine("Using JAVA options set in JAVA_OPTS");
    return parse(javaOpts);
  }
  return [];
}

export function getJavaOptions(outputChannel: OutputChannel): string[] {
  const combinedOptions = [
    ...javaOpts(outputChannel),
    ...jvmOpts(outputChannel)
  ];
  const options = combinedOptions.reduce(
    (options, line) => {
      if (
        line.startsWith("-") &&
        // We care most about enabling options like HTTP proxy settings.
        // We don't include memory options because Metals does not have the same
        // memory requirements as for example the sbt build.
        !line.startsWith("-Xms") &&
        !line.startsWith("-Xmx") &&
        !line.startsWith("-Xss")
      ) {
        return [...options, line];
      }
      return options;
    },
    [] as string[]
  );
  return options;
}
