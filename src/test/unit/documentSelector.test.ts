import * as assert from "assert";
import { buildDocumentSelector } from "../../documentSelector";

const baseSelector = [
  { scheme: "file", language: "scala" },
  { scheme: "file", language: "java" },
  { scheme: "file", language: "twirl-html" },
  { scheme: "file", language: "twirl-xml" },
  { scheme: "file", language: "twirl-js" },
  { scheme: "file", language: "twirl-txt" },
  { scheme: "jar", language: "scala" },
  { scheme: "jar", language: "java" },
];

const jarFsSelector = [
  { scheme: "jar-fs", language: "scala" },
  { scheme: "jar-fs", language: "java" },
];

describe("buildDocumentSelector", () => {
  it("does not include proto documents when protobuf LSP is disabled", () => {
    assert.deepStrictEqual(
      buildDocumentSelector({
        protobuf: false,
        prototext: false,
        jarFileSystem: false,
      }),
      baseSelector,
    );
  });

  it("includes proto documents when protobuf LSP is enabled", () => {
    assert.deepStrictEqual(
      buildDocumentSelector({
        protobuf: true,
        prototext: false,
        jarFileSystem: false,
      }),
      [
        ...baseSelector,
        { scheme: "file", language: "proto" },
        { scheme: "jar", language: "proto" },
      ],
    );
  });

  it("includes prototext documents when prototext LSP is enabled", () => {
    assert.deepStrictEqual(
      buildDocumentSelector({
        protobuf: false,
        prototext: true,
        jarFileSystem: false,
      }),
      [
        ...baseSelector,
        { scheme: "file", language: "prototext" },
        { scheme: "jar", language: "prototext" },
      ],
    );
  });

  it("includes proto and prototext documents when both are enabled", () => {
    assert.deepStrictEqual(
      buildDocumentSelector({
        protobuf: true,
        prototext: true,
        jarFileSystem: false,
      }),
      [
        ...baseSelector,
        { scheme: "file", language: "proto" },
        { scheme: "jar", language: "proto" },
        { scheme: "file", language: "prototext" },
        { scheme: "jar", language: "prototext" },
      ],
    );
  });

  it("includes jar-fs documents when the experimental JAR filesystem is enabled", () => {
    assert.deepStrictEqual(
      buildDocumentSelector({
        protobuf: true,
        prototext: true,
        jarFileSystem: true,
      }),
      [
        ...baseSelector,
        ...jarFsSelector,
        { scheme: "file", language: "proto" },
        { scheme: "jar", language: "proto" },
        { scheme: "jar-fs", language: "proto" },
        { scheme: "file", language: "prototext" },
        { scheme: "jar", language: "prototext" },
        { scheme: "jar-fs", language: "prototext" },
      ],
    );
  });
});
