import { calcServerDependency } from "../fetchMetals";

describe("fetchMetals", () => {
  describe("calcServerDependency", () => {
    function expectedDep(binaryVersion: string, serverVersion: string): string {
      return `org.scalameta:metals_${binaryVersion}:${serverVersion}`;
    }
    it("should download from appropriate binaryVersion", () => {
      expect(calcServerDependency("0.11.1")).toBe(
        expectedDep("2.12", "0.11.1")
      );
      expect(calcServerDependency("0.11.2")).toBe(
        expectedDep("2.12", "0.11.2")
      );
      expect(calcServerDependency("0.11.2-SNAPSHOT")).toBe(
        expectedDep("2.13", "0.11.2-SNAPSHOT")
      );
      expect(calcServerDependency("0.11.2-RC1")).toBe(
        expectedDep("2.12", "0.11.2-RC1")
      );
      expect(calcServerDependency("0.11.3")).toBe(
        expectedDep("2.13", "0.11.3")
      );
      expect(calcServerDependency("0.11.3-SNAPSHOT")).toBe(
        expectedDep("2.13", "0.11.3-SNAPSHOT")
      );
      expect(calcServerDependency("0.11.3-RC1")).toBe(
        expectedDep("2.13", "0.11.3-RC1")
      );
      expect(calcServerDependency("0.11.2+32-536ff4b1-SNAPSHOT")).toBe(
        expectedDep("2.13", "0.11.2+32-536ff4b1-SNAPSHOT")
      );
    });
  });
});
