import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { getJavaOptions } from "../getJavaOptions";

describe("getJavaOptions", () => {
  // Silence noisy debug logs during tests
  console.debug = () => {};

  const originalEnv = process.env;

  afterEach(() => {
    process.env = originalEnv;
  });

  const proxyOptions = [
    "-Dhttp.proxyHost=proxy.example.com",
    "-Dhttp.proxyPort=1234"
  ];

  it("reads from .jvmopts", () => {
    const workspaceRoot = createWorskpace(proxyOptions);
    const options = getJavaOptions(workspaceRoot);
    expect(options).toEqual(proxyOptions);
  });

  it("reads from JAVA_OPTS", () => {
    process.env = { ...originalEnv, JAVA_OPTS: proxyOptions.join(" ") };
    const workspaceRoot = createWorskpace([]);
    const options = getJavaOptions(workspaceRoot);
    expect(options).toEqual(proxyOptions);
  });

  it("reads from JAVA_FLAGS", () => {
    process.env = { ...originalEnv, JAVA_FLAGS: proxyOptions.join(" ") };
    const workspaceRoot = createWorskpace([]);
    const options = getJavaOptions(workspaceRoot);
    expect(options).toEqual(proxyOptions);
  });

  it("reads from multiple sources", () => {
    const javaOpts = ["-Dsome.opt=1"];
    const javaFlags = ["-Jsome.flag=1", "-Jother.flag=2"];
    process.env = {
      ...originalEnv,
      JAVA_OPTS: javaOpts.join(" "),
      JAVA_FLAGS: javaFlags.join(" ")
    };
    const workspaceRoot = createWorskpace(proxyOptions);
    const options = getJavaOptions(workspaceRoot);
    expect(options).toEqual([...javaOpts, ...javaFlags, ...proxyOptions]);
  });

  it("ignores memory options", () => {
    const jvmOpts = ["-Xms256m", ...proxyOptions, "-Xmx4g"];
    const workspaceRoot = createWorskpace(jvmOpts);
    const options = getJavaOptions(workspaceRoot);
    expect(options).toEqual(proxyOptions);
  });
});

function createWorskpace(jvmOpts: string[]): string {
  const tmpDir = fs.mkdtempSync(
    path.join(os.tmpdir(), "metals-languageclient")
  );
  fs.writeFileSync(path.join(tmpDir, ".jvmopts"), jvmOpts.join("\n"), "utf8");
  return tmpDir;
}
