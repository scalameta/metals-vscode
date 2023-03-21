import * as path from "path";
import { existsSync } from "fs";

/**
 * Check whether Dotty IDE is enabled on this project
 *
 * @param workspaceRoot the workspace root, if defined
 */
export function checkDottyIde(
  workspaceRoot: string | undefined
): { enabled: true; path: string } | { enabled: false } {
  if (workspaceRoot) {
    const dottyIdeArtifactPath = path.join(
      workspaceRoot,
      ".dotty-ide-artifact"
    );
    return {
      enabled: existsSync(dottyIdeArtifactPath),
      path: dottyIdeArtifactPath,
    };
  }
  return { enabled: false };
}
