import type { Config } from "prettier";

const config: Config = {
  plugins: ["prettier-plugin-tailwindcss"],
  tailwindFunctions: ["clsx", "cn"],
};

export default config;
