"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type { Results } from "@mediapipe/pose";
import { AbsExerciseDetector, ExerciseState } from "../lib/pose-detection";
import WorkoutSubmission from "./WorkoutSubmission";
import ChainlinkEnhancement from "./ChainlinkEnhancement";
import { useWallet } from "../contexts/WalletContext";
import WalletConnectButton from "./WalletConnectButton";

interface SessionStats {
  totalReps: number;
  averageFormAccuracy: number;
  duration: number;
  bestStreak: number;
}

interface WorkoutState {
  isActive: boolean;
  isInitializing: boolean;
  hasCompletedWorkout: boolean;
  showSubmission: boolean;
}

export default function ImprovedWorkoutTracker() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const detectorRef = useRef<AbsExerciseDetector | null>(null);
  const sessionStartTime = useRef<number | null>(null);
  const poseDataRef = useRef<unknown[]>([]);

  // Exercise state
  const [exerciseState, setExerciseState] = useState<ExerciseState>({
    counter: 0,
    status: "down",
    angle: 0,
    formAccuracy: 100,
  });

  // Session tracking
  const [sessionStats, setSessionStats] = useState<SessionStats>({
    totalReps: 0,
    averageFormAccuracy: 100,
    duration: 0,
    bestStreak: 0,
  });

  const [currentStreak, setCurrentStreak] = useState(0);
  const [maxStreak, setMaxStreak] = useState(0);
  const [formHistory, setFormHistory] = useState<number[]>([]);

  // UI state
  const [workoutState, setWorkoutState] = useState<WorkoutState>({
    isActive: false,
    isInitializing: false,
    hasCompletedWorkout: false,
    showSubmission: false,
  });

  const [error, setError] = useState<string | null>(null);
  const [isFullScreen, setIsFullScreen] = useState(false);

  // Wallet context
  const { isConnected: isWalletConnected, address: walletAddress } =
    useWallet();

  // Auto-detect mobile device
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Initialize workout session
  const startWorkout = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current) return;

    setWorkoutState((prev) => ({ ...prev, isInitializing: true }));
    setError(null);

    try {
      // Reset session data
      setExerciseState({
        counter: 0,
        status: "down",
        angle: 0,
        formAccuracy: 100,
      });
      setCurrentStreak(0);
      setMaxStreak(0);
      setFormHistory([]);
      poseDataRef.current = [];
      sessionStartTime.current = Date.now();

      // Initialize pose detection
      detectorRef.current = new AbsExerciseDetector();

      await detectorRef.current.initialize(
        videoRef.current,
        (results: Results) => {
          if (!detectorRef.current || !workoutState.isActive) return;

          // Draw pose on canvas
          if (canvasRef.current && results.poseLandmarks) {
            const canvas = canvasRef.current;
            const ctx = canvas.getContext("2d");
            if (ctx) {
              ctx.clearRect(0, 0, canvas.width, canvas.height);

              // Draw pose landmarks
              const drawingUtils = new (
                window as unknown as {
                  DrawingUtils: new (ctx: CanvasRenderingContext2D) => {
                    drawLandmarks: (landmarks: unknown) => void;
                    drawConnectors: (
                      landmarks: unknown,
                      connections: unknown,
                    ) => void;
                  };
                }
              ).DrawingUtils(ctx);
              drawingUtils.drawLandmarks(results.poseLandmarks);
              drawingUtils.drawConnectors(
                results.poseLandmarks,
                (window as unknown as { POSE_CONNECTIONS: unknown })
                  .POSE_CONNECTIONS,
              );
            }
          }

          // Process exercise detection
          if (results.poseLandmarks) {
            const currentState = exerciseState;
            const newState = detectorRef.current.processAbsExercise(
              results.poseLandmarks,
              currentState,
            );

            // Track rep completion
            if (newState.counter > exerciseState.counter) {
              const isGoodForm = newState.formAccuracy >= 80;
              if (isGoodForm) {
                setCurrentStreak((prev) => prev + 1);
                setMaxStreak((prev) => Math.max(prev, currentStreak + 1));
              } else {
                setCurrentStreak(0);
              }

              // Add to form history
              setFormHistory((prev) => [...prev, newState.formAccuracy]);
            }

            setExerciseState(newState);

            // Store pose data for analysis
            poseDataRef.current.push({
              landmarks: results.poseLandmarks,
              timestamp: Date.now(),
              formAccuracy: newState.formAccuracy,
              angle: newState.angle,
            });

            // Keep only recent data for memory management
            if (poseDataRef.current.length > 200) {
              poseDataRef.current = poseDataRef.current.slice(-200);
            }
          }
        },
      );
      setWorkoutState((prev) => ({
        ...prev,
        isActive: true,
        isInitializing: false,
        hasCompletedWorkout: false,
        showSubmission: false,
      }));

      // Request fullscreen on mobile for better experience
      if (isMobile && videoRef.current.requestFullscreen) {
        try {
          await videoRef.current.requestFullscreen();
          setIsFullScreen(true);
        } catch {
          console.log("Fullscreen not supported or denied");
        }
      }
    } catch (err) {
      setError(
        "Failed to start camera. Please check permissions and try again.",
      );
      console.error("Workout initialization error:", err);
      setWorkoutState((prev) => ({ ...prev, isInitializing: false }));
    }
  }, [isMobile, currentStreak, exerciseState, workoutState.isActive]);

  // Stop workout session
  const stopWorkout = useCallback(() => {
    if (detectorRef.current) {
      detectorRef.current.stop();
      detectorRef.current = null;
    }

    // Exit fullscreen if active
    if (isFullScreen && document.exitFullscreen) {
      document.exitFullscreen();
      setIsFullScreen(false);
    }

    // Calculate final stats
    const endTime = Date.now();
    const duration = sessionStartTime.current
      ? Math.round((endTime - sessionStartTime.current) / 1000)
      : 0;

    const avgFormAccuracy =
      formHistory.length > 0
        ? Math.round(
            formHistory.reduce((a, b) => a + b, 0) / formHistory.length,
          )
        : exerciseState.formAccuracy;

    const finalStats: SessionStats = {
      totalReps: exerciseState.counter,
      averageFormAccuracy: avgFormAccuracy,
      duration,
      bestStreak: maxStreak,
    };

    setSessionStats(finalStats);
    setWorkoutState((prev) => ({
      ...prev,
      isActive: false,
      hasCompletedWorkout: exerciseState.counter > 0,
      showSubmission: exerciseState.counter > 0 && isWalletConnected,
    }));
  }, [
    exerciseState.counter,
    exerciseState.formAccuracy,
    formHistory,
    maxStreak,
    isWalletConnected,
    isFullScreen,
  ]);

  // Handle successful submission
  const handleSubmissionComplete = useCallback((success: boolean) => {
    if (success) {
      setWorkoutState((prev) => ({ ...prev, showSubmission: false }));
      // Could show success animation or reset for next workout
    }
  }, []);

  // Get workout status color
  const getStatusColor = () => {
    if (exerciseState.formAccuracy >= 90) return "text-green-500";
    if (exerciseState.formAccuracy >= 70) return "text-yellow-500";
    return "text-red-500";
  };

  // Get status message
  const getStatusMessage = () => {
    if (!workoutState.isActive && !workoutState.hasCompletedWorkout) {
      return "Ready to start your abs workout";
    }

    if (workoutState.isInitializing) {
      return "Initializing camera...";
    }

    if (workoutState.isActive) {
      return exerciseState.status === "up" ? "CRUNCH UP!" : "LOWER DOWN";
    }

    if (workoutState.hasCompletedWorkout) {
      return "Workout completed! 🎉";
    }

    return "Workout session";
  };

  return (
    <div className="flex flex-col min-h-screen bg-white">
      {/* Header */}
      <div className="abs-card-brutal p-4 mb-4">
        <h1 className="text-2xl md:text-3xl font-black text-center uppercase">
          💪 Imperfect Abs Tracker
        </h1>
        <p className="text-center text-gray-600 font-bold mt-2">
          {getStatusMessage()}
        </p>
      </div>

      {/* Main Content */}
      <div className="flex-1 px-4 pb-4">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Camera Feed - Main Column */}
            <div className="lg:col-span-2">
              <div className="abs-card-primary p-4">
                <div className="relative">
                  <video
                    ref={videoRef}
                    className="w-full h-auto bg-black rounded border-4 border-black"
                    autoPlay
                    muted
                    playsInline
                    style={{
                      maxHeight: isMobile ? "50vh" : "400px",
                      objectFit: "cover",
                    }}
                  />
                  <canvas
                    ref={canvasRef}
                    className="absolute top-0 left-0 w-full h-full"
                    style={{
                      maxHeight: isMobile ? "50vh" : "400px",
                    }}
                  />

                  {/* Exercise Status Overlay */}
                  {workoutState.isActive && (
                    <div className="absolute top-4 left-4 right-4">
                      <div className="abs-stats-overlay text-center">
                        <div
                          className={`text-xl md:text-2xl font-black ${getStatusColor()}`}
                        >
                          {exerciseState.status.toUpperCase()}
                        </div>
                        <div className="text-sm mt-1">
                          Form: {exerciseState.formAccuracy}% | Angle:{" "}
                          {Math.round(exerciseState.angle)}°
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Reps Counter */}
                  {workoutState.isActive && (
                    <div className="absolute bottom-4 left-4">
                      <div className="abs-stats-overlay">
                        <div className="text-3xl md:text-4xl font-black text-green-400">
                          {exerciseState.counter}
                        </div>
                        <div className="text-sm">REPS</div>
                      </div>
                    </div>
                  )}

                  {/* Streak Counter */}
                  {workoutState.isActive && currentStreak > 0 && (
                    <div className="absolute bottom-4 right-4">
                      <div className="abs-stats-overlay">
                        <div className="text-2xl md:text-3xl font-black text-orange-400">
                          🔥 {currentStreak}
                        </div>
                        <div className="text-sm">STREAK</div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Control Buttons */}
                <div className="mt-4 space-y-3">
                  {!workoutState.isActive ? (
                    <button
                      onClick={startWorkout}
                      disabled={workoutState.isInitializing}
                      className="w-full abs-btn-start text-lg py-4"
                    >
                      {workoutState.isInitializing
                        ? "STARTING..."
                        : "🚀 START WORKOUT"}
                    </button>
                  ) : (
                    <button
                      onClick={stopWorkout}
                      className="w-full abs-btn-stop text-lg py-4"
                    >
                      ⏹️ STOP WORKOUT
                    </button>
                  )}

                  {/* Wallet Connection */}
                  {!isWalletConnected && (
                    <div className="w-full">
                      <WalletConnectButton
                        variant="primary"
                        className="w-full bg-purple-600 text-white py-3"
                        showWalletSelection={true}
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Error Display */}
              {error && (
                <div className="mt-4 p-4 bg-red-50 border-2 border-red-500 rounded">
                  <div className="font-bold text-red-700 mb-2">❌ Error</div>
                  <div className="text-red-600">{error}</div>
                </div>
              )}
            </div>

            {/* Stats & Submission Sidebar */}
            <div className="space-y-6">
              {/* Live Stats */}
              {workoutState.isActive && (
                <div className="abs-card-workout p-4">
                  <h3 className="font-black uppercase text-center mb-4">
                    📊 Live Stats
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="font-bold">Reps:</span>
                      <span className="text-xl font-black text-blue-600">
                        {exerciseState.counter}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-bold">Form:</span>
                      <span
                        className={`text-xl font-black ${getStatusColor()}`}
                      >
                        {exerciseState.formAccuracy}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-bold">Streak:</span>
                      <span className="text-xl font-black text-orange-600">
                        {currentStreak} 🔥
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-bold">Best:</span>
                      <span className="text-xl font-black text-green-600">
                        {maxStreak}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-bold">Time:</span>
                      <span className="font-mono">
                        {sessionStartTime.current
                          ? Math.floor(
                              (Date.now() - sessionStartTime.current) / 1000,
                            )
                          : 0}
                        s
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Submission Component */}
              {workoutState.showSubmission && (
                <WorkoutSubmission
                  sessionStats={sessionStats}
                  isConnected={isWalletConnected}
                  walletAddress={walletAddress}
                  onSubmissionComplete={handleSubmissionComplete}
                  onError={setError}
                />
              )}

              {/* Session Results */}
              {workoutState.hasCompletedWorkout &&
                !workoutState.showSubmission && (
                  <div className="abs-card-brutal p-4">
                    <h3 className="font-black uppercase text-center mb-4">
                      🏆 Session Complete
                    </h3>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="font-bold">Total Reps:</span>
                        <span className="text-xl font-black">
                          {sessionStats.totalReps}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-bold">Avg Form:</span>
                        <span className="text-xl font-black">
                          {sessionStats.averageFormAccuracy}%
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-bold">Best Streak:</span>
                        <span className="text-xl font-black">
                          {sessionStats.bestStreak}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-bold">Duration:</span>
                        <span className="font-mono">
                          {Math.floor(sessionStats.duration / 60)}:
                          {(sessionStats.duration % 60)
                            .toString()
                            .padStart(2, "0")}
                        </span>
                      </div>
                    </div>

                    {isWalletConnected ? (
                      <button
                        onClick={() =>
                          setWorkoutState((prev) => ({
                            ...prev,
                            showSubmission: true,
                          }))
                        }
                        className="w-full mt-4 abs-btn-primary bg-green-500 text-black"
                      >
                        📤 SUBMIT TO BLOCKCHAIN
                      </button>
                    ) : (
                      <div className="mt-4 p-3 bg-gray-100 border-2 border-gray-300 text-center">
                        <div className="font-bold text-gray-700 mb-2">
                          Connect wallet to submit to leaderboard
                        </div>
                      </div>
                    )}
                  </div>
                )}

              {/* Chainlink Enhancement */}
              {workoutState.hasCompletedWorkout &&
                poseDataRef.current.length > 0 && (
                  <ChainlinkEnhancement
                    isConnected={isWalletConnected}
                    currentSession={{
                      reps: sessionStats.totalReps,
                      formAccuracy: sessionStats.averageFormAccuracy,
                      streak: sessionStats.bestStreak,
                      duration: sessionStats.duration,
                      poseData: poseDataRef.current,
                    }}
                  />
                )}

              {/* Tips for mobile */}
              {isMobile && (
                <div className="abs-card-primary p-4">
                  <h4 className="font-black text-center mb-3">
                    📱 Mobile Tips
                  </h4>
                  <ul className="text-sm space-y-2">
                    <li>• Position phone in landscape mode</li>
                    <li>• Ensure your full torso is visible</li>
                    <li>• Use good lighting for best detection</li>
                    <li>• Tap fullscreen for immersive experience</li>
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
