"use client";

import React from "react";
import Link from "next/link";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function Error({ error, reset }: ErrorProps) {
  React.useEffect(() => {
    console.error("Error:", error);
  }, [error]);

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
        <div
          className="bg-white border-8 border-black p-8 mb-8"
          style={{ boxShadow: "0.5rem 0.5rem 0 0 black" }}
        >
          <div className="text-center">
            <h1 className="text-6xl font-black text-red-600 mb-4">OOPS!</h1>
            <h2 className="text-2xl font-black uppercase text-black mb-4">
              Something Went Wrong
            </h2>
            <p className="text-gray-700 font-mono mb-6">
              An unexpected error occurred. This might be a temporary issue.
              <br />
              Your workout data is safe!
            </p>

            <div className="space-y-4">
              <button
                onClick={reset}
                className="inline-block bg-blue-600 text-white font-bold text-lg px-6 py-3 border-4 border-black uppercase transition-all duration-200 hover:transform hover:translate-y-1"
                style={{ boxShadow: "0.5rem 0.5rem 0 0 black" }}
              >
                🔄 Try Again
              </button>

              <div className="mt-4">
                <Link
                  href="/"
                  className="inline-block bg-green-600 text-white font-bold text-lg px-6 py-3 border-4 border-black uppercase transition-all duration-200 hover:transform hover:translate-y-1 no-underline"
                  style={{ boxShadow: "0.5rem 0.5rem 0 0 black" }}
                >
                  🏠 Go Home
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div
          className="bg-gray-100 border-8 border-black p-6"
          style={{ boxShadow: "0.5rem 0.5rem 0 0 black" }}
        >
          <h3 className="text-lg font-black uppercase mb-4 text-center">
            Quick Actions
          </h3>
          <div className="grid grid-cols-1 gap-3">
            <Link
              href="/#workout"
              className="bg-green-600 text-white font-bold text-sm px-4 py-3 border-4 border-black uppercase transition-all duration-200 hover:transform hover:translate-y-1 text-center no-underline block"
              style={{ boxShadow: "0.25rem 0.25rem 0 0 black" }}
            >
              🏋️ Start New Workout
            </Link>
            <Link
              href="/#leaderboard"
              className="bg-yellow-500 text-black font-bold text-sm px-4 py-3 border-4 border-black uppercase transition-all duration-200 hover:transform hover:translate-y-1 text-center no-underline block"
              style={{ boxShadow: "0.25rem 0.25rem 0 0 black" }}
            >
              🏆 View Leaderboard
            </Link>
          </div>
        </div>

        {/* Development Error Details */}
        {process.env.NODE_ENV === "development" && (
          <details className="mt-6 text-left">
            <summary className="cursor-pointer font-bold text-red-600 text-center">
              🔧 Error Details (Development Only)
            </summary>
            <div
              className="mt-4 bg-red-50 border-4 border-red-600 p-4"
              style={{ boxShadow: "0.25rem 0.25rem 0 0 red" }}
            >
              <pre className="text-xs bg-white p-3 rounded overflow-auto border-2 border-red-300">
                <strong>Error Message:</strong>
                {error.message}
                {error.digest && (
                  <>
                    <br />
                    <strong>Digest:</strong> {error.digest}
                  </>
                )}
                <br />
                <strong>Stack:</strong>
                {error.stack}
              </pre>
            </div>
          </details>
        )}
      </div>
    </div>
  );
}
