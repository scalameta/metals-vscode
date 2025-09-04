import path from "path";
import { OutputChannel } from "../../interfaces/OutputChannel";
import { expect } from "chai";
import sinon from "sinon";
import { getJavaHome } from "../../getJavaHome";
import fs from "fs";
import child_promise from "promisify-child-process";

class MockOutput implements OutputChannel {
  append(value: string): void {
    console.log(value);
  }
  appendLine(value: string): void {
    console.log(value);
  }
}

const exampleJavaVersionString = `openjdk "17.0.1" 2021-10-19
  OpenJDK Runtime Environment (build 17.0.1+12-39)
  OpenJDK 64-Bit Server VM (build 17.0.1+12-39, mixed mode, sharing)`;

const pathJavaHome =
  "/Users/jdoe/.asdf/installs/java/zulu-17.50.19/zulu-17.jdk/Contents/Home";

const exampleJavaPropertiesVersionString = `Property settings:
    java.home = ${pathJavaHome}
    java.runtime.name = OpenJDK Runtime Environment
    java.runtime.version = 17.0.11+9-LTS
    java.specification.name = Java Platform API Specification
    java.specification.vendor = Oracle Corporation
    java.specification.version = 17
    java.version = 17.0.11
    java.version.date = 2024-04-16
    java.vm.compressedOopsMode = Zero based
    java.vm.info = mixed mode, sharing
    java.vm.name = OpenJDK 64-Bit Server VM
    java.vm.specification.name = Java Virtual Machine Specification
    java.vm.specification.vendor = Oracle Corporation
    java.vm.specification.version = 17

openjdk version "17.0.11" 2024-04-16 LTS
OpenJDK Runtime Environment Zulu17.50+19-CA (build 17.0.11+9-LTS)
OpenJDK 64-Bit Server VM Zulu17.50+19-CA (build 17.0.11+9-LTS, mixed mode, sharing)`;

describe("getJavaHome", () => {
  const originalEnv = process.env;
  let sandbox: sinon.SinonSandbox;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    process.env = { ...originalEnv };
    delete process.env.JAVA_HOME;
    delete process.env.PATH;
  });

  afterEach(() => {
    process.env = originalEnv;
    sandbox.restore();
  });

  it("reads from JAVA_HOME", async () => {
    const JAVA_HOME = path.join("/", "path", "to", "java");
    process.env = { ...originalEnv, JAVA_HOME };
    const javaPaths = [{ binPath: path.join(JAVA_HOME, "bin", "java") }];
    mockSpawn(exampleJavaVersionString, sandbox);
    mockExistsFs(javaPaths, sandbox);
    const javaHome = await getJavaHome("17", new MockOutput());
    expect(javaHome).to.not.be.undefined;
    expect(javaHome?.path).to.equal(JAVA_HOME);
  });

  // needs to run on a machine with an actual JAVA_HOME set up
  it("reads from real JAVA_HOME", async () => {
    process.env = { ...originalEnv };
    delete process.env.PATH;
    const javaHome = await getJavaHome("17", new MockOutput());
    expect(javaHome).to.not.be.undefined;
  });

  // needs to run on a machine with an actual java on PATH set up
  it("reads from real PATH", async () => {
    process.env = { ...originalEnv };
    delete process.env.JAVA_HOME;
    mockSpawn(exampleJavaPropertiesVersionString, sandbox);
    const javaHome = await getJavaHome("17", new MockOutput());
    expect(javaHome).to.not.be.undefined;
    expect(javaHome?.path).to.equal(pathJavaHome);
  });
});

function mockExistsFs(
  javaLinks: { binPath: string }[],
  sandbox: sinon.SinonSandbox,
): void {
  sandbox.stub(fs, "existsSync").callsFake((path: unknown) => {
    if (javaLinks.find((o) => o.binPath == path)) {
      return true;
    } else {
      return false;
    }
  });
}

function mockSpawn(resultString: string, sandbox: sinon.SinonSandbox): void {
  sandbox.stub(require("promisify-child-process"), "spawn").resolves({
    stderr: resultString,
  });
}
