import { IndentAction, languages } from "vscode";

function increaseIndentPattern(): RegExp {
  const old_if = /\b(if|while)\s+\([^\)]*?\)/;
  const keywords_not_ending = /((?<!\bend\b\s*?)\b(if|while|for|match|try))/;

  const keywords =
    /(\b(then|else|do|catch|finally|yield|return|throw))|=|=>|<-|=>>|:/;
  const ending_spaces = /\s*?$/;
  const extensionClause = /\s*extension\s*((\(|\[).*(\)|\]))+/;

  const regexp = `(${extensionClause.source}|${keywords_not_ending.source}|${old_if.source}|${keywords.source})${ending_spaces.source}`;
  return new RegExp(regexp);
}

export function enableScaladocIndentation() {
  // Adapted from:
  // https://github.com/Microsoft/vscode/blob/9d611d4dfd5a4a101b5201b8c9e21af97f06e7a7/extensions/typescript/src/typescriptMain.ts#L186
  languages.setLanguageConfiguration("scala", {
    indentationRules: {
      // ^(.*\*/)?\s*\}.*$
      decreaseIndentPattern: /^(.*\*\/)?\s*\}.*$/,
      // ^.*\{[^}"']*$
      increaseIndentPattern: /^.*\{[^}"']*$/,
    },
    wordPattern:
      /(-?\d*\.\d\w*)|([^\`\~\!\@\#\%\^\&\*\(\)\-\=\+\[\{\]\}\\\|\;\:\'\"\,\.\<\>\/\?\s]+)/g,
    onEnterRules: [
      {
        // e.g. /** | */
        beforeText: /^\s*\/\*\*(?!\/)([^\*]|\*(?!\/))*$/,
        afterText: /^\s*\*\/$/,
        action: { indentAction: IndentAction.IndentOutdent, appendText: " * " },
      },
      {
        // indent in places with optional braces
        beforeText: increaseIndentPattern(),
        action: { indentAction: IndentAction.Indent },
      },
      {
        // stop vscode from indenting automatically to last known indentation
        beforeText: /^\s*/,
        /* we still want {} to be nicely split with two new lines into
         *{
         *  |
         *}
         */
        afterText: /[^\]\}\)]+/,
        action: { indentAction: IndentAction.None },
      },
      {
        // e.g. /** ...|
        beforeText: /^\s*\/\*\*(?!\/)([^\*]|\*(?!\/))*$/,
        action: { indentAction: IndentAction.None, appendText: " * " },
      },
      {
        // e.g.  * ...| Javadoc style
        beforeText: /^(\t|(\ \ ))*\ \*(\ ([^\*]|\*(?!\/))*)?$/,
        action: { indentAction: IndentAction.None, appendText: "* " },
      },
      {
        // e.g.  * ...| Scaladoc style
        beforeText: /^(\t|(\ \ ))*\*(\ ([^\*]|\*(?!\/))*)?$/,
        action: { indentAction: IndentAction.None, appendText: "* " },
      },
      {
        // e.g.  */|
        beforeText: /^(\t|(\ \ ))*\ \*\/\s*$/,
        action: { indentAction: IndentAction.None, removeText: 1 },
      },
      {
        // e.g.  *-----*/|
        beforeText: /^(\t|(\ \ ))*\ \*[^/]*\*\/\s*$/,
        action: { indentAction: IndentAction.None, removeText: 1 },
      },
    ],
  });
}
