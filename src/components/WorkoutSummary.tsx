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
    <div className="abs-card-brutal p-6 text-center">
      <h3 className="text-2xl font-black uppercase mb-4">
        🏆 Session Complete
      </h3>
      <div className="grid grid-cols-2 gap-4">
        <div className="abs-card-brutal bg-blue-600 text-white p-4">
          <div className="text-3xl font-black">{sessionStats.totalReps}</div>
          <div className="text-sm font-mono uppercase">Reps</div>
        </div>
        <div className="abs-card-brutal bg-orange-500 text-white p-4">
          <div className="text-3xl font-black">{sessionStats.bestStreak}</div>
          <div className="text-sm font-mono uppercase">Best Streak</div>
        </div>
        <div className="abs-card-brutal bg-green-500 text-white p-4">
          <div className="text-3xl font-black">
            {sessionStats.averageFormAccuracy}%
          </div>
          <div className="text-sm font-mono uppercase">Avg Form</div>
        </div>
        <div className="abs-card-brutal bg-black text-white p-4">
          <div className="text-3xl font-black">{sessionStats.duration}s</div>
          <div className="text-sm font-mono uppercase">Duration</div>
        </div>
      </div>

      {enhancedFormScore && (
        <div className="mt-6 abs-card-brutal bg-purple-600 text-white p-4">
          <div className="text-sm font-mono uppercase">AI Enhanced Score</div>
          <div className="text-4xl font-black">{enhancedFormScore}%</div>
        </div>
      )}
    </div>
  );
}
