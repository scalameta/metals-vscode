import * as path from "path";
import { ConsoleReporter, runTests } from "@vscode/test-electron";

async function main(): Promise<void> {
  try {
    // The folder containing the Extension Manifest package.json
    // Passed to `--extensionDevelopmentPath`
    const extensionDevelopmentPath: string = path.resolve(
      __dirname,
      "../../../"
    );

    // The path to the extension test script
    // Passed to --extensionTestsPath
    const extensionTestsPath: string = path.resolve(__dirname, "./suites");

    const reporter = new ConsoleReporter(true);

    // Download VS Code, unzip it and run the integration test
    await runTests({
      extensionDevelopmentPath,
      extensionTestsPath,
      reuseMachineInstall: true,
      launchArgs: ["--disable-extension"],
      reporter,
    });
  } catch (err) {
    process.exit(1);
  }
}

main();
