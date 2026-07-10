import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { SessionProvider } from "@/components/providers/SessionProvider";
import { ToastProvider } from "@/components/providers/ToastProvider";
import { ServiceWorkerProvider } from "@/components/providers/ServiceWorkerProvider";
import ErrorBoundary from "@/components/common/ErrorBoundary";
import Footer from "@/components/layout/Footer";
import InstallPrompt from "@/components/common/InstallPrompt";
import { SkipLink } from "@/components/a11y/SkipLink";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";

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
    apple: "/icons/icon-192.png",
  },
  manifest: "/manifest.json",
  applicationName: "ReflectHub",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "ReflectHub",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: "#0a0a0a",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased flex flex-col min-h-screen`}
      >
        <SkipLink />
        <ErrorBoundary>
          <SessionProvider>
            <ToastProvider>
              <div id="main-content" className="flex-1 flex flex-col">
                {children}
              </div>
              <Footer />
              <InstallPrompt />
            </ToastProvider>
          </SessionProvider>
        </ErrorBoundary>
        <ServiceWorkerProvider />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
