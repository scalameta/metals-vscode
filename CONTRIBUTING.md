# Contributing to the Metals Visual Studio Code extension

This document explains the developer workflow for making changes to the
[Metals extension](https://marketplace.visualstudio.com/items?itemName=scalameta.metals)
for Visual Studio Code.

## Prerequisites

Make sure you have the following applications installed on your machine:

- `git` for cloning this repository
- `yarn` for building a local version of the extension
- Visual Studio Code (`code` from the console)

## Getting started

First, clone the repo and install the project dependencies.

```
git clone https://github.com/scalameta/metals-vscode.git
cd metals-vscode
yarn install
code .
```

Next, open the file `extension.ts` and make changes to the code. To try out your
change, start the plugin in debugging mode via `Debug > Start debugging` or by
pressing `F5`. This starts a new "Extension Development Host" application with
the local Metals extension installed. Open a directory with an sbt build and
edit a `*.scala` source file to start the Metals server.

It's OK if you already have installed the Metals extension from the Marketplace,
the local extension overrides your existing installation only for the "Extension
Development Host" application. When you quit the development host, the Metals
extension from Marketplace remains installed in your regular VS Code
application.

When you make further changes to the extension, quit the "Extension Development
Host" and run `F5` (or `Debug > Start debugging`) again.

## Testing

The extension currently has no tests. When you are happy with the functionality
of your change, feel free to open a PR without tests.

## Formatting

TypeScript and Markdown sources are formatted with
[Prettier](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode).
It's recommended to enable "Format on save" when working in this repository.
