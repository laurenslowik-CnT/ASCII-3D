// Readme for those using VS Code and Yarn and ESLint.
// Using yarn with pnp means the eslint bin is not in the <root_directory>node_modules directory.
// This means VS Code's "OUTPUT" panel for eslint had tons of errors.
// You could adjust your .yarnrc to use node_modules, i.e. `nodeLinker: node-modules`
// https://yarnpkg.com/getting-started/editor-sdks
// specifically VS Code and its use of ZipFS https://yarnpkg.com/getting-started/editor-sdks#vscode
// The command that auto-detects your package.json and sets up the editor is:
// yarn dlx @yarnpkg/sdks vscode

import { defineConfig, globalIgnores } from "eslint/config";
import js from "@eslint/js";
import tseslint from "typescript-eslint";
import react from "eslint-plugin-react";
import eslintConfigPrettier from "eslint-config-prettier/flat";
import tailwind from "eslint-plugin-tailwindcss";
import sonarjs from "eslint-plugin-sonarjs";
import unicorn from "eslint-plugin-unicorn";
import jsxA11y from "eslint-plugin-jsx-a11y";
import { importX } from "eslint-plugin-import-x";
/* eslint-disable-next-line import-x/default */
import reactHooks from "eslint-plugin-react-hooks";
import pluginPromise from "eslint-plugin-promise";
import json from "@eslint/json";
import storybook from "eslint-plugin-storybook";
import testingLibrary from "eslint-plugin-testing-library";
import pluginJest from "eslint-plugin-jest";
import reactHooksExtra from "eslint-plugin-react-hooks-extra";
import reactRefresh from "eslint-plugin-react-refresh";
import simpleImportSort from "eslint-plugin-simple-import-sort";
import next from "@next/eslint-plugin-next";

import globals from "globals";
import tsParser from "@typescript-eslint/parser";

export default defineConfig([
  globalIgnores([".next", ".pnp*", ".yarn", "**/generated/*"]),
  {
    files: ["**/*.json"],
    ignores: ["package-lock.json"],
    plugins: { json },
    language: "json/json",
    extends: ["json/recommended"],
  },
  {
    files: ["**/*.{ts,tsx,js,tsx,mjs}"],
    linterOptions: {
      reportUnusedDisableDirectives: "error",
    },
    extends: [
      js.configs.recommended,
      tseslint.configs.recommendedTypeChecked,
      sonarjs.configs.recommended,
      jsxA11y.flatConfigs.recommended,
      react.configs.flat.recommended,
      react.configs.flat["jsx-runtime"],
      tailwind.configs["flat/recommended"],
      reactHooks.configs["recommended-latest"],
      next.configs.recommended,
      unicorn.configs.recommended,
      pluginPromise.configs["flat/recommended"],
      importX.flatConfigs.recommended,
      importX.flatConfigs.typescript,
      eslintConfigPrettier,
      reactHooksExtra.configs.recommended,
    ],

    settings: {
      tailwindcss: {
        callees: ["clsx", "cn"],
      },
    },

    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
      parser: tsParser,
      ecmaVersion: "latest",
      sourceType: "module",
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },

    plugins: {
      "simple-import-sort": simpleImportSort,
    },

    rules: {
      // Globally Tuned rules
      "@typescript-eslint/no-confusing-non-null-assertion": "error",
      "@typescript-eslint/no-deprecated": "error",
      "@typescript-eslint/no-duplicate-type-constituents": "off",
      "@typescript-eslint/no-non-null-assertion": "error",
      "@typescript-eslint/no-shadow": "error",
      "@typescript-eslint/no-unused-expressions": [
        "error",
        { allowShortCircuit: true },
      ],
      "@typescript-eslint/prefer-optional-chain": "error",
      "@typescript-eslint/prefer-string-starts-ends-with": "error",
      eqeqeq: ["error", "smart"],
      "import-x/no-duplicates": "error",
      "import-x/no-named-as-default": "off",
      "import-x/no-named-as-default-member": "off",
      "import-x/no-self-import": "error",
      "no-console": "error",
      "no-continue": "error",
      "no-else-return": "error",
      "no-lone-blocks": "error",
      "no-lonely-if": "error",
      "no-multi-str": "error",
      "no-template-curly-in-string": "error",
      "no-sequences": "error",
      "no-return-await": "error",
      "no-useless-rename": "error",
      "no-with": "error",
      "object-shorthand": "error",
      "promise/always-return": ["error", { ignoreLastCallback: true }],
      "promise/catch-or-return": ["error", { allowFinally: true }],
      "react/forward-ref-uses-ref": "error",
      "react/jsx-no-useless-fragment": "error",
      "react/jsx-pascal-case": "error",
      "react/jsx-props-no-spread-multi": "error",
      "react/no-access-state-in-setstate": "error",
      "react/no-unstable-nested-components": "error",
      "sonarjs/deprecation": "off",
      "sonarjs/todo-tag": "off",
      "unicorn/filename-case": "off",
      "unicorn/prefer-global-this": "off",
      "unicorn/prefer-number-properties": "off",
      "unicorn/prevent-abbreviations": "off",
      "unicorn/no-array-for-each": "off",
      "unicorn/no-array-callback-reference": "off",
      "unicorn/no-array-reduce": "off",
      "unicorn/no-null": "off",
      "unicorn/no-useless-switch-case": "off",
      "unicorn/numeric-separators-style": "off",
      "unicorn/switch-case-braces": "off",
    },
  },
  {
    files: ["src/components/**/*.{tsx,jsx}"],
    plugins: {
      "react-refresh": reactRefresh,
    },
    rules: {
      "react-refresh/only-export-components": "error",
    },
  },
  {
    files: ["*.config.{js,mjs,cjs,ts}", ".plop/*", ".storybook/*"],
    extends: [tseslint.configs.disableTypeChecked],
  },
  {
    files: ["**/*.test.*"],
    plugins: { jest: pluginJest },
    extends: [
      pluginJest.configs["flat/recommended"],
      testingLibrary.configs["flat/react"],
    ],
    languageOptions: {
      globals: pluginJest.environments.globals.globals,
    },
    rules: {
      "jest/prefer-to-have-length": "error",
      "jest/no-mocks-import": "off",
      "react-hooks-extra/no-unnecessary-use-prefix": "off",
    },
  },
  {
    files: ["**/*.stories.{jsx,tsx}"],
    extends: [storybook.configs["flat/recommended"]],
    rules: {
      "react-hooks/rules-of-hooks": "off",
    },
  },
]);
