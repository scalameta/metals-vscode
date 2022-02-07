import assert from "assert";
import * as vscode from "vscode";
import { addTestCases } from "../../../../test-explorer/add-test-cases";
import { addTestSuite } from "../../../../test-explorer/add-test-suite";
import { removeTestItem } from "../../../../test-explorer/remove-test-item";
import { foo, fooTestCases, noPackage } from "./data";
import { buildTarget, prettyPrint, randomString } from "./util";

const [targetName, targetUri] = buildTarget("app", "");

interface TestItem {
  id: string;
  label: string;
  children: TestItem[];
}

function compareTestItem(item: vscode.TestItem, expected: TestItem) {
  assert.equal(item.id, expected.id);
  assert.equal(item.label, expected.label);
  assert.equal(item.children.size, expected.children.length);
}

function checkTestController(
  controller: vscode.TestController,
  expectedRoot: TestItem
): void {
  function checkTestItem(
    node: vscode.TestItem | undefined,
    expected: TestItem
  ) {
    assert(
      node != null,
      `There is no test item for id ${expected.id}\n${prettyPrint(
        controller.items
      )}`
    );
    if (node) {
      compareTestItem(node, expected);
      for (const child of expected.children) {
        checkTestItem(node.children.get(child.id), child);
      }
    }
  }

  checkTestItem(controller.items.get(expectedRoot.id), expectedRoot);
}

suite("Test Explorer events", () => {
  const testController = vscode.tests.createTestController(
    "testController" + randomString(),
    "Test Explorer"
  );

  const cleanup = () => {
    testController.items.replace([]);
  };

  test("add suite without package", () => {
    addTestSuite(testController, targetName, targetUri, noPackage);

    checkTestController(testController, {
      id: targetName,
      label: targetName,
      children: [{ id: "NoPackage", label: "NoPackage", children: [] }],
    });
    cleanup();
  });

  test("add suite with package", () => {
    addTestSuite(testController, targetName, targetUri, noPackage);
    addTestSuite(testController, targetName, targetUri, foo);

    checkTestController(testController, {
      id: targetName,
      label: targetName,
      children: [
        { id: "NoPackage", label: "NoPackage", children: [] },
        {
          id: "a",
          label: "a",
          children: [{ id: "a.Foo", label: "Foo", children: [] }],
        },
      ],
    });
    cleanup();
  });

  test("remove suite", () => {
    addTestSuite(testController, targetName, targetUri, noPackage);
    addTestSuite(testController, targetName, targetUri, foo);
    removeTestItem(testController, targetName, { ...foo, kind: "removeSuite" });

    checkTestController(testController, {
      id: targetName,
      label: targetName,
      children: [{ id: "NoPackage", label: "NoPackage", children: [] }],
    });
    cleanup();
  });

  test("add test cases", () => {
    addTestSuite(testController, targetName, targetUri, noPackage);
    addTestSuite(testController, targetName, targetUri, foo);
    addTestCases(testController, targetName, targetUri, fooTestCases);

    checkTestController(testController, {
      id: targetName,
      label: targetName,
      children: [
        { id: "NoPackage", label: "NoPackage", children: [] },
        {
          id: "a",
          label: "a",
          children: [
            {
              id: "a.Foo",
              label: "Foo",
              children: [
                { id: "a.Foo.test1", label: "test1", children: [] },
                { id: "a.Foo.test2", label: "test2", children: [] },
              ],
            },
          ],
        },
      ],
    });
    cleanup();
  });
});
