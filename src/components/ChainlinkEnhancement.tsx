"use client";

import { useState, useEffect } from "react";
import { ethers } from "ethers";
import { useWallet } from "../contexts/WalletContext";
import LoadingState from "./LoadingState";

interface ChainlinkRequest {
  requestId: string;
  status: "pending" | "fulfilled" | "failed" | "cancelled";
  sessionData: unknown;
  enhancedScore?: number;
  timestamp: number;
  transactionHash?: string;
}

interface ChainlinkEnhancementProps {
  isConnected: boolean;
  currentSession?: {
    reps: number;
    formAccuracy: number;
    streak: number;
    duration: number;
    poseData?: unknown[];
  };
  onEnhancedAnalysis?: (enhancedScore: number) => void;
}

export default function ChainlinkEnhancement({
  isConnected,
  currentSession,
  onEnhancedAnalysis,
}: ChainlinkEnhancementProps) {
  const [requests, setRequests] = useState<ChainlinkRequest[]>([]);
  const [isRequestingAnalysis, setIsRequestingAnalysis] = useState(false);
  const [hasActiveRequest, setHasActiveRequest] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  // Use wallet context instead of prop
  const { signer, provider } = useWallet();

  useEffect(() => {
    if (isConnected) {
      loadRequests();
    }
  }, [isConnected]);

  const loadRequests = () => {
    // Load from localStorage for demo
    const saved = localStorage.getItem("chainlink-requests");
    if (saved) {
      const parsed = JSON.parse(saved);
      setRequests(parsed);
      setHasActiveRequest(
        parsed.some((r: ChainlinkRequest) => r.status === "pending")
      );
    }
  };

  const saveRequests = (newRequests: ChainlinkRequest[]) => {
    localStorage.setItem("chainlink-requests", JSON.stringify(newRequests));
    setRequests(newRequests);
  };

  const requestEnhancedAnalysis = async () => {
    if (!currentSession || !signer) return;

    setIsRequestingAnalysis(true);

    try {
      console.log("Requesting AI analysis via consumer contract...");

      // Import contract integration
      const { getContract } = await import("../lib/contract");
      const contract = getContract(signer);

      // Call the consumer contract's submitWorkoutSession function
      // This will internally trigger requestAIAnalysis via Chainlink Functions
      const tx = await contract.submitWorkoutSession(
        currentSession.reps,
        currentSession.formAccuracy,
        currentSession.streak,
        currentSession.duration,
        {
          value: ethers.utils.parseEther("0.01"), // Submission fee
          gasLimit: 500000, // Higher gas limit for Chainlink Functions
        }
      );

      console.log("Transaction sent:", tx.hash);
      const receipt = await tx.wait();
      console.log("Transaction confirmed:", receipt.transactionHash);

      // Extract request ID from events if available
      const requestEvent = receipt.events?.find(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (e: any) => e.event === "RequestSent" || e.topics?.[0] === "0x..." // Add actual event signature
      );

      const newRequest: ChainlinkRequest = {
        requestId:
          requestEvent?.args?.requestId ||
          `0x${Math.random().toString(16).substr(2, 64)}`,
        status: "pending",
        sessionData: currentSession,
        timestamp: Date.now(),
        transactionHash: receipt.transactionHash,
      };

      // Add to requests
      const updatedRequests = [newRequest, ...requests].slice(0, 10);
      saveRequests(updatedRequests);
      setHasActiveRequest(true);

      console.log(
        `AI analysis request submitted! TX: ${receipt.transactionHash}`
      );

      // Poll for response by checking contract events
      pollForContractResponse(newRequest.requestId);
    } catch (error) {
      console.error("Failed to request enhanced analysis:", error);
      setHasActiveRequest(false);
    } finally {
      setIsRequestingAnalysis(false);
    }
  };

  const pollForContractResponse = async (requestId: string) => {
    // Poll for Chainlink Functions fulfillment events from the consumer contract
    let attempts = 0;
    const maxAttempts = 30; // 5 minutes max

    const poll = setInterval(async () => {
      attempts++;

      if (attempts >= maxAttempts) {
        clearInterval(poll);
        // Mark as failed
        const updatedRequests = requests.map((req) =>
          req.requestId === requestId
            ? { ...req, status: "failed" as const }
            : req
        );
        saveRequests(updatedRequests);
        setHasActiveRequest(false);
        return;
      }

      try {
        // Check contract for fulfillment events
        const { getContract } = await import("../lib/contract");
        if (!provider) return;
        const contract = getContract(provider);

        // Query for RequestFulfilled events
        const filter = contract.filters.RequestFulfilled?.(requestId);
        if (filter) {
          const events = await contract.queryFilter(filter, -1000); // Last 1000 blocks

          if (events.length > 0) {
            clearInterval(poll);

            const event = events[0];
            const enhancedScore = event.args?.response
              ? parseInt(event.args.response.toString())
              : currentSession?.formAccuracy || 75;

            const updatedRequests = requests.map((req) =>
              req.requestId === requestId
                ? {
                    ...req,
                    status: "fulfilled" as const,
                    enhancedScore,
                    fulfillmentTxHash: event.transactionHash,
                  }
                : req
            );

            saveRequests(updatedRequests);
            setHasActiveRequest(false);

            if (onEnhancedAnalysis) {
              onEnhancedAnalysis(enhancedScore);
            }

            console.log(
              `AI analysis complete! Enhanced score: ${enhancedScore}%`
            );
          }
        }
      } catch (error) {
        console.error("Error checking for fulfillment:", error);
      }
    }, 15000); // Poll every 15 seconds
  };

  const canRequestAnalysis =
    isConnected && currentSession && signer && !hasActiveRequest;

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "text-yellow-500";
      case "fulfilled":
        return "text-green-500";
      case "failed":
        return "text-red-500";
      case "cancelled":
        return "text-gray-500";
      default:
        return "text-gray-500";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
        return "⏳";
      case "fulfilled":
        return "✅";
      case "failed":
        return "❌";
      case "cancelled":
        return "⭕";
      default:
        return "❓";
    }
  };

  return (
    <div className="abs-card-brutal bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6">
      {isRequestingAnalysis || hasActiveRequest ? (
        <LoadingState />
      ) : (
        <>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-black uppercase">
                🤖 AI Enhancement
              </h3>
            </div>
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="text-xs font-mono underline"
            >
              {showHistory ? "Hide" : "Show"} History
            </button>
          </div>

          <button
            onClick={requestEnhancedAnalysis}
            disabled={!canRequestAnalysis}
            className={`w-full abs-btn-primary ${
              canRequestAnalysis
                ? "bg-lime-400 text-black hover:bg-lime-300"
                : "bg-gray-500 text-gray-300 cursor-not-allowed"
            }`}
          >
            🤖 Get AI Analysis (0.01 AVAX)
          </button>

          {!isConnected && (
            <p className="text-xs text-center mt-2 opacity-75">
              Connect wallet to enable AI analysis
            </p>
          )}

          {isConnected && !currentSession && (
            <p className="text-xs text-center mt-2 opacity-75">
              Complete a workout session first
            </p>
          )}

          {showHistory && requests.length > 0 && (
            <div className="mt-4 space-y-2">
              {requests.map((request) => (
                <div
                  key={request.requestId}
                  className="p-2 bg-black bg-opacity-20 text-xs"
                >
                  <div className="flex justify-between">
                    <span
                      className={`font-bold ${getStatusColor(request.status)}`}
                    >
                      {getStatusIcon(request.status)} {request.status}
                    </span>
                    <span className="font-mono">
                      {new Date(request.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
