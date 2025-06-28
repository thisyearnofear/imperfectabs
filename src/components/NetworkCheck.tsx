"use client";

import React from "react";
import { useWallet } from "../contexts/WalletContext";
import { CONTRACT_CONFIG } from "../lib/contractIntegration";

const getNetworkName = (chainId: number | null): string => {
  switch (chainId) {
    case 1:
      return "Ethereum Mainnet";
    case 43113:
      return "Avalanche Fuji";
    case 43114:
      return "Avalanche Mainnet";
    default:
      return `Unknown Network (ID: ${chainId})`;
  }
};

export default function NetworkCheck() {
  const { chainId, switchNetwork, isConnecting } = useWallet();
  const isCorrectNetwork = chainId === CONTRACT_CONFIG.chainId;

  if (!chainId) {
    return null; // Don't show anything if wallet is not connected
  }

  return (
    <div
      className={`p-4 border-b-4 mb-6 text-center ${
        isCorrectNetwork
          ? "bg-green-100 border-green-500"
          : "bg-red-100 border-red-500"
      }`}
    >
      <div className="flex items-center justify-center">
        <div
          className={`w-3 h-3 rounded-full mr-3 ${
            isCorrectNetwork ? "bg-green-500" : "bg-red-500"
          }`}
        ></div>
        <div className="font-bold text-black">{getNetworkName(chainId)}</div>
      </div>

      {!isCorrectNetwork && (
        <div className="mt-4">
          <p className="text-sm text-red-700 mb-3">
            Please switch to the Avalanche Fuji network to submit your score.
          </p>
          <button
            onClick={() => switchNetwork(CONTRACT_CONFIG.chainId)}
            disabled={isConnecting}
            className="abs-btn-primary bg-red-500 text-white hover:bg-red-600 disabled:bg-gray-400"
          >
            {isConnecting ? "Switching..." : "Switch to Fuji Network"}
          </button>
        </div>
      )}
    </div>
  );
}
