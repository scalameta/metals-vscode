import path from "path";
import { OutputChannel } from "../interfaces/OutputChannel";

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

describe("getJavaHome", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.JAVA_HOME;
    delete process.env.PATH;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("reads from JAVA_HOME", async () => {
    const JAVA_HOME = path.join("/", "path", "to", "java");
    process.env = { ...originalEnv, JAVA_HOME };
    const javaPaths = [{ binPath: path.join(JAVA_HOME, "bin", "java") }];
    mockSpawn(exampleJavaVersionString);
    mockExistsFs(javaPaths);
    const javaHome = await require("../getJavaHome").getJavaHome("17");
    expect(javaHome).toBe(JAVA_HOME);
  });

  // needs to run on a machine with an actual JAVA_HOME set up
  it("reads from real JAVA_HOME", async () => {
    process.env = { ...originalEnv };
    delete process.env.PATH;
    const javaHome = await require("../getJavaHome").getJavaHome(
      "17",
      new MockOutput()
    );
    expect(javaHome).toBeDefined();
  });

  // needs to run on a machine with an actual java on PATH set up
  it("reads from real PATH", async () => {
    process.env = { ...originalEnv };
    delete process.env.JAVA_HOME;
    const javaHome = await require("../getJavaHome").getJavaHome(
      "17",
      new MockOutput()
    );
    expect(javaHome).toBeDefined();
  });
});

function mockExistsFs(javaLinks: { binPath: String }[]): void {
  jest
    .spyOn(require("fs"), "existsSync")
    .mockImplementation((path: unknown) => {
      if (javaLinks.find((o) => o.binPath == path)) {
        return true;
      } else {
        return false;
      }
    });
}

function mockSpawn(resultString: String): void {
  jest
    .spyOn(require("promisify-child-process"), "spawn")
    .mockImplementation(() => {
      return Promise.resolve({ stderr: resultString });
    });
}
