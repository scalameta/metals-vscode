module.exports = {
  root: true,
  parser: "@typescript-eslint/parser",
  plugins: ["@typescript-eslint", "mocha"],
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "prettier",
  ],
  ignorePatterns: ["out/*", "*.js"],
  overrides: [
    {
      files: ["*.ts"],
      rules: {
        "@typescript-eslint/no-explicit-any": [
          "warn",
          { ignoreRestArgs: true },
        ],
        "no-unused-vars": "off",
        "@typescript-eslint/no-unused-vars": [
          "error",
          {
            argsIgnorePattern: "^_",
            varsIgnorePattern: "^_",
            caughtErrorsIgnorePattern: "^_",
          },
        ],
        "@typescript-eslint/no-non-null-assertion": "error",
        "guard-for-in": "error",
        "no-var": "error",
        curly: "error",
        "no-useless-escape": "off",
        "mocha/no-exclusive-tests": "error",
      },
    },
  ],
};
