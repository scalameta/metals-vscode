import * as fs from "fs";
import * as path from "path";
import Mocha from "mocha";

function findTestFiles(directory: string): string[] {
  const files: string[] = [];

  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (entry.name.startsWith(".")) {
      continue;
    }

    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...findTestFiles(entryPath));
    } else if (entry.isFile() && entry.name.endsWith(".test.js")) {
      files.push(entryPath);
    }
  }

  return files.sort();
}

export function run(
  testsRoot: string,
  cb: (error: unknown, failures?: number) => void,
): void {
  // Create the mocha test
  const mocha = new Mocha({ ui: "tdd" });

  findTestFiles(testsRoot).forEach((file) => mocha.addFile(file));

  try {
    // Run the mocha test
    mocha.run((failures) => {
      cb(null, failures);
    });
  } catch (err) {
    console.error(err);
    cb(err);
  }
}
