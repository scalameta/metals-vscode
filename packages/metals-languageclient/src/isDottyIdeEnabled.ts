import * as path from "path";
import { existsSync } from "fs";

/**
 * Whether Dotty IDE is enabled on this project
 *
 * @param workspaceRoot the workspace root, if defined
 */
export function isDottyIdeEnabled(workspaceRoot: string | undefined): boolean {
  if (workspaceRoot) {
    const dottyIdeArtifactPath = path.join(
      workspaceRoot,
      ".dotty-ide-artifact"
    );
    return existsSync(dottyIdeArtifactPath);
  }
  return false;
}
