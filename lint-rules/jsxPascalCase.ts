// From https://eslint-react.xyz/docs/migrating-from-eslint-plugin-react
import type { RuleFunction } from "@eslint-react/kit";

/** Options for {@link jsxPascalCase}. */
export type JsxPascalCaseOptions = {
  /** Allow all-uppercase component names like `<XML />`. */
  allowAllCaps?: boolean;
  /** Allow leading underscores in component names like `<_Component />`. */
  allowLeadingUnderscore?: boolean;
};

/** Enforce PascalCase for user-defined JSX components. */
export function jsxPascalCase(
  options: JsxPascalCaseOptions = {},
): RuleFunction {
  const { allowAllCaps = false, allowLeadingUnderscore = false } = options;
  const pascalCaseRegex = /^[A-Z][a-zA-Z0-9]*$/;
  return (context) => ({
    JSXOpeningElement(node) {
      // eslint-disable-next-line @typescript-eslint/prefer-destructuring
      const name = node.name;
      // › Guard: must be simple identifier
      // eslint-disable-next-line @typescript-eslint/no-unsafe-enum-comparison
      if (name.type !== "JSXIdentifier") return;
      const componentName = name.name;
      // ─── Handle leading underscore ───────────────
      if (componentName.startsWith("_")) {
        if (!allowLeadingUnderscore) {
          context.report({
            node: name,
            message: `Component name "${componentName}" should not start with an underscore.`,
          });
        }
        return;
      }
      // › Guard: ignore DOM elements (lowercase)
      const firstChar = componentName[0];
      // eslint-disable-next-line sonarjs/different-types-comparison
      if (firstChar === undefined) return;
      if (firstChar === firstChar.toLowerCase()) return;
      // ─── Handle all-caps ─────────────────────────
      if (componentName === componentName.toUpperCase()) {
        if (!allowAllCaps) {
          context.report({
            node: name,
            message: `Component name "${componentName}" should use PascalCase, not all uppercase.`,
          });
        }
        return;
      }
      // ─── Validate PascalCase ─────────────────────
      if (!pascalCaseRegex.test(componentName)) {
        context.report({
          node: name,
          message: `Component name "${componentName}" should be in PascalCase.`,
        });
      }
    },
  });
}
