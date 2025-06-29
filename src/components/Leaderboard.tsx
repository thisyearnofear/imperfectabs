"use client";

import { useEffect, useState, useCallback } from "react";
import { ENSDisplay, useBatchResolvedProfiles } from "./ENSDisplay";
import {
  imperfectAbsContract,
  type AbsScore,
  formatScore,
  formatTimestamp,
} from "../lib/contractIntegration";
import { ethers } from "ethers";

interface LeaderboardEntry {
  id: string;
  walletAddress: string;
  username: string;
  totalReps: number;
  averageFormAccuracy: number;
  bestStreak: number;
  sessionsCompleted: number;
  lastActive: Date;
  score: number;
  compositeScore: number;
}

interface LeaderboardProps {
  currentUserStats?: {
    totalReps: number;
    averageFormAccuracy: number;
    bestStreak: number;
    sessionsCompleted: number;
  };
}

export default function Leaderboard({ currentUserStats }: LeaderboardProps) {
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardEntry[]>(
    []
  );
  const [timeFilter, setTimeFilter] = useState<
    "daily" | "weekly" | "monthly" | "allTime"
  >("weekly");
  const [isLoading, setIsLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [, setLastRefresh] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Get all unique addresses for batch ENS resolution
  const addresses = leaderboardData.map((entry) => entry.walletAddress);
  useBatchResolvedProfiles(addresses); // Preload profiles for ENS components

  const loadLeaderboardData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Initialize contract if not already done
      if (!isConnected && window.ethereum) {
        try {
          const provider = new ethers.providers.Web3Provider(window.ethereum);
          await imperfectAbsContract.initialize(provider);
          setIsConnected(true);
        } catch {
          console.warn(
            "Contract initialization failed, loading in read-only mode"
          );
        }
      }

      // Load leaderboard data from blockchain
      const rawLeaderboard = await imperfectAbsContract.getLeaderboard(50); // Top 50

      // Convert blockchain data to UI format
      const formattedData: LeaderboardEntry[] = await Promise.all(
        rawLeaderboard.map(async (entry: AbsScore) => {
          // Calculate composite score for ranking
          const compositeScore = await imperfectAbsContract.calculateScore(
            entry.totalReps,
            entry.averageFormAccuracy,
            entry.bestStreak
          );

          return {
            id: `${entry.user}-${entry.timestamp}`,
            walletAddress: entry.user,
            username: entry.user, // Will be enhanced with ENS resolution
            totalReps: entry.totalReps,
            averageFormAccuracy: entry.averageFormAccuracy,
            bestStreak: entry.bestStreak,
            sessionsCompleted: entry.sessionsCompleted,
            lastActive: new Date(entry.timestamp * 1000),
            score: entry.totalReps, // Simple score for display
            compositeScore,
          };
        })
      );

      // Sort by composite score descending
      formattedData.sort((a, b) => b.compositeScore - a.compositeScore);

      setLeaderboardData(formattedData);
      setLastRefresh(new Date());
    } catch (error) {
      console.error("Failed to load leaderboard data:", error);
      setError("Failed to load leaderboard data. Please try again.");
      setLeaderboardData([]);
    } finally {
      setIsLoading(false);
    }
  }, [isConnected]);

  useEffect(() => {
    loadLeaderboardData();
  }, [loadLeaderboardData]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (!isLoading) {
        loadLeaderboardData();
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [loadLeaderboardData, isLoading]);

  // Composite score calculation function (for future use)
  // const calculateScore = (entry: LeaderboardEntry): number => {
  //   const repScore = entry.totalReps * 1.0;
  //   const formScore = entry.averageFormAccuracy * 5.0;
  //   const streakScore = entry.bestStreak * 8.0;
  //   const consistencyScore = entry.sessionsCompleted * 3.0;
  //   return Math.round(repScore + formScore + streakScore + consistencyScore);
  // };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return "🥇";
      case 2:
        return "🥈";
      case 3:
        return "🥉";
      default:
        return `#${rank}`;
    }
  };

  const getFormQualityColor = (accuracy: number) => {
    if (accuracy >= 90) return "text-green-500";
    if (accuracy >= 80) return "text-yellow-500";
    return "text-red-500";
  };

  return (
    <div className="abs-card-brutal max-w-5xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-3xl font-black tracking-tighter uppercase text-black border-b-8 border-black pb-2 inline-block">
          🏆 LEADERBOARD
        </h2>

        {/* Time Filter */}
        <div className="flex space-x-2">
          {(["daily", "weekly", "monthly", "allTime"] as const).map(
            (filter) => (
              <button
                key={filter}
                onClick={() => setTimeFilter(filter)}
                className={`px-4 py-2 border-4 border-black font-bold text-sm uppercase transition-all duration-200 ${
                  timeFilter === filter
                    ? "bg-blue-600 text-white shadow-brutal"
                    : "bg-white text-black hover:bg-gray-100"
                }`}
                style={
                  timeFilter === filter
                    ? { boxShadow: "var(--shadow-brutal)" }
                    : {}
                }
              >
                {filter === "allTime" ? "ALL TIME" : filter.toUpperCase()}
              </button>
            )
          )}
        </div>
      </div>

      {/* Current User Stats Preview */}
      {currentUserStats && (
        <div className="abs-card-brutal bg-cyan-400 text-black mb-8">
          <h3 className="text-xl font-black mb-4 uppercase border-b-4 border-black pb-2">
            YOUR CURRENT SESSION
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-black">
                {currentUserStats.totalReps}
              </div>
              <div className="text-sm font-mono font-bold uppercase border-t-2 border-black pt-1 mt-1">
                REPS
              </div>
            </div>
            <div className="text-center">
              <div
                className={`text-2xl font-black ${getFormQualityColor(
                  currentUserStats.averageFormAccuracy
                )}`}
              >
                {currentUserStats.averageFormAccuracy}%
              </div>
              <div className="text-sm font-mono font-bold uppercase border-t-2 border-black pt-1 mt-1">
                FORM
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-black">
                {currentUserStats.bestStreak}
              </div>
              <div className="text-sm font-mono font-bold uppercase border-t-2 border-black pt-1 mt-1">
                STREAK
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-black">
                {currentUserStats.sessionsCompleted}
              </div>
              <div className="text-sm font-mono font-bold uppercase border-t-2 border-black pt-1 mt-1">
                SESSIONS
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Loading State */}
      {isLoading ? (
        <div className="abs-card-brutal bg-yellow-500 text-black text-center py-8">
          <div className="flex justify-center items-center">
            <div className="h-8 w-8 bg-black border-4 border-black animate-spin mr-4"></div>
            <span className="font-mono font-bold uppercase">
              LOADING LEADERBOARD DATA...
            </span>
          </div>
        </div>
      ) : (
        <>
          {/* Leaderboard Table */}
          <div className="overflow-x-auto abs-card-brutal bg-white">
            <table className="w-full font-mono">
              <thead>
                <tr className="border-b-4 border-black bg-black text-white">
                  <th className="text-left py-4 px-4 font-black uppercase">
                    RANK
                  </th>
                  <th className="text-left py-4 px-4 font-black uppercase">
                    USER
                  </th>
                  <th className="text-center py-4 px-4 font-black uppercase">
                    SCORE
                  </th>
                  <th className="text-center py-4 px-4 font-black uppercase">
                    REPS
                  </th>
                  <th className="text-center py-4 px-4 font-black uppercase">
                    FORM
                  </th>
                  <th className="text-center py-4 px-4 font-black uppercase">
                    STREAK
                  </th>
                  <th className="text-center py-4 px-4 font-black uppercase">
                    SESSIONS
                  </th>
                  <th className="text-center py-4 px-4 font-black uppercase">
                    LAST ACTIVE
                  </th>
                </tr>
              </thead>
              <tbody>
                {leaderboardData.length === 0 && !isLoading && !error ? (
                  <tr>
                    <td colSpan={8} className="text-center py-12 text-gray-600">
                      <div className="text-6xl mb-4">🏆</div>
                      <h3 className="text-xl font-bold mb-2">
                        No workouts yet!
                      </h3>
                      <p className="mb-4">
                        Be the first to submit a workout to the blockchain.
                      </p>
                      <div className="text-sm text-gray-500">
                        Connect your wallet and complete a workout to get
                        started!
                      </div>
                    </td>
                  </tr>
                ) : (
                  leaderboardData.map((entry, index) => {
                    const rank = index + 1;
                    return (
                      <tr
                        key={entry.id}
                        className={`abs-leaderboard-row ${
                          rank <= 3 ? "abs-leaderboard-row top-three" : ""
                        }`}
                        style={
                          rank <= 3
                            ? {
                                backgroundColor:
                                  rank === 1
                                    ? "#ffd70020"
                                    : rank === 2
                                    ? "#c0c0c020"
                                    : "#cd7f3220",
                              }
                            : {}
                        }
                      >
                        <td className="py-4 px-4">
                          <div className="flex items-center">
                            <div
                              className={`abs-leaderboard-rank mr-2 ${
                                rank === 1
                                  ? "abs-leaderboard-gold"
                                  : rank === 2
                                  ? "abs-leaderboard-silver"
                                  : rank === 3
                                  ? "abs-leaderboard-bronze"
                                  : ""
                              }`}
                            >
                              {getRankIcon(rank)}
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <div>
                            <ENSDisplay
                              address={entry.walletAddress}
                              className="font-black text-black uppercase"
                              showAvatar={true}
                              maxLength={20}
                            />
                            <div className="text-xs text-gray-500 mt-1">
                              {formatTimestamp(
                                entry.lastActive.getTime() / 1000
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-4 text-center">
                          <div className="font-black text-xl text-purple-600 border-2 border-purple-600 px-2 py-1">
                            {formatScore(entry.compositeScore)}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            Composite
                          </div>
                        </td>
                        <td className="py-4 px-4 text-center">
                          <div className="font-black text-blue-600">
                            {entry.totalReps}
                          </div>
                        </td>
                        <td className="py-4 px-4 text-center">
                          <div
                            className={`font-black ${getFormQualityColor(
                              entry.averageFormAccuracy
                            )}`}
                          >
                            {entry.averageFormAccuracy}%
                          </div>
                        </td>
                        <td className="py-4 px-4 text-center">
                          <div className="font-black text-orange-600">
                            {entry.bestStreak}
                          </div>
                        </td>
                        <td className="py-4 px-4 text-center">
                          <div className="font-black text-green-600">
                            {entry.sessionsCompleted}
                          </div>
                        </td>
                        <td className="py-4 px-4 text-center">
                          <a
                            href={`https://testnet.snowtrace.io/address/${entry.walletAddress}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 underline text-sm font-bold"
                          >
                            📱 View
                          </a>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Blockchain Integration Notice */}
          <div className="mt-8 abs-card-brutal bg-gradient-to-r from-purple-500 to-blue-600 text-white">
            <div className="flex items-center">
              <div className="h-12 w-12 bg-white border-4 border-black flex items-center justify-center mr-4">
                <span className="text-2xl">⛓️</span>
              </div>
              <div>
                <h4 className="text-xl font-black uppercase border-b-4 border-white pb-1 mb-2">
                  BLOCKCHAIN INTEGRATION INCOMING
                </h4>
                <p className="font-mono font-bold">
                  CONNECT YOUR WALLET TO JOIN THE ON-CHAIN LEADERBOARD ON
                  AVALANCHE FUJI TESTNET. EARN NFT ACHIEVEMENTS AND COMPETE WITH
                  VERIFIED FITNESS DATA.
                </p>
              </div>
            </div>
          </div>

          {/* Stats Explanation */}
          <div className="mt-6 abs-card-brutal bg-yellow-500 text-black">
            <details className="cursor-pointer">
              <summary className="text-lg font-black uppercase border-b-4 border-black pb-2 mb-4">
                HOW SCORES ARE CALCULATED
              </summary>
              <div className="grid md:grid-cols-2 gap-4 font-mono font-bold">
                <div className="space-y-2">
                  <div className="flex items-center">
                    <div className="h-4 w-4 bg-blue-600 border-2 border-black mr-3"></div>
                    <strong>REPS:</strong> TOTAL × 1.0
                  </div>
                  <div className="flex items-center">
                    <div className="h-4 w-4 bg-green-600 border-2 border-black mr-3"></div>
                    <strong>FORM:</strong> ACCURACY × 5.0
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center">
                    <div className="h-4 w-4 bg-orange-600 border-2 border-black mr-3"></div>
                    <strong>STREAK:</strong> BEST × 8.0
                  </div>
                  <div className="flex items-center">
                    <div className="h-4 w-4 bg-red-600 border-2 border-black mr-3"></div>
                    <strong>CONSISTENCY:</strong> SESSIONS × 3.0
                  </div>
                </div>
                <div className="col-span-full mt-4 p-2 bg-black text-yellow-500 border-4 border-black">
                  FORM ACCURACY + CONSISTENCY WEIGHTED HIGHER THAN RAW REPS
                </div>
              </div>
            </details>
          </div>
        </>
      )}
    </div>
  );
}
