import * as yauzl from "yauzl";

const REQUIRED_VM_OPTIONS_PATH = "META-INF/metals-required-vm-options.txt";

/**
 * Reads the required VM options from the first JAR in the metals classpath.
 * The JAR is expected to contain a META-INF/metals-required-vm-options.txt file
 * with one VM option per line.
 *
 * @param metalsClasspath The classpath string (colon or semicolon separated JAR paths)
 * @returns Array of VM options read from the JAR, or empty array if not found
 */
export async function readRequiredVmOptions(
  metalsClasspath: string,
): Promise<string[]> {
  const separator = process.platform === "win32" ? ";" : ":";
  const jars = metalsClasspath.split(separator);

  if (jars.length === 0) {
    return [];
  }

  const firstJar = jars[0];
  if (!firstJar || !firstJar.endsWith(".jar")) {
    return [];
  }

  try {
    return await readVmOptionsFromJar(firstJar);
  } catch (_error) {
    // If we can't read the JAR or the entry doesn't exist, just return empty array
    // This ensures backwards compatibility with older Metals versions
    return [];
  }
}

async function readVmOptionsFromJar(jarPath: string): Promise<string[]> {
  return new Promise((resolve, reject) => {
    yauzl.open(jarPath, { lazyEntries: true }, (err, zipfile) => {
      if (err) {
        reject(err);
        return;
      }
      if (!zipfile) {
        resolve([]);
        return;
      }

      let found = false;

      zipfile.on("entry", (entry) => {
        if (entry.fileName === REQUIRED_VM_OPTIONS_PATH) {
          found = true;
          zipfile.openReadStream(entry, (err, readStream) => {
            if (err) {
              zipfile.close();
              reject(err);
              return;
            }
            if (!readStream) {
              zipfile.close();
              resolve([]);
              return;
            }

            const chunks: Buffer[] = [];
            readStream.on("data", (chunk) => chunks.push(chunk));
            readStream.on("end", () => {
              zipfile.close();
              const content = Buffer.concat(chunks).toString("utf-8");
              const options = content
                .split("\n")
                .map((line) => line.trim())
                .filter((line) => line.length > 0 && !line.startsWith("#"));
              resolve(options);
            });
            readStream.on("error", (err) => {
              zipfile.close();
              reject(err);
            });
          });
        } else {
          zipfile.readEntry();
        }
      });

      zipfile.on("end", () => {
        if (!found) {
          zipfile.close();
          resolve([]);
        }
      });

      zipfile.on("error", (err) => {
        reject(err);
      });

      zipfile.readEntry();
    });
  });
}
