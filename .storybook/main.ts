import type { StorybookConfig } from "@storybook/nextjs";
import { env as t3Env } from "../src/env";

const config: StorybookConfig = {
  stories: ["../src/**/*.mdx", "../src/**/*.stories.@(js|jsx|mjs|ts|tsx)"],

  addons: [
    "@storybook/addon-links",
    "@storybook/addon-a11y",
    "@storybook/addon-designs",
    "@storybook/addon-docs",
  ],

  framework: {
    name: "@storybook/nextjs",
    options: {},
  },

  docs: {},

  staticDirs: ["../public"],

  env: (config1) => ({
    ...config1,
    ...t3Env,
  }),

  typescript: {
    reactDocgen: "react-docgen-typescript",
  },
};
export default config;
