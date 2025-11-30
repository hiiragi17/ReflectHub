import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { SessionProvider } from "@/components/providers/SessionProvider";
import { ToastProvider } from "@/components/providers/ToastProvider";
import ErrorBoundary from "@/components/common/ErrorBoundary";
import { Analytics } from "@vercel/analytics/react";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "ReflectHub - 3分で始める週次振り返り",
    template: "%s | ReflectHub"
  },
  description: "YWTやKPTフレームワークを使った週次振り返りアプリ。3分で今週の振り返りを記録し、継続的な成長を実現しましょう。",
  keywords: ["振り返り", "リフレクション", "YWT", "KPT", "週次振り返り", "成長記録", "自己改善"],
  authors: [{ name: "ReflectHub" }],
  creator: "ReflectHub",
  openGraph: {
    type: "website",
    locale: "ja_JP",
    url: "https://reflecthub.com",
    title: "ReflectHub - 3分で始める週次振り返り",
    description: "YWTやKPTフレームワークを使った週次振り返りアプリ。3分で今週の振り返りを記録し、継続的な成長を実現しましょう。",
    siteName: "ReflectHub",
    images: [
      {
        url: "/ogp.png",
        width: 1200,
        height: 630,
        alt: "ReflectHub - 3分で始める週次振り返り",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "ReflectHub - 3分で始める週次振り返り",
    description: "YWTやKPTフレームワークを使った週次振り返りアプリ。3分で今週の振り返りを記録し、継続的な成長を実現しましょう。",
    images: ["/ogp.png"],
  },
  robots: {
    index: true,
    follow: true,
  },
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ErrorBoundary>
          <SessionProvider>
            <ToastProvider>
              {children}
            </ToastProvider>
          </SessionProvider>
        </ErrorBoundary>
        <Analytics />
      </body>
    </html>
  );
}
