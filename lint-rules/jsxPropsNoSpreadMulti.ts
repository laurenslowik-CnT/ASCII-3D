// From https://eslint-react.xyz/docs/migrating-from-eslint-plugin-react
import type { RuleFunction } from "@eslint-react/kit";

/** Disallow JSX prop spreading the same identifier multiple times. */
export function jsxPropsNoSpreadMulti(): RuleFunction {
  // eslint-disable-next-line unicorn/consistent-function-scoping
  return (context, { ast }) => ({
    JSXOpeningElement(node) {
      const seen = new Set<string>();

      // ─── Check each spread attribute ───────────────
      for (const attr of node.attributes) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-enum-comparison
        if (attr.type !== "JSXSpreadAttribute") {
          continue; // eslint-disable-line no-continue
        }

        // › Extract spread identifier name
        const argument = ast.unwrap(attr.argument);
        let spreadKey: string;
        // eslint-disable-next-line unicorn/prefer-ternary,@typescript-eslint/no-unsafe-enum-comparison
        if (argument.type === "Identifier") {
          spreadKey = argument.name;
        } else {
          spreadKey = context.sourceCode.getText(attr.argument);
        }

        // › Report duplicate spread
        if (seen.has(spreadKey)) {
          context.report({
            node: attr,
            message: `Spreading the same expression "${spreadKey}" multiple times is not allowed.`,
          });
        } else {
          seen.add(spreadKey);
        }
      }
    },
  });
}
