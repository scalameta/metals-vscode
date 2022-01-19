const fs = require("fs");

const path = "./package.json";

const package = fs.readFileSync(path, { encoding: "utf8", flag: "r" });
const updated = package.replaceAll("1.59.0", "1.63.0");

fs.writeFileSync(path, updated);
