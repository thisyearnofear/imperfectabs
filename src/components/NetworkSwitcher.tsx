"use client";

import React, { useState } from "react";
import { useWallet } from "../contexts/WalletContext";
import { CONTRACT_CONFIG } from "../lib/contractIntegration";

const NETWORKS = {
  1: {
    name: "Ethereum",
    shortName: "ETH",
    color: "bg-blue-500",
    textColor: "text-blue-600"
  },
  43113: {
    name: "Avalanche Fuji",
    shortName: "FUJI",
    color: "bg-red-500",
    textColor: "text-red-600"
  },
  43114: {
    name: "Avalanche",
    shortName: "AVAX",
    color: "bg-red-600",
    textColor: "text-red-600"
  }
};

interface NetworkSwitcherProps {
  variant?: "header" | "inline";
  className?: string;
}

export default function NetworkSwitcher({ 
  variant = "header", 
  className = "" 
}: NetworkSwitcherProps) {
  const { chainId, switchNetwork, isConnected, isConnecting } = useWallet();
  const [isOpen, setIsOpen] = useState(false);
  const [isSwitching, setIsSwitching] = useState(false);

  if (!isConnected) return null;

  const currentNetwork = chainId ? NETWORKS[chainId as keyof typeof NETWORKS] : null;
  const isCorrectNetwork = chainId === CONTRACT_CONFIG.chainId;
  const targetNetwork = NETWORKS[CONTRACT_CONFIG.chainId as keyof typeof NETWORKS];

  const handleNetworkSwitch = async (targetChainId: number) => {
    setIsSwitching(true);
    setIsOpen(false);
    
    try {
      await switchNetwork(targetChainId);
      console.log(`✅ Successfully switched to network ${targetChainId}`);
    } catch (error) {
      console.error("❌ Failed to switch network:", error);
    } finally {
      setIsSwitching(false);
    }
  };

  if (variant === "header") {
    return (
      <div className={`relative ${className}`}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          disabled={isConnecting || isSwitching}
          className={`flex items-center space-x-2 px-3 py-2 text-xs font-bold border-2 border-black ${
            isCorrectNetwork 
              ? "bg-green-500 text-white" 
              : "bg-red-500 text-white animate-pulse"
          } ${isConnecting || isSwitching ? "opacity-50 cursor-not-allowed" : "hover:opacity-80"}`}
        >
          <div className={`w-2 h-2 rounded-full ${isCorrectNetwork ? "bg-green-200" : "bg-red-200"}`} />
          <span>
            {isSwitching 
              ? "SWITCHING..." 
              : currentNetwork?.shortName || "UNKNOWN"
            }
          </span>
          <span className="text-xs">▼</span>
        </button>

        {isOpen && (
          <>
            <div
              className="fixed inset-0 bg-black bg-opacity-50 z-40"
              onClick={() => setIsOpen(false)}
            />
            <div className="absolute top-full right-0 mt-2 bg-white border-4 border-black z-50 min-w-48">
              <div className="p-2">
                <div className="text-xs font-bold text-gray-600 mb-2 px-2">
                  SWITCH NETWORK
                </div>
                
                {/* Current Network */}
                <div className="mb-2 p-2 bg-gray-100 border-2 border-gray-300">
                  <div className="text-xs font-bold text-gray-600">CURRENT</div>
                  <div className="flex items-center space-x-2">
                    <div className={`w-2 h-2 rounded-full ${currentNetwork?.color || "bg-gray-400"}`} />
                    <span className="text-sm font-bold">
                      {currentNetwork?.name || `Unknown (${chainId})`}
                    </span>
                  </div>
                </div>

                {/* Target Network */}
                {!isCorrectNetwork && (
                  <button
                    onClick={() => handleNetworkSwitch(CONTRACT_CONFIG.chainId)}
                    disabled={isSwitching}
                    className="w-full p-2 text-left bg-red-500 text-white hover:bg-red-600 disabled:opacity-50"
                  >
                    <div className="text-xs font-bold">REQUIRED</div>
                    <div className="flex items-center space-x-2">
                      <div className={`w-2 h-2 rounded-full ${targetNetwork.color}`} />
                      <span className="text-sm font-bold">{targetNetwork.name}</span>
                    </div>
                  </button>
                )}

                {isCorrectNetwork && (
                  <div className="p-2 bg-green-100 border-2 border-green-300">
                    <div className="text-xs font-bold text-green-600">✅ CORRECT NETWORK</div>
                    <div className="text-sm text-green-700">Ready for transactions</div>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    );
  }

  // Inline variant for use in other components
  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <div className={`w-3 h-3 rounded-full ${isCorrectNetwork ? "bg-green-500" : "bg-red-500"}`} />
      <span className={`text-sm font-bold ${isCorrectNetwork ? "text-green-600" : "text-red-600"}`}>
        {currentNetwork?.name || `Unknown (${chainId})`}
      </span>
      {!isCorrectNetwork && (
        <button
          onClick={() => handleNetworkSwitch(CONTRACT_CONFIG.chainId)}
          disabled={isSwitching}
          className="text-xs bg-red-500 text-white px-2 py-1 hover:bg-red-600 disabled:opacity-50"
        >
          {isSwitching ? "SWITCHING..." : "SWITCH"}
        </button>
      )}
    </div>
  );
}

// Export a simple network status indicator
export function NetworkStatus() {
  const { chainId, isConnected } = useWallet();
  
  if (!isConnected) return null;
  
  const isCorrectNetwork = chainId === CONTRACT_CONFIG.chainId;
  const currentNetwork = chainId ? NETWORKS[chainId as keyof typeof NETWORKS] : null;
  
  return (
    <div className={`flex items-center space-x-1 text-xs ${
      isCorrectNetwork ? "text-green-600" : "text-red-600"
    }`}>
      <div className={`w-2 h-2 rounded-full ${isCorrectNetwork ? "bg-green-500" : "bg-red-500"}`} />
      <span>{currentNetwork?.shortName || "UNKNOWN"}</span>
    </div>
  );
}
