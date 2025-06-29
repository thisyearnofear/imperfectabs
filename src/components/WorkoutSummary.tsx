"use client";

import React from "react";

interface SessionStats {
  totalReps: number;
  averageFormAccuracy: number;
  duration: number;
  bestStreak: number;
}

interface WorkoutSummaryProps {
  sessionStats: SessionStats;
  enhancedFormScore: number | null;
}

export default function WorkoutSummary({
  sessionStats,
  enhancedFormScore,
}: WorkoutSummaryProps) {
  return (
    <div className="abs-card-brutal !bg-white !text-black p-6 text-center border-8 border-black">
      <h3 className="text-2xl font-black uppercase mb-4 !text-black">
        🏆 Session Complete
      </h3>
      <div className="grid grid-cols-2 gap-4">
        <div className="abs-card-brutal !bg-blue-600 !text-white p-4 !border-black border-4">
          <div className="text-3xl font-black !text-white">
            {sessionStats.totalReps}
          </div>
          <div className="text-sm font-mono uppercase !text-white">Reps</div>
        </div>
        <div className="abs-card-brutal !bg-orange-500 !text-white p-4 !border-black border-4">
          <div className="text-3xl font-black !text-white">
            {sessionStats.bestStreak}
          </div>
          <div className="text-sm font-mono uppercase !text-white">
            Best Streak
          </div>
        </div>
        <div className="abs-card-brutal !bg-green-500 !text-white p-4 !border-black border-4">
          <div className="text-3xl font-black !text-white">
            {sessionStats.averageFormAccuracy}%
          </div>
          <div className="text-sm font-mono uppercase !text-white">
            Avg Form
          </div>
        </div>
        <div className="abs-card-brutal !bg-black !text-white p-4 !border-white border-4">
          <div className="text-3xl font-black !text-white">
            {sessionStats.duration}s
          </div>
          <div className="text-sm font-mono uppercase !text-white">
            Duration
          </div>
        </div>
      </div>

      {enhancedFormScore && (
        <div className="mt-6 abs-card-brutal !bg-purple-600 !text-white p-4 !border-black border-4">
          <div className="text-sm font-mono uppercase !text-white">
            AI Enhanced Score
          </div>
          <div className="text-4xl font-black !text-white">
            {enhancedFormScore}%
          </div>
        </div>
      )}
    </div>
  );
}
