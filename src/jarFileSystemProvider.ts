import {
  FileSystemProvider,
  FileType,
  FileStat,
  Uri,
  Event,
  EventEmitter,
  Disposable,
  FileChangeEvent,
  FileSystemError,
} from "vscode";
import * as yauzl from "yauzl";
import * as fs from "fs";

/**
 * Entry in a JAR directory listing
 */
interface JarEntry {
  name: string;
  type: FileType;
  size: number;
}

/**
 * Parsed components of a jar: URI
 */
interface JarUriComponents {
  jarPath: string;
  internalPath: string;
}

/**
 * Global registry mapping jar-fs URIs back to original jar: URIs.
 * This is populated by translateJarToJarFs and used by JarFileSystemProvider.
 */
const jarFsToJarUri = new Map<string, string>();

/**
 * Translates a jar-fs: URI back to the original jar: URI for sending to Metals.
 * Returns the original URI string if no translation is found or if not a jar-fs URI.
 */
export function translateJarFsToJar(uri: Uri): string {
  if (uri.scheme !== "jar-fs") {
    return uri.toString();
  }

  // First, try to reconstruct from query parameter (self-contained URI)
  if (uri.query) {
    const params = new URLSearchParams(uri.query);
    const jarPath = params.get("jarPath");
    if (jarPath) {
      // Path format: /jarName.jar/internal/path
      const pathParts = uri.path.split("/").filter((p) => p);
      const internalPath = pathParts.slice(1).join("/");
      return `jar:file://${jarPath}!/${internalPath}`;
    }
  }

  const uriString = uri.toString();

  // Direct lookup in the registry
  const directMatch = jarFsToJarUri.get(uriString);
  if (directMatch) {
    return directMatch;
  }

  // Try to find a matching base URI and reconstruct the full path
  const path = uri.path;
  const parts = path.split("/").filter((p) => p);

  for (let i = parts.length; i >= 1; i--) {
    const testPath = "/" + parts.slice(0, i).join("/");
    const testUri = uri.with({ path: testPath }).toString();

    const jarUri = jarFsToJarUri.get(testUri);
    if (jarUri) {
      const additionalPath = path.substring(testPath.length);
      const separatorIndex = jarUri.indexOf("!/");
      if (separatorIndex !== -1) {
        const basePart = jarUri.substring(0, separatorIndex + 2);
        const internalPart = jarUri.substring(separatorIndex + 2);
        return basePart + internalPart + additionalPath;
      }
    }
  }

  return uriString;
}

/**
 * FileSystemProvider implementation for browsing JAR dependency sources.
 *
 * This provider enables proper file path breadcrumbs and enhanced navigation
 * for dependency sources by implementing VS Code's FileSystemProvider interface.
 *
 * URI scheme: jar-fs:/artifact-name-1.0.0.jar/com/example/MyClass.scala
 *
 * The provider reads JAR files directly using the yauzl library, without
 * requiring server-side support.
 *
 * Caching is implemented for all operations since JAR contents don't change.
 */
export class JarFileSystemProvider implements FileSystemProvider {
  private _onDidChangeFile = new EventEmitter<FileChangeEvent[]>();
  readonly onDidChangeFile: Event<FileChangeEvent[]> =
    this._onDidChangeFile.event;

  private statCache = new Map<string, FileStat>();
  private dirCache = new Map<string, [string, FileType][]>();
  private contentCache = new Map<string, Uint8Array>();
  private jarEntriesCache = new Map<string, Map<string, JarEntry>>();

  /**
   * Get file/directory metadata.
   * Results are cached since JAR contents don't change.
   */
  async stat(uri: Uri): Promise<FileStat> {
    const key = uri.toString();

    const cached = this.statCache.get(key);
    if (cached) {
      return cached;
    }

    const components = this.resolveJarComponents(uri);
    if (!components) {
      throw FileSystemError.FileNotFound(uri);
    }

    const entries = await this.getJarEntries(components.jarPath);
    const entry = entries.get(components.internalPath);

    if (!entry) {
      if (components.internalPath === "" || components.internalPath === "/") {
        const stat: FileStat = {
          type: FileType.Directory,
          ctime: 0,
          mtime: 0,
          size: 0,
        };
        this.statCache.set(key, stat);
        return stat;
      }
      throw FileSystemError.FileNotFound(uri);
    }

    const stat: FileStat = {
      type: entry.type,
      ctime: 0,
      mtime: 0,
      size: entry.size,
    };

    this.statCache.set(key, stat);
    return stat;
  }

  /**
   * List directory contents.
   * This enables breadcrumb dropdowns for navigating package hierarchies.
   * Results are cached since JAR contents don't change.
   */
  async readDirectory(uri: Uri): Promise<[string, FileType][]> {
    const key = uri.toString();

    const cached = this.dirCache.get(key);
    if (cached) {
      return cached;
    }

    const components = this.resolveJarComponents(uri);
    if (!components) {
      throw FileSystemError.FileNotFound(uri);
    }

    const entries = await this.getJarEntries(components.jarPath);
    const dirPath = components.internalPath.endsWith("/")
      ? components.internalPath
      : components.internalPath + "/";
    const normalizedDirPath = dirPath === "/" ? "" : dirPath;

    const result: [string, FileType][] = [];
    const seen = new Set<string>();

    for (const [entryPath, entry] of entries) {
      if (!entryPath.startsWith(normalizedDirPath)) {
        continue;
      }

      const relativePath = entryPath.substring(normalizedDirPath.length);
      if (!relativePath || relativePath.startsWith("/")) {
        continue;
      }

      const slashIndex = relativePath.indexOf("/");
      if (slashIndex === -1) {
        if (!seen.has(relativePath)) {
          seen.add(relativePath);
          result.push([relativePath, entry.type]);
        }
      } else {
        const dirName = relativePath.substring(0, slashIndex);
        if (!seen.has(dirName)) {
          seen.add(dirName);
          result.push([dirName, FileType.Directory]);
        }
      }
    }

    this.dirCache.set(key, result);
    return result;
  }

  /**
   * Read file content directly from the JAR.
   * Results are cached since JAR contents don't change.
   */
  async readFile(uri: Uri): Promise<Uint8Array> {
    const key = uri.toString();

    const cached = this.contentCache.get(key);
    if (cached) {
      return cached;
    }

    const components = this.resolveJarComponents(uri);
    if (!components) {
      throw FileSystemError.FileNotFound(uri);
    }

    const content = await this.readJarEntry(
      components.jarPath,
      components.internalPath,
    );
    this.contentCache.set(key, content);
    return content;
  }

  /**
   * Watch for file changes - no-op since JAR contents are read-only.
   */
  watch(): Disposable {
    return { dispose: () => {} };
  }

  /**
   * Clear all caches. Call when JARs may have changed (e.g., after build import).
   */
  clearCache(): void {
    this.statCache.clear();
    this.dirCache.clear();
    this.contentCache.clear();
    this.jarEntriesCache.clear();
  }

  createDirectory(): void {
    throw FileSystemError.NoPermissions("JAR filesystem is read-only");
  }

  writeFile(): void {
    throw FileSystemError.NoPermissions("JAR filesystem is read-only");
  }

  delete(): void {
    throw FileSystemError.NoPermissions("JAR filesystem is read-only");
  }

  rename(): void {
    throw FileSystemError.NoPermissions("JAR filesystem is read-only");
  }

  /**
   * Resolve a jar-fs URI to its JAR file path and internal path components.
   */
  private resolveJarComponents(uri: Uri): JarUriComponents | undefined {
    // First, try to extract from query parameter (self-contained URI)
    const fromQuery = this.parseJarFsUriFromQuery(uri);
    if (fromQuery) {
      return fromQuery;
    }

    // Fall back to registry lookup
    const originalJarUri = jarFsToJarUri.get(uri.toString());
    if (originalJarUri) {
      return parseJarUri(originalJarUri);
    }

    // Try to find from path matching
    return this.parseJarFsUriFromPath(uri);
  }

  /**
   * Parse jar-fs URI components from the query parameter.
   * URI format: jar-fs:/jarName.jar/internal/path?jarPath=%2Fpath%2Fto%2FjarName.jar
   */
  private parseJarFsUriFromQuery(uri: Uri): JarUriComponents | undefined {
    if (!uri.query) {
      return undefined;
    }

    const params = new URLSearchParams(uri.query);
    const jarPath = params.get("jarPath");
    if (!jarPath) {
      return undefined;
    }

    // Path format: /jarName.jar/internal/path
    // We need to extract the internal path (everything after the JAR name)
    const pathParts = uri.path.split("/").filter((p) => p);
    if (pathParts.length < 1) {
      return undefined;
    }

    // First part is the JAR name, rest is the internal path
    const internalPath = pathParts.slice(1).join("/");

    return { jarPath, internalPath };
  }

  /**
   * Try to find the JAR path from a jar-fs URI by looking up parent paths
   * in the registry.
   */
  private parseJarFsUriFromPath(uri: Uri): JarUriComponents | undefined {
    const path = uri.path;
    const parts = path.split("/").filter((p) => p);

    for (let i = parts.length; i >= 1; i--) {
      const testPath = "/" + parts.slice(0, i).join("/");
      const testUri = uri.with({ path: testPath }).toString();

      for (const [jarFsUri, jarUri] of jarFsToJarUri) {
        if (jarFsUri.startsWith(testUri) || testUri.startsWith(jarFsUri)) {
          const components = parseJarUri(jarUri);
          if (components) {
            const jarFsParsed = Uri.parse(jarFsUri);
            const jarFsInternalStart = jarFsParsed.path.length;
            const additionalPath = path.substring(jarFsInternalStart);
            return {
              jarPath: components.jarPath,
              internalPath: components.internalPath + additionalPath,
            };
          }
        }
      }
    }

    return undefined;
  }

  /**
   * Get all entries from a JAR file, cached for performance.
   */
  private async getJarEntries(jarPath: string): Promise<Map<string, JarEntry>> {
    const cached = this.jarEntriesCache.get(jarPath);
    if (cached) {
      return cached;
    }

    const entries = new Map<string, JarEntry>();

    await new Promise<void>((resolve, reject) => {
      yauzl.open(jarPath, { lazyEntries: true }, (err, zipfile) => {
        if (err || !zipfile) {
          reject(err || new Error("Failed to open JAR"));
          return;
        }

        zipfile.readEntry();
        zipfile.on("entry", (entry: yauzl.Entry) => {
          const isDirectory = entry.fileName.endsWith("/");
          const name = isDirectory
            ? entry.fileName.slice(0, -1)
            : entry.fileName;

          entries.set(name, {
            name: name.split("/").pop() || name,
            type: isDirectory ? FileType.Directory : FileType.File,
            size: entry.uncompressedSize,
          });

          zipfile.readEntry();
        });

        zipfile.on("end", () => resolve());
        zipfile.on("error", reject);
      });
    });

    this.jarEntriesCache.set(jarPath, entries);
    return entries;
  }

  /**
   * Read a specific entry from a JAR file.
   */
  private async readJarEntry(
    jarPath: string,
    internalPath: string,
  ): Promise<Uint8Array> {
    return new Promise((resolve, reject) => {
      yauzl.open(jarPath, { lazyEntries: true }, (err, zipfile) => {
        if (err || !zipfile) {
          reject(err || new Error("Failed to open JAR"));
          return;
        }

        zipfile.readEntry();
        zipfile.on("entry", (entry: yauzl.Entry) => {
          const entryName = entry.fileName.endsWith("/")
            ? entry.fileName.slice(0, -1)
            : entry.fileName;

          if (entryName === internalPath) {
            zipfile.openReadStream(entry, (err, readStream) => {
              if (err || !readStream) {
                reject(err || new Error("Failed to read entry"));
                return;
              }

              const chunks: Buffer[] = [];
              readStream.on("data", (chunk: Buffer) => chunks.push(chunk));
              readStream.on("end", () => {
                resolve(new Uint8Array(Buffer.concat(chunks)));
                zipfile.close();
              });
              readStream.on("error", reject);
            });
          } else {
            zipfile.readEntry();
          }
        });

        zipfile.on("end", () => {
          reject(FileSystemError.FileNotFound(internalPath));
        });
        zipfile.on("error", reject);
      });
    });
  }
}

/**
 * Parse a jar: URI into its components.
 *
 * Input: jar:file:///path/to/scala-library-2.13.12.jar!/scala/Option.scala
 * Output: { jarPath: "/path/to/scala-library-2.13.12.jar", internalPath: "scala/Option.scala" }
 */
export function parseJarUri(uriString: string): JarUriComponents | undefined {
  const decoded = decodeURIComponent(uriString);

  const jarSeparatorIndex = decoded.indexOf("!/");
  if (jarSeparatorIndex === -1) {
    return undefined;
  }

  let jarPath = decoded.substring(0, jarSeparatorIndex);
  const internalPath = decoded.substring(jarSeparatorIndex + 2);

  if (jarPath.startsWith("jar:file://")) {
    jarPath = jarPath.substring("jar:file://".length);
  } else if (jarPath.startsWith("jar:file:")) {
    jarPath = jarPath.substring("jar:file:".length);
  }

  if (jarPath.startsWith("//")) {
    jarPath = jarPath.substring(1);
  }

  return { jarPath, internalPath };
}

/**
 * Translates a jar: URI to a jar-fs: URI for use with the FileSystemProvider.
 *
 * Input format:  jar:file:///path/to/scala-library-2.13.12.jar!/scala/Option.scala
 * Output format: jar-fs:/scala-library-2.13.12.jar/scala/Option.scala?jarPath=%2Fpath%2Fto%2Fscala-library-2.13.12.jar
 *
 * The full JAR path is encoded in the query parameter so the URI is self-contained
 * and can be resolved without needing a registry (survives extension restarts).
 */
export function translateJarToJarFs(uri: Uri): Uri {
  if (uri.scheme !== "jar") {
    return uri;
  }

  const decoded = decodeURIComponent(uri.toString());

  const jarSeparatorIndex = decoded.indexOf("!/");
  if (jarSeparatorIndex === -1) {
    return uri;
  }

  let fullJarPath = decoded.substring(0, jarSeparatorIndex);
  const internalPath = decoded.substring(jarSeparatorIndex + 2);

  // Extract the actual filesystem path from jar:file:// prefix
  if (fullJarPath.startsWith("jar:file://")) {
    fullJarPath = fullJarPath.substring("jar:file://".length);
  } else if (fullJarPath.startsWith("jar:file:")) {
    fullJarPath = fullJarPath.substring("jar:file:".length);
  }
  if (fullJarPath.startsWith("//")) {
    fullJarPath = fullJarPath.substring(1);
  }

  const lastSlash = fullJarPath.lastIndexOf("/");
  const jarName =
    lastSlash !== -1 ? fullJarPath.substring(lastSlash + 1) : fullJarPath;

  // Encode the full JAR path in the query parameter
  const jarFsUri = Uri.parse(`jar-fs:/${jarName}/${internalPath}`).with({
    query: `jarPath=${encodeURIComponent(fullJarPath)}`,
  });

  // Also store in registry for backwards compatibility and translateJarFsToJar
  jarFsToJarUri.set(jarFsUri.toString(), decoded);

  return jarFsUri;
}

/**
 * Check if a JAR file exists on the filesystem.
 */
export function jarExists(jarPath: string): boolean {
  try {
    return fs.existsSync(jarPath);
  } catch {
    return false;
  }
}
