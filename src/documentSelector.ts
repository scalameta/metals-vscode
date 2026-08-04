import { LanguageClientOptions } from "vscode-languageclient/node";

export interface LanguageSupport {
  protobuf: boolean;
  prototext: boolean;
}

export function buildDocumentSelector({
  protobuf,
  prototext,
}: LanguageSupport): LanguageClientOptions["documentSelector"] {
  const documentSelector: LanguageClientOptions["documentSelector"] = [
    { scheme: "file", language: "scala" },
    { scheme: "file", language: "java" },
    { scheme: "file", language: "twirl-html" },
    { scheme: "file", language: "twirl-xml" },
    { scheme: "file", language: "twirl-js" },
    { scheme: "file", language: "twirl-txt" },
    { scheme: "jar", language: "scala" },
    { scheme: "jar", language: "java" },
    { scheme: "jar-fs", language: "scala" },
    { scheme: "jar-fs", language: "java" },
  ];

  if (protobuf) {
    documentSelector.push(
      { scheme: "file", language: "proto" },
      { scheme: "jar", language: "proto" },
      { scheme: "jar-fs", language: "proto" },
    );
  }

  if (prototext) {
    documentSelector.push(
      { scheme: "file", language: "prototext" },
      { scheme: "jar", language: "prototext" },
      { scheme: "jar-fs", language: "prototext" },
    );
  }

  return documentSelector;
}
