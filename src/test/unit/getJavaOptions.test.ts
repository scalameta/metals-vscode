import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import * as assert from "assert";
import { getJavaOptions } from "../../getJavaOptions";

describe("getJavaOptions", () => {
  console.debug = () => {
    // Silence noisy debug logs during tests
  };

  const originalEnv = process.env;

  afterEach(() => {
    process.env = originalEnv;
  });

  const proxyOptions = [
    "-Dhttp.proxyHost=proxy.example.com",
    "-Dhttp.proxyPort=1234",
  ];

  it("reads from .jvmopts", () => {
    const workspaceRoot = createWorskpace(proxyOptions);
    const options = getJavaOptions(workspaceRoot);
    assert.deepStrictEqual(options, proxyOptions);
  });

  it("sanitizes options from .jvmopts", () => {
    const malformedOptions = [
      "-Dhttp.proxyHost=proxy.example.com   ",
      "-Dhttp.proxyPort=1234  ",
    ];
    const workspaceRoot = createWorskpace(malformedOptions);
    const options = getJavaOptions(workspaceRoot);
    assert.deepStrictEqual(options, proxyOptions);
  });

  it("reads from JAVA_OPTS", () => {
    process.env = { ...originalEnv, JAVA_OPTS: proxyOptions.join(" ") };
    const workspaceRoot = createWorskpace([]);
    const options = getJavaOptions(workspaceRoot);
    assert.deepStrictEqual(options, proxyOptions);
  });

  it("reads from JAVA_FLAGS", () => {
    process.env = { ...originalEnv, JAVA_FLAGS: proxyOptions.join(" ") };
    const workspaceRoot = createWorskpace([]);
    const options = getJavaOptions(workspaceRoot);
    assert.deepStrictEqual(options, proxyOptions);
  });

  it("reads from multiple sources", () => {
    const javaOpts = ["-Dsome.opt=1"];
    const javaFlags = ["-Jsome.flag=1", "-Jother.flag=2"];
    process.env = {
      ...originalEnv,
      JAVA_OPTS: javaOpts.join(" "),
      JAVA_FLAGS: javaFlags.join(" "),
    };
    const workspaceRoot = createWorskpace(proxyOptions);
    const options = getJavaOptions(workspaceRoot);
    assert.deepStrictEqual(options, [
      ...javaOpts,
      ...javaFlags,
      ...proxyOptions,
    ]);
  });

  it("ignores memory options", () => {
    const jvmOpts = ["-Xms256m", ...proxyOptions, "-Xmx4g"];
    const workspaceRoot = createWorskpace(jvmOpts);
    const options = getJavaOptions(workspaceRoot);
    assert.deepStrictEqual(options, proxyOptions);
  });

  it("ignores PrintCommandLineFlags", () => {
    const jvmOpts = ["-XX:+PrintCommandLineFlags", ...proxyOptions];
    const workspaceRoot = createWorskpace(jvmOpts);
    const options = getJavaOptions(workspaceRoot);
    assert.deepStrictEqual(options, proxyOptions);
  });
});

function createWorskpace(jvmOpts: string[]): string {
  const tmpDir = fs.mkdtempSync(
    path.join(os.tmpdir(), "metals-languageclient"),
  );
  fs.writeFileSync(path.join(tmpDir, ".jvmopts"), jvmOpts.join("\n"), "utf8");
  return tmpDir;
}
