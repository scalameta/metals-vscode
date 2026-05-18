import * as assert from "assert";
import { getCustomServerOptions } from "../../getServerOptions";

describe("getServerOptions", () => {
  describe("getCustomServerOptions", () => {
    it("uses the configured command and extension host environment", () => {
      const serverOptions = getCustomServerOptions("/usr/local/bin/metals");

      assert.strictEqual(serverOptions.run.command, "/usr/local/bin/metals");
      assert.strictEqual(serverOptions.run.options?.env, process.env);
      assert.strictEqual(serverOptions.debug.command, "/usr/local/bin/metals");
      assert.strictEqual(serverOptions.debug.options?.env, process.env);
    });
  });
});
