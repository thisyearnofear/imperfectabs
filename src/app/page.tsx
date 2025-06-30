"use client";

import { useState, useEffect } from "react";
import ImprovedWorkoutTracker from "../components/ImprovedWorkoutTracker";
import Leaderboard from "../components/Leaderboard";
import EcosystemNav from "../components/EcosystemNav";
import { WalletProvider } from "../contexts/WalletContext";
import { ContractProvider } from "../contexts/ContractContext";
import WalletConnectButton, {
  MobileWalletIndicator,
} from "../components/WalletConnectButton";
import NetworkSwitcher from "../components/NetworkSwitcher";

type ActiveTab = "workout" | "leaderboard";

function HomeContent() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("workout");
  const [isMobile, setIsMobile] = useState(false);
  const [currentSessionStats] = useState({
    totalReps: 0,
    averageFormAccuracy: 100,
    bestStreak: 0,
    sessionsCompleted: 1,
  });

  // Detect mobile device
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 mobile-viewport-fix">
      {/* Header */}
      <header className="bg-white border-b-8 border-black app-header">
        <div className="max-w-6xl mx-auto px-4 py-4 md:py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              {/* Geometric Logo */}
              <div className="flex items-center relative">
                <div
                  className={`${
                    isMobile ? "h-8 w-8" : "h-12 w-12"
                  } bg-yellow-500 border-4 border-black rotate-12`}
                ></div>
                <div
                  className={`${
                    isMobile ? "h-8 w-8" : "h-12 w-12"
                  } bg-red-600 border-4 border-black -ml-4 md:-ml-6 -rotate-12`}
                ></div>
                <div
                  className={`${
                    isMobile ? "h-6 w-6" : "h-8 w-8"
                  } bg-blue-600 border-4 border-black -ml-3 md:-ml-4 rotate-45`}
                ></div>
              </div>
              <div>
                <h1 className="text-xl md:text-2xl font-black tracking-tighter uppercase text-black">
                  IMPERFECT ABS
                </h1>
                <p className="text-xs md:text-sm font-mono font-bold text-gray-700 uppercase">
                  BUILD YOUR CORE ONCHAIN
                </p>
              </div>
            </div>

            {/* Wallet connection and network switcher - responsive */}
            <div className="flex items-center space-x-2">
              {isMobile ? (
                <MobileWalletIndicator />
              ) : (
                <WalletConnectButton
                  variant="primary"
                  showBalance={false}
                  className="text-on-colored-bg"
                />
              )}
              <NetworkSwitcher variant="header" />
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <nav className="bg-white border-b-4 border-black sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex space-x-0">
            <button
              onClick={() => setActiveTab("workout")}
              className={`abs-btn-nav flex-1 ${
                activeTab === "workout" ? "active" : ""
              }`}
            >
              <div className="flex items-center justify-center space-x-1 md:space-x-2">
                <div
                  className={`${
                    isMobile ? "h-4 w-4" : "h-6 w-6"
                  } bg-red-600 border-2 border-black`}
                ></div>
                <span className={isMobile ? "text-sm" : ""}>WORKOUT</span>
              </div>
            </button>

            <button
              onClick={() => setActiveTab("leaderboard")}
              className={`abs-btn-nav flex-1 ${
                activeTab === "leaderboard" ? "active" : ""
              }`}
            >
              <div className="flex items-center justify-center space-x-1 md:space-x-2">
                <div
                  className={`${
                    isMobile ? "h-4 w-4" : "h-6 w-6"
                  } bg-yellow-500 border-2 border-black transform rotate-45`}
                ></div>
                <span className={isMobile ? "text-sm" : ""}>LEADERBOARD</span>
              </div>
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className={isMobile ? "py-4" : "py-8"}>
        {activeTab === "workout" && <ImprovedWorkoutTracker />}

        {activeTab === "leaderboard" && (
          <div className="px-4">
            <Leaderboard currentUserStats={currentSessionStats} />
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-black text-white border-t-8 border-black mt-8 md:mt-16 app-footer">
        <div className="max-w-6xl mx-auto px-4 py-8 md:py-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-8">
            <div className="abs-card-workout">
              <h3 className="text-xl font-black mb-4 uppercase border-b-4 border-white pb-2">
                IMPERFECT ABS
              </h3>
              <p className="text-sm font-mono">
                PART OF THE IMPERFECT FITNESS ECOSYSTEM. AI-POWERED FORM
                ANALYSIS WITH BLOCKCHAIN LEADERBOARDS ACROSS MULTIPLE NETWORKS.
              </p>
              <div className="mt-3 text-xs font-mono text-gray-300">
                <span className="text-cyan-400">SISTER APPS:</span>{" "}
                IMPERFECTCOACH • IMPERFECTFORM • IMPERFECTBREATH
              </div>
            </div>

            <div className="abs-card-brutal bg-blue-600 text-black">
              <h3 className="text-xl font-black mb-4 uppercase border-b-4 border-black pb-2">
                FEATURES
              </h3>
              <ul className="text-sm font-mono space-y-2">
                <li className="flex items-center">
                  <div className="h-3 w-3 bg-cyan-400 border-2 border-black mr-2"></div>
                  REAL-TIME POSE DETECTION
                </li>
                <li className="flex items-center">
                  <div className="h-3 w-3 bg-lime-400 border-2 border-black mr-2"></div>
                  FORM ACCURACY ANALYSIS
                </li>
                <li className="flex items-center">
                  <div className="h-3 w-3 bg-fuchsia-400 border-2 border-black mr-2"></div>
                  STREAK TRACKING
                </li>
                <li className="flex items-center">
                  <div className="h-3 w-3 bg-orange-400 border-2 border-black mr-2"></div>
                  BLOCKCHAIN LEADERBOARDS
                </li>
              </ul>
            </div>

            <div className="abs-card-brutal bg-red-600 text-black">
              <h3 className="text-xl font-black mb-4 uppercase border-b-4 border-black pb-2">
                TECHNOLOGY
              </h3>
              <ul className="text-sm font-mono space-y-2">
                <li className="flex items-center">
                  <div className="h-3 w-3 bg-yellow-400 border-2 border-black mr-2 rotate-45"></div>
                  MEDIAPIPE AI
                </li>
                <li className="flex items-center">
                  <div className="h-3 w-3 bg-emerald-400 border-2 border-black mr-2"></div>
                  NEXT.JS + TYPESCRIPT
                </li>
                <li className="flex items-center">
                  <div className="h-3 w-3 bg-cyan-400 border-2 border-black mr-2"></div>
                  AVALANCHE C-CHAIN
                </li>
                <li className="flex items-center">
                  <div className="h-3 w-3 bg-purple-400 border-2 border-black mr-2 rotate-45"></div>
                  MULTI-CHAIN ECOSYSTEM
                </li>
                <li className="flex items-center">
                  <div className="h-3 w-3 bg-lime-400 border-2 border-black mr-2"></div>
                  CHAINLINK FUNCTIONS
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t-4 border-white pt-6 md:pt-8 mt-6 md:mt-8 flex flex-col items-center space-y-4">
            <div className="abs-card-brutal bg-yellow-500 text-black inline-block text-center">
              <p className="text-xs md:text-sm font-mono font-bold uppercase">
                PART OF THE IMPERFECT FITNESS ECOSYSTEM
                <br />
                {isMobile ? (
                  <>
                    CAMERA PERMISSIONS REQUIRED
                    <br />
                    AVALANCHE BLOCKCHAIN INTEGRATION
                  </>
                ) : (
                  <>
                    EXPLORE: IMPERFECTCOACH.NETLIFY.APP • IMPERFECTFORM.FUN •
                    IMPERFECTBREATH.NETLIFY.APP
                    <br />
                    CAMERA PERMISSIONS REQUIRED FOR POSE DETECTION
                  </>
                )}
              </p>
            </div>
            <EcosystemNav />
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function Home() {
  return (
    <WalletProvider>
      <ContractProvider>
        <HomeContent />
      </ContractProvider>
    </WalletProvider>
  );
}
