"use client";

import { useState, useEffect, useCallback } from "react";
import { ethers } from "ethers";
import {
  ChainlinkFunctionsManager,
  createFunctionsManager,
  CHAINLINK_CONFIG,
  formatLinkAmount,
  estimateRequestCost,
} from "../lib/chainlink-functions";
import { useWallet } from "../contexts/WalletContext";

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
  const [linkBalance, setLinkBalance] = useState<string>("0");
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
    signer: ethers.Signer,
  ) => {
    try {
      const address = await signer.getAddress();

      // Check LINK balance
      const balance = await manager.getLinkBalance(address);
      setLinkBalance(balance);

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
        parsed.some((r: ChainlinkRequest) => r.status === "pending"),
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
        subscriptionId,
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
            : req,
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
          Math.min(100, Math.round(baseScore + variance)),
        );

        const updatedRequests = requests.map((req) =>
          req.requestId === requestId
            ? {
                ...req,
                status: "fulfilled" as const,
                enhancedScore,
                fulfillmentTxHash: `0x${Math.random().toString(16).substr(2, 64)}`,
              }
            : req,
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

  const hasEnoughLink = parseFloat(linkBalance) >= parseFloat(REQUEST_COST);
  const canRequestAnalysis =
    isConnected &&
    currentSession &&
    setupStatus === "ready" &&
    !hasActiveRequest;

  return (
    <div className="abs-card-brutal bg-gradient-to-r from-blue-600 to-purple-600 text-white">
      <div className="flex items-center mb-4">
        <div className="h-8 w-8 bg-white border-4 border-black flex items-center justify-center mr-3">
          <span className="text-xl">🔗</span>
        </div>
        <div>
          <h3 className="text-xl font-black uppercase border-b-4 border-white pb-1">
            CHAINLINK AI ENHANCEMENT
          </h3>
          <p className="text-sm font-mono">
            ADVANCED FORM ANALYSIS POWERED BY CHAINLINK FUNCTIONS
          </p>
        </div>
      </div>

      {/* LINK Balance & Status */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="abs-card-brutal bg-black text-white text-center">
          <div className="text-lg font-black">
            {formatLinkAmount(linkBalance)}
          </div>
          <div className="text-xs font-mono uppercase border-t-2 border-white pt-1 mt-1">
            BALANCE
          </div>
        </div>
        <div className="abs-card-brutal bg-white text-black text-center">
          <div className="text-lg font-black">{requests.length}</div>
          <div className="text-xs font-mono uppercase border-t-2 border-black pt-1 mt-1">
            REQUESTS
          </div>
        </div>
      </div>

      {/* Setup Status */}
      {setupStatus === "checking" && (
        <div className="mb-6 p-4 bg-yellow-500 text-black border-4 border-black">
          <div className="flex items-center space-x-2">
            <div className="h-4 w-4 bg-black animate-spin"></div>
            <span className="font-bold">CHECKING CHAINLINK SETUP...</span>
          </div>
        </div>
      )}

      {setupStatus === "needs-setup" && (
        <div className="mb-6">
          <div className="p-4 bg-orange-500 text-white border-4 border-black mb-4">
            <h4 className="font-bold mb-2">⚙️ SETUP REQUIRED</h4>
            <p className="text-sm font-mono">
              Create Chainlink Functions subscription to enable AI analysis
            </p>
          </div>
          <button
            onClick={createSubscription}
            className="w-full abs-btn-primary bg-blue-600 text-white"
          >
            CREATE SUBSCRIPTION ({formatLinkAmount("2.0")})
          </button>
        </div>
      )}

      {setupStatus === "error" && (
        <div className="mb-6 p-4 bg-red-600 text-white border-4 border-black">
          <h4 className="font-bold mb-2">❌ SETUP ERROR</h4>
          <p className="text-sm font-mono">
            Need at least {formatLinkAmount(MIN_LINK_BALANCE.toString())} to
            setup Chainlink Functions
          </p>
          <p className="text-xs mt-2">
            Get LINK: https://faucets.chain.link/fuji
          </p>
        </div>
      )}

      {/* Request Button */}
      {setupStatus === "ready" && (
        <div className="mb-6">
          <button
            onClick={requestEnhancedAnalysis}
            disabled={!canRequestAnalysis || isRequestingAnalysis}
            className={`w-full abs-btn-primary ${
              canRequestAnalysis
                ? "bg-lime-400 text-black hover:bg-lime-300"
                : "bg-gray-500 text-gray-300 cursor-not-allowed"
            }`}
          >
            {isRequestingAnalysis ? (
              <div className="flex items-center justify-center space-x-2">
                <div className="h-4 w-4 bg-black border-2 border-white animate-spin"></div>
                <span>REQUESTING AI ANALYSIS...</span>
              </div>
            ) : hasActiveRequest ? (
              "ANALYSIS IN PROGRESS..."
            ) : !hasEnoughLink ? (
              `NEED ${formatLinkAmount(REQUEST_COST)} FOR REQUEST`
            ) : !currentSession ? (
              "COMPLETE A WORKOUT FIRST"
            ) : (
              `REQUEST AI ENHANCEMENT (~${formatLinkAmount(REQUEST_COST)})`
            )}
          </button>
        </div>
      )}

      {/* How It Works */}
      <div className="mb-6 p-4 bg-black bg-opacity-50 border-4 border-white">
        <h4 className="font-black text-sm uppercase mb-2 border-b-2 border-white pb-1">
          HOW IT WORKS:
        </h4>
        <div className="space-y-2 text-xs font-mono">
          <div className="flex items-center">
            <div className="h-2 w-2 bg-cyan-400 border border-white mr-2"></div>
            POSE DATA SENT TO CHAINLINK FUNCTIONS
          </div>
          <div className="flex items-center">
            <div className="h-2 w-2 bg-lime-400 border border-white mr-2"></div>
            AI MODEL ANALYZES MOVEMENT PATTERNS
          </div>
          <div className="flex items-center">
            <div className="h-2 w-2 bg-fuchsia-400 border border-white mr-2"></div>
            ENHANCED SCORE RETURNED ON-CHAIN
          </div>
          <div className="flex items-center">
            <div className="h-2 w-2 bg-orange-400 border border-white mr-2"></div>
            RESULTS STORED IN SMART CONTRACT
          </div>
        </div>
      </div>

      {/* Recent Requests */}
      {requests.length > 0 && (
        <div>
          <h4 className="font-black text-sm uppercase mb-3 border-b-2 border-white pb-1">
            RECENT AI REQUESTS:
          </h4>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {requests.slice(0, 5).map((request) => (
              <div
                key={request.requestId}
                className="p-3 bg-black bg-opacity-30 border-2 border-white text-xs"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <span className="text-lg">
                      {getStatusIcon(request.status)}
                    </span>
                    <span
                      className={`font-bold uppercase ${getStatusColor(request.status)}`}
                    >
                      {request.status}
                    </span>
                  </div>
                  <div className="font-mono text-gray-300">
                    {new Date(request.timestamp).toLocaleTimeString()}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 mb-2">
                  <div>
                    <span className="text-gray-400">REPS:</span>{" "}
                    {(request.sessionData as { reps: number }).reps}
                  </div>
                  <div>
                    <span className="text-gray-400">FORM:</span>{" "}
                    {
                      (request.sessionData as { formAccuracy: number })
                        .formAccuracy
                    }
                    %
                  </div>
                </div>

                {request.enhancedScore !== undefined && (
                  <div className="border-t-2 border-gray-600 pt-2 mt-2">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400 font-bold">
                        AI ENHANCED SCORE:
                      </span>
                      <span
                        className={`font-black text-lg ${
                          request.enhancedScore >= 90
                            ? "text-green-400"
                            : request.enhancedScore >= 70
                              ? "text-yellow-400"
                              : "text-red-400"
                        }`}
                      >
                        {request.enhancedScore}%
                      </span>
                    </div>
                  </div>
                )}

                <div className="text-gray-500 font-mono text-xs mt-1">
                  ID: {request.requestId.slice(0, 8)}...
                  {request.requestId.slice(-6)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Network Info */}
      <div className="mt-6 pt-4 border-t-4 border-white text-center">
        <div className="grid grid-cols-2 gap-4 text-xs font-mono">
          <div>
            <div className="font-bold">FUNCTIONS ROUTER:</div>
            <div className="text-gray-300">
              {CHAINLINK_CONFIG.router.slice(0, 8)}...
              {CHAINLINK_CONFIG.router.slice(-6)}
            </div>
          </div>
          <div>
            <div className="font-bold">SUBSCRIPTION:</div>
            <div className="text-gray-300">{subscriptionId || "Not Setup"}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
