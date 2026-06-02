import type { Metadata } from "next";
import Link from "next/link";
import { Gem } from "../components/Gem";
import { ConstellationField } from "../components/ConstellationField";
import { AboutContent } from "../components/AboutContent";

export const metadata: Metadata = {
  title: "About · askvault",
  description: "Why askvault exists — talk to your Obsidian vault.",
};

export default function AboutPage() {
  return (
    <div className="about">
      <ConstellationField quiet />

      <nav className="about-nav">
        <Link href="/" className="about-brand">
          <Gem size={26} />
          <span>askvault</span>
        </Link>
        <Link href="/" className="ghost-sm">
          Launch app →
        </Link>
      </nav>

      <AboutContent />
    </div>
  );
}
