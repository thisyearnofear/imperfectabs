"use client";

import { useState, useEffect, useCallback } from "react";
import { ethers } from "ethers";
import {
  imperfectAbsContract,
  type SubmissionData,
  type ContractError,
  type AbsScore,
} from "../lib/contractIntegration";
import { ENSDisplay } from "./ENSDisplay";

interface WorkoutSubmissionProps {
  sessionStats: {
    totalReps: number;
    averageFormAccuracy: number;
    bestStreak: number;
    duration: number;
  };
  isConnected: boolean;
  walletAddress?: string;
  onSubmissionComplete?: (success: boolean, txHash?: string) => void;
  onError?: (error: string) => void;
}

interface SubmissionState {
  isSubmitting: boolean;
  isCheckingCooldown: boolean;
  cooldownRemaining: number;
  canSubmit: boolean;
  userScore: AbsScore | null;
  submissionFee: string;
  estimatedScore: number;
}

export default function WorkoutSubmission({
  sessionStats,
  isConnected,
  walletAddress,
  onSubmissionComplete,
  onError,
}: WorkoutSubmissionProps) {
  const [state, setState] = useState<SubmissionState>({
    isSubmitting: false,
    isCheckingCooldown: false,
    cooldownRemaining: 0,
    canSubmit: false,
    userScore: null,
    submissionFee: "0.01",
    estimatedScore: 0,
  });

  const [showDetails, setShowDetails] = useState(false);
  const [txHash, setTxHash] = useState<string>("");
  const [lastSubmissionResult, setLastSubmissionResult] = useState<{
    success: boolean;
    message: string;
    txHash?: string;
  } | null>(null);

  const initializeContract = useCallback(async () => {
    try {
      if (!window.ethereum) return;

      const provider = new ethers.providers.Web3Provider(window.ethereum);
      await imperfectAbsContract.initialize(provider);

      // Get contract config and user status
      const [config, userScore, cooldownCheck, estimatedScore] =
        await Promise.all([
          imperfectAbsContract.getContractConfig(),
          walletAddress
            ? imperfectAbsContract.getUserScore(walletAddress)
            : null,
          walletAddress
            ? imperfectAbsContract.checkCooldown(walletAddress)
            : { canSubmit: true, remainingTime: 0 },
          imperfectAbsContract.calculateScore(
            sessionStats.totalReps,
            sessionStats.averageFormAccuracy,
            sessionStats.bestStreak,
          ),
        ]);

      setState((prev) => ({
        ...prev,
        submissionFee: config.submissionFee,
        userScore,
        cooldownRemaining: cooldownCheck.remainingTime,
        canSubmit: cooldownCheck.canSubmit,
        estimatedScore,
      }));
    } catch (error) {
      console.error("Failed to initialize contract:", error);
      onError?.("Failed to connect to smart contract");
    }
  }, [walletAddress, sessionStats, onError]);

  // Initialize contract and check status
  useEffect(() => {
    if (isConnected && walletAddress) {
      initializeContract();
    }
  }, [isConnected, walletAddress, initializeContract]);

  // Cooldown countdown timer
  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (state.cooldownRemaining > 0) {
      interval = setInterval(() => {
        setState((prev) => ({
          ...prev,
          cooldownRemaining: Math.max(0, prev.cooldownRemaining - 1),
          canSubmit: prev.cooldownRemaining <= 1,
        }));
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [state.cooldownRemaining]);

  const handleSubmission = async () => {
    if (!isConnected || !walletAddress || state.isSubmitting) return;

    setState((prev) => ({ ...prev, isSubmitting: true }));
    setLastSubmissionResult(null);

    const submissionData: SubmissionData = {
      reps: sessionStats.totalReps,
      formAccuracy: sessionStats.averageFormAccuracy,
      streak: sessionStats.bestStreak,
      duration: sessionStats.duration,
    };

    try {
      const result = await imperfectAbsContract.submitWorkoutSession(
        submissionData,
        {
          onConfirmation: (hash) => {
            setTxHash(hash);
          },
          onError: (error) => {
            handleSubmissionError(error);
          },
        },
      );

      if (result.success && result.txHash) {
        setLastSubmissionResult({
          success: true,
          message: "Workout submitted successfully!",
          txHash: result.txHash,
        });

        // Refresh user score and cooldown
        await initializeContract();

        onSubmissionComplete?.(true, result.txHash);
      } else if (result.error) {
        handleSubmissionError(result.error);
      }
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "An unexpected error occurred";
      handleSubmissionError({
        code: "UNKNOWN_ERROR",
        message: errorMessage,
      });
    } finally {
      setState((prev) => ({ ...prev, isSubmitting: false }));
    }
  };

  const handleSubmissionError = (error: ContractError) => {
    setLastSubmissionResult({
      success: false,
      message: error.message,
    });

    // Update cooldown if error indicates active cooldown
    if (error.code === "COOLDOWN_ACTIVE" && error.remainingTime) {
      setState((prev) => ({
        ...prev,
        cooldownRemaining: error.remainingTime!,
        canSubmit: false,
      }));
    }

    onSubmissionComplete?.(false);
    onError?.(error.message);
  };

  const formatCooldownTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  };

  const getSubmissionButtonText = (): string => {
    if (state.isSubmitting) return "SUBMITTING...";
    if (state.cooldownRemaining > 0)
      return `COOLDOWN ${formatCooldownTime(state.cooldownRemaining)}`;
    if (!isConnected) return "CONNECT WALLET";
    return `SUBMIT TO BLOCKCHAIN (${state.submissionFee} AVAX)`;
  };

  const getSubmissionButtonClass = (): string => {
    const baseClass =
      "w-full abs-btn-primary text-center transition-all duration-200";

    if (!isConnected) return `${baseClass} bg-purple-600 text-white`;
    if (state.isSubmitting)
      return `${baseClass} bg-gray-400 text-gray-600 cursor-not-allowed`;
    if (state.cooldownRemaining > 0)
      return `${baseClass} bg-orange-500 text-white cursor-not-allowed`;
    return `${baseClass} bg-green-500 text-black hover:bg-green-400`;
  };

  // Performance metrics for display
  const performanceMetrics = [
    { label: "Reps", value: sessionStats.totalReps, icon: "💪" },
    {
      label: "Form",
      value: `${sessionStats.averageFormAccuracy}%`,
      icon: "🎯",
    },
    { label: "Streak", value: sessionStats.bestStreak, icon: "🔥" },
    {
      label: "Duration",
      value: `${Math.floor(sessionStats.duration / 60)}:${(sessionStats.duration % 60).toString().padStart(2, "0")}`,
      icon: "⏱️",
    },
  ];

  return (
    <div className="abs-card-brutal p-6 space-y-6">
      {/* Header */}
      <div className="text-center border-b-4 border-black pb-4">
        <h2 className="text-2xl font-black uppercase text-black mb-2">
          🏆 Submit to Leaderboard
        </h2>
        <p className="text-gray-600 font-bold">
          Record your workout on Avalanche blockchain
        </p>
      </div>

      {/* Performance Metrics */}
      <div className="grid grid-cols-2 gap-4">
        {performanceMetrics.map((metric) => (
          <div key={metric.label} className="abs-card-primary p-4 text-center">
            <div className="text-2xl mb-2">{metric.icon}</div>
            <div className="text-xl font-black text-black">{metric.value}</div>
            <div className="text-sm font-bold text-gray-600 uppercase">
              {metric.label}
            </div>
          </div>
        ))}
      </div>

      {/* Estimated Score */}
      {state.estimatedScore > 0 && (
        <div className="abs-card-workout p-4 text-center">
          <div className="text-lg font-bold text-purple-600 mb-2">
            📊 ESTIMATED SCORE
          </div>
          <div className="text-3xl font-black text-purple-600">
            {state.estimatedScore.toLocaleString()}
          </div>
          <div className="text-sm text-gray-600 mt-2">
            Based on reps, form accuracy, and streak
          </div>
        </div>
      )}

      {/* User Stats */}
      {state.userScore && (
        <div className="border-2 border-gray-300 p-4 rounded">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-black text-black uppercase">Your Stats</h3>
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="text-sm bg-gray-200 px-2 py-1 border border-gray-400 font-bold"
            >
              {showDetails ? "HIDE" : "SHOW"}
            </button>
          </div>

          {walletAddress && (
            <div className="mb-3">
              <ENSDisplay
                address={walletAddress}
                className="font-mono text-sm"
                showAvatar={true}
                maxLength={25}
              />
            </div>
          )}

          {showDetails && (
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="font-bold">Total Reps:</span>{" "}
                {state.userScore.totalReps}
              </div>
              <div>
                <span className="font-bold">Avg Form:</span>{" "}
                {state.userScore.averageFormAccuracy}%
              </div>
              <div>
                <span className="font-bold">Best Streak:</span>{" "}
                {state.userScore.bestStreak}
              </div>
              <div>
                <span className="font-bold">Sessions:</span>{" "}
                {state.userScore.sessionsCompleted}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Submission Button */}
      <button
        onClick={handleSubmission}
        disabled={
          state.isSubmitting || state.cooldownRemaining > 0 || !isConnected
        }
        className={getSubmissionButtonClass()}
      >
        {getSubmissionButtonText()}
      </button>

      {/* Submission Info */}
      <div className="text-xs text-gray-600 space-y-2">
        <div className="flex justify-between">
          <span>Network:</span>
          <span className="font-bold">Avalanche Fuji</span>
        </div>
        <div className="flex justify-between">
          <span>Contract:</span>
          <span className="font-mono">0xFBE9...A05d1</span>
        </div>
        <div className="flex justify-between">
          <span>Cooldown:</span>
          <span className="font-bold">60 seconds</span>
        </div>
        {state.submissionFee && (
          <div className="flex justify-between">
            <span>Fee:</span>
            <span className="font-bold">{state.submissionFee} AVAX</span>
          </div>
        )}
      </div>

      {/* Status Messages */}
      {lastSubmissionResult && (
        <div
          className={`p-4 border-2 ${
            lastSubmissionResult.success
              ? "border-green-500 bg-green-50"
              : "border-red-500 bg-red-50"
          }`}
        >
          <div
            className={`font-bold ${
              lastSubmissionResult.success ? "text-green-700" : "text-red-700"
            }`}
          >
            {lastSubmissionResult.success ? "✅ SUCCESS" : "❌ ERROR"}
          </div>
          <div className="text-sm mt-1">{lastSubmissionResult.message}</div>
          {lastSubmissionResult.txHash && (
            <div className="mt-2">
              <a
                href={imperfectAbsContract.getTransactionUrl(
                  lastSubmissionResult.txHash,
                )}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 underline text-sm font-bold"
              >
                📱 View Transaction
              </a>
            </div>
          )}
        </div>
      )}

      {/* Transaction in Progress */}
      {txHash && state.isSubmitting && (
        <div className="p-4 border-2 border-blue-500 bg-blue-50">
          <div className="font-bold text-blue-700 mb-2">
            ⏳ Transaction Submitted
          </div>
          <div className="text-sm">
            Waiting for confirmation on Avalanche...
          </div>
          <div className="mt-2">
            <a
              href={imperfectAbsContract.getTransactionUrl(txHash)}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 underline text-sm font-bold"
            >
              📱 Track Progress
            </a>
          </div>
        </div>
      )}

      {/* Mobile Optimization Note */}
      <div className="text-xs text-gray-500 text-center mt-4 p-3 bg-gray-100 border">
        <div className="font-bold mb-1">📱 Mobile Optimized</div>
        <div>
          Tap and hold buttons for better mobile interaction. Transactions
          typically confirm in 1-2 seconds on Avalanche.
        </div>
      </div>
    </div>
  );
}
