import type { Metadata } from "next";
import { sans, mono } from "./fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: "askvault",
  description: "Light up your second brain — find notes in your Obsidian vault, read-only.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${sans.variable} ${mono.variable}`}>
      <body>
        {children}
        <div className="grain" aria-hidden />
      </body>
    </html>
  );
}
