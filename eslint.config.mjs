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
import reactYouMightNotNeedAnEffect from "eslint-plugin-react-you-might-not-need-an-effect";
import noBarrelFiles from "eslint-plugin-no-barrel-files";
import pluginSecurity from "eslint-plugin-security";

import globals from "globals";
import tsParser from "@typescript-eslint/parser";

export default defineConfig([
  globalIgnores([
    ".next",
    ".pnp*",
    ".yarn",
    "**/generated/*",
    "public-storybook/mockServiceWorker.js",
  ]),
  {
    files: ["**/*.json"],
    ignores: ["package-lock.json"],
    plugins: { json },
    language: "json/json",
    extends: ["json/recommended"],
  },
  {
    files: ["**/*.{ts,tsx,js,jsx,mjs,cjs}"],
    linterOptions: {
      reportUnusedDisableDirectives: "error",
      reportUnusedInlineConfigs: "error",
    },
    extends: [
      js.configs.recommended,
      tseslint.configs.recommendedTypeChecked,
      sonarjs.configs.recommended,
      jsxA11y.flatConfigs.recommended,
      react.configs.flat.recommended,
      react.configs.flat["jsx-runtime"],
      tailwind.configs["flat/recommended"],
      reactHooks.configs.flat["recommended-latest"],
      next.configs.recommended,
      unicorn.configs.recommended,
      pluginPromise.configs["flat/recommended"],
      importX.flatConfigs.recommended,
      importX.flatConfigs.typescript,
      eslintConfigPrettier,
      reactHooksExtra.configs.recommended,
      reactYouMightNotNeedAnEffect.configs.recommended,
      noBarrelFiles.flat,
      pluginSecurity.configs.recommended,
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
      // typescript-eslint extending core rules
      "@typescript-eslint/dot-notation": "error",
      "@typescript-eslint/no-loop-func": "error",
      "no-unused-private-class-members": "off",
      "@typescript-eslint/no-unused-private-class-members": "error",
      "@typescript-eslint/no-useless-constructor": "error",
      "@typescript-eslint/prefer-destructuring": [
        "error",
        {
          VariableDeclarator: { array: false, object: true },
          AssignmentExpression: { array: false, object: false },
        },
      ],
      "@typescript-eslint/return-await": "error",

      // Globally Tuned rules
      "@typescript-eslint/array-type": "error",
      "@typescript-eslint/consistent-type-imports": "error",
      "@typescript-eslint/no-confusing-non-null-assertion": "error",
      "@typescript-eslint/no-deprecated": "error",
      "@typescript-eslint/no-non-null-assertion": "error",
      "@typescript-eslint/no-shadow": "error",
      "@typescript-eslint/no-unnecessary-template-expression": "error",
      "@typescript-eslint/no-unused-expressions": [
        "error",
        { allowShortCircuit: true },
      ],
      "@typescript-eslint/prefer-optional-chain": "error",
      "@typescript-eslint/prefer-string-starts-ends-with": "error",
      "@typescript-eslint/switch-exhaustiveness-check": [
        "error",
        { considerDefaultExhaustiveForUnions: true },
      ],
      "accessor-pairs": "error",
      "array-callback-return": "error",
      eqeqeq: ["error", "smart"],
      "import-x/consistent-type-specifier-style": "error",
      "import-x/no-duplicates": "error",
      "import-x/no-named-as-default": "off",
      "import-x/no-named-as-default-member": "off",
      "import-x/no-self-import": "error",
      "no-alert": "error",
      "no-caller": "error",
      "no-console": "error",
      "no-constructor-return": "error",
      "no-continue": "error",
      "no-else-return": "error",
      "no-eval": "error",
      "no-extend-native": "error",
      "no-extra-bind": "error",
      "no-iterator": "error",
      "no-lone-blocks": "error",
      "no-lonely-if": "error",
      "no-multi-str": "error",
      "no-new-func": "error",
      "no-new-wrappers": "error",
      "no-object-constructor": "error",
      "no-octal-escape": "error",
      "no-promise-executor-return": "error",
      "no-proto": "error",
      "no-script-url": "error",
      "no-self-compare": "error",
      "no-sequences": "error",
      "no-template-curly-in-string": "error",
      "no-undef-init": "error",
      "no-unmodified-loop-condition": "error",
      "no-unneeded-ternary": ["error", { defaultAssignment: false }],
      "no-unreachable-loop": "error",
      "no-useless-assignment": "error",
      "no-useless-call": "error",
      "no-useless-computed-key": "error",
      "no-useless-rename": "error",
      "no-useless-return": "error",
      "object-shorthand": "error",
      "operator-assignment": "error",
      "prefer-arrow-callback": "error",
      "prefer-exponentiation-operator": "error",
      "prefer-numeric-literals": "error",
      "prefer-object-spread": "error",
      "prefer-regex-literals": "error",
      "prefer-template": "error",
      "promise/always-return": ["error", { ignoreLastCallback: true }],
      "promise/catch-or-return": ["error", { allowFinally: true }],
      "react/forward-ref-uses-ref": "error",
      "react/jsx-no-useless-fragment": "error",
      "react/jsx-pascal-case": "error",
      "react/jsx-props-no-spread-multi": "error",
      "react/no-access-state-in-setstate": "error",
      "react/no-unstable-nested-components": "error",
      "react/void-dom-elements-no-children": "error",
      "require-atomic-updates": "error",
      "sonarjs/deprecation": "off",
      "sonarjs/todo-tag": "off",
      "unicorn/filename-case": "off",
      "unicorn/prefer-classlist-toggle": "off",
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
      yoda: ["error", "never", { onlyEquality: true }],
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
      "sonarjs/pseudo-random": "off",
    },
  },
]);
