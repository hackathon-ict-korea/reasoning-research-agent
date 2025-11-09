import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Reasoning Research Agent",
  description: "An AI agent designed to assist with reasoning research tasks.",
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
