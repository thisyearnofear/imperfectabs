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
import NetworkCheck from "./NetworkCheck";
import { useWallet } from "../contexts/WalletContext";
import { CONTRACT_CONFIG } from "../lib/contractIntegration";

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
  const { chainId } = useWallet();
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

      // Wait a bit for network to stabilize after switching
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // Create fresh provider instance to avoid network change errors
      const provider = new ethers.providers.Web3Provider(
        window.ethereum,
        "any"
      );

      // Force provider to detect current network
      await provider.detectNetwork();

      await imperfectAbsContract.initialize(provider);

      // Get contract config and user status
      const [userScore, cooldownCheck, estimatedScore] = await Promise.all([
        walletAddress ? imperfectAbsContract.getUserScore(walletAddress) : null,
        walletAddress
          ? imperfectAbsContract.checkCooldown(walletAddress)
          : { canSubmit: true, remainingTime: 0 },
        imperfectAbsContract.calculateScore(
          sessionStats.totalReps,
          sessionStats.averageFormAccuracy,
          sessionStats.bestStreak
        ),
      ]);

      setState((prev) => ({
        ...prev,
        submissionFee: CONTRACT_CONFIG.submissionFee,
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
        }
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
      "w-full abs-btn-primary text-center transition-all duration-200 font-black";
    const isCorrectNetwork = chainId === CONTRACT_CONFIG.chainId;

    if (!isConnected)
      return `${baseClass} bg-purple-600 text-white border-purple-800`;
    if (!isCorrectNetwork)
      return `${baseClass} bg-gray-500 text-white cursor-not-allowed border-gray-700`;
    if (state.isSubmitting)
      return `${baseClass} bg-blue-500 text-white cursor-not-allowed border-blue-700`;
    if (state.cooldownRemaining > 0)
      return `${baseClass} bg-orange-600 text-white cursor-not-allowed border-orange-800`;
    return `${baseClass} bg-green-600 text-white hover:bg-green-500 border-green-800`;
  };

  // Helper function to get transaction URL
  const getTransactionUrl = (txHash: string) => {
    return `${CONTRACT_CONFIG.explorerUrl}/tx/${txHash}`;
  };

  return (
    <div className="abs-card-brutal p-6 space-y-6">
      {/* Header */}
      <div className="text-center border-b-4 border-black pb-4">
        <h2 className="text-2xl font-black uppercase text-gray-900 mb-2">
          🏆 Submit to Leaderboard
        </h2>
        <p className="text-gray-700 font-bold">
          Record your workout on Avalanche blockchain
        </p>
      </div>

      {/* Network Check */}
      {isConnected && <NetworkCheck />}

      {/* Network Info */}
      <div className="bg-blue-50 p-4 rounded-lg border-2 border-blue-200 text-center">
        <div className="text-sm font-bold text-blue-800 mb-2">
          SUBMITTING TO AVALANCHE FUJI
        </div>
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
            <h3 className="font-black text-gray-900 uppercase">Your Stats</h3>
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="text-sm bg-gray-800 text-white px-3 py-1 rounded border border-gray-600 font-bold hover:bg-gray-700"
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
            <div className="grid grid-cols-2 gap-3 text-sm text-gray-800">
              <div className="bg-gray-50 p-2 rounded">
                <span className="font-bold text-gray-900">Total Reps:</span>{" "}
                <span className="text-blue-600 font-semibold">
                  {state.userScore.totalReps}
                </span>
              </div>
              <div className="bg-gray-50 p-2 rounded">
                <span className="font-bold text-gray-900">Avg Form:</span>{" "}
                <span className="text-green-600 font-semibold">
                  {state.userScore.averageFormAccuracy}%
                </span>
              </div>
              <div className="bg-gray-50 p-2 rounded">
                <span className="font-bold text-gray-900">Best Streak:</span>{" "}
                <span className="text-purple-600 font-semibold">
                  {state.userScore.bestStreak}
                </span>
              </div>
              <div className="bg-gray-50 p-2 rounded">
                <span className="font-bold text-gray-900">Sessions:</span>{" "}
                <span className="text-orange-600 font-semibold">
                  {state.userScore.sessionsCompleted}
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Submission Button */}
      <button
        onClick={handleSubmission}
        disabled={
          state.isSubmitting ||
          state.cooldownRemaining > 0 ||
          !isConnected ||
          chainId !== CONTRACT_CONFIG.chainId
        }
        className={getSubmissionButtonClass()}
      >
        {getSubmissionButtonText()}
      </button>

      {/* Submission Info */}
      <div className="text-xs text-gray-700 space-y-2 bg-gray-50 p-3 rounded border">
        <div className="flex justify-between">
          <span className="text-gray-600">Network:</span>
          <span className="font-bold text-gray-900">Avalanche Fuji</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Contract:</span>
          <span className="font-mono text-gray-900">
            {CONTRACT_CONFIG.address.slice(0, 6)}...
            {CONTRACT_CONFIG.address.slice(-6)}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Cooldown:</span>
          <span className="font-bold text-gray-900">60 seconds</span>
        </div>
        {state.submissionFee && (
          <div className="flex justify-between">
            <span className="text-gray-600">Fee:</span>
            <span className="font-bold text-gray-900">
              {state.submissionFee} AVAX
            </span>
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
          <div
            className={`text-sm mt-1 font-semibold ${
              lastSubmissionResult.success ? "text-green-800" : "text-red-800"
            }`}
          >
            {lastSubmissionResult.message}
          </div>
          {lastSubmissionResult.txHash && (
            <div className="mt-2">
              <a
                href={getTransactionUrl(lastSubmissionResult.txHash)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-800 underline text-sm font-black bg-blue-100 px-2 py-1 rounded"
              >
                📱 View Transaction
              </a>
            </div>
          )}
        </div>
      )}

      {/* Transaction in Progress */}
      {txHash && state.isSubmitting && (
        <div className="p-4 border-2 border-blue-600 bg-blue-50">
          <div className="font-bold text-blue-800 mb-2">
            ⏳ Transaction Submitted
          </div>
          <div className="text-sm">
            Waiting for confirmation on Avalanche...
          </div>
          <div className="mt-2">
            <a
              href={getTransactionUrl(txHash)}
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
      <div className="text-xs text-gray-800 text-center mt-4 p-3 bg-gray-100 border border-gray-400 rounded">
        <div className="font-black mb-1 text-gray-900">📱 Mobile Optimized</div>
        <div className="font-semibold">
          Tap and hold buttons for better mobile interaction. Transactions
          typically confirm in 1-2 seconds on Avalanche.
        </div>
      </div>
    </div>
  );
}
