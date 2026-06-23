import js from "@eslint/js";
import json from "@eslint/json";
import eslintReact from "@eslint-react/eslint-plugin";
import eslintReactKit from "@eslint-react/kit";
import next from "@next/eslint-plugin-next";
import vitest from "@vitest/eslint-plugin";
import { defineConfig, globalIgnores } from "eslint/config";
import eslintConfigPrettier from "eslint-config-prettier/flat";
import betterTailwindcss from "eslint-plugin-better-tailwindcss";
import { importX } from "eslint-plugin-import-x";
import jsxA11y from "eslint-plugin-jsx-a11y";
import pluginPromise from "eslint-plugin-promise";
import reactRefresh from "eslint-plugin-react-refresh";
import reactYouMightNotNeedAnEffect from "eslint-plugin-react-you-might-not-need-an-effect";
import pluginSecurity from "eslint-plugin-security";
import simpleImportSort from "eslint-plugin-simple-import-sort";
import sonarjs from "eslint-plugin-sonarjs";
import storybook from "eslint-plugin-storybook";
import testingLibrary from "eslint-plugin-testing-library";
import unicorn from "eslint-plugin-unicorn";
import globals from "globals";
import tseslint from "typescript-eslint";

import { jsxMaxDepth } from "./lint-rules/jsxMaxDepth.ts";
import { jsxNoDuplicateProps } from "./lint-rules/jsxNoDuplicateProps.ts";
import { jsxPascalCase } from "./lint-rules/jsxPascalCase.ts";
import { jsxPropsNoSpreadMulti } from "./lint-rules/jsxPropsNoSpreadMulti.ts";

export default defineConfig([
  globalIgnores([
    ".next",
    ".pnp*",
    ".yarn",
    "**/generated/*",
    "public-storybook/mockServiceWorker.js",
    "storybook-static",
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
      betterTailwindcss.configs.recommended,
      next.configs.recommended,
      unicorn.configs.recommended,
      pluginPromise.configs["flat/recommended"],
      importX.flatConfigs.recommended,
      importX.flatConfigs.typescript,
      reactYouMightNotNeedAnEffect.configs.recommended,
      pluginSecurity.configs.recommended,
      eslintReact.configs["strict-type-checked"],
      eslintReactKit()
        .use(jsxMaxDepth, { max: 3 })
        .use(jsxNoDuplicateProps)
        .use(jsxPascalCase)
        .use(jsxPropsNoSpreadMulti)
        .getConfig(),
      eslintConfigPrettier,
    ],

    settings: {
      "better-tailwindcss": {
        entryPoint: "src/app/globals.css",
      },
    },

    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
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
      // typescript-eslint improved rules
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
      "sonarjs/no-unused-vars": "off",
      "sonarjs/unused-import": "off",

      // Conflicts with prettier-plugin-tailwindcss
      "better-tailwindcss/enforce-consistent-class-order": "off",
      "better-tailwindcss/enforce-consistent-line-wrapping": "off",

      // Globally Tuned rules
      "@eslint-react/dom-no-string-style-prop": "error",
      "@eslint-react/globals": "error",
      "@eslint-react/immutability": "error",
      "@eslint-react/jsx-no-useless-fragment": "error",
      "@eslint-react/refs": "error",
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
      "jsx-a11y/html-has-lang": "off",
      "jsx-a11y/lang": "error",
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
      "require-atomic-updates": "error",
      "simple-import-sort/imports": "error",
      "simple-import-sort/exports": "error",
      "sonarjs/deprecation": "off",
      "sonarjs/todo-tag": "off",
      "unicorn/filename-case": "off",
      "unicorn/no-array-callback-reference": "off",
      "unicorn/no-array-for-each": "off",
      "unicorn/no-array-reduce": "off",
      "unicorn/no-null": "off",
      "unicorn/no-useless-switch-case": "off",
      "unicorn/numeric-separators-style": "off",
      "unicorn/prefer-classlist-toggle": "off",
      "unicorn/prefer-global-this": "off",
      "unicorn/prefer-number-properties": "off",
      "unicorn/prevent-abbreviations": "off",
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
    files: ["**/*.{mjs,cjs,js}", ".plop/*", ".storybook/*"],
    extends: [
      tseslint.configs.disableTypeChecked,
      eslintReact.configs["disable-type-checked"],
    ],
  },
  {
    files: ["**/*.test.*"],
    extends: [vitest.configs.recommended, testingLibrary.configs["flat/react"]],
    rules: {
      "@eslint-react/no-unnecessary-use-prefix": "off",
      "sonarjs/pseudo-random": "off",
      "vitest/prefer-to-have-length": "error",
    },
  },
  {
    files: ["**/*.stories.{jsx,tsx}"],
    extends: [storybook.configs["flat/recommended"]],
    rules: {
      "sonarjs/pseudo-random": "off",
    },
  },
]);
