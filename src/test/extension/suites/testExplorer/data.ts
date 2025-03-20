import { Location, Range } from "vscode-languageclient/node";
import {
  AddTestCases,
  AddTestSuite,
  ClassName
} from "../../../../testExplorer/types";
import { FullyQualifiedClassName } from "../../../../types";

const defaultRange: Range = {
  start: { line: 1, character: 1 },
  end: { line: 1, character: 2 }
};

function makeLocation(uri: string, range: Range = defaultRange): Location {
  return {
    uri,
    range
  };
}
const location = makeLocation("");

export const noPackage: AddTestSuite = {
  kind: "addSuite",
  fullyQualifiedClassName: "NoPackage" as FullyQualifiedClassName,
  className: "NoPackage" as ClassName,
  symbol: "_empty_/NoPackage#",
  location,
  canResolveChildren: false
};

export const foo: AddTestSuite = {
  kind: "addSuite",
  fullyQualifiedClassName: "a.Foo" as FullyQualifiedClassName,
  className: "Foo" as ClassName,
  symbol: "a/Foo#",
  location,
  canResolveChildren: false
};

export const fooBar: AddTestSuite = {
  kind: "addSuite",
  fullyQualifiedClassName: "a.b.FooBar" as FullyQualifiedClassName,
  className: "FooBar" as ClassName,
  symbol: "a/b/FooBar#",
  location,
  canResolveChildren: false
};

export const fooTestCases: AddTestCases = {
  kind: "addTestCases",
  fullyQualifiedClassName: "a.Foo" as FullyQualifiedClassName,
  className: "Foo" as ClassName,
  testCases: [
    { name: "test1", location },
    { name: "test2", location }
  ]
};
