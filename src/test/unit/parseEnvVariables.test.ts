import * as assert from "assert";
import { parseEnvVariables } from "../../debugger/parseEnvVariables";

describe("parseEnvVariables", () => {

    it("ignores malformed entries without a valid key", () => {
        const result = parseEnvVariables(["NO_EQUALS", "=value", "OK=1"]);
        assert.deepStrictEqual(result, { OK: "1" });
    });


    it("parses simple key=value pairs", () => {
        const result = parseEnvVariables(["FOO=bar", "BAZ=qux"]);
        assert.deepStrictEqual(result, { FOO: "bar", BAZ: "qux" });
    });

    it("preserves values containing '=' characters", () => {
        const result = parseEnvVariables([
            "JAVA_TOOL_OPTIONS=-Dhttp.proxyHost=cias.example.com -Dhttp.proxyPort=8080",
        ]);
        assert.deepStrictEqual(result, {
            JAVA_TOOL_OPTIONS:
                "-Dhttp.proxyHost=cias.example.com -Dhttp.proxyPort=8080",
        });
    });

    it("handles multiple '=' in value", () => {
        const result = parseEnvVariables(["OPTS=a=b=c=d"]);
        assert.deepStrictEqual(result, { OPTS: "a=b=c=d" });
    });

    it("handles empty value", () => {
        const result = parseEnvVariables(["EMPTY="]);
        assert.deepStrictEqual(result, { EMPTY: "" });
    });

    it("returns empty object for empty input", () => {
        const result = parseEnvVariables([]);
        assert.deepStrictEqual(result, {});
    });
});
