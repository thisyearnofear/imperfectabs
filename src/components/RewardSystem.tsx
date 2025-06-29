"use client";

import React, { useState, useEffect, useCallback } from "react";
import { ethers } from "ethers";

interface RewardInfo {
  totalEarned: string;
  lastClaimed: string;
  currentPeriodEarned: string;
  rank: number;
  pendingAmount: string;
}

interface RewardConfig {
  distributionPeriod: number;
  topPerformersCount: number;
  lastDistribution: number;
  totalRewardPool: string;
  autoDistribution: boolean;
  timeUntilNextDistribution: number;
}

export default function RewardSystem({
  contract,
  userAddress,
}: {
  contract: ethers.Contract | null;
  userAddress: string | null;
}) {
  const [rewardInfo, setRewardInfo] = useState<RewardInfo | null>(null);
  const [rewardConfig, setRewardConfig] = useState<RewardConfig | null>(null);
  const [loading, setLoading] = useState(false);
  const [claiming, setClaiming] = useState(false);

  const loadRewardData = useCallback(async () => {
    if (!contract || !userAddress) return;

    try {
      setLoading(true);

      // Get user reward info
      const userReward = await contract.getUserRewardInfo(userAddress);
      setRewardInfo({
        totalEarned: ethers.utils.formatEther(userReward.totalEarned),
        lastClaimed: new Date(
          Number(userReward.lastClaimed) * 1000
        ).toLocaleDateString(),
        currentPeriodEarned: ethers.utils.formatEther(
          userReward.currentPeriodEarned
        ),
        rank: Number(userReward.rank),
        pendingAmount: ethers.utils.formatEther(userReward.pendingAmount),
      });

      // Get reward config
      const config = await contract.getRewardConfig();
      setRewardConfig({
        distributionPeriod: Number(config.distributionPeriod),
        topPerformersCount: Number(config.topPerformersCount),
        lastDistribution: Number(config.lastDistribution),
        totalRewardPool: ethers.utils.formatEther(config.totalRewardPool),
        autoDistribution: config.autoDistribution,
        timeUntilNextDistribution: Number(config.timeUntilNextDistribution),
      });
    } catch (error) {
      console.error("Error loading reward data:", error);
    } finally {
      setLoading(false);
    }
  }, [contract, userAddress]);

  useEffect(() => {
    if (contract && userAddress) {
      loadRewardData();
    }
  }, [contract, userAddress, loadRewardData]);

  const claimRewards = async () => {
    if (!contract || !rewardInfo || parseFloat(rewardInfo.pendingAmount) === 0)
      return;

    try {
      setClaiming(true);
      const tx = await contract.claimRewards();
      await tx.wait();

      // Reload data after claiming
      await loadRewardData();

      alert("Rewards claimed successfully!");
    } catch (error) {
      console.error("Error claiming rewards:", error);
      alert("Failed to claim rewards. Please try again.");
    } finally {
      setClaiming(false);
    }
  };

  const formatTime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  if (!contract || !userAddress) {
    return (
      <div className="bg-gray-100 p-6 rounded-lg">
        <h3 className="text-xl font-bold mb-4">Reward System</h3>
        <p className="text-gray-600">
          Connect your wallet to view reward information
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="bg-gray-100 p-6 rounded-lg">
        <h3 className="text-xl font-bold mb-4">Reward System</h3>
        <p className="text-gray-600">Loading reward data...</p>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-purple-100 to-blue-100 p-6 rounded-lg">
      <h3 className="text-2xl font-bold mb-6 text-gray-800">
        🏆 Reward System
      </h3>

      {/* User Reward Info */}
      {rewardInfo && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg shadow">
            <h4 className="font-semibold text-gray-700 mb-2">Your Rewards</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Total Earned:</span>
                <span className="font-bold">
                  {parseFloat(rewardInfo.totalEarned).toFixed(4)} AVAX
                </span>
              </div>
              <div className="flex justify-between">
                <span>Current Period:</span>
                <span className="font-bold">
                  {parseFloat(rewardInfo.currentPeriodEarned).toFixed(4)} AVAX
                </span>
              </div>
              <div className="flex justify-between">
                <span>Pending:</span>
                <span className="font-bold text-green-600">
                  {parseFloat(rewardInfo.pendingAmount).toFixed(4)} AVAX
                </span>
              </div>
              {rewardInfo.rank > 0 && (
                <div className="flex justify-between">
                  <span>Current Rank:</span>
                  <span className="font-bold text-blue-600">
                    #{rewardInfo.rank}
                  </span>
                </div>
              )}
            </div>

            {parseFloat(rewardInfo.pendingAmount) > 0 && (
              <button
                onClick={claimRewards}
                disabled={claiming}
                className="w-full mt-4 bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white font-bold py-2 px-4 rounded transition-colors"
              >
                {claiming ? "Claiming..." : "Claim Rewards"}
              </button>
            )}
          </div>

          {/* Reward Pool Info */}
          {rewardConfig && (
            <div className="bg-white p-4 rounded-lg shadow">
              <h4 className="font-semibold text-gray-700 mb-2">Reward Pool</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Total Pool:</span>
                  <span className="font-bold">
                    {parseFloat(rewardConfig.totalRewardPool).toFixed(4)} AVAX
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Top Performers:</span>
                  <span className="font-bold">
                    {rewardConfig.topPerformersCount}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Distribution:</span>
                  <span className="font-bold">
                    {rewardConfig.autoDistribution ? "Automatic" : "Manual"}
                  </span>
                </div>
                {rewardConfig.timeUntilNextDistribution > 0 ? (
                  <div className="flex justify-between">
                    <span>Next Distribution:</span>
                    <span className="font-bold text-orange-600">
                      {formatTime(rewardConfig.timeUntilNextDistribution)}
                    </span>
                  </div>
                ) : (
                  <div className="text-green-600 font-bold text-center">
                    Distribution Available!
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* How It Works */}
      <div className="bg-white p-4 rounded-lg shadow">
        <h4 className="font-semibold text-gray-700 mb-2">How Rewards Work</h4>
        <ul className="text-sm text-gray-600 space-y-1">
          <li>• 60% of submission fees go to the reward pool</li>
          <li>• Top 10 performers get rewards based on their ranking</li>
          <li>• Rewards are distributed weekly automatically</li>
          <li>• Higher ranks get larger reward shares</li>
          <li>• Claim your rewards anytime after distribution</li>
        </ul>
      </div>
    </div>
  );
}
