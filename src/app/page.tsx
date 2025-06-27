"use client";

import { useState } from "react";
import AbsExerciseTracker from "../components/AbsExerciseTracker";
import Leaderboard from "../components/Leaderboard";

type ActiveTab = "workout" | "leaderboard";

export default function Home() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("workout");
  const [currentSessionStats] = useState({
    totalReps: 0,
    averageFormAccuracy: 100,
    bestStreak: 0,
    sessionsCompleted: 1,
  });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="text-3xl">💪</div>
              <div>
                <h1 className="text-xl font-bold text-gray-800">Perfect Abs</h1>
                <p className="text-sm text-gray-600">
                  AI-Powered Fitness Tracker
                </p>
              </div>
            </div>

            {/* Future wallet connection button */}
            <button className="bg-gradient-to-r from-purple-500 to-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:from-purple-600 hover:to-blue-600 transition-all duration-200 shadow-sm">
              🔗 Connect Wallet (Soon)
            </button>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <nav className="bg-white border-b">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex space-x-8">
            <button
              onClick={() => setActiveTab("workout")}
              className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                activeTab === "workout"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              <div className="flex items-center space-x-2">
                <span>🏋️</span>
                <span>Workout</span>
              </div>
            </button>

            <button
              onClick={() => setActiveTab("leaderboard")}
              className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                activeTab === "leaderboard"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              <div className="flex items-center space-x-2">
                <span>🏆</span>
                <span>Leaderboard</span>
              </div>
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="py-8">
        {activeTab === "workout" && <AbsExerciseTracker />}

        {activeTab === "leaderboard" && (
          <Leaderboard currentUserStats={currentSessionStats} />
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t mt-16">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <h3 className="font-semibold text-gray-800 mb-3">Perfect Abs</h3>
              <p className="text-sm text-gray-600">
                AI-powered fitness tracking with blockchain leaderboards. Built
                for the future of decentralized fitness.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-gray-800 mb-3">Features</h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Real-time pose detection</li>
                <li>• Form accuracy analysis</li>
                <li>• Streak tracking</li>
                <li>• Blockchain leaderboards (soon)</li>
                <li>• NFT achievements (soon)</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-gray-800 mb-3">Technology</h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• MediaPipe Pose Detection</li>
                <li>• Next.js & TypeScript</li>
                <li>• Avalanche C-Chain</li>
                <li>• Chainlink Functions (planned)</li>
                <li>• AI Agent Integration (planned)</li>
              </ul>
            </div>
          </div>

          <div className="border-t pt-6 mt-6 text-center">
            <p className="text-sm text-gray-500">
              Built for the Web3 fitness revolution. Camera permissions required
              for pose detection.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
