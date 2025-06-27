"use client";

import { useEffect, useState } from "react";

interface LeaderboardEntry {
  id: string;
  walletAddress?: string;
  username: string;
  totalReps: number;
  averageFormAccuracy: number;
  bestStreak: number;
  sessionsCompleted: number;
  lastActive: Date;
  score: number; // Calculated composite score
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
    [],
  );
  const [timeFilter, setTimeFilter] = useState<
    "daily" | "weekly" | "monthly" | "allTime"
  >("weekly");
  const [isLoading, setIsLoading] = useState(false);

  // Mock data for demonstration - will be replaced with blockchain data
  const mockLeaderboardData: LeaderboardEntry[] = [
    {
      id: "1",
      username: "FitnessCrypto",
      totalReps: 1250,
      averageFormAccuracy: 94,
      bestStreak: 45,
      sessionsCompleted: 28,
      lastActive: new Date("2024-01-15"),
      score: 1567,
    },
    {
      id: "2",
      username: "AbsMaster",
      totalReps: 1180,
      averageFormAccuracy: 91,
      bestStreak: 38,
      sessionsCompleted: 25,
      lastActive: new Date("2024-01-14"),
      score: 1445,
    },
    {
      id: "3",
      username: "CrunchKing",
      totalReps: 1050,
      averageFormAccuracy: 96,
      bestStreak: 42,
      sessionsCompleted: 22,
      lastActive: new Date("2024-01-13"),
      score: 1389,
    },
    {
      id: "4",
      username: "CoreStrong",
      totalReps: 980,
      averageFormAccuracy: 88,
      bestStreak: 35,
      sessionsCompleted: 20,
      lastActive: new Date("2024-01-12"),
      score: 1245,
    },
    {
      id: "5",
      username: "SitUpSage",
      totalReps: 875,
      averageFormAccuracy: 92,
      bestStreak: 31,
      sessionsCompleted: 18,
      lastActive: new Date("2024-01-11"),
      score: 1156,
    },
  ];

  useEffect(() => {
    loadLeaderboardData();
  }, [timeFilter]);

  const loadLeaderboardData = async () => {
    setIsLoading(true);

    // Simulate API call - replace with actual blockchain query
    setTimeout(() => {
      setLeaderboardData(mockLeaderboardData);
      setIsLoading(false);
    }, 1000);
  };

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

  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return `${Math.floor(diffDays / 30)} months ago`;
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">🏆 Leaderboard</h2>

        {/* Time Filter */}
        <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
          {(["daily", "weekly", "monthly", "allTime"] as const).map(
            (filter) => (
              <button
                key={filter}
                onClick={() => setTimeFilter(filter)}
                className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                  timeFilter === filter
                    ? "bg-blue-500 text-white"
                    : "text-gray-600 hover:text-gray-800"
                }`}
              >
                {filter === "allTime"
                  ? "All Time"
                  : filter.charAt(0).toUpperCase() + filter.slice(1)}
              </button>
            ),
          )}
        </div>
      </div>

      {/* Current User Stats Preview */}
      {currentUserStats && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-blue-800 mb-2">
            Your Current Session
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <div className="text-blue-600 font-bold text-lg">
                {currentUserStats.totalReps}
              </div>
              <div className="text-blue-700">Reps</div>
            </div>
            <div>
              <div
                className={`font-bold text-lg ${getFormQualityColor(currentUserStats.averageFormAccuracy)}`}
              >
                {currentUserStats.averageFormAccuracy}%
              </div>
              <div className="text-blue-700">Form</div>
            </div>
            <div>
              <div className="text-blue-600 font-bold text-lg">
                {currentUserStats.bestStreak}
              </div>
              <div className="text-blue-700">Streak</div>
            </div>
            <div>
              <div className="text-blue-600 font-bold text-lg">
                {currentUserStats.sessionsCompleted}
              </div>
              <div className="text-blue-700">Sessions</div>
            </div>
          </div>
        </div>
      )}

      {/* Loading State */}
      {isLoading ? (
        <div className="flex justify-center items-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          <span className="ml-2 text-gray-600">Loading leaderboard...</span>
        </div>
      ) : (
        <>
          {/* Leaderboard Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">
                    Rank
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">
                    User
                  </th>
                  <th className="text-center py-3 px-4 font-semibold text-gray-700">
                    Score
                  </th>
                  <th className="text-center py-3 px-4 font-semibold text-gray-700">
                    Reps
                  </th>
                  <th className="text-center py-3 px-4 font-semibold text-gray-700">
                    Form
                  </th>
                  <th className="text-center py-3 px-4 font-semibold text-gray-700">
                    Streak
                  </th>
                  <th className="text-center py-3 px-4 font-semibold text-gray-700">
                    Sessions
                  </th>
                  <th className="text-center py-3 px-4 font-semibold text-gray-700">
                    Last Active
                  </th>
                </tr>
              </thead>
              <tbody>
                {leaderboardData.map((entry, index) => {
                  const rank = index + 1;
                  return (
                    <tr
                      key={entry.id}
                      className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                        rank <= 3
                          ? "bg-gradient-to-r from-yellow-50 to-transparent"
                          : ""
                      }`}
                    >
                      <td className="py-4 px-4">
                        <div className="flex items-center">
                          <span className="text-2xl mr-2">
                            {getRankIcon(rank)}
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div>
                          <div className="font-semibold text-gray-800">
                            {entry.username}
                          </div>
                          {entry.walletAddress && (
                            <div className="text-xs text-gray-500 font-mono">
                              {entry.walletAddress.slice(0, 6)}...
                              {entry.walletAddress.slice(-4)}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <div className="font-bold text-lg text-purple-600">
                          {entry.score}
                        </div>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <div className="font-semibold text-blue-600">
                          {entry.totalReps}
                        </div>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <div
                          className={`font-semibold ${getFormQualityColor(entry.averageFormAccuracy)}`}
                        >
                          {entry.averageFormAccuracy}%
                        </div>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <div className="font-semibold text-orange-600">
                          {entry.bestStreak}
                        </div>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <div className="font-semibold text-green-600">
                          {entry.sessionsCompleted}
                        </div>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <div className="text-sm text-gray-600">
                          {formatTimeAgo(entry.lastActive)}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Blockchain Integration Notice */}
          <div className="mt-6 p-4 bg-gradient-to-r from-purple-100 to-blue-100 rounded-lg border border-purple-200">
            <div className="flex items-center">
              <div className="text-2xl mr-3">⛓️</div>
              <div>
                <h4 className="font-semibold text-purple-800">
                  Blockchain Integration Coming Soon
                </h4>
                <p className="text-sm text-purple-700 mt-1">
                  Connect your wallet to join the on-chain leaderboard on
                  Avalanche Fuji Testnet. Earn NFT achievements and compete with
                  verified fitness data.
                </p>
              </div>
            </div>
          </div>

          {/* Stats Explanation */}
          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
            <details className="cursor-pointer">
              <summary className="font-semibold text-gray-700 text-sm">
                How scores are calculated
              </summary>
              <div className="mt-2 text-xs text-gray-600 space-y-1">
                <div>
                  • <strong>Reps:</strong> Total repetitions × 1.0
                </div>
                <div>
                  • <strong>Form:</strong> Average form accuracy × 5.0
                </div>
                <div>
                  • <strong>Streak:</strong> Best streak × 8.0
                </div>
                <div>
                  • <strong>Consistency:</strong> Sessions completed × 3.0
                </div>
                <div className="mt-2 text-gray-500">
                  Higher form accuracy and consistency are rewarded more than
                  raw repetition count.
                </div>
              </div>
            </details>
          </div>
        </>
      )}
    </div>
  );
}
