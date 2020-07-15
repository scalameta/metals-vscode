# Metals extension for Visual Studio Code

![Completions](https://user-images.githubusercontent.com/1408093/56036958-725bac00-5d2e-11e9-9cf7-46249125494a.gif)

The following table shows the status of various features.

| Feature               | Status | Notes                                                                                            |
| --------------------- | :----: | ------------------------------------------------------------------------------------------------ |
| Import build          |   ✅   | Works with sbt, Gradle, Maven, Mill and Bloop.                                                   |
| Compile errors        |   ✅   | Syntax errors as you type and type errors on file save.                                          |
| Completions           |   ✅   |                                                                                                  |
| Hover (type at point) |   ✅   |                                                                                                  |
| Goto definition       |   ✅   | Works for project sources and Java/Scala library dependencies.                                   |
| Document symbols      |   ✅   |                                                                                                  |
| Formatting            |   ✅   | Uses Scalafmt.                                                                                   |
| Find references       |   ✅   |                                                                                                  |
| Find implementations  |   ✅   |                                                                                                  |
| Workspace symbol      |   ✅   | Searches workspace sources and library dependencies. All-lowercase queries are case-insensitive. |
| Highlight             |   ✅   |                                                                                                  |
| Folding               |   ✅   |                                                                                                  |
| Rename symbol         |   ✅   |                                                                                                  |
| Run/Debug             |   ✅   |                                                                                                  |

## Requirements

**Java 8 or 11 provided by OpenJDK or Oracle**. Eclipse OpenJ9 is not supported,
please make sure the `JAVA_HOME` environment variable points to a valid Java 8
or 11 installation.

**macOS, Linux or Windows**. Metals is developed on macOS and every PR is tested
on Ubuntu+Windows.

**Scala 2.13, 2.12, 2.11 and Scala 3**. Metals supports these Scala versions
2.13.3, 2.12.12, 2.12.11, 2.12.10, 2.13.1, 2.13.2, 2.11.12, 2.12.8, 2.12.9,
2.13.0, 0.25.0-RC2, 0.24.0 and 0.24.0-RC1. Note that 2.11.x support is
deprecated and it will be removed in future releases. It's recommended to
upgrade to Scala 2.12 or Scala 2.13

## Installation

Install the Metals extension from the
[Marketplace](https://marketplace.visualstudio.com/items?itemName=scalameta.metals).

[![Install Metals extension](https://img.shields.io/badge/metals-vscode-blue.png)](vscode:extension/scalameta.metals)

> Make sure to disable the extensions
> [Scala Language Server](https://marketplace.visualstudio.com/items?itemName=dragos.scala-lsp)
> and
> [Scala (sbt)](https://marketplace.visualstudio.com/items?itemName=lightbend.vscode-sbt-scala)
> if they are installed. The
> [Dotty Language Server](https://marketplace.visualstudio.com/items?itemName=lampepfl.dotty)
> does **not** need to be disabled because the Metals and Dotty extensions don't
> conflict with each other.

Next, open a directory containing a `build.sbt` file. The extension activates
when a `*.scala` or `*.sbt` file is opened.

## Importing a build

The first time you open Metals in a new workspace it prompts you to import the
build. Click "Import build" to start the installation step.

![Import build](https://i.imgur.com/0VqZWay.png)

- "Not now" disables this prompt for 2 minutes.
- "Don't show again" disables this prompt forever, use `rm -rf .metals/` to
  re-enable the prompt.
- Use `tail -f .metals/metals.log` to watch the build import progress.
- Behind the scenes, Metals uses [Bloop](https://scalacenter.github.io/bloop/)
  to import sbt builds, but you don't need Bloop installed on your machine to
  run this step.

Once the import step completes, compilation starts for your open `*.scala`
files.

Once the sources have compiled successfully, you can navigate the codebase with
goto definition.

### Custom sbt launcher

By default, Metals runs an embedded `sbt-launch.jar` launcher that respects
`.sbtopts` and `.jvmopts`. However, the environment variables `SBT_OPTS` and
`JAVA_OPTS` are not respected.

Update the "Sbt Script" setting to use a custom `sbt` script instead of the
default Metals launcher if you need further customizations like reading
environment variables.

![Sbt Launcher](https://i.imgur.com/NuwEBe4.png)

### Speeding up import

The "Import build" step can take a long time, especially the first time you run
it in a new build. The exact time depends on the complexity of the build and if
library dependencies need to be downloaded. For example, this step can take
everything from 10 seconds in small cached builds up to 10-15 minutes in large
uncached builds.

Consult the
[Bloop documentation](https://scalacenter.github.io/bloop/docs/build-tools/sbt#speeding-up-build-export)
to learn how to speed up build import.

### Importing changes

When you change `build.sbt` or sources under `project/`, you will be prompted to
re-import the build.

![Import sbt changes](https://i.imgur.com/72kdZkL.png)

### Manually trigger build import

To manually trigger a build import, execute the "Import build" command through
the command palette (`Cmd + Shift + P`).

![Import build command](https://i.imgur.com/QHLKt8u.png)

## Run doctor

Execute the "Run Doctor" through the command palette to troubleshoot potential
configuration problems in your workspace.

![Run doctor command](https://i.imgur.com/K02g0UM.png)

## Configure Java version

The VS Code plugin uses by default the `JAVA_HOME` environment variable (via
[`find-java-home`](https://www.npmjs.com/package/find-java-home)) to locate the
`java` executable. To override the default Java home location, update the "Java
Home" variable in the settings menu.

![Java Home setting](https://i.imgur.com/sKrPKk2.png)

If this setting is defined, the VS Code plugin uses the custom path instead of
the `JAVA_HOME` environment variable.

### macOS

To globally configure `$JAVA_HOME` for all GUI applications, see
[this Stackoverflow answer](https://stackoverflow.com/questions/135688/setting-environment-variables-on-os-x).

If you prefer to manually configure Java home through VS Code, run the following
command to copy the Java 8 home path.

```sh
/usr/libexec/java_home -v 1.8 | pbcopy
```

## Custom artifact repositories (Maven or Ivy resolvers)

Use the 'Custom Repositories' setting for the Metals VS Code extension to tell
[Coursier](https://get-coursier.io/docs/other-proxy) to try to download Metals
artifacts from your private artifact repository.

Use `.jvmopts` to set sbt options
(https://www.scala-sbt.org/1.0/docs/Proxy-Repositories.html) for
`sbt bloopInstall` which resolves library dependencies. You can also provide a
custom sbt script (see 'Custom sbt launcher').

## HTTP proxy

Metals uses [Coursier](https://get-coursier.io/docs/other-proxy) to download
artifacts from Maven Central. To use Metals behind an HTTP proxy, configure the
system properties `-Dhttps.proxyHost=… -Dhttps.proxyPort=…` in one of the
following locations:

- `.jvmopts` file in the workspace directory.
- `JAVA_OPTS` environment variable, make sure to start `code` from your terminal
  when using this option since environment variables don't always propagate
  correctly when opening VS Code as a GUI application outside a terminal.
- "Server Properties" setting for the Metals VS Code extension, which can be
  configured per-workspace or per-user.

## Using latest Metals SNAPSHOT

Update the "Server Version" setting to try out the latest pending Metals
features.

See
https://scalameta.org/metals/docs/editors/vscode.html#using-latest-metals-snapshot
to find the latest SNAPSHOT version.

Run the "Reload Window" command after updating the setting for the new version
to take effect.

## Files and Directories to include in your Gitignore

The Metals server places logs and other files in the `.metals` directory. The
Bloop compile server places logs and compilation artifacts in the `.bloop`
directory. Bloop plugin that generates Bloop configuration is added in the
`project/metals.sbt` file. Working with Ammonite scripts will place compiled
scripts into the `.ammonite` directory. It's recommended to exclude these
directories and file from version control systems like git.

```sh
# ~/.gitignore
.metals/
.bloop/
.ammonite/
project/metals.sbt
```

## Show document symbols

Run the "Explorer: Focus on Outline View" command to open the symbol outline for
the current file in the sidebar.

![Document Symbols Outline](https://i.imgur.com/T0kVJsr.gif)

Run the "Open Symbol in File" command to search for a symbol in the current file
without opening the sidebar.

![Document Symbols Command](https://i.imgur.com/0PJ4brd.png)

As you type, the symbol outline is also visible at the top of the file.
![Document Symbols Outline](https://i.imgur.com/L217n4q.png)

## Enable on type formatting for multiline string formatting

![pipes](https://i.imgur.com/iXGYOf0.gif)

To properly support adding `|` in multiline strings we are using the
`onTypeFormatting` method. To enable the functionality you need to enable
`onTypeFormatting` inside Visual Studio Code.

This needs to be done in settings by checking `Editor: Format On Type`:

![on-type](https://i.imgur.com/4eVvSP5.gif)

## Enable formatting on paste for multiline strings

Whenever text is paste into a multiline string with `|` it will be properly
formatted by Metals:

![format-on-paste](https://i.imgur.com/yJLAIxQ.gif)

To enable this feature you need to enable formatting on paste in Visual Studio
Code by checking `Editor: Format On Paste`:

![format-on-paste](https://i.imgur.com/OaBxwer.png)

## Coming from IntelliJ

Install the
[IntelliJ IDEA Keybindings](https://marketplace.visualstudio.com/items?itemName=k--kato.intellij-idea-keybindings)
extension to use default IntelliJ shortcuts with VS Code.

| IntelliJ         | VS Code                   |
| ---------------- | ------------------------- |
| Go to class      | Go to symbol in workspace |
| Parameter info   | Trigger parameter hints   |
| Basic completion | Trigger suggest           |
| Type info        | Show hover                |
| Expand           | Fold                      |
| Extend Selection | Expand selection          |
