import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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
  metadataBase: new URL("https://collabnotes.app"),
  title: "Collab Notes — Real-Time Collaborative Note-Taking",
  description:
    "Create, share, and edit notes in real-time with your team. Powered by CRDTs for zero-conflict collaboration — no signup required to start.",
  keywords: [
    "collaborative notes",
    "real-time editing",
    "team notes",
    "CRDT",
    "note-taking app",
    "live collaboration",
    "shared notes",
  ],
  robots: { index: true, follow: true },
  openGraph: {
    title: "Collab Notes — Real-Time Collaborative Note-Taking",
    description:
      "Create, share, and edit notes in real-time. Zero conflicts, no signup required.",
    siteName: "Collab Notes",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Collab Notes — Real-Time Collaborative Note-Taking",
    description:
      "Create, share, and edit notes in real-time. Zero conflicts, no signup required.",
  },
  icons: {
    icon: "/icon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
