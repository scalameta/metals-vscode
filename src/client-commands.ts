"use strict";

// Metals expects clients to implement the following commands: https://scalameta.org/metals/docs/editors/new-editor.html#metals-client-commands
export const ClientCommands = {
  toggleLogs: "metals-logs-toggle",
  focusDiagnostics: "metals-diagnostics-focus",
  runDoctor: "metals-doctor-run"
};
