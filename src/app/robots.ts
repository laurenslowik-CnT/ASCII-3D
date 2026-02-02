import type { MetadataRoute } from "next";
import { env } from "@/env";

export default function robots(): MetadataRoute.Robots {
  const sitemap = new URL(
    "sitemap.xml",
    `https://${env.NEXT_PUBLIC_SITE_URL}`,
  ).toString();

  return {
    rules: {
      userAgent: "*",
      allow: "/",
    },
    sitemap,
  };
}
