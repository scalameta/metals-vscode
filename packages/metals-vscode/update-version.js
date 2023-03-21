const fs = require("fs");

const path = "./package.json";

const package = fs.readFileSync(path, { encoding: "utf8", flag: "r" });
const json = JSON.parse(package);
json.contributes.configuration.properties[
  "metals.suggestLatestUpgrade"
].default = true;
json.engines.vscode = "^1.63.0";
json.devDependencies["@types/vscode"] = "1.63.0";

const updated = JSON.stringify(json, null, 2);
fs.writeFileSync(path, updated);
