import assert from "assert";
import { ConfigurationTarget } from "../../ConfigurationTarget";
import { needCheckForUpdates } from "../../service/checkForUpdate";
import { CheckForUpdateRepo } from "../../repository/CheckForUpdateRepo";
import sinon from "sinon";

class MockRepo implements CheckForUpdateRepo {
  constructor(private prevVersion?: string, private lastUpdatedAt?: string) {}
  getLastUpdated(_target: ConfigurationTarget): {
    prevVersion?: string | undefined;
    lastUpdatedAt?: string | undefined;
  } {
    return {
      prevVersion: this.prevVersion,
      lastUpdatedAt: this.lastUpdatedAt,
    };
  }
  saveLastUpdated(
    _serverVersion: string,
    _lastUpdatedAt: string,
    _target: ConfigurationTarget
  ): void {
    return;
  }
}

describe("needCheckForUpdates", () => {
  it("should false if nothing has saved / save current versions", async () => {
    const currentVersion = "0.11.8";
    const today = "2022-01-01";
    const repo = new MockRepo(undefined, undefined);
    const spy = sinon.spy(repo, "saveLastUpdated");
    const actual = await needCheckForUpdates(
      currentVersion,
      today,
      ConfigurationTarget.Global,
      repo
    );
    assert(actual === false);
    assert(spy.calledWith(currentVersion, today, ConfigurationTarget.Global));
  });

  it("should false if currentVersion was seen for the first time / save current versions", async () => {
    const prevVersion = "0.11.8";
    const currentVersion = "0.11.9";
    const today = "2022-01-01";
    const repo = new MockRepo(prevVersion, today);
    const spy = sinon.spy(repo, "saveLastUpdated");
    const actual = await needCheckForUpdates(
      currentVersion,
      today,
      ConfigurationTarget.Global,
      repo
    );
    assert(actual === false);
    assert(spy.calledWith(currentVersion, today, ConfigurationTarget.Global));
  });

  it("should false if currentVersion is set today", async () => {
    const currentVersion = "0.11.8";
    const today = "2022-01-01";
    const repo = new MockRepo(currentVersion, today);
    const spy = sinon.spy(repo, "saveLastUpdated");
    const actual = await needCheckForUpdates(
      currentVersion,
      today,
      ConfigurationTarget.Global,
      repo
    );
    assert(actual === false);
    assert(spy.notCalled);
  });

  it("should true if currentVersion is set more than a day ago", async () => {
    const currentVersion = "0.11.8";
    const lastUpdatedAt = "2022-01-01";
    const today = "2022-01-02";
    const repo = new MockRepo(currentVersion, lastUpdatedAt);
    const spy = sinon.spy(repo, "saveLastUpdated");
    const actual = await needCheckForUpdates(
      currentVersion,
      today,
      ConfigurationTarget.Global,
      repo
    );
    assert(actual === true);
    assert(spy.notCalled);
  });
});
