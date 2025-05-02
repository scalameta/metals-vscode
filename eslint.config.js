const { defineConfig, globalIgnores } = require("eslint/config");

const tsParser = require("@typescript-eslint/parser");
const typescriptEslint = require("@typescript-eslint/eslint-plugin");
const js = require("@eslint/js");

const { FlatCompat } = require("@eslint/eslintrc");

const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
  allConfig: js.configs.all
});

module.exports = defineConfig([
  {
    languageOptions: {
      parser: tsParser
    },

    plugins: {
      "@typescript-eslint": typescriptEslint
    },

    extends: compat.extends(
      "eslint:recommended",
      "plugin:@typescript-eslint/recommended",
      "prettier"
    )
  },
  globalIgnores([
    "out/*",
    "**/*.js",
    "src/test/unit/getJavaHome.test.ts",
    "src/test/unit/checkForUpdate.test.ts"
  ]),
  {
    files: ["**/*.ts"],
    rules: {
      "@typescript-eslint/no-explicit-any": [
        "warn",
        {
          ignoreRestArgs: true
        }
      ],

      "no-unused-vars": "off",

      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_"
        }
      ],

      "@typescript-eslint/no-non-null-assertion": "error",
      "guard-for-in": "error",
      "no-var": "error",
      curly: "error",
      "no-useless-escape": "off"
    }
  }
]);
