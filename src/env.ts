import { createEnv } from "@t3-oss/env-nextjs";
// import * as z from "zod";

export const env = createEnv({
  server: {
    // EXAMPLE_SERVER_VAR: z.string().url(),
  },
  client: {
    // NEXT_PUBLIC_EXAMPLE_CLIENT_VAR: z.string().min(1),
  },
  // For Next.js >= 13.4.4, we only need to destructure client variables:
  experimental__runtimeEnv: {
    // NEXT_PUBLIC_EXAMPLE_CLIENT_VAR: process.env.NEXT_PUBLIC_EXAMPLE_CLIENT_VAR,
  },
});
