import path from "path";
import {
  fetchCoursier,
  setupCoursier,
  validateCoursier,
} from "../setupCoursier";
import { OutputChannel } from "../interfaces/OutputChannel";
import { log } from "console";

describe("setupCoursier", () => {
  const tmpDir = path.resolve(process.cwd(), ".tmp");
  const fs = require("fs");

  beforeAll(() => {
    if (!fs.existsSync(tmpDir)) {
      fs.mkdirSync(tmpDir);
    }
  });

  afterAll(() => {
    if (fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it("should find coursier in PATH", async () => {
    const pathEnv = process.env["PATH"];
    if (pathEnv) {
      expect(await validateCoursier(pathEnv)).toBeDefined();
    } else {
      fail("PATH environment variable is not defined");
    }
  });

  it("should not find coursier if not present in PATH", async () => {
    process.env = {};
    expect(await validateCoursier()).toBeUndefined();
  });

  it("should fetch coursier correctly", async () => {
    expect(
      await fetchCoursier(tmpDir, (out) => {
        log(out.toString().trim());
      })
    ).toEqual(0);
  }, 10000);

  it("should setup coursier correctly", async () => {
    const { coursier, javaHome } = await setupCoursier(
      "17",
      undefined,
      tmpDir,
      process.cwd(),
      new LogOutputChannel(),
      false,
      ["-Xmx1000M", "-XX-fake!"]
    );
    expect(fs.existsSync(coursier)).toBeTruthy;
    expect(fs.existsSync(javaHome)).toBeTruthy;
  }, 50000);
});

class LogOutputChannel implements OutputChannel {
  append(text: string): void {
    log(text);
  }
  appendLine(text: string): void {
    log(text);
  }
}
