import * as assert from "assert";
import * as fs from "fs";
import * as path from "path";
import { spawn } from "promisify-child-process";
import { FileSystemError, FileType, Uri } from "vscode";
import {
  JarFileSystemProvider,
  translateJarFsToJar,
  translateJarToJarFs,
} from "../../../jarFileSystemProvider";
import { validateCoursier } from "../../../setupCoursier";

suite("jar URI translation", () => {
  test("round-trips a plain jar URI", () => {
    const original =
      "jar:file:///home/user/.cache/coursier/v1/https/repo1.maven.org/maven2/org/scala-lang/scala-library/2.13.12/scala-library-2.13.12.jar!/scala/Option.scala";
    const jarFs = translateJarToJarFs(Uri.parse(original), original);

    assert.strictEqual(jarFs.scheme, "jar-fs");
    assert.strictEqual(
      jarFs.path,
      "/scala-library-2.13.12.jar/scala/Option.scala",
    );
    assert.strictEqual(
      new URLSearchParams(jarFs.query).get("jarPath"),
      "/home/user/.cache/coursier/v1/https/repo1.maven.org/maven2/org/scala-lang/scala-library/2.13.12/scala-library-2.13.12.jar",
    );
    assert.strictEqual(translateJarFsToJar(jarFs), original);
  });

  test("round-trips a jar URI with an ampersand in the archive path", () => {
    const original =
      "jar:file:///home/user/foo%26bar/scala-library-2.13.12.jar!/scala/Option.scala";
    const jarFs = translateJarToJarFs(Uri.parse(original), original);

    assert.strictEqual(jarFs.scheme, "jar-fs");
    const jarPath = new URLSearchParams(jarFs.query).get("jarPath");
    assert.strictEqual(jarPath, "/home/user/foo&bar/scala-library-2.13.12.jar");
    assert.strictEqual(translateJarFsToJar(jarFs), original);
  });

  test("round-trips a jar URI with an encoded archive path", () => {
    const original =
      "jar:file:///home/user/My%20Libraries/scala-library-2.13.12.jar!/scala/Option.scala";
    const jarFs = translateJarToJarFs(Uri.parse(original), original);

    assert.strictEqual(jarFs.scheme, "jar-fs");
    const jarPath = new URLSearchParams(jarFs.query).get("jarPath");
    assert.ok(jarPath?.includes("My Libraries"));
    assert.strictEqual(translateJarFsToJar(jarFs), original);
  });

  test("round-trips query-free parent and sibling URIs via the JAR root mapping", () => {
    const jarFile =
      "jar:file:///home/user/.cache/coursier/v1/https/repo1.maven.org/maven2/org/scala-lang/scala-library/2.13.12/scala-library-2.13.12.jar";
    const original = `${jarFile}!/scala/Option.scala`;
    translateJarToJarFs(Uri.parse(original), original);

    const parent = Uri.from({
      scheme: "jar-fs",
      path: "/scala-library-2.13.12.jar/scala",
    });
    const sibling = Uri.from({
      scheme: "jar-fs",
      path: "/scala-library-2.13.12.jar/scala/Some.scala",
    });

    assert.strictEqual(translateJarFsToJar(parent), `${jarFile}!/scala`);
    assert.strictEqual(
      translateJarFsToJar(sibling),
      `${jarFile}!/scala/Some.scala`,
    );
  });

  test("round-trips query-free parent and sibling URIs with encoded archive paths", () => {
    const original =
      "jar:file:///home/user/My%20Libraries/scala-library-2.13.12.jar!/scala/Option.scala";
    translateJarToJarFs(Uri.parse(original), original);

    const parent = Uri.from({
      scheme: "jar-fs",
      path: "/scala-library-2.13.12.jar/scala",
    });
    const sibling = Uri.from({
      scheme: "jar-fs",
      path: "/scala-library-2.13.12.jar/scala/Some.scala",
    });

    assert.strictEqual(
      translateJarFsToJar(parent),
      "jar:file:///home/user/My%20Libraries/scala-library-2.13.12.jar!/scala",
    );
    assert.strictEqual(
      translateJarFsToJar(sibling),
      "jar:file:///home/user/My%20Libraries/scala-library-2.13.12.jar!/scala/Some.scala",
    );
  });

  test("reconstructs encoded archive paths from query without a registry entry", () => {
    const jarFs = Uri.from({
      scheme: "jar-fs",
      path: "/other.jar/com/example/Foo.scala",
      query: "jarPath=/home/user/My Libraries/other.jar",
    });

    const reconstructed = translateJarFsToJar(jarFs);

    assert.ok(reconstructed.startsWith("jar:file:"));
    assert.ok(reconstructed.includes("My%20Libraries"));
    assert.ok(reconstructed.endsWith("!/com/example/Foo.scala"));
  });
});

suite("JarFileSystemProvider archive indexing", () => {
  let jarPath: string;
  let provider: JarFileSystemProvider;

  suiteSetup(async function () {
    this.timeout(120000);
    jarPath = await fetchScalaLibrarySources();
    provider = new JarFileSystemProvider();
  });

  function jarFsUri(internalPath: string): Uri {
    const jarName = path.basename(jarPath);
    const suffix = internalPath ? `/${internalPath}` : "";
    return Uri.from({
      scheme: "jar-fs",
      path: `/${jarName}${suffix}`,
      query: `jarPath=${encodeURIComponent(jarPath)}`,
    });
  }

  test("stat resolves implicit package directories", async () => {
    // scala-library-sources omits an explicit META-INF/ zip entry.
    const metaStat = await provider.stat(jarFsUri("META-INF"));
    const scalaStat = await provider.stat(jarFsUri("scala"));

    assert.strictEqual(metaStat.type, FileType.Directory);
    assert.strictEqual(metaStat.size, 0);
    assert.strictEqual(scalaStat.type, FileType.Directory);
  });

  test("stat and read preserve explicit archive entries", async () => {
    const fileStat = await provider.stat(jarFsUri("scala/Option.scala"));
    const content = await provider.readFile(jarFsUri("scala/Option.scala"));
    const source = Buffer.from(content).toString();

    assert.strictEqual(fileStat.type, FileType.File);
    assert.ok(fileStat.size > 0);
    assert.ok(source.includes("package scala"));
    assert.ok(source.includes("class Option"));
  });

  test("readDirectory still lists package hierarchies", async () => {
    const root = new Map(await provider.readDirectory(jarFsUri("")));
    const scala = new Map(await provider.readDirectory(jarFsUri("scala")));

    assert.strictEqual(root.get("META-INF"), FileType.Directory);
    assert.strictEqual(root.get("scala"), FileType.Directory);
    assert.strictEqual(scala.get("Option.scala"), FileType.File);
    assert.strictEqual(scala.get("collection"), FileType.Directory);
  });

  test("stat still fails for missing entries", async () => {
    await assert.rejects(
      () => provider.stat(jarFsUri("scala/missing")),
      (err: unknown) => err instanceof FileSystemError,
    );
  });
});

async function fetchScalaLibrarySources(): Promise<string> {
  const coursier = await validateCoursier();
  if (!coursier) {
    throw new Error(
      "Coursier not found on PATH. Install cs (https://get-coursier.io) to run this test.",
    );
  }

  const result = await spawn(
    coursier,
    [
      "fetch",
      "--ttl",
      "Inf",
      "--classifier",
      "sources",
      "org.scala-lang:scala-library:2.13.12",
    ],
    { encoding: "utf8" },
  );
  const stdout = (result.stdout ?? "").toString();
  const jar = stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => line.endsWith("-sources.jar") && fs.existsSync(line));

  if (!jar) {
    throw new Error(
      `Coursier fetch did not return scala-library sources:\n${stdout}\n${result.stderr ?? ""}`,
    );
  }
  return jar;
}
