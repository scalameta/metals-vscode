import * as fs from "fs";
import * as path from "path";
import Mocha from "mocha";
export function run(
  testsRoot: string,
  cb: (error: unknown, failures?: number) => void,
): void {
  // Create the mocha test
  const mocha = new Mocha({ ui: "tdd" });

  // Add files to the test suite
  fs.readdirSync(testsRoot, { recursive: true, encoding: "utf8" })
    .filter((f) => f.endsWith(".test.js"))
    .forEach((f) => mocha.addFile(path.resolve(testsRoot, f)));

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
