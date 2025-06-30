"use client";

interface ChainlinkEnhancementProps {
  isConnected: boolean;
  currentSession?: {
    reps: number;
    formAccuracy: number;
    streak: number;
    duration: number;
    poseData?: unknown[];
  };
  onEnhancedAnalysis?: (enhancedScore: number, aiAdvice?: string) => void;
}

export default function ChainlinkEnhancement({
  isConnected,
  currentSession,
}: ChainlinkEnhancementProps) {
  // Simplified component for V4 - AI Enhancement coming soon
  if (!isConnected || !currentSession) {
    return null;
  }

  return (
    <div className="abs-card-primary p-4">
      <h3 className="font-black uppercase text-center mb-4">
        🤖 AI Enhancement
      </h3>

      <div className="text-center space-y-4">
        <div className="bg-blue-100 border border-blue-300 rounded-lg p-4">
          <div className="text-blue-800 font-semibold mb-2">
            🚀 Coming Soon!
          </div>
          <p className="text-blue-700 text-sm">
            Advanced AI form analysis powered by Chainlink Functions will be
            available in the next update.
          </p>
        </div>

        <div className="text-gray-600 text-sm">
          <p>
            <strong>Current Session:</strong>
          </p>
          <p>
            Reps: {currentSession.reps} | Form: {currentSession.formAccuracy}%
          </p>
          <p>
            Streak: {currentSession.streak} | Duration:{" "}
            {Math.floor(currentSession.duration / 60)}:
            {(currentSession.duration % 60).toString().padStart(2, "0")}
          </p>
        </div>
      </div>
    </div>
  );
}
