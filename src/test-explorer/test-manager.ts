import * as vscode from "vscode";
import { TestRunProfileKind, tests } from "vscode";
import {
  ExecuteCommandRequest,
  LanguageClient,
} from "vscode-languageclient/node";
import { testCache } from "./test-cache";
import { runHandler } from "./test-run-handler";
import {
  SuiteDiscovery,
  TargetName,
  TargetUri,
  TestDiscoveryResult,
  TestItemMetadata,
} from "./types";
import { toVscodeRange } from "./util";

export function createTestManager(
  client: LanguageClient,
  isDisabled: boolean
): TestManager {
  return new TestManager(client, isDisabled);
}

class TestManager {
  readonly testController = tests.createTestController(
    "metalsTestController",
    "Metals Test Explorer"
  );

  private isDisabled = false;
  private isRunning = false;

  constructor(private readonly client: LanguageClient, isDisabled: boolean) {
    if (isDisabled) {
      this.disable();
    }
    this.testController.resolveHandler = async (item?: vscode.TestItem) => {
      if (item != null) {
        return;
      } else {
        await this.discoverTestSuites();
      }
    };

    const callback = () => (this.isRunning = false);

    this.testController.createRunProfile(
      "Run",
      TestRunProfileKind.Run,
      (request, token) => {
        if (!this.isRunning) {
          this.isRunning = true;
          runHandler(this.testController, true, callback, request, token);
        }
      },
      true
    );

    this.testController.createRunProfile(
      "Debug",
      TestRunProfileKind.Debug,
      (request, token) => {
        if (!this.isRunning) {
          this.isRunning = true;
          runHandler(this.testController, false, callback, request, token);
        }
      },
      false
    );
  }

  async enable(): Promise<void> {
    this.isDisabled = false;
    await this.discoverTestSuites();
  }

  /**
   * Disables test manager, also it deletes all discovered test items in order to hide gutter icons.
   */
  disable(): void {
    this.testController.items.forEach((item) =>
      this.testController.items.delete(item.id)
    );
    this.isDisabled = true;
  }

  discoverTestSuites(): Promise<void> {
    if (this.isDisabled) {
      return Promise.resolve();
    }

    return this.client
      .sendRequest(ExecuteCommandRequest.type, {
        command: "discover-test-suites",
      })
      .then(
        (value: SuiteDiscovery[]) => {
          for (const { targetName, targetUri, discovered } of value) {
            const rootNode = this.testController.createTestItem(
              targetName,
              targetName
            );
            createTestItems(
              this.testController,
              discovered,
              rootNode,
              targetName,
              targetUri
            );
            const data: TestItemMetadata = {
              kind: "project",
              targetName,
              targetUri,
            };
            testCache.setMetadata(rootNode, data);
            this.testController.items.add(rootNode);
          }
        },
        (err) => console.error(err)
      );
  }
}

/**
 * Create TestItems from the given @param discoveredArray and add them to the @param parent
 */
function createTestItems(
  testController: vscode.TestController,
  discoveredArray: TestDiscoveryResult[],
  parent: vscode.TestItem,
  targetName: TargetName,
  targetUri: TargetUri
) {
  for (const discovered of discoveredArray) {
    if (discovered.kind === "suite") {
      const { className, location, fullyQualifiedName } = discovered;
      const parsedUri = vscode.Uri.parse(location.uri);
      const parsedRange = toVscodeRange(location.range);
      const testItem = testController.createTestItem(
        fullyQualifiedName,
        className,
        parsedUri
      );
      testItem.range = parsedRange;
      const data: TestItemMetadata = {
        kind: "suite",
        targetName,
        targetUri,
      };
      testCache.setMetadata(testItem, data);
      parent.children.add(testItem);
    } else {
      const data: TestItemMetadata = {
        kind: "package",
        targetName,
        targetUri,
      };

      const packageNode = testController.createTestItem(
        `${parent.id}.${discovered.prefix}`,
        discovered.prefix
      );
      parent.children.add(packageNode);
      testCache.setMetadata(packageNode, data);
      createTestItems(
        testController,
        discovered.children,
        packageNode,
        targetName,
        targetUri
      );
    }
  }
}
