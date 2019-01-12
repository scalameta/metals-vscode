"use strict";

// Metals expects clients to implement the following commands: https://scalameta.org/metals/docs/editors/new-editor.html#metals-client-commands
export namespace ClientCommands {
  export const TOGGLE_LOGS = "metals-logs-toggle";
  export const FOCUS_DIAGNOSTICS = "metals-diagnostics-focus";
  export const RUN_DOCTOR = "metals-doctor-run";
}
