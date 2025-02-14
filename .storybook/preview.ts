import type { Preview } from "@storybook/react";
import "../src/app/globals.css";

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
  },
};

export default preview;
