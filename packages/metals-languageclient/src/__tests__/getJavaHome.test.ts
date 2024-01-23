import { IJavaHomeInfo } from "@viperproject/locate-java-home/js/es5/lib/interfaces";
import path from "path";

const exampleJavaVersionString =
  `openjdk 17.0.1 2021-10-19
  OpenJDK Runtime Environment (build 17.0.1+12-39)
  OpenJDK 64-Bit Server VM (build 17.0.1+12-39, mixed mode, sharing)`

describe("getJavaHome", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    delete process.env.JAVA_HOME;
    delete process.env.PATH;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("reads from JAVA_HOME", async () => {
    const JAVA_HOME = "/path/to/java";
    process.env = { ...originalEnv, JAVA_HOME };
    mockSpawn(exampleJavaVersionString);
    const javaHome = await require("../getJavaHome").fromEnv("17");
    expect(javaHome).toBe(JAVA_HOME);
  });

  it("checks PATH variable", async () => {
    const javaPaths = [
      {
        binPath: path.join("/", "test", "usr", "bin", "java"),
        realPath: path.join(java8Jdk.path, "bin", "java"),
      },
    ];
    const PATH = path.join("/", "test", "usr", "bin");
    mockLocateJavaHome([java8Jdk, java11Jdk]);
    mockFs(javaPaths);
    process.env = { PATH };
    const javaHome = await require("../getJavaHome").getJavaHome("11");
    expect(javaHome).toBe(java8Jdk.path);
  });

  // NOTE(gabro): we don't care about testing locate-java-home since it's an external dependency
  // and we assume it works as expected. However, we want to test how we select a specific version
  // when multiple installed Java are available.

  it("falls back to installed Java", async () => {
    mockLocateJavaHome([java8Jdk, java11Jdk]);
    const javaHome = await require("../getJavaHome").getJavaHome("11");
    expect(javaHome).toBe(java11Jdk.path);
  });

  it("prefers installed JDK over JRE", async () => {
    mockLocateJavaHome([java11Jre, java8Jdk, java8Jre]);
    const javaHome = await require("../getJavaHome").getJavaHome("8");
    expect(javaHome).toBe(java8Jdk.path);
  });

  it("prefers the most recent installed JDK 11", async () => {
    mockLocateJavaHome([java11Jdk, java8Jdk, java8Jre]);
    const javaHome = await require("../getJavaHome").getJavaHome("11");
    expect(javaHome).toBe(java11Jdk.path);
  });

  it("prefers the most recent installed JDK 17", async () => {
    mockLocateJavaHome([java17Jdk, java11Jdk, java8Jdk, java8Jre]);
    const javaHome = await require("../getJavaHome").getJavaHome("17");
    expect(javaHome).toBe(java17Jdk.path);
  });

  it("prefers the most recent security patch", async () => {
    mockLocateJavaHome([java11Jdk, java11JdkNewPatch, java8Jre]);
    const javaHome = await require("../getJavaHome").getJavaHome("11");
    expect(javaHome).toBe(java11JdkNewPatch.path);
  });
});

const java8Jdk = {
  path: path.join("/", "path", "to", "java8jdk"),
  version: "1.8.0",
  security: 1,
  isJDK: true,
};

const java8Jre = {
  path: path.join("/", "path", "to", "java8jdk"),
  version: "1.8.0",
  security: 1,
  isJDK: false,
};

const java11Jdk = {
  path: path.join("/", "path", "to", "java11jdk"),
  version: "1.11.0",
  security: 1,
  isJDK: true,
};

const java17Jdk = {
  path: path.join("/", "path", "to", "java17jdk"),
  version: "1.17.0",
  security: 1,
  isJDK: true,
};

const java11Jre = {
  path: path.join("/", "path", "to", "java11jdk"),
  version: "1.11.0",
  security: 1,
  isJDK: false,
};

const java11JdkNewPatch = {
  path: path.join("/", "path", "to", "java11jdk", "high", "security"),
  version: "1.11.0",
  security: 192,
  isJDK: true,
};

function mockLocateJavaHome(
  javas: { path: string; version: string; security: number; isJDK: boolean }[]
): void {
  jest.resetModules();
  jest
    .spyOn(require("@viperproject/locate-java-home"), "default")
    .mockImplementation((_options: unknown, cb: unknown) => {
      (cb as (err: Error | null, found?: IJavaHomeInfo[]) => void)(
        null,
        javas.map((j) => ({
          ...j,
          is64Bit: true,
          executables: {
            java: path.join(j.path, "bin", "java"),
            javac: path.join(j.path, "bin", "javac"),
            javap: path.join(j.path, "bin", "javap"),
          },
        }))
      );
    });
}

function mockFs(javaLinks: { binPath: String; realPath: String }[]): void {
  jest
    .spyOn(require("fs"), "existsSync")
    .mockImplementation((path: unknown) => {
      if (javaLinks.find((o) => o.binPath == path)) {
        return true;
      } else {
        return false;
      }
    });
  jest
    .spyOn(require("fs"), "realpathSync")
    .mockImplementation((path: unknown) => {
      const value = javaLinks.find((o) => o.binPath == path);
      if (value) {
        return value.realPath;
      } else {
        return path;
      }
    });
}

function mockSpawn(resultString: String): void {
  jest
    .spyOn(require("promisify-child-process"), "spawn")
    .mockImplementation(() => {
      return Promise.resolve({stdout: resultString})
    });
}
