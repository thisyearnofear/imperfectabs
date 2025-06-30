"use client";

import { useState, useEffect, useCallback } from "react";
import { ethers } from "ethers";
import {
  CONTRACT_ABI,
  CONTRACT_ADDRESS,
  type DailyChallenge,
} from "../lib/contract";

interface DailyChallengesProps {
  isConnected: boolean;
  walletAddress?: string;
}

const CHALLENGE_TYPES = [
  "Reps Challenge",
  "Duration Challenge",
  "Streak Challenge",
  "Accuracy Challenge",
  "Combo Challenge",
];

export default function DailyChallenges({
  isConnected,
  walletAddress,
}: DailyChallengesProps) {
  const [challenge, setChallenge] = useState<DailyChallenge | null>(null);
  const [isCompleted, setIsCompleted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<string>("");

  const fetchCurrentChallenge = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const provider = new ethers.providers.JsonRpcProvider(
        "https://api.avax-test.network/ext/bc/C/rpc"
      );
      const coreContract = new ethers.Contract(
        CONTRACT_ADDRESS,
        CONTRACT_ABI,
        provider
      );

      // Get VRF service address from core contract
      const vrfServiceId = ethers.utils.keccak256(
        ethers.utils.toUtf8Bytes("VRF_SERVICE")
      );
      const vrfServiceAddress = await coreContract.getService(vrfServiceId);
      const isVrfEnabled = await coreContract.isServiceEnabled(vrfServiceId);

      if (!isVrfEnabled || vrfServiceAddress === ethers.constants.AddressZero) {
        // VRF service not enabled, show placeholder
        setChallenge(null);
        setError("Daily challenges not available - VRF service not enabled");
        return;
      }

      // Call VRF service contract directly
      const vrfServiceABI = [
        "function getCurrentChallenge() external view returns (uint256 challengeType, uint256 target, uint256 bonusMultiplier, uint256 expiresAt, bool active)",
        "function hasCompletedChallenge(address user) external view returns (bool)",
      ];

      const vrfContract = new ethers.Contract(
        vrfServiceAddress,
        vrfServiceABI,
        provider
      );

      const currentChallenge = await vrfContract.getCurrentChallenge();

      if (currentChallenge.active) {
        setChallenge({
          challengeType: currentChallenge.challengeType.toNumber(),
          target: currentChallenge.target.toNumber(),
          bonusMultiplier: currentChallenge.bonusMultiplier.toNumber(),
          expiresAt: currentChallenge.expiresAt.toNumber(),
          active: currentChallenge.active,
        });

        // Check if user completed this challenge
        if (walletAddress) {
          const completed = await vrfContract.hasCompletedChallenge(
            walletAddress
          );
          setIsCompleted(completed);
        }
      } else {
        setChallenge(null);
      }
    } catch (err) {
      console.error("Error fetching challenge:", err);
      setError("Daily challenges service temporarily unavailable");
      // Don't show as failed, just show that it's not available
      setChallenge(null);
    } finally {
      setLoading(false);
    }
  }, [walletAddress]);

  useEffect(() => {
    if (isConnected) {
      fetchCurrentChallenge();
      const interval = setInterval(fetchCurrentChallenge, 30000);
      return () => clearInterval(interval);
    }
  }, [isConnected, fetchCurrentChallenge]);

  useEffect(() => {
    if (challenge?.expiresAt) {
      const timer = setInterval(updateTimeRemaining, 1000);
      return () => clearInterval(timer);
    }
  }, [challenge]); // eslint-disable-line react-hooks/exhaustive-deps

  const updateTimeRemaining = () => {
    if (!challenge?.expiresAt) return;

    const now = Math.floor(Date.now() / 1000);
    const remaining = challenge.expiresAt - now;

    if (remaining <= 0) {
      setTimeRemaining("Expired");
      return;
    }

    const hours = Math.floor(remaining / 3600);
    const minutes = Math.floor((remaining % 3600) / 60);
    const seconds = remaining % 60;

    setTimeRemaining(`${hours}h ${minutes}m ${seconds}s`);
  };

  const getChallengeDescription = (type: number, target: number): string => {
    switch (type) {
      case 0:
        return `Complete ${target} reps in your workout`;
      case 1:
        return `Workout for at least ${Math.floor(target / 60)}:${(target % 60)
          .toString()
          .padStart(2, "0")} minutes`;
      case 2:
        return `Achieve a streak of ${target} consecutive reps`;
      case 3:
        return `Maintain ${target}% form accuracy`;
      case 4:
        return `Complete ${target} reps with 90%+ accuracy`;
      default:
        return `Complete the challenge target: ${target}`;
    }
  };

  const getChallengeIcon = (type: number): string => {
    switch (type) {
      case 0:
        return "🔢"; // Reps
      case 1:
        return "⏱️"; // Duration
      case 2:
        return "🔥"; // Streak
      case 3:
        return "🎯"; // Accuracy
      case 4:
        return "💪"; // Combo
      default:
        return "🏆";
    }
  };

  if (!isConnected) {
    return (
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <h3 className="text-xl font-bold text-white mb-4">
          🏆 Daily Challenge
        </h3>
        <p className="text-gray-400">
          Connect your wallet to see today's challenge
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <h3 className="text-xl font-bold text-white mb-4">
          🏆 Daily Challenge
        </h3>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-700 rounded mb-2"></div>
          <div className="h-4 bg-gray-700 rounded w-3/4"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <h3 className="text-xl font-bold text-white mb-4">
          🏆 Daily Challenge
        </h3>
        <p className="text-red-400">{error}</p>
        <button
          onClick={fetchCurrentChallenge}
          className="mt-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!challenge || !challenge.active) {
    return (
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <h3 className="text-xl font-bold text-white mb-4">
          🏆 Daily Challenge
        </h3>
        <p className="text-gray-400">No active challenge at the moment</p>
        <p className="text-sm text-gray-500 mt-2">
          New challenges are generated daily via Chainlink VRF
        </p>
      </div>
    );
  }

  const bonusPercentage = (challenge.bonusMultiplier / 100).toFixed(1);

  return (
    <div className="bg-gradient-to-br from-purple-900 to-blue-900 rounded-lg p-6 border border-purple-500">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-bold text-white">🏆 Daily Challenge</h3>
        {isCompleted && (
          <span className="bg-green-500 text-white px-3 py-1 rounded-full text-sm font-bold">
            ✅ COMPLETED
          </span>
        )}
      </div>

      <div className="space-y-4">
        {/* Challenge Type */}
        <div className="flex items-center space-x-3">
          <span className="text-3xl">
            {getChallengeIcon(challenge.challengeType)}
          </span>
          <div>
            <h4 className="text-lg font-semibold text-white">
              {CHALLENGE_TYPES[challenge.challengeType] || "Special Challenge"}
            </h4>
            <p className="text-gray-300">
              {getChallengeDescription(
                challenge.challengeType,
                challenge.target
              )}
            </p>
          </div>
        </div>

        {/* Bonus Multiplier */}
        <div className="bg-yellow-500/20 border border-yellow-500/50 rounded-lg p-3">
          <div className="flex items-center space-x-2">
            <span className="text-yellow-400 text-xl">💰</span>
            <span className="text-yellow-400 font-bold">
              {bonusPercentage}% Score Bonus
            </span>
          </div>
        </div>

        {/* Time Remaining */}
        <div className="flex items-center justify-between">
          <span className="text-gray-400">Time Remaining:</span>
          <span className="text-white font-mono font-bold">
            {timeRemaining || "Calculating..."}
          </span>
        </div>

        {/* Progress Indicator */}
        {!isCompleted && (
          <div className="bg-gray-700 rounded-full h-2">
            <div
              className="bg-gradient-to-r from-purple-500 to-blue-500 h-2 rounded-full transition-all duration-300"
              style={{
                width: timeRemaining === "Expired" ? "100%" : "0%",
              }}
            ></div>
          </div>
        )}

        {/* Challenge Status */}
        {isCompleted && (
          <div className="text-center">
            <p className="text-green-400 font-semibold">
              🎉 Challenge completed! Bonus applied to your next workout.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
