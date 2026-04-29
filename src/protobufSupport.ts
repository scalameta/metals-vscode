import * as fs from "fs";
import * as path from "path";
import { ExtensionContext } from "vscode";

interface PackageJson {
  activationEvents?: string[];
}

/**
 * Checks if protobuf language support is enabled by looking for
 * `onLanguage:proto` in the activation events of package.json.
 *
 * This allows enabling/disabling proto support via feature flag
 * by rewriting package.json.
 */
export function isProtobufEnabled(context: ExtensionContext): boolean {
  const packageJsonPath = path.join(context.extensionPath, "package.json");

  try {
    const packageJson: PackageJson = JSON.parse(
      fs.readFileSync(packageJsonPath, "utf8")
    );

    const activationEvents = packageJson.activationEvents ?? [];
    return activationEvents.includes("onLanguage:proto");
  } catch {
    return false;
  }
}
