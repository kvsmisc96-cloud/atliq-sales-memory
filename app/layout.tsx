import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { TODAY } from "@/lib/data";
import { weekday } from "@/lib/dates";

export const metadata: Metadata = {
  title: "AtliQ Sales Memory Assistant",
  description: "Prototype: a grounded daily brief and CRM assistant for AtliQ's founder-sellers.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="topbar">
          <div className="inner">
            <Link href="/" className="brand">AtliQ Sales Memory</Link>
            <nav className="nav">
              <Link href="/">Daily brief</Link>
              <Link href="/crm">CRM fixes</Link>
              <Link href="/opportunities">Opportunities</Link>
              <Link href="/sources">Sources</Link>
              <Link href="/try">Try it live</Link>
              <Link href="/evals">Evals</Link>
              <Link href="/audit">Audit log</Link>
            </nav>
            <span className="today">Dataset date: {weekday(TODAY)}</span>
          </div>
        </header>
        <div className="banner">
          <div className="inner">
            Prototype on synthetic data. The assistant suggests; a person approves. It never sends email or changes the CRM on its own.
          </div>
        </div>
        <main>{children}</main>
      </body>
    </html>
  );
}
