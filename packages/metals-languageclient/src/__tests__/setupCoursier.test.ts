import path from "path";
import { fetchCoursier, setupCoursier, validateCoursier } from "../setupCoursier";
import { OutputChannel } from "../interfaces/OutputChannel";

describe("setupCoursier", () => {

  const tmpDir = path.resolve(process.cwd(), ".tmp");
  const fs = require('fs');

  beforeAll(() => {
    if (!fs.existsSync(tmpDir)){
        fs.mkdirSync(tmpDir);
    }
  })

  afterAll(() => {
    if (fs.existsSync(tmpDir)){
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
    expect(await validateCoursier("path/fake")).toBeUndefined();
  });

  it("should fetch coursier correctly", async () => {
    expect(await fetchCoursier(tmpDir, () => { })).toEqual(0)
  }, 10000)

  it("should setup coursier correctly", async () => {
    const { coursier, javaHome } = await setupCoursier("17", tmpDir, new NoOpOutputChannel());
    expect(fs.existsSync(coursier)).toBeTruthy
    expect(fs.existsSync(javaHome)).toBeTruthy
  }, 10000)

});

class NoOpOutputChannel implements OutputChannel {
  append(_: string): void { }
  appendLine(_: string): void { }
}
