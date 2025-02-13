import { env, ExtensionContext } from "vscode";
import * as vscode from "vscode";
import * as semver from "semver";
import path from "path";
import { fetchFrom } from "./util";
import { Either, makeLeft, makeRight } from "./types";
import { marked } from "marked";

const versionKey = "metals-server-version";
type CalledOn = "onExtensionStart" | "onUserDemand";

/**
 * Show release notes if possible, swallow errors since its not a crucial feature.
 * Treats snapshot versions like 0.11.6+67-926ec9a3-SNAPSHOT as a 0.11.6.
 *
 * @param calledOn determines when this function was called.
 * For 'onExtensionStart' case show release notes only once (first time).
 * For 'onUserDemand' show extension notes no matter if it's another time.
 */
export async function showReleaseNotes(
  calledOn: CalledOn,
  context: ExtensionContext,
  serverVersion: string,
  outputChannel: vscode.OutputChannel
): Promise<void> {
  try {
    const result = await showReleaseNotesImpl(calledOn, context, serverVersion);
    if (result.kind === "left") {
      const msg = `Release notes was not shown: ${result.value}`;
      outputChannel.appendLine(msg);
    }
  } catch (error) {
    outputChannel.appendLine(
      `Error, couldn't show release notes for Metals ${serverVersion}`
    );
    outputChannel.appendLine(`${error}`);
  }
}

async function showReleaseNotesImpl(
  calledOn: CalledOn,
  context: ExtensionContext,
  currentVersion: string
): Promise<Either<string, void>> {
  const state = context.globalState;

  const version = getVersion();
  if (version.kind === "left") {
    return version;
  }

  const remote = isRemote();
  if (calledOn === "onExtensionStart" && remote.kind === "left") {
    return remote;
  }

  const releaseNotesUrl = await getMarkdownLink(version.value);
  if (releaseNotesUrl.kind === "left") {
    return releaseNotesUrl;
  }

  // actual logic starts here
  await showPanel(version.value, releaseNotesUrl.value);
  return makeRight(undefined);

  // below are helper functions

  async function showPanel(version: string, releaseNotesUrl: string) {
    const timeoutMs = 10000; // 10 seconds timeout
    const timeoutPromise = new Promise<(_: vscode.Uri) => string>((_, reject) =>
      setTimeout(() => reject(new Error("Request timed out")), timeoutMs)
    );
    const releaseNotes = await Promise.race([
      getReleaseNotesMarkdown(releaseNotesUrl),
      timeoutPromise,
    ]);

    const panel = vscode.window.createWebviewPanel(
      `scalameta.metals.whatsNew`,
      `Metals ${version} release notes`,
      vscode.ViewColumn.One
    );

    panel.iconPath = vscode.Uri.file(
      path.join(context.extensionPath, "icons", "scalameta-logo.png")
    );

    // Uri with additional styles for webview
    const stylesPathMainPath = vscode.Uri.joinPath(
      context.extensionUri,
      "media",
      "styles.css"
    );

    // need to transform Uri
    const stylesUri = panel.webview.asWebviewUri(stylesPathMainPath);

    panel.webview.html = releaseNotes(stylesUri);
    panel.reveal();

    // Update current device's latest server version when there's no value or it was a older one.
    // Then sync this value across other devices.
    state.update(versionKey, version);
    state.setKeysForSync([versionKey]);

    context.subscriptions.push(panel);
  }

  /**
   * Show panel:
   * - for wsl
   * - when it's not a remote env
   */
  function isRemote(): Either<string, void> {
    return env.remoteName == null || env.remoteName === "wsl"
      ? makeRight(undefined)
      : makeLeft(`is a remote environment ${env.remoteName}`);
  }

  /**
   *  Return version for which release notes should be displayed
   */
  function getVersion(): Either<string, string> {
    const previousVersion: string | undefined = state.get(versionKey);
    // strip version to
    // in theory semver.clean can return null, but we're almost sure that currentVersion is well defined
    const cleanVersion = semver.clean(currentVersion);

    if (cleanVersion == null) {
      const msg = `can't transform ${currentVersion} to 'major.minor.patch'`;
      return makeLeft(msg);
    }

    // if there was no previous version or user explicitly wants to read release notes
    // show release notes for current cleaned version
    if (!previousVersion || calledOn === "onUserDemand") {
      return makeRight(cleanVersion);
    }

    const compare = semver.compare(cleanVersion, previousVersion);
    const diff = semver.diff(cleanVersion, previousVersion);

    // take into account only major, minor and patch, ignore snapshot releases
    const isNewerVersion =
      compare === 1 &&
      (diff === "major" || diff === "minor" || diff === "patch");

    return isNewerVersion
      ? makeRight(cleanVersion)
      : makeLeft(
          `not showing release notes since they've already been seen for your current version`
        );
  }
}

/**
 * Translate server version to link to the markdown file with release notes.
 * @param version clean version in major.minor.patch form
 * If version has release notes return link to them, if not return nothing.
 * Sample link to which we're doing request https://api.github.com/repos/scalameta/metals/releases/tags/v0.11.6.
 * From such JSON obtain body property which contains link to the blogpost, but what's more important,
 * contains can be converted to name of markdown file with release notes.
 */
async function getMarkdownLink(
  version: string
): Promise<Either<string, string>> {
  const releaseInfoUrl = `https://api.github.com/repos/scalameta/metals/releases/tags/v${version}`;
  const options = {
    headers: {
      "User-Agent": "metals",
    },
  };
  const stringifiedContent = await fetchFrom(releaseInfoUrl, options);
  const body = JSON.parse(stringifiedContent)["body"] as string;

  if (!body) {
    const msg = `can't obtain content of ${releaseInfoUrl}`;
    return makeLeft(msg);
  }

  // matches (2022)/(06)/(03)/(aluminium) via capture groups
  const matchResult = body.match(
    new RegExp("(\\d\\d\\d\\d)/(\\d\\d)/(\\d\\d)/(\\w+)")
  );
  // whole expression + 4 capture groups = 5 entries
  if (matchResult?.length === 5) {
    // omit first entry
    const [_, ...tail] = matchResult;
    const name = tail.join("-");
    const url = `https://raw.githubusercontent.com/scalameta/metals/main/website/blog/${name}.md`;
    return makeRight(url);
  } else {
    const msg = `can't obtain markdown file name for ${version} from ${body}`;
    return makeLeft(msg);
  }
}

/**
 *
 * @param releaseNotesUrl Url which server markdown with release notes
 * @param context Extension context
 * @param asWebviewUri
 * Webviews cannot directly load resources from the workspace or local
 * file system using file: uris. The asWebviewUri function takes a local
 * file: uri and converts it into a uri that can be used inside of a webview
 * to load the same resource.
 * proxy to webview.asWebviewUri
 */
async function getReleaseNotesMarkdown(
  releaseNotesUrl: string
): Promise<(_: vscode.Uri) => string> {
  const text = await fetchFrom(releaseNotesUrl);
  // every release notes starts with metadata format
  const tripleDash = "---";
  const firstTripleDash = text.indexOf(tripleDash);
  const notesStartIdx =
    text.indexOf(tripleDash, firstTripleDash + 1) + tripleDash.length + 1;
  const releaseNotes = text.substring(notesStartIdx);

  // cut metadata yaml from release notes, it start with --- and ends with ---
  const metadata = text
    .substring(0, notesStartIdx - 1)
    .replace(tripleDash, "")
    .replace(tripleDash, "")
    .trim()
    .split("\n");
  const author = metadata[0].slice("author: ".length);
  const title = metadata[1].slice("title: ".length);
  const authorUrl = metadata[2].slice("authorURL: ".length);
  const renderedNotes = marked.parse(releaseNotes);

  return (stylesUri: vscode.Uri) => `
  <!DOCTYPE html>
  <html lang="en" style="height: 100%; width: 100%;">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link href="${stylesUri}" rel="stylesheet">
  </head>
  <body>
    <h1>${title}</h1>
    <hr>
    <p>
      Showing Metals' release notes embedded in VS Code is an experimental feature, in case of any issues report them at 
      <a href="https://github.com/scalameta/metals-vscode">https://github.com/scalameta/metals-vscode</a>.
      <br/>
      <br/>
      Original blogpost can be viewed at 
      <a href="https://scalameta.org/metals/blog/" target="_blank" itemprop="url">
      <span itemprop="name">Metals blog</span>
      </a>.
    </p>
    <hr>
    <p>
      <a href="${authorUrl}" target="_blank" itemprop="url">
        <span itemprop="name">${author}</span>
      </a>
    </p>
    <hr>
    ${renderedNotes}
    </body>
  </html>
`;
}
