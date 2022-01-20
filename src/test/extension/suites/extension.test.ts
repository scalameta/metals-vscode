import * as assert from "assert";
import * as vscode from "vscode";

suite("Extension: ", () => {
  test("should be present", () => {
    assert.ok(vscode.extensions.getExtension("scalameta.metals"));
  });

  test("should activate", async () => {
    await vscode.extensions.getExtension("scalameta.metals")?.activate();
    return assert.ok(true);
  }).timeout(1 * 30 * 1000); // 30 seconds
});
