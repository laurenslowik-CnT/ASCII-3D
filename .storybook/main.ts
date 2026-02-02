import type { StorybookConfig } from "@storybook/nextjs-vite";
import tsConfigPaths from "vite-tsconfig-paths";

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

  docs: {},

  staticDirs: ["../public", "../public-storybook"],

  typescript: {
    reactDocgen: "react-docgen-typescript",
  },

  features: {
    experimentalRSC: true,
  },

  core: {
    builder: "@storybook/builder-vite",
  },

  async viteFinal(c) {
    const { mergeConfig } = await import("vite");

    return mergeConfig(c, {
      plugins: [tsConfigPaths()],
    });
  },
};
export default config;
