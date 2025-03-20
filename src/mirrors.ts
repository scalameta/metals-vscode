import { ConfigurationTarget, WorkspaceConfiguration } from "vscode";
import fs from "fs";
import path from "path";
import { getConfigValue, metalsDir } from "./util";

const mirrorProperty = "coursierMirror";

/**
 * @returns path to the mirror config file described in https://get-coursier.io/blog/#mirrors
 */
export function getCoursierMirrorPath(
  config: WorkspaceConfiguration,
): string | undefined {
  const mirrorConfig = getConfigValue<string>(config, mirrorProperty);

  const value = mirrorConfig?.value.trim();
  if (mirrorConfig && value && value.length > 0) {
    return writeMirrorFile(value, mirrorConfig.target);
  }
}

function writeMirrorFile(mirrorString: string, target: ConfigurationTarget) {
  const dotMetalsDir = metalsDir(target);
  if (!fs.existsSync(dotMetalsDir)) {
    fs.mkdirSync(dotMetalsDir);
  }
  const file = path.join(dotMetalsDir, "mirror.properties");
  const mirrorContents = [
    "metals.from=https://repo1.maven.org/maven2",
    `metals.to=${mirrorString}`,
  ].join("\n");
  fs.writeFileSync(file, mirrorContents);
  return file;
}
