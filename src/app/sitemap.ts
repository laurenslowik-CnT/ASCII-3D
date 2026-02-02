import { env } from "@/env";

function getSitemap() {
  return [
    {
      url: `https://${env.NEXT_PUBLIC_SITE_URL}`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 1,
    },
  ];
}

export default function sitemap() {
  return getSitemap();
}
