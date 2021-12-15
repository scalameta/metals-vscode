import { getJavaHome } from "../getJavaHome";
import { IJavaHomeInfo } from "locate-java-home/js/es5/lib/interfaces";
import path from "path";

describe("getJavaHome", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    delete process.env.JAVA_HOME;
    delete process.env.PATH;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("reads from configuration", async () => {
    const javaHomeConfig = "/path/to/java";
    const javaHome = await getJavaHome(javaHomeConfig);
    expect(javaHome).toBe(javaHomeConfig);
  });

  it("reads from JAVA_HOME", async () => {
    const JAVA_HOME = "/path/to/java";
    process.env = { ...originalEnv, JAVA_HOME };
    const javaHome = await getJavaHome(undefined);
    expect(javaHome).toBe(JAVA_HOME);
  });

  it("checks PATH variable", async () => {
    const javaPaths = [
      {
        binPath: path.join("/", "test", "usr", "bin", "java"),
        realPath: path.join(
          "/",
          "test",
          "usr",
          "lib",
          "jvm",
          "java-11-openjdk-amd64",
          "bin",
          "java"
        ),
      },
    ];
    const PATH = path.join("/", "test", "usr", "bin");
    mockFs(javaPaths);
    process.env = { PATH };
    const javaHome = await getJavaHome(undefined);
    const expected = path.join(
      "/",
      "test",
      "usr",
      "lib",
      "jvm",
      "java-11-openjdk-amd64"
    );
    expect(javaHome).toBe(expected);
  });

  it("prefers configuration to JAVA_HOME and installed Java", async () => {
    const javaHomeConfig = "/path/to/config/java";
    const JAVA_HOME = "/path/to/java";
    process.env = { ...originalEnv, JAVA_HOME };
    mockLocateJavaHome([java8Jdk, java11Jdk]);
    const javaHome = await require("../getJavaHome").getJavaHome(
      javaHomeConfig
    );
    expect(javaHome).toBe(javaHomeConfig);
  });

  // NOTE(gabro): we don't care about testing locate-java-home since it's an external dependency
  // and we assume it works as expected. However, we want to test how we select a specific version
  // when multiple installed Java are available.

  it("falls back to installed Java", async () => {
    mockLocateJavaHome([java8Jdk, java11Jdk]);
    const javaHome = await require("../getJavaHome").getJavaHome(undefined);
    expect(javaHome).toBe(java11Jdk.path);
  });

  it("prefers installed JDK over JRE", async () => {
    mockLocateJavaHome([java11Jre, java8Jdk, java8Jre]);
    const javaHome = await require("../getJavaHome").getJavaHome(undefined);
    expect(javaHome).toBe(java8Jdk.path);
  });

  it("prefers the most recent installed JDK 11", async () => {
    mockLocateJavaHome([java11Jdk, java8Jdk, java8Jre]);
    const javaHome = await require("../getJavaHome").getJavaHome(undefined);
    expect(javaHome).toBe(java11Jdk.path);
  });

  it("prefers the most recent installed JDK 17", async () => {
    mockLocateJavaHome([java17Jdk, java11Jdk, java8Jdk, java8Jre]);
    const javaHome = await require("../getJavaHome").getJavaHome(undefined);
    expect(javaHome).toBe(java17Jdk.path);
  });

  it("prefers the most recent security patch", async () => {
    mockLocateJavaHome([java11Jdk, java11JdkNewPatch, java8Jre]);
    const javaHome = await require("../getJavaHome").getJavaHome(undefined);
    expect(javaHome).toBe(java11JdkNewPatch.path);
  });
});

const java8Jdk = {
  path: "/path/to/java8jdk",
  version: "1.8.0",
  security: 1,
  isJDK: true,
};

const java8Jre = {
  path: "/path/to/java8jdk",
  version: "1.8.0",
  security: 1,
  isJDK: false,
};

const java11Jdk = {
  path: "/path/to/java11jdk",
  version: "1.11.0",
  security: 1,
  isJDK: true,
};

const java17Jdk = {
  path: "/path/to/java17jdk",
  version: "1.17.0",
  security: 1,
  isJDK: true,
};

const java11Jre = {
  path: "/path/to/java11jdk",
  version: "1.11.0",
  security: 1,
  isJDK: false,
};

const java11JdkNewPatch = {
  path: "/path/to/java11jdk/high/security",
  version: "1.11.0",
  security: 192,
  isJDK: true,
};

function mockLocateJavaHome(
  javas: { path: string; version: string; security: number; isJDK: boolean }[]
): void {
  jest.resetModules();
  jest
    .spyOn(require("locate-java-home"), "default")
    .mockImplementation((_options: unknown, cb: unknown) => {
      (cb as (err: Error | null, found?: IJavaHomeInfo[]) => void)(
        null,
        javas.map((j) => ({
          ...j,
          is64Bit: true,
          executables: {
            java: j.path + "/bin/java",
            javac: j.path + "/bin/javac",
            javap: j.path + "/bin/javap",
          },
        }))
      );
    });
}

function mockFs(javaLinks: { binPath: String; realPath: String }[]): void {
  jest.resetModules();
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
