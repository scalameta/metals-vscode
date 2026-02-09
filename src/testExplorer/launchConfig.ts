import * as vscode from "vscode";
import * as jsonc from "jsonc-parser";
import { MetalsTestItem } from "./types";
import { TargetUri } from "../types";
import { ScalaTestSuiteSelection } from "../debugger/types";

interface LaunchTestConfig extends vscode.DebugConfiguration {
  flags: string[];
  suites: ScalaTestSuiteSelection[];
  debug: boolean;
}

/**
 * Update configurations in launch.json while preserving comments.
 * Returns the URI of the launch.json file.
 */
async function updateLaunchConfigurations(
  workspaceFolder: vscode.WorkspaceFolder,
  newConfig: LaunchTestConfig
): Promise<vscode.Uri> {
  const launchJsonPath = vscode.Uri.joinPath(workspaceFolder.uri, ".vscode", "launch.json");

  let content: string;
  try {
    const fileContent = await vscode.workspace.fs.readFile(launchJsonPath);
    content = Buffer.from(fileContent).toString("utf-8");
  } catch {
    const launchJson = vscode.workspace.getConfiguration("launch", workspaceFolder.uri);
    await launchJson.update("configurations", [newConfig], vscode.ConfigurationTarget.WorkspaceFolder);
    return launchJsonPath;
  }

  const tree = jsonc.parse(content);
  const configurations = jsonc.findNodeAtLocation(tree, ["configurations"]);
  const insertionIndex = configurations?.length ?? 0;
  const edits = jsonc.modify(content, ["configurations", insertionIndex + 1], newConfig, {
    isArrayInsertion: true,
    formattingOptions: {
      tabSize: 2,
      insertSpaces: true,
      eol: "\n"
    }
  });
  const updatedContent = jsonc.applyEdits(content, edits);

  await vscode.workspace.fs.writeFile(launchJsonPath, Buffer.from(updatedContent, "utf-8"));
  return launchJsonPath;
}

function findBuildTarget(metalsItem: MetalsTestItem): TargetUri | null {
  switch (metalsItem._metalsKind) {
    case "suite":
      return metalsItem._metalsTargetUri;
    case "testcase":
      return metalsItem._metalsTargetUri;
    default:
      let target: TargetUri | null = null;
      metalsItem.children.forEach(child => {
        if (target) return target
        target = findBuildTarget(child as MetalsTestItem);
      });
      return target;
  }
}

function findSuites(metalsItem: MetalsTestItem): string[] {
  switch (metalsItem._metalsKind) {
    case "suite":
      return [metalsItem._metalsTargetUri];
    case "package":
      let suites: string[] = [];
      metalsItem.children.forEach(child => {
        suites.push(...findSuites(child as MetalsTestItem));
      });
      return suites;
    default:
      return [];
  }
}

export async function createLaunchConfig(testItem: vscode.TestItem) {
  if (!testItem) {
    return;
  }
  const metalsItem = testItem as MetalsTestItem;
  if (metalsItem._metalsKind === "workspaceFolder") {
    return;
  }

  let rootItem: MetalsTestItem | undefined = metalsItem._metalsParent;
  while (rootItem && rootItem._metalsParent) {
    rootItem = rootItem._metalsParent;
  }
  if (!rootItem) {
    vscode.window.showErrorMessage("No workspace folder found for " + metalsItem.id);
    return;
  }

  const workspaceFolder = vscode.workspace.workspaceFolders?.find(folder => folder.uri.path === rootItem.id);
  if (!workspaceFolder) {
    vscode.window.showErrorMessage("Workspace folder " + rootItem.id + " not found");
    return;
  }

  const mode = await vscode.window.showQuickPick(["Run", "Debug"], {
    placeHolder: "Select mode (Run or Debug)",
  });
  if (!mode) {
    return;
  }

  // Get current launch.json content
  const launchConfig = vscode.workspace.getConfiguration("launch", workspaceFolder.uri);
  const configurations = launchConfig.get<vscode.DebugConfiguration[]>("configurations") || [];

  // Add new configuration
  const config: LaunchTestConfig = {
    name: "",
    type: "scala",
    request: "launch",
    debug: mode === "Debug",
    flags: [],
    suites: [],
  };
  switch (metalsItem._metalsKind) {
    case "suite":
      config.buildTarget = metalsItem._metalsTargetUri;
      config.suites = [{ className: metalsItem.id, tests: [] }];
      break;
    case "testcase":
      config.buildTarget = metalsItem._metalsTargetUri;
      config.suites = [{ className: metalsItem._metalsParent.id, tests: [metalsItem.id] }];
      break;
    case "module":
    case "package":
      const target = findBuildTarget(metalsItem);
      if (!target) {
        vscode.window.showErrorMessage("No build target found for " + metalsItem.id);
        return;
      }
      config.buildTarget = target;
      config.suites = [];
      if (metalsItem._metalsKind === "package") {
        const suites = findSuites(metalsItem);
        config.suites = suites.map(suite => ({ className: suite, tests: [] }));
      }
      break;
  }

  let name: string | undefined = undefined;
  const names = new Set<string>();
  for (const config of configurations) {
    names.add(config.name);
  }
  for (let i = 0; !name || names.has(name); i++) {
    name = mode + " " + config.buildTarget
    if (i > 0) name += " (" + i + ")";
  }

  do {
    name = await vscode.window.showInputBox({
      value: name,
      prompt: "Enter the name of the launch configuration",
      placeHolder: "Run test",
    })
    if (!name) {
      return;
    }
    if (names.has(name)) {
      vscode.window.showErrorMessage("A configuration with this name already exists");
      continue;
    }
    config.name = name;
  } while (!config.name);

  const launchJsonUri = await updateLaunchConfigurations(workspaceFolder, config);

  await vscode.window.showQuickPick(["Customize configuration", "Run configuration", "Focus debug view"], {
    placeHolder: "Select the action to perform",
  }).then(async (action) => {
    switch (action) {
      case "Run configuration":
        vscode.debug.startDebugging(workspaceFolder, config.name);
        break;
      case "Customize configuration":
        const document = await vscode.workspace.openTextDocument(launchJsonUri);
        const editor = await vscode.window.showTextDocument(document);

        // Find the position of the new config by searching for its name
        const text = document.getText();
        const searchPattern = `"name": "${name}"`;
        const configIndex = text.indexOf(searchPattern);
        if (configIndex !== -1) {
          const position = document.positionAt(configIndex);
          editor.selection = new vscode.Selection(position, position);
          editor.revealRange(new vscode.Range(position, position), vscode.TextEditorRevealType.InCenter);
        }
        break;
      case "Focus debug view":
        await vscode.commands.executeCommand("workbench.view.debug");
        break;
    }
  });
}
