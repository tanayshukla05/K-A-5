import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { BackgroundVideo } from "@/components/bg-video";
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
  title: "Pandit Tanay Shukla Ji Maharaj — Knowledge Archive",
  description:
    "A personal knowledge archive publishing blogs, CTF walkthroughs, research notes, cheat sheets, and downloadable files.",
  keywords: [
    "knowledge archive",
    "malware analysis",
    "reverse engineering",
    "shellcode loaders",
    "windows internals",
    "detection engineering",
    "yara",
    "ctf walkthroughs",
  ],
  authors: [{ name: "Pandit Tanay Shukla Ji Maharaj" }],
  icons: {
    icon: "/favicon.png",
    apple: "/logo.png",
  },
  openGraph: {
    title: "Pandit Tanay Shukla Ji Maharaj — Knowledge Archive",
    description:
      "A personal knowledge archive publishing blogs, CTF walkthroughs, research notes, cheat sheets, and downloadable files.",
    siteName: "Knowledge Archive",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Pandit Tanay Shukla Ji Maharaj — Knowledge Archive",
    description:
      "A personal knowledge archive publishing blogs, CTF walkthroughs, research notes, cheat sheets, and downloadable files.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport = {
  themeColor: "#0a0a0a",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {/*
          BACKGROUND GHOST — looping rain-boulder video behind the whole
          app. Mounted through BackgroundVideo so phones get real muted /
          playsinline attributes + poster + play() fallback (see the
          component header for why — mobile autoplay silently fails
          otherwise). Fixed and z-index -1 via .bg-video in globals.css.
        */}
        <BackgroundVideo />
        {children}
      </body>
    </html>
  );
}
