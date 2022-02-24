import { ConfigurationTarget, WorkspaceConfiguration } from "vscode";
import fs from "fs";
import path from "path";
import { getConfigValue, metalsDir } from "./util";

const mirrorProperty = "coursierMirror";

export function getMirrorPath(
  config: WorkspaceConfiguration
): string | undefined {
  const mirrorConfig = getConfigValue<string>(config, mirrorProperty);

  const value = mirrorConfig?.value.trim();
  if (mirrorConfig && value && value.length > 0)
    return writeMirrorFile(value, mirrorConfig.target);
  else return;
}

function writeMirrorFile(mirrorString: string, target: ConfigurationTarget) {
  const dotMetalsDir = metalsDir(target);
  const file = path.join(dotMetalsDir, "mirror.properties");
  let mirrorContents =
    "metals.from=https://repo1.maven.org/maven2\n" +
    `metals.to=${mirrorString}`;
  if (!fs.existsSync(file)) {
    fs.writeFileSync(file, mirrorContents);
    return file;
  } else {
    let current = fs.readFileSync(file, {
      encoding: "utf8",
      flag: "r",
    });
    if (current != mirrorContents) fs.writeFileSync(file, mirrorContents);
    return file;
  }
}
