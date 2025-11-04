import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";
import { ScalaCodeLensesParams, ScalaRunMain } from "./types";
import { currentWorkspaceFolder } from "../util";

/**
 * Checks if the response is a valid Scala main class
 */
function isScalaRunMain(
  runMain: ScalaCodeLensesParams,
): runMain is ScalaRunMain {
  return runMain.dataKind === "scala-main-class";
}

/**
 * Gets the short name from a fully qualified class name
 * e.g., "com.example.MyMainClass" -> "MyMainClass"
 */
function getShortClassName(fullyQualifiedName: string): string {
  const parts = fullyQualifiedName.split(".");
  return parts[parts.length - 1];
}

/**
 * Generates a launch configuration object from main class information
 */
function createLaunchConfig(
  mainClass: string,
  buildTarget: string,
): vscode.DebugConfiguration {
  const shortName = getShortClassName(mainClass);

  return {
    type: "scala",
    request: "launch",
    name: shortName,
    mainClass: mainClass,
    buildTarget: buildTarget,
    args: [],
    jvmOptions: [],
    env: {},
  };
}

/**
 * Ensures the .vscode directory exists in the workspace
 */
async function ensureVSCodeDirectory(
  workspaceFolder: vscode.WorkspaceFolder,
): Promise<string> {
  const vscodeDir = path.join(workspaceFolder.uri.fsPath, ".vscode");

  if (!fs.existsSync(vscodeDir)) {
    await fs.promises.mkdir(vscodeDir, { recursive: true });
  }

  return vscodeDir;
}

/**
 * Reads the existing launch.json file, or returns a default structure
 */
async function readLaunchConfig(launchJsonPath: string): Promise<any> {
  if (fs.existsSync(launchJsonPath)) {
    try {
      const content = await fs.promises.readFile(launchJsonPath, "utf-8");
      return JSON.parse(content);
    } catch (error) {
      // If parsing fails, return default structure
      console.error(
        "Could not parse existing launch.json. Creating new structure.",
        error,
      );
    }
  }

  // Default structure for launch.json
  return {
    version: "0.2.0",
    configurations: [],
  };
}

/**
 * Writes the launch configuration to launch.json
 */
async function writeLaunchConfig(
  launchJsonPath: string,
  launchConfig: any,
): Promise<void> {
  const content = JSON.stringify(launchConfig, null, 2);
  await fs.promises.writeFile(launchJsonPath, content, "utf-8");
}

/**
 * Discovers the main class at the current editor position and generates a launch configuration
 */
export async function generateLaunchConfigFromMainClass(
  params: ScalaCodeLensesParams,
): Promise<void> {
  try {
    const workspaceFolder = currentWorkspaceFolder();

    if (workspaceFolder && isScalaRunMain(params)) {
      const mainClass = params.data.class;
      const buildTarget = params.targets[0]?.uri || "";

      // Create the launch configuration
      const newConfig = createLaunchConfig(mainClass, buildTarget);

      // Ensure .vscode directory exists
      const vscodeDir = await ensureVSCodeDirectory(workspaceFolder);
      const launchJsonPath = path.join(vscodeDir, "launch.json");

      // Read existing launch.json or create new structure
      const launchConfig = await readLaunchConfig(launchJsonPath);

      // Check if a configuration with this name already exists
      const existingIndex = launchConfig.configurations.findIndex(
        (config: vscode.DebugConfiguration) => config.name === newConfig.name,
      );

      if (existingIndex < 0) {
        // Add the new configuration
        launchConfig.configurations.push(newConfig);
        // Write the updated launch.json
        await writeLaunchConfig(launchJsonPath, launchConfig);
      }
    }
  } catch (error) {
    console.error("Error generating launch config:", error);
  }
}
