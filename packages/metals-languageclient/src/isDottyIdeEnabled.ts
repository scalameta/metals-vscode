import * as path from "path";
import { existsSync } from "fs";

export function isDottyIdeEnabled(workspaceRoot: string): boolean {
  const dottyIdeArtifactPath = path.join(workspaceRoot, ".dotty-ide-artifact");
  return existsSync(dottyIdeArtifactPath);
}
