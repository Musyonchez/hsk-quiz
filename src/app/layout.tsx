import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AppHeader } from "@/components/AppHeader";
import { HeaderHeightVar } from "@/components/HeaderHeightVar";
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
  title: "HSK Quiz",
  description:
    "Learn HSK vocabulary with typed pinyin recall, meaning quizzes, and character-only mode — audio and a memory aid for every word, by chapter, combined, or fully custom.",
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
      <body className="flex min-h-full flex-col">
        <HeaderHeightVar>
          <AppHeader />
        </HeaderHeightVar>
        {children}
      </body>
    </html>
  );
}
