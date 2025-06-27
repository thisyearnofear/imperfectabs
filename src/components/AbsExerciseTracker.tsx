"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type { Results } from "@mediapipe/pose";
import {
  AbsExerciseDetector,
  ExerciseState,
  PoseLandmark,
} from "../lib/pose-detection";
import ChainlinkEnhancement from "./ChainlinkEnhancement";
import {
  submitWorkoutSession,
  getUserStats,
  getTimeUntilNextSubmission,
  subscribeToEvents,
} from "../lib/contract";
import { useWallet } from "../contexts/WalletContext";
import WalletConnectButton from "./WalletConnectButton";

interface SessionStats {
  totalReps: number;
  averageFormAccuracy: number;
  sessionDuration: number;
  bestStreak: number;
}

export default function AbsExerciseTracker() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const detectorRef = useRef<AbsExerciseDetector | null>(null);
  const poseDataRef = useRef<unknown[]>([]);

  const [isActive, setIsActive] = useState(false);
  const [exerciseState, setExerciseState] = useState<ExerciseState>({
    counter: 0,
    status: "down",
    angle: 0,
    formAccuracy: 100,
  });

  const [sessionStats, setSessionStats] = useState<SessionStats>({
    totalReps: 0,
    averageFormAccuracy: 100,
    sessionDuration: 0,
    bestStreak: 0,
  });

  const [sessionStartTime, setSessionStartTime] = useState<number | null>(null);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [formAccuracyHistory, setFormAccuracyHistory] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Wallet context
  const {
    isConnected: isWalletConnected,
    address: walletAddress,
    signer,
  } = useWallet();

  // Blockchain state
  const [isSubmittingToBlockchain, setIsSubmittingToBlockchain] =
    useState(false);
  const [blockchainError, setBlockchainError] = useState<string | null>(null);
  const [submissionCooldown, setSubmissionCooldown] = useState(0);
  const [enhancedFormScore, setEnhancedFormScore] = useState<number | null>(
    null,
  );
  const [onChainStats, setOnChainStats] = useState<{
    totalReps: number;
    averageFormAccuracy: number;
    bestStreak: number;
    sessionsCompleted: number;
    timestamp: number;
  } | null>(null);

  // Load blockchain data when wallet connects
  const loadUserBlockchainData = useCallback(async () => {
    if (!isWalletConnected || !walletAddress) return;

    try {
      setIsLoading(true);
      setBlockchainError(null);

      // Load user stats and cooldown
      const [stats, cooldown] = await Promise.all([
        getUserStats(walletAddress),
        getTimeUntilNextSubmission(walletAddress),
      ]);

      setOnChainStats(stats);
      setSubmissionCooldown(cooldown);

      // Subscribe to contract events
      const unsubscribe = subscribeToEvents((event) => {
        console.log("Blockchain event:", event);
        if (
          event.type === "AbsScoreAdded" &&
          event.user &&
          event.user.toLowerCase() === walletAddress.toLowerCase()
        ) {
          loadUserBlockchainData();
        }
      });

      return () => unsubscribe();
    } catch (err: unknown) {
      setBlockchainError(
        (err as Error).message || "Failed to load blockchain data",
      );
    } finally {
      setIsLoading(false);
    }
  }, [isWalletConnected, walletAddress]);

  // Initialize pose detection
  const initializePoseDetection = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    setIsLoading(true);
    setError(null);

    try {
      detectorRef.current = new AbsExerciseDetector();

      // Clear previous pose data
      poseDataRef.current = [];

      await detectorRef.current.initialize(
        videoRef.current,
        (results: Results) => {
          drawResults(results);
          processExercise(results);

          // Store pose data for Chainlink analysis
          if (results.poseLandmarks) {
            poseDataRef.current.push({
              landmarks: results.poseLandmarks,
              timestamp: Date.now(),
            });

            // Keep only last 100 poses to manage memory
            if (poseDataRef.current.length > 100) {
              poseDataRef.current = poseDataRef.current.slice(-100);
            }
          }
        },
      );

      setIsActive(true);
      setSessionStartTime(Date.now());
    } catch (err) {
      setError(
        "Failed to initialize camera. Please ensure camera permissions are granted.",
      );
      console.error("Error initializing pose detection:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // Stop pose detection
  const stopPoseDetection = () => {
    if (detectorRef.current) {
      detectorRef.current.stop();
      detectorRef.current = null;
    }
    setIsActive(false);

    // Calculate final session stats
    if (sessionStartTime) {
      const duration = Math.round((Date.now() - sessionStartTime) / 1000);
      const finalStats = {
        ...sessionStats,
        sessionDuration: duration,
        totalReps: exerciseState.counter,
        averageFormAccuracy:
          formAccuracyHistory.length > 0
            ? Math.round(
                formAccuracyHistory.reduce((a, b) => a + b, 0) /
                  formAccuracyHistory.length,
              )
            : 100,
      };

      setSessionStats(finalStats);

      // Submit to blockchain if connected and has reps
      if (
        isWalletConnected &&
        exerciseState.counter > 0 &&
        submissionCooldown === 0
      ) {
        handleBlockchainSubmission(finalStats);
      }
    }
  };

  // Draw pose landmarks and connections
  const drawResults = async (results: Results) => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (results.poseLandmarks) {
      try {
        // Dynamic import for drawing utilities
        const { drawConnectors, drawLandmarks } = await import(
          "@mediapipe/drawing_utils"
        );
        const { POSE_CONNECTIONS } = await import("@mediapipe/pose");

        // Draw pose connections
        drawConnectors(ctx, results.poseLandmarks, POSE_CONNECTIONS, {
          color: "#00FF00",
          lineWidth: 2,
        });

        // Draw landmarks
        drawLandmarks(ctx, results.poseLandmarks, {
          color: "#FF0000",
          lineWidth: 1,
          radius: 2,
        });
      } catch {
        console.warn(
          "Could not load drawing utilities, using fallback rendering",
        );
      }

      // Highlight key points for abs exercise
      const keyPoints = [11, 12, 23, 24, 25, 26]; // Shoulders, hips, knees
      keyPoints.forEach((index) => {
        const landmark = results.poseLandmarks?.[index];
        if (landmark) {
          ctx.beginPath();
          ctx.arc(
            landmark.x * canvas.width,
            landmark.y * canvas.height,
            5,
            0,
            2 * Math.PI,
          );
          ctx.fillStyle = "#FFD700";
          ctx.fill();
        }
      });
    }
  };

  // Process exercise logic
  const processExercise = (results: Results) => {
    if (!results.poseLandmarks || !detectorRef.current) return;

    const landmarks = results.poseLandmarks as PoseLandmark[];

    if (detectorRef.current.isValidPose(landmarks)) {
      const newState = detectorRef.current.processAbsExercise(
        landmarks,
        exerciseState,
      );

      // Update streak tracking
      if (newState.counter > exerciseState.counter) {
        if (newState.formAccuracy >= 80) {
          setCurrentStreak((prev) => prev + 1);
          setSessionStats((prev) => ({
            ...prev,
            bestStreak: Math.max(prev.bestStreak, currentStreak + 1),
          }));
        } else {
          setCurrentStreak(0);
        }

        // Add to form accuracy history
        setFormAccuracyHistory((prev) => [...prev, newState.formAccuracy]);
      }

      setExerciseState(newState);
    }
  };

  // Reset session
  const resetSession = () => {
    setExerciseState({
      counter: 0,
      status: "down",
      angle: 0,
      formAccuracy: 100,
    });
    setCurrentStreak(0);
    setFormAccuracyHistory([]);
    setSessionStartTime(Date.now());
    setSessionStats({
      totalReps: 0,
      averageFormAccuracy: 100,
      sessionDuration: 0,
      bestStreak: 0,
    });
    setEnhancedFormScore(null);
    poseDataRef.current = [];
  };

  // Handle blockchain submission
  const handleBlockchainSubmission = async (stats: SessionStats) => {
    if (!isWalletConnected || submissionCooldown > 0 || !signer) return;

    setIsSubmittingToBlockchain(true);
    setBlockchainError(null);

    try {
      await submitWorkoutSession(
        signer,
        stats.totalReps,
        stats.averageFormAccuracy,
        sessionStats.bestStreak,
        stats.sessionDuration,
        poseDataRef.current,
      );

      // Reload user data after successful submission
      if (walletAddress) {
        await loadUserBlockchainData();
      }
    } catch (err: unknown) {
      setBlockchainError(
        (err as Error).message || "Failed to submit to blockchain",
      );
    } finally {
      setIsSubmittingToBlockchain(false);
    }
  };

  const handleEnhancedAnalysis = (score: number) => {
    setEnhancedFormScore(score);
  };

  // Load blockchain data when wallet connects
  useEffect(() => {
    if (isWalletConnected && walletAddress) {
      loadUserBlockchainData();
    }
  }, [isWalletConnected, walletAddress, loadUserBlockchainData]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (detectorRef.current) {
        detectorRef.current.stop();
      }
    };
  }, []);

  return (
    <div className="flex flex-col items-center space-y-8 p-6 max-w-4xl mx-auto">
      <div className="text-center">
        <h1 className="text-4xl font-black tracking-tighter uppercase text-black mb-4 border-b-8 border-black pb-2 inline-block">
          WORKOUT SESSION
        </h1>
        <p className="text-lg font-mono font-bold uppercase text-gray-700">
          AI-POWERED FORM ANALYSIS ENGINE
        </p>
      </div>

      {/* Camera and Canvas */}
      <div className="abs-camera-container">
        <video
          ref={videoRef}
          className="w-full max-w-2xl"
          width="640"
          height="480"
          autoPlay
          muted
          playsInline
        />
        <canvas
          ref={canvasRef}
          className="absolute top-0 left-0 w-full h-full"
          width="640"
          height="480"
        />

        {/* Overlay Stats */}
        <div className="abs-stats-overlay absolute top-4 left-4">
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <div className="h-4 w-4 bg-cyan-400 border-2 border-white transform rotate-45"></div>
              <span className="font-bold uppercase">REPS:</span>
              <span className="abs-rep-counter">{exerciseState.counter}</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="h-4 w-4 bg-yellow-500 border-2 border-white"></div>
              <span className="font-bold uppercase">STATUS:</span>
              <span
                className={`font-bold uppercase ${exerciseState.status === "up" ? "abs-status-up" : "abs-status-down"}`}
              >
                {exerciseState.status}
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="h-4 w-4 bg-fuchsia-500 border-2 border-white transform rotate-45"></div>
              <span className="font-bold uppercase">ANGLE:</span>
              <span className="font-mono font-bold">
                {Math.round(exerciseState.angle)}°
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="h-4 w-4 bg-lime-400 border-2 border-white"></div>
              <span className="font-bold uppercase">FORM:</span>
              <span
                className={`abs-form-score ${
                  exerciseState.formAccuracy >= 90
                    ? "abs-form-excellent"
                    : exerciseState.formAccuracy >= 70
                      ? "abs-form-good"
                      : "abs-form-poor"
                }`}
              >
                {exerciseState.formAccuracy}%
              </span>
            </div>
          </div>
        </div>

        {/* Streak Indicator */}
        {currentStreak > 0 && (
          <div className="abs-streak-indicator abs-streak-glow absolute top-4 right-4">
            <div className="flex items-center space-x-2">
              <div className="h-6 w-6 bg-red-600 border-2 border-black transform rotate-45"></div>
              <span className="uppercase">{currentStreak} STREAK!</span>
            </div>
          </div>
        )}
      </div>

      {/* Wallet Connection */}
      {!isWalletConnected && (
        <div className="abs-card-brutal bg-purple-600 text-white text-center">
          <h3 className="text-lg font-black mb-3 uppercase border-b-4 border-white pb-2">
            Connect Wallet
          </h3>
          <p className="text-sm font-mono mb-4">
            Connect your wallet to submit workouts to the blockchain and track
            your progress on the leaderboard.
          </p>
          <WalletConnectButton
            variant="primary"
            className="bg-white text-purple-600"
            showWalletSelection={true}
          />
        </div>
      )}

      {/* Wallet Info */}
      {isWalletConnected && (
        <div className="abs-card-brutal bg-green-600 text-white">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-black uppercase">WALLET CONNECTED</h3>
            <div className="h-3 w-3 bg-lime-400 rounded-full animate-pulse"></div>
          </div>
          <p className="text-xs font-mono mb-2">
            {walletAddress.slice(0, 8)}...{walletAddress.slice(-6)}
          </p>
          {submissionCooldown > 0 && (
            <p className="text-xs font-mono text-yellow-200">
              COOLDOWN: {submissionCooldown}s remaining
            </p>
          )}
          {onChainStats && (
            <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
              <div>ON-CHAIN REPS: {onChainStats.totalReps}</div>
              <div>SESSIONS: {onChainStats.sessionsCompleted}</div>
            </div>
          )}
        </div>
      )}

      {/* Controls */}
      <div className="flex flex-wrap gap-4 justify-center">
        {!isActive ? (
          <button
            onClick={initializePoseDetection}
            disabled={isLoading}
            className="abs-btn-start disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {isLoading ? "STARTING CAMERA..." : "START WORKOUT"}
          </button>
        ) : (
          <button onClick={stopPoseDetection} className="abs-btn-stop">
            STOP WORKOUT
          </button>
        )}

        <button onClick={resetSession} className="abs-btn-reset">
          RESET SESSION
        </button>

        {isWalletConnected &&
          exerciseState.counter > 0 &&
          submissionCooldown === 0 && (
            <button
              onClick={() => handleBlockchainSubmission(sessionStats)}
              disabled={isSubmittingToBlockchain}
              className="abs-btn-primary bg-purple-600 text-white"
            >
              {isSubmittingToBlockchain
                ? "SUBMITTING..."
                : "SUBMIT TO BLOCKCHAIN"}
            </button>
          )}
      </div>

      {/* Error Display */}
      {(error || blockchainError) && (
        <div className="abs-card-brutal bg-red-600 text-white">
          <div className="flex items-center space-x-2">
            <div className="h-6 w-6 bg-white border-2 border-black transform rotate-45"></div>
            <span className="font-bold uppercase">ERROR:</span>
          </div>
          {error && <p className="font-mono mt-2">{error}</p>}
          {blockchainError && (
            <p className="font-mono mt-2">BLOCKCHAIN: {blockchainError}</p>
          )}
        </div>
      )}

      {/* Chainlink Enhancement */}
      {isWalletConnected && (
        <ChainlinkEnhancement
          isConnected={isWalletConnected}
          currentSession={
            exerciseState.counter > 0
              ? {
                  reps: exerciseState.counter,
                  formAccuracy: exerciseState.formAccuracy,
                  streak: currentStreak,
                  duration: sessionStats.sessionDuration,
                  poseData: poseDataRef.current,
                }
              : undefined
          }
          onEnhancedAnalysis={handleEnhancedAnalysis}
        />
      )}

      {/* Session Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 w-full max-w-4xl">
        <div className="abs-card-brutal bg-blue-600 text-white text-center">
          <div className="text-3xl font-black">{sessionStats.totalReps}</div>
          <div className="text-sm font-mono font-bold uppercase border-t-4 border-white pt-2 mt-2">
            TOTAL REPS
          </div>
        </div>
        <div
          className="abs-card-brutal text-center"
          style={{
            backgroundColor:
              sessionStats.averageFormAccuracy >= 90
                ? "#10b981"
                : sessionStats.averageFormAccuracy >= 70
                  ? "#eab308"
                  : "#dc2626",
            color: "white",
          }}
        >
          <div className="text-3xl font-black">
            {enhancedFormScore ?? sessionStats.averageFormAccuracy}%
          </div>
          <div className="text-sm font-mono font-bold uppercase border-t-4 border-white pt-2 mt-2">
            {enhancedFormScore ? "AI FORM" : "AVG FORM"}
          </div>
          {enhancedFormScore && (
            <div className="text-xs font-mono text-gray-200 mt-1">
              CHAINLINK ENHANCED
            </div>
          )}
        </div>
        <div className="abs-card-brutal bg-orange-500 text-white text-center">
          <div className="text-3xl font-black">{sessionStats.bestStreak}</div>
          <div className="text-sm font-mono font-bold uppercase border-t-4 border-white pt-2 mt-2">
            BEST STREAK
          </div>
        </div>
        <div className="abs-card-brutal bg-black text-white text-center">
          <div className="text-3xl font-black">
            {sessionStats.sessionDuration}s
          </div>
          <div className="text-sm font-mono font-bold uppercase border-t-4 border-white pt-2 mt-2">
            DURATION
          </div>
        </div>
      </div>

      {/* Instructions */}
      <div className="abs-card-brutal bg-yellow-500 text-black max-w-3xl">
        <h3 className="text-xl font-black mb-4 uppercase border-b-4 border-black pb-2">
          WORKOUT INSTRUCTIONS:
        </h3>
        <div className="grid md:grid-cols-2 gap-4">
          <ul className="font-mono font-bold space-y-2">
            <li className="flex items-center">
              <div className="h-3 w-3 bg-black border-2 border-black mr-3 transform rotate-45"></div>
              POSITION FULL TORSO IN VIEW
            </li>
            <li className="flex items-center">
              <div className="h-3 w-3 bg-black border-2 border-black mr-3"></div>
              LIE DOWN FOR SIT-UPS
            </li>
            <li className="flex items-center">
              <div className="h-3 w-3 bg-black border-2 border-black mr-3 transform rotate-45"></div>
              MAINTAIN PROPER FORM
            </li>
          </ul>
          <ul className="font-mono font-bold space-y-2">
            <li className="flex items-center">
              <div className="h-3 w-3 bg-green-600 border-2 border-black mr-3"></div>
              GREEN = EXCELLENT (90%+)
            </li>
            <li className="flex items-center">
              <div className="h-3 w-3 bg-yellow-600 border-2 border-black mr-3"></div>
              YELLOW = GOOD (70-89%)
            </li>
            <li className="flex items-center">
              <div className="h-3 w-3 bg-red-600 border-2 border-black mr-3"></div>
              RED = NEEDS WORK ({`<70%`})
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
