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
  fulfillmentTxHash?: string;
  error?: string;
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
    if (!currentSession || !signer) {
      console.log("❌ Cannot request analysis: missing session or signer");
      return;
    }

    console.log("🚀 Starting AI analysis request...");
    console.log("📊 Session data:", {
      reps: currentSession.reps,
      formAccuracy: currentSession.formAccuracy,
      streak: currentSession.streak,
      duration: currentSession.duration,
    });

    setIsRequestingAnalysis(true);

    try {
      console.log("📝 Requesting AI analysis via consumer contract...");

      // Import contract integration
      const { getContract } = await import("../lib/contract");
      const contract = getContract(signer);

      console.log("💰 Preparing transaction with 0.01 AVAX fee...");

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

      console.log("📤 Transaction sent:", tx.hash);
      console.log("⏳ Waiting for confirmation...");

      const receipt = await tx.wait();
      console.log("✅ Transaction confirmed in block:", receipt.blockNumber);
      console.log(
        "📋 Receipt events:",
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        receipt.events?.map((e: any) => e.event)
      );

      // Extract the actual Chainlink request ID from events
      let chainlinkRequestId = null;

      // Look for AIAnalysisRequested event
      const aiAnalysisEvents = receipt.events?.filter(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (event: any) => event.event === "AIAnalysisRequested"
      );

      if (aiAnalysisEvents && aiAnalysisEvents.length > 0) {
        chainlinkRequestId = aiAnalysisEvents[0].args?.requestId;
        console.log("🔗 Chainlink request ID found:", chainlinkRequestId);
      } else {
        console.log(
          "⚠️ No AIAnalysisRequested event found, checking all events..."
        );
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        receipt.events?.forEach((event: any, index: number) => {
          console.log(`Event ${index}:`, {
            event: event.event,
            args: event.args,
            topics: event.topics,
          });
        });
        chainlinkRequestId = `fallback_${receipt.transactionHash}`;
      }

      const newRequest: ChainlinkRequest = {
        requestId: chainlinkRequestId,
        status: "pending",
        sessionData: currentSession,
        timestamp: Date.now(),
        transactionHash: receipt.transactionHash,
      };

      // Add to requests
      const updatedRequests = [newRequest, ...requests].slice(0, 10);
      saveRequests(updatedRequests);
      setHasActiveRequest(true);

      console.log("📋 Request tracking created:", {
        requestId: newRequest.requestId,
        txHash: receipt.transactionHash,
        status: "pending",
      });

      // Poll for response by checking contract events
      console.log("🔄 Starting to poll for Chainlink response...");
      pollForContractResponse(newRequest.requestId);
    } catch (error) {
      console.error("❌ Failed to request enhanced analysis:", error);
      if (error instanceof Error) {
        console.error("Error details:", error.message);
        console.error("Error stack:", error.stack);
      }
      setHasActiveRequest(false);
    } finally {
      setIsRequestingAnalysis(false);
    }
  };

  const pollForContractResponse = async (requestId: string) => {
    console.log("🔄 Starting polling for request:", requestId);

    // Poll for Chainlink Functions fulfillment events from the consumer contract
    let attempts = 0;
    const maxAttempts = 30; // 5 minutes max (30 attempts * 10 seconds)

    const poll = setInterval(async () => {
      attempts++;
      console.log(
        `🔍 Polling attempt ${attempts}/${maxAttempts} for request ${requestId}`
      );

      if (attempts >= maxAttempts) {
        clearInterval(poll);
        console.log("⏰ Polling timeout reached, marking request as failed");

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
        if (!provider) {
          console.log("⚠️ No provider available for polling");
          return;
        }

        const contract = getContract(provider);
        console.log("📡 Checking contract for events...");

        // Check for AIAnalysisCompleted events (success case)
        const completedFilter = contract.filters.AIAnalysisCompleted?.(
          null,
          requestId
        );
        if (completedFilter) {
          console.log("🔍 Checking for AIAnalysisCompleted events...");
          const completedEvents = await contract.queryFilter(
            completedFilter,
            -1000
          ); // Last 1000 blocks

          if (completedEvents.length > 0) {
            clearInterval(poll);
            console.log("✅ AIAnalysisCompleted event found!");

            const event = completedEvents[0];
            const enhancedScore = event.args?.enhancedScore
              ? parseInt(event.args.enhancedScore.toString())
              : currentSession?.formAccuracy || 75;

            console.log("📊 Enhanced score received:", enhancedScore);

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
              `🎉 AI analysis complete! Enhanced score: ${enhancedScore}%`
            );
            return;
          }
        }

        // Check for AIAnalysisFailed events (error case)
        const failedFilter = contract.filters.AIAnalysisFailed?.(
          null,
          requestId
        );
        if (failedFilter) {
          console.log("🔍 Checking for AIAnalysisFailed events...");
          const failedEvents = await contract.queryFilter(failedFilter, -1000);

          if (failedEvents.length > 0) {
            clearInterval(poll);
            console.log("❌ AIAnalysisFailed event found!");

            const event = failedEvents[0];
            const reason = event.args?.reason || "Unknown error";
            console.log("❌ Failure reason:", reason);

            const updatedRequests = requests.map((req) =>
              req.requestId === requestId
                ? {
                    ...req,
                    status: "failed" as const,
                    error: reason,
                    fulfillmentTxHash: event.transactionHash,
                  }
                : req
            );

            saveRequests(updatedRequests);
            setHasActiveRequest(false);
            return;
          }
        }

        console.log(
          "⏳ No fulfillment events found yet, continuing to poll..."
        );
      } catch (error) {
        console.error("❌ Error checking for fulfillment:", error);
        if (error instanceof Error) {
          console.error("Error details:", error.message);
        }
      }
    }, 10000); // Poll every 10 seconds
  };

  const canRequestAnalysis =
    isConnected && currentSession && signer && !hasActiveRequest;

  // Check if we have any completed analysis for this session
  const hasCompletedAnalysis = requests.some(
    (req) => req.status === "fulfilled"
  );
  const latestCompletedRequest = requests.find(
    (req) => req.status === "fulfilled"
  );

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

          {hasCompletedAnalysis && latestCompletedRequest ? (
            <>
              <div className="bg-green-500 text-white p-4 rounded-lg mb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-black text-lg">
                      ✅ Analysis Complete!
                    </div>
                    <div className="text-sm opacity-90">
                      Enhanced Score: {latestCompletedRequest.enhancedScore}%
                    </div>
                  </div>
                  <div className="text-right text-xs">
                    <div>
                      TX:{" "}
                      {latestCompletedRequest.fulfillmentTxHash?.slice(0, 8)}
                      ...
                    </div>
                    <div>
                      {new Date(
                        latestCompletedRequest.timestamp
                      ).toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              </div>
              <button
                onClick={requestEnhancedAnalysis}
                disabled={!canRequestAnalysis}
                className={`w-full abs-btn-primary text-sm ${
                  canRequestAnalysis
                    ? "bg-blue-400 text-white hover:bg-blue-300"
                    : "bg-gray-500 text-gray-300 cursor-not-allowed"
                }`}
              >
                🔄 Request Another Analysis (0.01 AVAX)
              </button>
            </>
          ) : (
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
          )}

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
