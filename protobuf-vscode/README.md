# Protocol Buffers (Protobuf) for VS Code

Syntax highlighting and language support for Protocol Buffers (`.proto` files) in Visual Studio Code and compatible editors.

## Features

- 🎨 **Syntax Highlighting** - Full syntax highlighting for proto2 and proto3 files
- 📝 **Language Configuration** - Bracket matching, auto-closing pairs, and code folding
- 💡 **Comment Support** - Line (`//`) and block (`/* */`) comments

## Supported Syntax

- `syntax`, `package`, `import` statements
- `message`, `enum`, `service` definitions
- `rpc` method declarations with `stream` support
- Field modifiers: `repeated`, `optional`, `required`
- Built-in types: `double`, `float`, `int32`, `int64`, `uint32`, `uint64`, `sint32`, `sint64`, `fixed32`, `fixed64`, `sfixed32`, `sfixed64`, `bool`, `string`, `bytes`
- `map` fields
- `oneof` groups
- `extend` blocks
- `reserved` and `extensions` statements
- Field and message options

## Installation

### From VSIX

1. Download the `.vsix` file
2. In VS Code, open the Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`)
3. Run "Extensions: Install from VSIX..."
4. Select the downloaded file

### From Marketplace

Search for "Protocol Buffers" in the VS Code Extensions marketplace.

## Development

```bash
# Install dependencies
yarn install

# Run grammar tests
yarn test:grammar

# Package the extension
yarn build
```

## License

Apache-2.0
