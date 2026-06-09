import * as assert from "assert";
import { buildDocumentSelector } from "../../documentSelector";

describe("buildDocumentSelector", () => {
  it("does not include proto documents by default", () => {
    assert.deepStrictEqual(
      buildDocumentSelector({ protobuf: false, prototext: false }),
      [
        { scheme: "file", language: "scala" },
        { scheme: "file", language: "java" },
        { scheme: "file", language: "twirl-html" },
        { scheme: "file", language: "twirl-xml" },
        { scheme: "file", language: "twirl-js" },
        { scheme: "file", language: "twirl-txt" },
        { scheme: "jar", language: "scala" },
        { scheme: "jar", language: "java" },
      ],
    );
  });

  it("includes proto documents when protobuf LSP is enabled", () => {
    assert.deepStrictEqual(
      buildDocumentSelector({ protobuf: true, prototext: false }),
      [
        { scheme: "file", language: "scala" },
        { scheme: "file", language: "java" },
        { scheme: "file", language: "twirl-html" },
        { scheme: "file", language: "twirl-xml" },
        { scheme: "file", language: "twirl-js" },
        { scheme: "file", language: "twirl-txt" },
        { scheme: "jar", language: "scala" },
        { scheme: "jar", language: "java" },
        { scheme: "file", language: "proto" },
        { scheme: "jar", language: "proto" },
      ],
    );
  });

  it("includes prototext documents when prototext LSP is enabled", () => {
    assert.deepStrictEqual(
      buildDocumentSelector({ protobuf: false, prototext: true }),
      [
        { scheme: "file", language: "scala" },
        { scheme: "file", language: "java" },
        { scheme: "file", language: "twirl-html" },
        { scheme: "file", language: "twirl-xml" },
        { scheme: "file", language: "twirl-js" },
        { scheme: "file", language: "twirl-txt" },
        { scheme: "jar", language: "scala" },
        { scheme: "jar", language: "java" },
        { scheme: "file", language: "prototext" },
        { scheme: "jar", language: "prototext" },
      ],
    );
  });

  it("includes proto and prototext documents when both are enabled", () => {
    assert.deepStrictEqual(
      buildDocumentSelector({ protobuf: true, prototext: true }),
      [
        { scheme: "file", language: "scala" },
        { scheme: "file", language: "java" },
        { scheme: "file", language: "twirl-html" },
        { scheme: "file", language: "twirl-xml" },
        { scheme: "file", language: "twirl-js" },
        { scheme: "file", language: "twirl-txt" },
        { scheme: "jar", language: "scala" },
        { scheme: "jar", language: "java" },
        { scheme: "file", language: "proto" },
        { scheme: "jar", language: "proto" },
        { scheme: "file", language: "prototext" },
        { scheme: "jar", language: "prototext" },
      ],
    );
  });
});
