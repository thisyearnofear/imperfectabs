"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Image from "next/image";
import type { Results } from "@mediapipe/pose";
import { AbsExerciseDetector, ExerciseState } from "../lib/pose-detection";
import { useWallet } from "../contexts/WalletContext";
import { useContract } from "../contexts/ContractContext";
import WalletConnectButton from "./WalletConnectButton";
import WorkoutTips from "./WorkoutTips";
import WorkoutSummary from "./WorkoutSummary";
import WorkoutSubmission from "./WorkoutSubmission";
import ChainlinkEnhancement from "./ChainlinkEnhancement";
import RewardSystem from "./RewardSystem";

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

// Type for MediaPipe landmark
interface PoseLandmark {
  x: number;
  y: number;
  z: number;
  visibility?: number;
}

// Pose connections for drawing skeleton (based on MediaPipe POSE_CONNECTIONS)
const POSE_CONNECTIONS = [
  // Face
  [0, 1],
  [1, 2],
  [2, 3],
  [3, 7],
  [0, 4],
  [4, 5],
  [5, 6],
  [6, 8],
  // Torso
  [9, 10],
  [11, 12],
  [11, 13],
  [13, 15],
  [15, 17],
  [15, 19],
  [15, 21],
  [12, 14],
  [14, 16],
  [16, 18],
  [16, 20],
  [16, 22],
  [11, 23],
  [12, 24],
  [23, 24],
  // Left arm
  [11, 13],
  [13, 15],
  [15, 17],
  [17, 19],
  [19, 15],
  [15, 21],
  // Right arm
  [12, 14],
  [14, 16],
  [16, 18],
  [18, 20],
  [20, 16],
  [16, 22],
  // Left leg
  [23, 25],
  [25, 27],
  [27, 29],
  [29, 31],
  [27, 31],
  // Right leg
  [24, 26],
  [26, 28],
  [28, 30],
  [30, 32],
  [28, 32],
];

// Draw pose connections
const drawPoseConnections = (
  ctx: CanvasRenderingContext2D,
  landmarks: PoseLandmark[],
  connections: number[][],
  width: number,
  height: number
) => {
  ctx.strokeStyle = "#00FF00"; // Green connections
  ctx.lineWidth = 2;

  connections.forEach(([startIdx, endIdx]) => {
    const startLandmark = landmarks[startIdx];
    const endLandmark = landmarks[endIdx];

    if (
      startLandmark &&
      endLandmark &&
      (startLandmark.visibility || 0) > 0.5 &&
      (endLandmark.visibility || 0) > 0.5
    ) {
      const startX = startLandmark.x * width;
      const startY = startLandmark.y * height;
      const endX = endLandmark.x * width;
      const endY = endLandmark.y * height;

      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(endX, endY);
      ctx.stroke();
    }
  });
};

// Draw pose landmarks
const drawPoseLandmarks = (
  ctx: CanvasRenderingContext2D,
  landmarks: PoseLandmark[],
  width: number,
  height: number
) => {
  ctx.fillStyle = "#FF0000"; // Red landmarks

  landmarks.forEach((landmark) => {
    if ((landmark.visibility || 0) > 0.5) {
      const x = landmark.x * width;
      const y = landmark.y * height;
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, 2 * Math.PI);
      ctx.fill();
    }
  });
};

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
  // Add a ref to always have the latest exerciseState
  const exerciseStateRef = useRef(exerciseState);
  useEffect(() => {
    exerciseStateRef.current = exerciseState;
  }, [exerciseState]);

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
  const workoutStateRef = useRef(workoutState);
  useEffect(() => {
    workoutStateRef.current = workoutState;
  }, [workoutState]);

  const [countdown, setCountdown] = useState(120);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const [enhancedFormScore, setEnhancedFormScore] = useState<number | null>(
    null
  );

  const [error, setError] = useState<string | null>(null);
  const [isFullScreen, setIsFullScreen] = useState(false);

  // Wallet context
  const { isConnected: isWalletConnected, address: walletAddress } =
    useWallet();
  const { contractInstance } = useContract();

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

  // Stop workout session
  const stopWorkout = useCallback(() => {
    if (detectorRef.current) {
      detectorRef.current.stop();
      detectorRef.current = null;
    }

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
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
            formHistory.reduce((a, b) => a + b, 0) / formHistory.length
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
      setCountdown(120);

      // Initialize pose detection
      detectorRef.current = new AbsExerciseDetector();

      await detectorRef.current.initialize(
        videoRef.current,
        (results: Results) => {
          if (!detectorRef.current || !workoutStateRef.current.isActive) return;

          // Draw pose on canvas
          if (canvasRef.current && results.poseLandmarks) {
            const canvas = canvasRef.current;
            const ctx = canvas.getContext("2d");
            if (ctx) {
              ctx.clearRect(0, 0, canvas.width, canvas.height);

              // Draw full pose skeleton with connections and landmarks
              if (results.poseLandmarks) {
                // First draw connections (skeleton)
                drawPoseConnections(
                  ctx,
                  results.poseLandmarks,
                  POSE_CONNECTIONS,
                  canvas.width,
                  canvas.height
                );

                // Then draw landmarks (joints)
                drawPoseLandmarks(
                  ctx,
                  results.poseLandmarks,
                  canvas.width,
                  canvas.height
                );
              }
            }
          }

          // Process exercise detection
          if (results.poseLandmarks) {
            // Use the ref for the latest state
            const currentState = exerciseStateRef.current;
            const newState = detectorRef.current.processAbsExercise(
              results.poseLandmarks,
              currentState
            );

            // Track rep completion
            if (newState.counter > currentState.counter) {
              // Start timer on first rep
              if (newState.counter === 1 && !timerRef.current) {
                timerRef.current = setInterval(() => {
                  setCountdown((prev) => {
                    if (prev <= 1) {
                      clearInterval(timerRef.current!);
                      stopWorkout();
                      return 0;
                    }
                    return prev - 1;
                  });
                }, 1000);
              }

              const isGoodForm = newState.formAccuracy >= 80;
              setCurrentStreak((prev) => (isGoodForm ? prev + 1 : 0));
              setMaxStreak((prev) =>
                isGoodForm ? Math.max(prev, prev + 1) : prev
              );
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
        }
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
        "Failed to start camera. Please check permissions and try again."
      );
      console.error("Workout initialization error:", err);
      setWorkoutState((prev) => ({ ...prev, isInitializing: false }));
    }
  }, [isMobile, stopWorkout]);

  // Handle successful submission
  const handleSubmissionComplete = useCallback((success: boolean) => {
    // Keep submission component visible to show transaction details
    // Don't hide it on success - user should see their transaction hash
    console.log(`Submission ${success ? "successful" : "failed"}`);
  }, []);

  const handleEnhancedAnalysis = (score: number) => {
    setEnhancedFormScore(score);
  };

  // Get workout status color
  const getStatusColor = () => {
    if (exerciseState.formAccuracy >= 90) return "text-green-500";
    if (exerciseState.formAccuracy >= 70) return "text-yellow-500";
    return "text-red-500";
  };

  // Get status message
  const getStatusMessage = () => {
    if (!workoutState.isActive && !workoutState.hasCompletedWorkout) {
      return "perfectly imperfect";
    }

    if (workoutState.isInitializing) {
      return "Initializing camera...";
    }

    if (workoutState.isActive) {
      return exerciseState.status === "up" ? "CRUNCH UP!" : "LOWER DOWN";
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-white">
      {/* Header */}
      <div className="abs-card-brutal p-4 mb-4">
        <h1
          className="text-2xl md:text-3xl font-black text-center uppercase text-black drop-shadow-lg"
          style={{ textShadow: "2px 2px 0 #fff, 4px 4px 0 #000" }}
        >
          Tracker
        </h1>
        <p className="text-center text-black font-bold mt-2">
          {getStatusMessage()}
        </p>
      </div>

      {/* Main Content */}
      <div className="flex-1 px-4 pb-4">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Main Content Column (Video and Submission) */}
            <div className="md:col-span-2 space-y-6">
              {/* Video Card */}
              <div className="abs-card-primary p-4">
                <div className="relative">
                  {/* Branding image shown post-workout */}
                  {!workoutState.isActive &&
                  workoutState.hasCompletedWorkout ? (
                    <div
                      className="flex items-center justify-center w-full bg-white rounded border-4 border-black"
                      style={{ minHeight: isMobile ? "50vh" : "400px" }}
                    >
                      <Image
                        src="/logo.png"
                        alt="Imperfect Abs Logo"
                        width={220}
                        height={220}
                        className="object-contain"
                        priority
                      />
                    </div>
                  ) : (
                    <>
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
                    </>
                  )}

                  {/* Live overlays */}
                  {workoutState.isActive && (
                    <>
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
                      <div className="absolute bottom-4 left-4">
                        <div className="abs-stats-overlay">
                          <div className="text-3xl md:text-4xl font-black text-green-400">
                            {exerciseState.counter}
                          </div>
                          <div className="text-sm">REPS</div>
                        </div>
                      </div>
                      {currentStreak > 0 && (
                        <div className="absolute bottom-4 right-4">
                          <div className="abs-stats-overlay">
                            <div className="text-2xl md:text-3xl font-black text-orange-400">
                              🔥 {currentStreak}
                            </div>
                            <div className="text-sm">STREAK</div>
                          </div>
                        </div>
                      )}
                    </>
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

              {/* Partner Logos */}
              <div className="flex justify-center items-center space-x-6">
                <p className="font-bold text-sm text-gray-500">POWERED BY</p>
                <Image
                  src="/Chainlink.png"
                  alt="Chainlink Logo"
                  width={120}
                  height={32}
                  className="h-8 w-auto"
                />
                <Image
                  src="/Avalanche.png"
                  alt="Avalanche Logo"
                  width={120}
                  height={32}
                  className="h-8 w-auto"
                />
              </div>

              {/* Error Display */}
              {error && (
                <div className="p-4 bg-red-50 border-2 border-red-500 rounded">
                  <div className="font-bold text-red-700 mb-2">❌ Error</div>
                  <div className="text-red-600">{error}</div>
                </div>
              )}

              {/* Submission Form (post-workout) */}
              {workoutState.hasCompletedWorkout &&
                workoutState.showSubmission && (
                  <WorkoutSubmission
                    sessionStats={sessionStats}
                    isConnected={isWalletConnected}
                    walletAddress={walletAddress}
                    onSubmissionComplete={handleSubmissionComplete}
                    onError={setError}
                  />
                )}
            </div>

            {/* Sidebar (Stats and Actions) */}
            <div className="space-y-6">
              {/* Pre-workout Tips */}
              {!workoutState.isActive && !workoutState.hasCompletedWorkout && (
                <WorkoutTips />
              )}

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
                      <span className="font-bold">Time Left:</span>
                      <span className="font-mono text-xl font-black text-red-500">
                        {Math.floor(countdown / 60)}:
                        {(countdown % 60).toString().padStart(2, "0")}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Post-workout Summary & Actions */}
              {workoutState.hasCompletedWorkout && (
                <>
                  <WorkoutSummary
                    sessionStats={sessionStats}
                    enhancedFormScore={enhancedFormScore}
                  />
                  {isWalletConnected &&
                    poseDataRef.current.length > 0 &&
                    !enhancedFormScore && (
                      <ChainlinkEnhancement
                        isConnected={isWalletConnected}
                        currentSession={{
                          reps: sessionStats.totalReps,
                          formAccuracy: sessionStats.averageFormAccuracy,
                          streak: sessionStats.bestStreak,
                          duration: sessionStats.duration,
                          poseData: poseDataRef.current,
                        }}
                        onEnhancedAnalysis={handleEnhancedAnalysis}
                      />
                    )}
                  {isWalletConnected && (
                    <RewardSystem
                      contractInstance={contractInstance}
                      userAddress={walletAddress || null}
                    />
                  )}
                </>
              )}

              {/* Mobile Tips */}
              {isMobile && !workoutState.isActive && (
                <div className="abs-card-primary p-4 mt-6">
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
