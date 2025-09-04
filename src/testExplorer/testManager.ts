import * as vscode from "vscode";
import { TestRunProfileKind, tests } from "vscode";
import {
  ExecuteCommandRequest,
  LanguageClient,
} from "vscode-languageclient/node";
import { addTestCases } from "./addTestCases";
import { addTestSuite } from "./addTestSuites";
import { removeTestItem } from "./removeTestItem";
import { runHandler } from "./testRunHandler";
import { BuildTargetUpdate, FolderName, FolderUri } from "./types";
import { updateTestSuiteLocation } from "./updateTestSuiteLocation";

export function createTestManager(
  client: LanguageClient,
  isDisabled: boolean,
  environmentVariables: () => Record<string, string>,
): TestManager {
  return new TestManager(client, isDisabled, environmentVariables);
}

class TestManager {
  readonly testController = tests.createTestController(
    "metalsTestController",
    "Metals Test Explorer",
  );

  private isDisabled = false;
  private isRunning = false;
  private environmentVariables: () => Record<string, string> = () => ({});

  constructor(
    private readonly client: LanguageClient,
    isDisabled: boolean,
    environmentVariables: () => Record<string, string>,
  ) {
    if (isDisabled) {
      this.disable();
    }

    this.environmentVariables = environmentVariables;

    const callback = () => (this.isRunning = false);

    this.testController.createRunProfile(
      "Run",
      TestRunProfileKind.Run,
      (request, token) => {
        if (!this.isRunning) {
          this.isRunning = true;
          runHandler(
            this.testController,
            true,
            callback,
            request,
            token,
            this.environmentVariables,
          );
        }
      },
      true,
    );

    this.testController.createRunProfile(
      "Debug",
      TestRunProfileKind.Debug,
      (request, token) => {
        if (!this.isRunning) {
          this.isRunning = true;
          runHandler(
            this.testController,
            false,
            callback,
            request,
            token,
            this.environmentVariables,
          );
        }
      },
      false,
    );

    this.testController.resolveHandler = async (item?: vscode.TestItem) => {
      const uri = item?.uri?.toString();
      if (uri) {
        await this.discoverTestSuites(uri);
      }
    };
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
      this.testController.items.delete(item.id),
    );
    this.isDisabled = true;
  }

  updateTestExplorer(updates: BuildTargetUpdate[]) {
    for (const {
      targetUri,
      targetName,
      folderUri,
      folderName,
      events,
    } of updates) {
      const folderUri_ = folderUri || ("root" as FolderUri);
      const folderName_ = folderName || ("root" as FolderName);
      for (const event of events) {
        if (event.kind === "removeSuite") {
          removeTestItem(this.testController, targetUri, folderUri_, event);
        } else if (event.kind === "addSuite") {
          addTestSuite(
            this.testController,
            targetName,
            targetUri,
            folderName_,
            folderUri_,
            event,
          );
        } else if (event.kind === "updateSuiteLocation") {
          updateTestSuiteLocation(
            this.testController,
            targetUri,
            folderUri_,
            event,
          );
        } else if (event.kind === "addTestCases") {
          addTestCases(
            this.testController,
            targetName,
            targetUri,
            folderUri_,
            event,
          );
        }
      }
    }
  }

  discoverTestSuites(uri?: string): Promise<void> {
    if (this.isDisabled) {
      return Promise.resolve();
    }

    const args = uri ? [{ uri }] : [{}];

    return this.client
      .sendRequest(ExecuteCommandRequest.type, {
        command: "discover-tests",
        arguments: args,
      })
      .then(
        (updates: BuildTargetUpdate[]) => {
          this.updateTestExplorer(updates);
        },
        (err) => console.error(err),
      );
  }
}
