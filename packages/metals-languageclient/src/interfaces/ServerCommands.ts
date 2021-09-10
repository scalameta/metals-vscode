/**
 * These are all of the server commands that Metals supports. Note that not support
 * may vary based on the `InitializationSettings` the client sets.
 *
 *  - https://scalameta.org/metals/docs/editors/new-editor.html#metals-server-commands
 */
export const ServerCommands = {
  /** Start the Ammonite build server. */
  AmmoniteStart: "ammonite-start",
  /** Stop the Ammonite build server. */
  AmmoniteStop: "ammonite-stop",
  /**
   * Converts provided stacktrace in the parameter to a format that contains
   * links to locations of places where the exception was raised.
   *
   * If the configuration parameter of the client (support-commands-in-html)
   * is true then client is requested to display html with links already
   * pointing to proper locations in user codebase. Otherwise the client will
   * display simple scala file but with code lenses that direct user to proper
   * location in codebase.
   */
  AnalyzeStacktrace: "analyze-stacktrace",
  /**
   * Prompt the user to select a new build server to connect to.
   *
   * This command does nothing in the case there are less than two installed
   * build servers on the computer.
   */
  BspSwitch: "bsp-switch",
  /** Establish a new connection to the build server and reindex the workspace. */
  BuildConnect: "build-connect",
  /** Disconnect the build server and without re-connecting. */
  BuildDisconnect: "build-disconnect",
  /** Import the latest changes from the build. */
  BuildImport: "build-import",
  /**
   * Unconditionally stop the current running Bloop server and start a new
   * one using Bloop launcher.
   */
  BuildRestart: "build-restart",
  /** Cancel the current ongoing compilation, if any. */
  CancelCompilation: "compile-cancel",
  /**
   * Compile the current open files along with all build targets in this
   * workspace that depend on those files.
   *
   * By default, Metals compiles only the current build target and its
   * dependencies when saving a file. Run the cascade compile task to
   * additionally compile the inverse dependencies of the current build target.
   * For example, if you change the API in main sources and run cascade compile
   * then it will also compile the test sources that depend on main.
   */
  CascadeCompile: "compile-cascade",
  /** Recompile all build targets in this workspace. */
  CleanCompile: "compile-clean",
  /**
   * Copy the contents of a worksheet to your local buffer.
   *
   * Note: This command returns the contents of the worksheet, and the LSP client
   * is in charge of taking that content and putting it into your local buffer.
   */
  CopyWorksheetOutput: "copy-worksheet-output",
  /** Start debug adapter. */
  DebugAdapterStart: "debug-adapter-start",
  /** Open the Metals doctor to troubleshoot potential problems with the build. */
  DoctorRun: "doctor-run",
  /** Decode a file to human readable format.  E.g. class, semanticdb */
  DecodeFile: "file-decode",
  /**
   * Detect the build tool for a workspace and generate the bsp config for the
   * build tool. If there are multiple build tools for a workspace ,the user
   * will be prompted to choose one.
   *
   * Following the creation, Metals will attempt to auto-connect to it.
   */
  GenerateBspConfig: "generate-bsp-config",
  /** Move the cursor to the definition of the argument symbol. */
  Goto: "goto",
  /** Jumps to the super method/field definition of a symbol. */
  GotoSuperMethod: "goto-super-method",
  /**
   * Create and open a new Scala class, object, trait, package object, or
   * worksheet.
   */
  NewScalaFile: "new-scala-file",
  /**
   * Create and open a new Java class, enum or interface
   */
  NewJavaFile: "new-java-file",
  /** Creaet a new Scala project using one of the available g8 templates. */
  NewScalaProject: "new-scala-project",
  /** Reset a decision you made about a specific setting. */
  ResetChoice: "reset-choice",
  /** Walk all the files in the workspace and index where symbols are defined. */
  SourcesScan: "sources-scan",
  /**
   * When user executes this command it will calculate inheritance hierarchy of
   * a class that contains given method. Then it will filter out classes not
   * overriding given method and a list using 'metalsQuickPick' will be
   * displayed to which super method user would like to go to. Command has no
   * effect on other symbols than method definition. QuickPick will show up
   * only if more than one result is found.
   */
  SuperMethodHierarchy: "super-method-hierarchy",
} as const;

type ServerCommands = typeof ServerCommands;
