/**
 * These are all of the client commands that Metals supports. Note that not support
 * may vary based on the `InitializationSettings` the client sets.
 *
 *  - https://scalameta.org/metals/docs/editors/new-editor.html#metals-client-commands
 */
export enum ClientCommands {
  /**
   * A client command that should be forwarded back to the Metals server.
   *
   * Metals may register commands in the client UIs like tree view node_modules
   * that should be forwarded back to the Metals server if the client clicks
   * on the UI elements.
   */
  EchoCommand = "metals-echo-command",
  /**
   * Focus on the window that lists all published diagnostics.
   */
  FocusDiagnostics = "metals-diagnostics-focus",
  /**
   * Move the cursor focus to the provided location.
   */
  GotoLocation = "metals-goto-location",
  /**
   * Open a specific folder either in the same or new window
   */
  OpenFolder = "metals-open-folder",
  /**
   * Notifies the client that the model has been updated and it
   * should be refreshed (e.g. by resending code lens request)
   */
  RefreshModel = "metals-model-refresh",
  /**
   * Reload the contents of an open Doctor window, if any. Should be ignored if
   * there is no open doctor window.
   */
  ReloadDoctor = "metals-doctor-reload",
  /**
   * Focus on a window displaying troubleshooting help from the Metals doctor.
   */
  RunDoctor = "metals-doctor-run",
  /**
   * Command to trigger a debug session with Metals. Triggered by a code lens
   * in the editor.
   */
  StartDebugSession = "metals-debug-session-start",
  /**
   * Command to run the codev via a code lens in the editor.
   */
  StartRunSession = "metals-run-session-start",
  /**
   * Focus or remove focus on the output logs reported by the server via
   * `window/logMessage`.
   */
  ToggleLogs = "metals-logs-toggle",
}
