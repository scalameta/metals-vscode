import * as vscode from "vscode";
import { TestItemMetadata, TestSuiteResult } from "./types";

class TestCache {
  private readonly metadata = new WeakMap<vscode.TestItem, TestItemMetadata>();
  private readonly suiteResults = new Map<string, TestSuiteResult[]>();

  setMetadata(test: vscode.TestItem, data: TestItemMetadata): void {
    this.metadata.set(test, data);
  }

  getMetadata(test: vscode.TestItem): TestItemMetadata | undefined {
    return this.metadata.get(test);
  }

  /**
   * Get all descendant suites of a given TestItem.
   * For build target it returns all test suite within it, same for package.
   * If is called with TestItem which is a suite, then returns itself
   */
  getTestItemChildren(test: vscode.TestItem): vscode.TestItem[] {
    if (this.getMetadata(test)?.kind === "suite") {
      return [test];
    } else {
      let children: vscode.TestItem[] = [];
      test.children.forEach((child) => {
        const descendants = this.getTestItemChildren(child);
        children = [...children, ...descendants];
      });
      return children;
    }
  }

  addSuiteResult(debugSession: string, result: TestSuiteResult): void {
    this.suiteResults.get(debugSession)?.push(result);
  }

  getSuiteResultsFor(debugSession: string): TestSuiteResult[] | undefined {
    return this.suiteResults.get(debugSession);
  }

  setEmptySuiteResultsFor(debugSession: string): void {
    this.suiteResults.set(debugSession, []);
  }

  clearSuiteResultsFor(debugSession: string): void {
    this.suiteResults.delete(debugSession);
  }
}

export const testCache = new TestCache();
