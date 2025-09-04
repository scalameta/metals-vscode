import path from "path";
import {
  fetchCoursier,
  setupCoursier,
  validateCoursier,
} from "../../setupCoursier";
import { OutputChannel } from "../../interfaces/OutputChannel";
import { log } from "console";
import { assert } from "chai";
import fs from "fs";

describe("setupCoursier", () => {
  const tmpDir = path.resolve(process.cwd(), ".tmp");

  before(() => {
    if (!fs.existsSync(tmpDir)) {
      fs.mkdirSync(tmpDir);
    }
  });

  after(() => {
    if (fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it("should find coursier in PATH", async () => {
    const pathEnv = process.env["PATH"];
    if (pathEnv) {
      assert.isDefined(await validateCoursier(pathEnv));
    } else {
      assert.fail("PATH environment variable is not defined");
    }
  });

  it("should not find coursier if not present in PATH", async () => {
    process.env = {};
    assert.isUndefined(await validateCoursier());
  });

  it("should fetch coursier correctly", async function () {
    this.timeout(0);
    assert.equal(
      await fetchCoursier(tmpDir, (out) => {
        log(out.toString().trim());
      }),
      0,
    );
  });

  it("should setup coursier correctly", async function () {
    this.timeout(0);
    const { coursier, javaHome } = await setupCoursier(
      "17",
      undefined,
      tmpDir,
      process.cwd(),
      new LogOutputChannel(),
      false,
      ["-Xmx1000M", "-XX-fake!"],
    );
    assert.isTrue(fs.existsSync(coursier));
    assert.isTrue(fs.existsSync(javaHome.path));
  });
});

class LogOutputChannel implements OutputChannel {
  append(text: string): void {
    log(text);
  }
  appendLine(text: string): void {
    log(text);
  }
}
