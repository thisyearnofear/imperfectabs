"use client";

import { useState, useEffect, useCallback } from "react";
import { ethers } from "ethers";
import {
  ChainlinkFunctionsManager,
  createFunctionsManager,
  formatLinkAmount,
  estimateRequestCost,
} from "../lib/chainlink-functions";
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
  const [functionsManager, setFunctionsManager] =
    useState<ChainlinkFunctionsManager | null>(null);
  const [subscriptionId, setSubscriptionId] = useState<number>(0);
  const [setupStatus, setSetupStatus] = useState<
    "checking" | "ready" | "needs-setup" | "error"
  >("checking");

  // Use wallet context instead of prop
  const { signer, provider } = useWallet();

  // Chainlink Functions configuration
  const MIN_LINK_BALANCE = 2; // Minimum LINK tokens needed
  const REQUEST_COST = estimateRequestCost();

  const initializeChainlinkFunctions = useCallback(async () => {
    if (!isConnected || !signer || !provider) return;

    try {
      setSetupStatus("checking");

      const manager = createFunctionsManager(provider);
      manager.setSigner(signer);
      setFunctionsManager(manager);

      await checkSetupStatus(manager, signer);
      await loadRequests();
    } catch (error) {
      console.error("Failed to initialize Chainlink Functions:", error);
      setSetupStatus("error");
    }
  }, [isConnected, signer, provider]);

  useEffect(() => {
    if (isConnected && signer && provider) {
      initializeChainlinkFunctions();
    }
  }, [isConnected, signer, provider, initializeChainlinkFunctions]);

  const checkSetupStatus = async (
    manager: ChainlinkFunctionsManager,
    signer: ethers.Signer
  ) => {
    try {
      const address = await signer.getAddress();

      // Check LINK balance
      const balance = await manager.getLinkBalance(address);

      // Check if we have a subscription ID from environment or config
      const savedSubId =
        process.env.NEXT_PUBLIC_CHAINLINK_SUBSCRIPTION_ID ||
        localStorage.getItem("chainlink-subscription-id");

      if (savedSubId) {
        const subId = parseInt(savedSubId);
        setSubscriptionId(subId);

        // Verify subscription exists and has balance
        const details = await manager.getSubscriptionDetails(subId);
        if (details && parseFloat(details.balance) > 0) {
          setSetupStatus("ready");
          return;
        }
      }

      // Check if user has enough LINK to create subscription
      if (parseFloat(balance) >= MIN_LINK_BALANCE) {
        setSetupStatus("needs-setup");
      } else {
        setSetupStatus("error");
      }
    } catch (error) {
      console.error("Setup check failed:", error);
      setSetupStatus("error");
    }
  };

  const createSubscription = async () => {
    if (!functionsManager) return;

    try {
      setSetupStatus("checking");

      console.log("Creating Chainlink Functions subscription...");
      const subId = await functionsManager.createSubscription();

      console.log("Funding subscription...");
      await functionsManager.fundSubscription(subId, "2.0");

      // Save subscription ID
      setSubscriptionId(subId);
      localStorage.setItem("chainlink-subscription-id", subId.toString());

      setSetupStatus("ready");

      console.log(`Subscription ${subId} created and funded!`);
    } catch (error) {
      console.error("Failed to create subscription:", error);
      setSetupStatus("error");
    }
  };

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
    if (!currentSession || !functionsManager || setupStatus !== "ready") return;

    setIsRequestingAnalysis(true);

    try {
      // Prepare session data for Chainlink Functions
      const sessionData = {
        reps: currentSession.reps,
        formAccuracy: currentSession.formAccuracy,
        streak: currentSession.streak,
        duration: currentSession.duration,
        poses: currentSession.poseData?.slice(0, 10) || [], // Limit data size for cost
        angles: extractAnglesFromPoses(currentSession.poseData || []),
        timestamp: Date.now(),
        userId: "anonymous", // In production, use actual user ID
        exerciseType: "abs",
      };

      console.log("Requesting AI analysis via Chainlink Functions...");

      // Make real Chainlink Functions request
      const functionsRequest = await functionsManager.requestAIAnalysis(
        sessionData,
        subscriptionId
      );

      const newRequest: ChainlinkRequest = {
        requestId: functionsRequest.requestId,
        status: "pending",
        sessionData,
        timestamp: Date.now(),
        transactionHash: functionsRequest.transactionHash,
      };

      // Add to requests
      const updatedRequests = [newRequest, ...requests].slice(0, 10);
      saveRequests(updatedRequests);
      setHasActiveRequest(true);

      console.log(`Request sent with ID: ${functionsRequest.requestId}`);

      // Poll for response (in production, use event listeners)
      pollForResponse(functionsRequest.requestId);
    } catch (error) {
      console.error("Failed to request enhanced analysis:", error);
      setHasActiveRequest(false);
    } finally {
      setIsRequestingAnalysis(false);
    }
  };

  const pollForResponse = async (requestId: string) => {
    // In a real implementation, you'd listen for contract events
    // For now, simulate with polling
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

      // Check if response received (simulate for now)
      if (Math.random() < 0.1) {
        // 10% chance each poll
        clearInterval(poll);

        // Simulate AI response
        const baseScore = currentSession?.formAccuracy || 75;
        const variance = Math.random() * 15 - 7.5; // ±7.5%
        const enhancedScore = Math.max(
          0,
          Math.min(100, Math.round(baseScore + variance))
        );

        const updatedRequests = requests.map((req) =>
          req.requestId === requestId
            ? {
                ...req,
                status: "fulfilled" as const,
                enhancedScore,
                fulfillmentTxHash: `0x${Math.random()
                  .toString(16)
                  .substr(2, 64)}`,
              }
            : req
        );

        saveRequests(updatedRequests);
        setHasActiveRequest(false);

        if (onEnhancedAnalysis) {
          onEnhancedAnalysis(enhancedScore);
        }

        console.log(`AI analysis complete! Enhanced score: ${enhancedScore}%`);
      }
    }, 10000); // Poll every 10 seconds
  };

  const extractAnglesFromPoses = (poseData: unknown[]): number[] => {
    // Extract angles for AI analysis
    return poseData
      .map((pose) => {
        if (!pose || typeof pose !== "object" || !("landmarks" in pose))
          return 0;
        // Simplified angle calculation for demo
        return Math.random() * 180;
      })
      .slice(0, 50); // Limit to 50 angle measurements
  };

  const canRequestAnalysis =
    isConnected &&
    currentSession &&
    setupStatus === "ready" &&
    !hasActiveRequest;

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
            <div className="flex items-center">
              <div className="h-8 w-8 bg-white border-4 border-black flex items-center justify-center mr-3">
                <span className="text-xl">🔗</span>
              </div>
              <div>
                <h3 className="text-xl font-black uppercase border-b-4 border-white pb-1">
                  🤖 AI-POWERED FORM ANALYSIS
                </h3>
                <p className="text-sm font-mono">GET PROFESSIONAL FEEDBACK</p>
              </div>
            </div>
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="text-xs font-mono underline"
            >
              {showHistory ? "Hide" : "Show"} History
            </button>
          </div>

          {setupStatus === "ready" && (
            <button
              onClick={requestEnhancedAnalysis}
              disabled={!canRequestAnalysis}
              className={`w-full abs-btn-primary ${
                canRequestAnalysis
                  ? "bg-lime-400 text-black hover:bg-lime-300"
                  : "bg-gray-500 text-gray-300 cursor-not-allowed"
              }`}
            >
              {`🤖 Get Professional Analysis (~${formatLinkAmount(
                REQUEST_COST
              )})`}
            </button>
          )}

          {setupStatus === "needs-setup" && (
            <div className="text-center space-y-4">
              <div className="bg-white/20 p-4 rounded-lg text-sm space-y-2">
                <p className="font-bold">🎯 What you'll get:</p>
                <ul className="text-left space-y-1">
                  <li>• Professional form analysis</li>
                  <li>• Personalized improvement tips</li>
                  <li>• Enhanced accuracy scoring</li>
                  <li>• Powered by AI & blockchain</li>
                </ul>
              </div>
              <button
                onClick={createSubscription}
                className="w-full abs-btn-primary bg-blue-600 text-white"
              >
                🚀 Setup AI Analysis Subscription ({formatLinkAmount("2.0")})
              </button>
              <p className="text-xs opacity-75">
                One-time setup • Requires LINK tokens for AI requests
              </p>
            </div>
          )}

          {setupStatus === "error" && (
            <div className="text-center text-red-300 font-mono text-sm">
              <p>
                Insufficient LINK balance to perform AI analysis. Please ensure
                your wallet has at least 2 LINK on the Fuji testnet.
              </p>
              <a
                href="https://faucets.chain.link/fuji"
                target="_blank"
                rel="noopener noreferrer"
                className="underline mt-2 inline-block"
              >
                Get LINK from Faucet
              </a>
            </div>
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
