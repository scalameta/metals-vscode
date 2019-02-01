import * as fs from "fs";
import * as path from "path";
import { workspace, OutputChannel } from "vscode";

function jvmOpts(outputChannel: OutputChannel): string | undefined {
  const jvmoptsPath = path.join(workspace.rootPath, ".jvmopts");
  if (fs.existsSync(jvmoptsPath)) {
    outputChannel.appendLine("Using JVM options set in " + jvmoptsPath);
    return fs.readFileSync(jvmoptsPath, "utf8");
  }
}

function javaOpts(outputChannel: OutputChannel): string | undefined {
  const javaOpts = process.env.JAVA_OPTS;
  if (javaOpts) {
    outputChannel.appendLine("Using JAVA options set in JAVA_OPTS");
    return javaOpts;
  }
}

export function getJavaOptions(outputChannel: OutputChannel): string[] {
  const combinedOptions = (javaOpts(outputChannel) || "").concat(
    jvmOpts(outputChannel) || ""
  );
  const options = combinedOptions.match(/[^\r\n]+/g).reduce(
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
