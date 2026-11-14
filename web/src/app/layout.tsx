import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { Banner } from "@/components/banner";

import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CareTrack",
  description: "Follow a patient's progress through a procedure.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        {/* CLAUDE.md rule 7: the banner lives in the root layout so every
            screen has it, including error and not-found pages. */}
        <Banner />
        {children}
      </body>
    </html>
  );
}
