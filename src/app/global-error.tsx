"use client";

import React from "react";
import Link from "next/link";

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  React.useEffect(() => {
    console.error("Global error:", error);
  }, [error]);

  return (
    <html>
      <body>
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
          <div className="max-w-md w-full text-center">
            <div
              className="bg-white border-8 border-black p-8"
              style={{ boxShadow: "0.5rem 0.5rem 0 0 black" }}
            >
              <h1 className="text-4xl font-black text-red-600 mb-4">ERROR</h1>
              <h2 className="text-xl font-bold uppercase text-black mb-4">
                Something went wrong!
              </h2>
              <p className="text-gray-700 mb-6">
                An unexpected error occurred. This might be a temporary issue.
              </p>

              <div className="space-y-4">
                <button
                  onClick={reset}
                  className="w-full bg-blue-600 text-white font-bold text-lg px-6 py-3 border-4 border-black uppercase transition-all duration-200 hover:transform hover:translate-y-1"
                  style={{ boxShadow: "0.5rem 0.5rem 0 0 black" }}
                >
                  Try Again
                </button>

                <Link
                  href="/"
                  className="block w-full bg-green-600 text-white font-bold text-lg px-6 py-3 border-4 border-black uppercase transition-all duration-200 hover:transform hover:translate-y-1 no-underline"
                  style={{ boxShadow: "0.5rem 0.5rem 0 0 black" }}
                >
                  Go Home
                </Link>
              </div>

              {process.env.NODE_ENV === "development" && (
                <details className="mt-6 text-left">
                  <summary className="cursor-pointer font-bold text-red-600">
                    Error Details (Development)
                  </summary>
                  <pre className="mt-2 text-xs bg-gray-100 p-2 rounded overflow-auto">
                    {error.message}
                    {error.digest && `\nDigest: ${error.digest}`}
                  </pre>
                </details>
              )}
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
