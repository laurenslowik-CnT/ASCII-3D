import type { StorybookConfig } from "@storybook/nextjs-vite";
import { env as t3Env } from "../src/env.ts";

const config: StorybookConfig = {
  stories: ["../src/**/*.mdx", "../src/**/*.stories.@(js|jsx|mjs|ts|tsx)"],

  addons: [
    "@storybook/addon-links",
    "@storybook/addon-a11y",
    "@storybook/addon-designs",
    "@storybook/addon-docs",
  ],

  framework: {
    name: "@storybook/nextjs-vite",
    options: {},
  },

  core: {
    builder: "@storybook/builder-vite",
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
