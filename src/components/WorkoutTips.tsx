"use client";

import React from "react";

export default function WorkoutTips() {
  return (
    <div className="abs-card-brutal p-4">
      <div className="space-y-2 text-sm">
        <div className="flex items-center space-x-2">
          <span className="text-lg">📍</span>
          <span className="font-bold text-black">
            Lie down, full body visible
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-lg">💪</span>
          <span className="font-bold text-black">
            Smooth, controlled movements
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-lg">⏱️</span>
          <span className="font-bold text-black">2 minutes, maximum reps</span>
        </div>
      </div>
    </div>
  );
}
