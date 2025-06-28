"use client";

import React from "react";
import WorkoutSubmission from "./WorkoutSubmission";
import ChainlinkEnhancement from "./ChainlinkEnhancement";
import { useWallet } from "../contexts/WalletContext";

interface SessionStats {
  totalReps: number;
  averageFormAccuracy: number;
  duration: number;
  bestStreak: number;
}

interface WorkoutSummaryProps {
  sessionStats: SessionStats;
  poseData: unknown[];
  onSubmissionComplete: (success: boolean) => void;
  onError: (error: string | null) => void;
  setWorkoutState: (
    state: React.SetStateAction<{
      isActive: boolean;
      isInitializing: boolean;
      hasCompletedWorkout: boolean;
      showSubmission: boolean;
    }>
  ) => void;
  onEnhancedAnalysis: (score: number) => void;
  enhancedFormScore: number | null;
}

export default function WorkoutSummary({
  sessionStats,
  poseData,
  onSubmissionComplete,
  onError,
  onEnhancedAnalysis,
  enhancedFormScore,
}: WorkoutSummaryProps) {
  const { isConnected: isWalletConnected, address: walletAddress } =
    useWallet();

  const showSubmissionForm =
    isWalletConnected && sessionStats.totalReps > 0 && !enhancedFormScore;

  return (
    <div className="space-y-6">
      <div className="abs-card-brutal p-6 text-center">
        <h3 className="text-2xl font-black uppercase mb-4">
          🏆 Session Complete
        </h3>
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="abs-card-brutal bg-blue-600 text-white p-4">
            <div className="text-3xl font-black">{sessionStats.totalReps}</div>
            <div className="text-sm font-mono uppercase">Reps</div>
          </div>
          <div className="abs-card-brutal bg-orange-500 text-white p-4">
            <div className="text-3xl font-black">{sessionStats.bestStreak}</div>
            <div className="text-sm font-mono uppercase">Best Streak</div>
          </div>
          <div className="abs-card-brutal bg-black text-white p-4 col-span-2">
            <div className="text-3xl font-black">
              {enhancedFormScore ? (
                <span className="text-green-400">{enhancedFormScore}%</span>
              ) : (
                `${sessionStats.averageFormAccuracy}%`
              )}
            </div>
            <div className="text-sm font-mono uppercase">
              {enhancedFormScore ? "AI Form Score" : "Avg Form"}
            </div>
          </div>
        </div>

        {showSubmissionForm && (
          <WorkoutSubmission
            sessionStats={sessionStats}
            isConnected={isWalletConnected}
            walletAddress={walletAddress}
            onSubmissionComplete={onSubmissionComplete}
            onError={onError}
          />
        )}
      </div>

      {isWalletConnected && poseData.length > 0 && !enhancedFormScore && (
        <ChainlinkEnhancement
          isConnected={isWalletConnected}
          currentSession={{
            reps: sessionStats.totalReps,
            formAccuracy: sessionStats.averageFormAccuracy,
            streak: sessionStats.bestStreak,
            duration: sessionStats.duration,
            poseData: poseData,
          }}
          onEnhancedAnalysis={onEnhancedAnalysis}
        />
      )}
    </div>
  );
}
