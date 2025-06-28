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
    <div id="root" className="min-h-screen">
      {children}
    </div>
  );
}
