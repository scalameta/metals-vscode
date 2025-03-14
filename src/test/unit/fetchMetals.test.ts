import { calcServerDependency } from "../../fetchMetals";
import { assert } from "chai";

describe("fetchMetals", () => {
  describe("calcServerDependency", () => {
    function expectedDep(binaryVersion: string, serverVersion: string): string {
      return `org.scalameta:metals_${binaryVersion}:${serverVersion}`;
    }
    it("should download from appropriate binaryVersion", () => {
      assert.strictEqual(
        calcServerDependency("0.11.1"),
        expectedDep("2.12", "0.11.1")
      );
      assert.strictEqual(
        calcServerDependency("0.11.2"),
        expectedDep("2.12", "0.11.2")
      );
      assert.strictEqual(
        calcServerDependency("0.11.2-SNAPSHOT"),
        expectedDep("2.13", "0.11.2-SNAPSHOT")
      );
      assert.strictEqual(
        calcServerDependency("0.11.2-RC1"),
        expectedDep("2.12", "0.11.2-RC1")
      );
      assert.strictEqual(
        calcServerDependency("0.11.3"),
        expectedDep("2.13", "0.11.3")
      );
      assert.strictEqual(
        calcServerDependency("0.11.3-SNAPSHOT"),
        expectedDep("2.13", "0.11.3-SNAPSHOT")
      );
      assert.strictEqual(
        calcServerDependency("0.11.3-RC1"),
        expectedDep("2.13", "0.11.3-RC1")
      );
      assert.strictEqual(
        calcServerDependency("0.11.2+32-536ff4b1-SNAPSHOT"),
        expectedDep("2.13", "0.11.2+32-536ff4b1-SNAPSHOT")
      );
      const customVersion = "com.acme:metals_1.2.3:3.2.1-foobar";
      assert.strictEqual(calcServerDependency(customVersion), customVersion);
    });
  });
});
