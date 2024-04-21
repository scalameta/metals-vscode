import path from "path";

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
