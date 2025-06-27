import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "IMPERFECT ABS | AI-Powered Core Workout Tracker",
  description:
    "Real-time AI-powered form analysis for abs and core exercises. Track your workouts on Avalanche blockchain with pose detection technology.",
  keywords:
    "fitness, abs workout, AI form analysis, blockchain, pose detection, avalanche, web3 fitness",
  viewport:
    "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no",
  themeColor: "#000000",
  robots: "index, follow",
  openGraph: {
    title: "IMPERFECT ABS | AI-Powered Core Workout Tracker",
    description:
      "Real-time AI-powered form analysis for abs and core exercises",
    type: "website",
    siteName: "Imperfect Fitness Ecosystem",
  },
  twitter: {
    card: "summary_large_image",
    title: "IMPERFECT ABS | AI-Powered Core Workout Tracker",
    description:
      "Real-time AI-powered form analysis for abs and core exercises",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="scroll-smooth">
      <head>
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no"
        />
        <meta name="theme-color" content="#000000" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
      </head>
      <body className="antialiased text-on-colored-bg" suppressHydrationWarning>
        <div id="root" className="min-h-screen">
          {children}
        </div>
        <div id="modal-root" />
      </body>
    </html>
  );
}
