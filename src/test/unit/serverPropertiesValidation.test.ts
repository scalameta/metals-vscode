import { assert } from "chai";
import * as fs from "fs";
import * as path from "path";
import {
  jvmOptionPattern,
  jvmOptionPatternString,
} from "../../jvmOptionsPattern";

describe("serverProperties validation pattern", () => {
  let packageJsonPattern: string;

  before(() => {
    const packageJsonPath = path.join(__dirname, "../../../package.json");
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
    packageJsonPattern =
      packageJson.contributes.configuration.properties[
        "metals.serverProperties"
      ].items.pattern;
  });

  it("extension pattern matches package.json pattern", () => {
    assert.strictEqual(
      jvmOptionPatternString,
      packageJsonPattern,
      "Pattern from jvmOptionsPattern.ts should match the pattern defined in package.json",
    );
  });

  describe("should accept valid JVM options", () => {
    const validOptions = [
      // -X options
      "-Xmx2G",
      "-Xms100m",
      "-Xss4m",
      "-Xmx1024m",
      // -D options
      "-Dmetals.statistics=all",
      "-Dmetals.client=vscode",
      "-Dhttps.proxyHost=proxy.example.com",
      "-Dhttps.proxyPort=8080",
      "-Dfile.encoding=UTF-8",
      "-Dmetals.http=true",
      "-Dsome.property",
      // -XX options
      "-XX:+UseZGC",
      "-XX:-UseG1GC",
      "-XX:ZUncommitDelay=30",
      "-XX:ZCollectionInterval=5",
      "-XX:+IgnoreUnrecognizedVMOptions",
      "-XX:MaxMetaspaceSize=512m",
      // -agentlib options (for JVM debugging)
      "-agentlib:jdwp",
      "-agentlib:jdwp=transport=dt_socket,server=y,suspend=n,address=5005",
      "-agentlib:jdwp=transport=dt_socket,server=y,suspend=n,address=5005,quiet=y",
      "-agentlib:jdwp=transport=dt_socket,server=y,suspend=y,address=localhost:5005",
      // -agentpath options
      "-agentpath:/path/to/agent.so",
      "-agentpath:/path/to/agent.so=option1,option2",
      "-agentpath:C:/agents/myagent.dll",
      // Simple options
      "-ea",
      "-da",
      "-server",
      "-verbose",
    ];

    validOptions.forEach((option) => {
      it(`accepts "${option}"`, () => {
        assert.isTrue(
          jvmOptionPattern.test(option),
          `Pattern should accept "${option}"`,
        );
      });
    });
  });

  describe("should reject invalid JVM options", () => {
    const invalidOptions = [
      // Missing dash
      "Xmx2G",
      "Dmetals.statistics=all",
      // Spaces in values
      "-Dproperty=value with spaces",
      // Empty
      "",
      "-",
      // Random strings
      "not-an-option",
      "random",
    ];

    invalidOptions.forEach((option) => {
      it(`rejects "${option}"`, () => {
        assert.isFalse(
          jvmOptionPattern.test(option),
          `Pattern should reject "${option}"`,
        );
      });
    });
  });
});
