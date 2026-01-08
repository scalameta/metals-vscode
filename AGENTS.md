# Agent Instructions

## Package Manager

This project uses **yarn** as the package manager. Do not use npm.

```bash
# Install dependencies
yarn install

# Compile TypeScript
yarn compile

# Run tests
yarn test

# Build extension package
yarn build

# Lint and format
yarn lint
yarn eslint . # required by CI
yarn format
```

## Development

- The extension is written in TypeScript
- Source files are in `src/`
- Compiled output goes to `out/`
- Run `yarn compile` to build the project

