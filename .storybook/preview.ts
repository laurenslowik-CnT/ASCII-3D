import type { Preview } from "@storybook/nextjs-vite";
import "../src/app/globals.css";
import { initialize, mswLoader } from "msw-storybook-addon";
import { handlers } from "../src/__mocks__/handlers";

initialize();

const preview: Preview = {
  parameters: {
    nextjs: {
      /**
       * Tells Storybook to work with the `app` directory in Next.js.
       * For more details
       * @see https://storybook.js.org/docs/get-started/frameworks/nextjs#nextjs-navigation
       */
      appDirectory: true,
    },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /date$/i,
      },
    },
    msw: {
      handlers,
    },
  },
  loaders: [mswLoader],
};

export default preview;
