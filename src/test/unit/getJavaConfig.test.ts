import * as assert from "assert";
import { formatExtraEnv } from "../../getJavaConfig";

describe("getJavaConfig", () => {
  describe("formatExtraEnv", () => {
    it("serializes empty extra env as json", () => {
      assert.strictEqual(formatExtraEnv({}), "{}");
    });

    it("serializes extra env entries as json", () => {
      assert.strictEqual(
        formatExtraEnv({
          COURSIER_REPOSITORIES: "repo1|repo2",
          COURSIER_MIRRORS: "/tmp/mirrors.json",
        }),
        '{"COURSIER_REPOSITORIES":"repo1|repo2","COURSIER_MIRRORS":"/tmp/mirrors.json"}',
      );
    });
  });
});
