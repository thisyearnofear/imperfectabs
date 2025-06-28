import React from "react";
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-lg w-full text-center">
        {/* Logo */}
        <div className="flex items-center justify-center mb-8">
          <div className="flex items-center relative">
            <div className="h-12 w-12 bg-yellow-500 border-4 border-black rotate-12"></div>
            <div className="h-12 w-12 bg-red-600 border-4 border-black -ml-6 -rotate-12"></div>
            <div className="h-8 w-8 bg-blue-600 border-4 border-black -ml-4 rotate-45"></div>
          </div>
        </div>

        {/* Error Content */}
        <div className="abs-card-brutal bg-white mb-8">
          <div className="text-center">
            <h1 className="text-6xl font-black text-red-600 mb-4">404</h1>
            <h2 className="text-2xl font-black uppercase text-black mb-4">
              Page Not Found
            </h2>
            <p className="text-gray-700 font-mono mb-6">
              The page you&apos;re looking for doesn&apos;t exist.
              <br />
              Let&apos;s get you back to your workout!
            </p>

            <div className="space-y-4">
              <Link
                href="/"
                className="inline-block abs-btn-primary bg-blue-600 text-white"
              >
                🏠 Go Home
              </Link>

              <div className="text-sm text-gray-500 font-mono">
                Or use the navigation above to find what you need.
              </div>
            </div>
          </div>
        </div>

        {/* Quick Links */}
        <div className="abs-card-brutal bg-gray-100">
          <h3 className="text-lg font-black uppercase mb-4 text-center">
            Quick Links
          </h3>
          <div className="grid grid-cols-1 gap-3">
            <Link
              href="/#workout"
              className="abs-btn-primary bg-green-600 text-white text-sm py-2"
            >
              🏋️ Start Workout
            </Link>
            <Link
              href="/#leaderboard"
              className="abs-btn-primary bg-yellow-500 text-black text-sm py-2"
            >
              🏆 View Leaderboard
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
