import { env, ExtensionContext } from "vscode";
import * as vscode from "vscode";
import * as semver from "semver";
import { Remarkable } from "remarkable";
import { fetchFrom } from "./util";

const versionKey = "metals-server-version";

/**
 * Show release notes if possible, swallow errors since its not a crucial feature.
 * Treats snapshot versions like 0.11.6+67-926ec9a3-SNAPSHOT as a 0.11.6.
 */
export async function showReleaseNotesIfNeeded(
  context: ExtensionContext,
  serverVersion: string,
  outputChannel: vscode.OutputChannel
) {
  try {
    context.globalState.update(versionKey, "0.11.5");
    await showReleaseNotes(context, serverVersion);
  } catch (error) {
    outputChannel.appendLine(
      `Couldn't show release notes for Metals ${serverVersion}`
    );
    outputChannel.appendLine(`${error}`);
  }
}

async function showReleaseNotes(
  context: ExtensionContext,
  currentVersion: string
): Promise<void> {
  const state = context.globalState;

  const version = getVersion();
  if (isNotRemote() && version) {
    const releaseNotesUrl = await getMarkdownLink(version);
    if (releaseNotesUrl) {
      await showPanel(version, releaseNotesUrl);
    }
  }

  async function showPanel(version: string, releaseNotesUrl: string) {
    const panel = vscode.window.createWebviewPanel(
      `scalameta.metals.whatsNew`,
      `Metals ${version} release notes`,
      vscode.ViewColumn.One
    );

    const releaseNotes = await getReleaseNotesMarkdown(
      releaseNotesUrl,
      context.extensionUri,
      (uri) => panel.webview.asWebviewUri(uri)
    );

    panel.webview.html = releaseNotes;
    panel.reveal();

    // Update current device's latest server version when there's no value or it was a older one.
    // Then sync this value across other devices.
    state.update(versionKey, version);
    state.setKeysForSync([versionKey]);

    context.subscriptions.push(panel);
  }

  /**
   * Don't show panel for remote environment because it installs extension on every time.
   * TODO: what about wsl?
   */
  function isNotRemote(): boolean {
    const isNotRemote = env.remoteName == null;
    // const isWsl = env.remoteName === "wsl";
    return isNotRemote;
  }

  /**
   *  Return version for which release notes should be displayed
   *  or
   *  undefined if notes shouldn't be displayed
   */
  function getVersion(): string | undefined {
    const previousVersion: string | undefined = state.get(versionKey);
    // strip version to 'major.minor.patch'
    const cleanVersion = semver.clean(currentVersion);
    if (cleanVersion) {
      if (previousVersion) {
        const compare = semver.compare(cleanVersion, previousVersion);
        const diff = semver.diff(cleanVersion, previousVersion);

        // take into account only major, minor and patch, ignore snapshot releases
        const isNewerVersion =
          compare === 1 &&
          (diff === "major" || diff === "minor" || diff === "patch");

        return isNewerVersion ? cleanVersion : undefined;
      }

      // if there was no previous version then show release notes for current cleaned version
      return currentVersion;
    }
  }
}

/**
 * Translate server version to link to the markdown file with release notes
 */
async function getMarkdownLink(version: string): Promise<string | undefined> {
  const releaseInfoUrl = `https://api.github.com/repos/scalameta/metals/releases/tags/v${version}`;
  const options = {
    headers: {
      "User-Agent": "metals",
    },
  };
  const info = await fetchFrom(releaseInfoUrl, options);
  const body = (JSON.parse(info)["body"] as string) ?? "";
  // matches (2022)/(06)/(03)/(aluminium)
  const matchResult = body.match(
    new RegExp("(\\d\\d\\d\\d)/(\\d\\d)/(\\d\\d)/(\\w+)")
  );
  if (matchResult?.length === 5) {
    const [, ...tail] = matchResult;
    const name = tail.join("-");
    const url = `https://raw.githubusercontent.com/scalameta/metals/main/website/blog/${name}.md`;
    return url;
  }
}

async function getReleaseNotesMarkdown(
  releaseNotesUrl: string,
  extensionUri: vscode.Uri,
  cssUriConverter: (_: vscode.Uri) => vscode.Uri
): Promise<string> {
  const text = await fetchFrom(releaseNotesUrl);
  // every release notes starts with that
  const beginning = "We're happy to announce the release of";
  const notesStartIdx = text.indexOf(beginning);
  const releaseNotes = text.substring(notesStartIdx);

  // cut metadata yaml from release notes, it start with --- and ends with ---
  const metadata = text
    .substring(0, notesStartIdx - 1)
    .replace("---", "")
    .replace("---", "")
    .trim()
    .split("\n");
  const author = metadata[0].slice("author: ".length);
  const title = metadata[1].slice("title: ".length);
  const authorUrl = metadata[2].slice("authorURL: ".length);

  const md = new Remarkable({ html: true });
  const renderedNotes = md.render(releaseNotes);

  const stylesPathMainPath = vscode.Uri.joinPath(
    extensionUri,
    "media",
    "styles.css"
  );

  // // Uri to load styles into webview
  const stylesMainUri = cssUriConverter(stylesPathMainPath);

  const notes = getHtmlContent(
    renderedNotes,
    author,
    title,
    authorUrl,
    stylesMainUri
  );
  return notes;
}

function getHtmlContent(
  renderedNotes: string,
  author: string,
  title: string,
  authorURL: string,
  stylesUri: vscode.Uri
): string {
  return `
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
      Showing Metals' release notes embedded in vscode is an experimental feature, in case of any issues report them at 
      <a href="https://github.com/scalameta/metals-vscode">https://github.com/scalameta/metals-vscode</a>.
    </p>
    <hr>
    <p>
      <a href="${authorURL}" target="_blank" itemprop="url">
        <span itemprop="name">${author}</span>
      </a>
    </p>
    <hr>
    ${renderedNotes}
    </body>
  </html>
`;
}
