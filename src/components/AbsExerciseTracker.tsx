"use client";

import { useEffect, useRef, useState } from "react";
import type { Results } from "@mediapipe/pose";
import {
  AbsExerciseDetector,
  ExerciseState,
  PoseLandmark,
} from "../lib/pose-detection";

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

  // Initialize pose detection
  const initializePoseDetection = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    setIsLoading(true);
    setError(null);

    try {
      detectorRef.current = new AbsExerciseDetector();

      await detectorRef.current.initialize(
        videoRef.current,
        (results: Results) => {
          drawResults(results);
          processExercise(results);
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
      setSessionStats((prev) => ({
        ...prev,
        sessionDuration: duration,
        totalReps: exerciseState.counter,
        averageFormAccuracy:
          formAccuracyHistory.length > 0
            ? Math.round(
                formAccuracyHistory.reduce((a, b) => a + b, 0) /
                  formAccuracyHistory.length,
              )
            : 100,
      }));
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
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (detectorRef.current) {
        detectorRef.current.stop();
      }
    };
  }, []);

  // Get form quality color
  const getFormQualityColor = (accuracy: number) => {
    if (accuracy >= 90) return "text-green-500";
    if (accuracy >= 70) return "text-yellow-500";
    return "text-red-500";
  };

  // Get status indicator color
  const getStatusColor = (status: string) => {
    return status === "up" ? "text-green-500" : "text-blue-500";
  };

  return (
    <div className="flex flex-col items-center space-y-6 p-6 max-w-4xl mx-auto">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">
          Perfect Abs Tracker
        </h1>
        <p className="text-gray-600">
          AI-powered form analysis for abs exercises
        </p>
      </div>

      {/* Camera and Canvas */}
      <div className="relative bg-black rounded-lg overflow-hidden shadow-lg">
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
        <div className="absolute top-4 left-4 bg-black bg-opacity-70 text-white p-3 rounded-lg">
          <div className="space-y-1 text-sm">
            <div>
              Reps:{" "}
              <span className="font-bold text-xl">{exerciseState.counter}</span>
            </div>
            <div>
              Status:{" "}
              <span
                className={`font-semibold ${getStatusColor(exerciseState.status)}`}
              >
                {exerciseState.status.toUpperCase()}
              </span>
            </div>
            <div>
              Angle:{" "}
              <span className="font-mono">
                {Math.round(exerciseState.angle)}°
              </span>
            </div>
            <div>
              Form:{" "}
              <span
                className={`font-semibold ${getFormQualityColor(exerciseState.formAccuracy)}`}
              >
                {exerciseState.formAccuracy}%
              </span>
            </div>
          </div>
        </div>

        {/* Streak Indicator */}
        {currentStreak > 0 && (
          <div className="absolute top-4 right-4 bg-yellow-500 text-black px-3 py-1 rounded-full font-bold">
            🔥 {currentStreak} streak!
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="flex space-x-4">
        {!isActive ? (
          <button
            onClick={initializePoseDetection}
            disabled={isLoading}
            className="bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
          >
            {isLoading ? "Starting Camera..." : "Start Workout"}
          </button>
        ) : (
          <button
            onClick={stopPoseDetection}
            className="bg-red-500 hover:bg-red-600 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
          >
            Stop Workout
          </button>
        )}

        <button
          onClick={resetSession}
          className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
        >
          Reset Session
        </button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Session Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full max-w-2xl">
        <div className="bg-white p-4 rounded-lg shadow text-center">
          <div className="text-2xl font-bold text-blue-600">
            {sessionStats.totalReps}
          </div>
          <div className="text-sm text-gray-600">Total Reps</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow text-center">
          <div
            className={`text-2xl font-bold ${getFormQualityColor(sessionStats.averageFormAccuracy)}`}
          >
            {sessionStats.averageFormAccuracy}%
          </div>
          <div className="text-sm text-gray-600">Avg Form</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow text-center">
          <div className="text-2xl font-bold text-green-600">
            {sessionStats.bestStreak}
          </div>
          <div className="text-sm text-gray-600">Best Streak</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow text-center">
          <div className="text-2xl font-bold text-purple-600">
            {sessionStats.sessionDuration}s
          </div>
          <div className="text-sm text-gray-600">Duration</div>
        </div>
      </div>

      {/* Instructions */}
      <div className="bg-gray-100 p-4 rounded-lg max-w-2xl">
        <h3 className="font-semibold mb-2">How to use:</h3>
        <ul className="text-sm space-y-1 text-gray-700">
          <li>• Position yourself so your full torso is visible</li>
          <li>• Lie down for sit-ups or position for crunches</li>
          <li>• Maintain proper form for accurate counting</li>
          <li>• Green form percentage indicates excellent technique</li>
          <li>• Build streaks with consistent good form (80%+)</li>
        </ul>
      </div>
    </div>
  );
}
