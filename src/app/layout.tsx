import "./globals.css";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Website name",
  description: "C&T Next.js starter template",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
