import findJavaHome = require("find-java-home");
import { workspace } from "vscode";

export function getJavaHome(): Promise<string> {
  const userJavaHome = workspace.getConfiguration("metals").get("javaHome");
  if (typeof userJavaHome === "string" && userJavaHome.trim() !== "") {
    return Promise.resolve(userJavaHome);
  } else {
    return new Promise((resolve, reject) => {
      findJavaHome((err, javaHome) => {
        if (err) {
          reject(err);
        } else {
          resolve(javaHome);
        }
      });
    });
  }
}
