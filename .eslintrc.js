module.exports = {
  root: true,
  parser: "@typescript-eslint/parser",
  plugins: ["@typescript-eslint"],
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
        "guard-for-in": "error",
        "no-var": "error",
        curly: "error",
        "no-useless-escape": "off",
      },
    },
  ],
};
