"use client";

import React, { useState } from "react";
import { useWallet } from "../contexts/WalletContext";
import { ENSDisplay } from "./ENSDisplay";

interface WalletConnectButtonProps {
  variant?: "primary" | "secondary" | "compact";
  showBalance?: boolean;
  showAddress?: boolean;
  showWalletSelection?: boolean;
  className?: string;
  onConnect?: () => void;
  onDisconnect?: () => void;
}

export default function WalletConnectButton({
  variant = "primary",
  showBalance = false,
  showAddress = false,
  showWalletSelection = true,
  className = "",
  onConnect,
  onDisconnect,
}: WalletConnectButtonProps) {
  const {
    isConnected,
    address,
    isConnecting,
    error,
    balance,
    connectedWallet,
    connectWallet,
    connectMetaMask,
    connectWalletConnect,
    connectCore,
    disconnectWallet,
    clearError,
  } = useWallet();

  const [showWalletOptions, setShowWalletOptions] = useState(false);

  const handleConnect = async (
    walletType?: "metamask" | "walletconnect" | "core"
  ) => {
    clearError();
    if (walletType) {
      switch (walletType) {
        case "metamask":
          await connectMetaMask();
          break;
        case "walletconnect":
          await connectWalletConnect();
          break;
        case "core":
          await connectCore();
          break;
      }
    } else {
      await connectWallet();
    }
    setShowWalletOptions(false);
    onConnect?.();
  };

  const handleDisconnect = () => {
    disconnectWallet();
    onDisconnect?.();
  };

  const getButtonText = () => {
    if (isConnecting) return "CONNECTING...";
    if (isConnected) {
      if (variant === "compact") return "✓ CONNECTED";
      const walletIcon =
        connectedWallet === "metamask"
          ? "🦊"
          : connectedWallet === "core"
          ? "🏔️"
          : connectedWallet === "walletconnect"
          ? "🔗"
          : "✓";
      return (
        <div className="flex items-center space-x-2">
          <span>{walletIcon}</span>
          <ENSDisplay address={address} />
        </div>
      );
    }
    return "🔗 CONNECT WALLET";
  };

  const getButtonClass = () => {
    const baseClass =
      "abs-btn-primary transition-all duration-200 font-bold uppercase border-4 border-black";

    if (variant === "compact") {
      return `${baseClass} text-sm px-3 py-2 ${className}`;
    }

    if (variant === "secondary") {
      return `${baseClass} text-sm px-4 py-2 bg-white text-black hover:bg-gray-100 ${className}`;
    }

    // Primary variant - ensure high contrast for unconnected state
    const statusColor = isConnected
      ? "bg-green-600 text-white hover:bg-green-700"
      : "bg-black text-white hover:bg-gray-800 !text-white"; // Force white text

    return `${baseClass} text-lg px-6 py-3 ${statusColor} ${className}`;
  };

  if (error) {
    return (
      <div className="flex flex-col items-center space-y-2">
        <button
          onClick={() => handleConnect()}
          disabled={isConnecting}
          className={getButtonClass()}
        >
          🔗 RETRY CONNECTION
        </button>
        <div className="text-xs text-red-600 font-mono max-w-xs text-center">
          {error}
        </div>
      </div>
    );
  }

  if (isConnected && (showBalance || showAddress) && variant !== "compact") {
    return (
      <div className="flex flex-col items-center space-y-2">
        <button onClick={handleDisconnect} className={getButtonClass()}>
          {getButtonText()}
        </button>

        {(showBalance || showAddress) && (
          <div className="text-xs font-mono text-gray-600 text-center">
            {showAddress && (
              <div className="font-bold">
                <ENSDisplay address={address} showAvatar={true} />
              </div>
            )}
            {showBalance && (
              <div className="text-green-600 font-bold">
                Balance: {balance} AVAX
              </div>
            )}
            <div className="text-xs text-gray-500 mt-1">
              Avalanche Fuji Testnet • {connectedWallet?.toUpperCase()}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Show wallet selection dropdown for non-connected state
  if (!isConnected && showWalletSelection && showWalletOptions) {
    return (
      <div className="relative">
        <button
          onClick={() => setShowWalletOptions(false)}
          className={getButtonClass()}
        >
          ❌ CANCEL
        </button>

        <div
          className="absolute top-full left-0 right-0 mt-2 bg-white border-4 border-black z-50"
          style={{ boxShadow: "var(--shadow-brutal)" }}
        >
          <div className="p-2 space-y-2">
            <button
              onClick={() => handleConnect("metamask")}
              disabled={isConnecting}
              className="w-full abs-btn-primary bg-orange-500 text-white text-sm py-2 px-3"
            >
              🦊 METAMASK
            </button>

            <button
              onClick={() => handleConnect("core")}
              disabled={isConnecting}
              className="w-full abs-btn-primary bg-red-600 text-white text-sm py-2 px-3"
            >
              🏔️ CORE WALLET
            </button>

            <button
              onClick={() => handleConnect("walletconnect")}
              disabled={isConnecting}
              className="w-full abs-btn-primary bg-blue-600 text-white text-xs py-2 px-3"
            >
              🔗 WALLET
              <br />
              CONNECT
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={
          isConnected
            ? handleDisconnect
            : showWalletSelection
            ? () => setShowWalletOptions(!showWalletOptions)
            : () => handleConnect()
        }
        disabled={isConnecting}
        className={getButtonClass()}
      >
        {getButtonText()}
      </button>

      {showWalletOptions && !isConnected && (
        <>
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-40"
            onClick={() => setShowWalletOptions(false)}
          />
          <div
            className="absolute top-full left-0 right-0 mt-2 bg-white border-4 border-black z-50"
            style={{ boxShadow: "var(--shadow-brutal)" }}
          >
            <div className="p-2 space-y-2">
              <button
                onClick={() => handleConnect("metamask")}
                disabled={isConnecting}
                className="w-full abs-btn-primary bg-orange-500 text-white text-sm py-2 px-3"
              >
                🦊 METAMASK
              </button>

              <button
                onClick={() => handleConnect("core")}
                disabled={isConnecting}
                className="w-full abs-btn-primary bg-red-600 text-white text-sm py-2 px-3"
              >
                🏔️ CORE WALLET
              </button>

              <button
                onClick={() => handleConnect("walletconnect")}
                disabled={isConnecting}
                className="w-full abs-btn-primary bg-blue-600 text-white text-xs py-2 px-3"
              >
                🔗 WALLET
                <br />
                CONNECT
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// Additional specialized components for specific use cases

export function WalletStatus() {
  const { isConnected, address, balance, chainId } = useWallet();

  if (!isConnected) return null;

  return (
    <div className="abs-card-brutal bg-green-600 text-white text-xs font-mono">
      <div className="flex items-center justify-between mb-2">
        <span className="font-bold uppercase">Wallet Connected</span>
        <div className="h-2 w-2 bg-lime-400 rounded-full animate-pulse"></div>
      </div>
      <div className="space-y-1">
        <div>
          <ENSDisplay address={address} />
        </div>
        <div>Balance: {balance} AVAX</div>
        <div>
          Chain: {chainId === 43113 ? "Avalanche Fuji" : `Unknown (${chainId})`}
        </div>
      </div>
    </div>
  );
}

export function WalletRequiredMessage({
  children,
}: {
  children?: React.ReactNode;
}) {
  const { isConnected } = useWallet();

  if (isConnected) return <>{children}</>;

  return (
    <div className="abs-card-brutal bg-yellow-500 text-black text-center p-6">
      <h3 className="text-lg font-black mb-3 uppercase">
        🔒 Wallet Connection Required
      </h3>
      <p className="text-sm font-mono mb-4">
        Connect your wallet to access blockchain features and submit your
        workout to the leaderboard.
      </p>
      <WalletConnectButton variant="primary" />
    </div>
  );
}

export function MobileWalletIndicator() {
  const {
    isConnected,
    address,
    error,
    connectedWallet,
    disconnectWallet,
    isConnecting,
    connectMetaMask,
    connectWalletConnect,
    connectCore,
    clearError,
  } = useWallet();
  const [showMobileOptions, setShowMobileOptions] = useState(false);

  const handleConnect = async (
    walletType: "metamask" | "walletconnect" | "core"
  ) => {
    clearError();
    try {
      switch (walletType) {
        case "metamask":
          await connectMetaMask();
          break;
        case "walletconnect":
          await connectWalletConnect();
          break;
        case "core":
          await connectCore();
          break;
      }
      setShowMobileOptions(false);
    } catch (error) {
      console.error("Mobile wallet connection failed:", error);
    }
  };

  if (error) {
    return (
      <div className="text-right">
        <div className="text-xs font-bold text-red-600">WALLET ERROR</div>
        <div className="text-xs text-red-500">● FAILED</div>
      </div>
    );
  }

  if (isConnected) {
    const walletName =
      connectedWallet === "metamask"
        ? "METAMASK"
        : connectedWallet === "core"
        ? "CORE"
        : connectedWallet === "walletconnect"
        ? "WC"
        : "WALLET";
    return (
      <div className="relative">
        <button
          onClick={() => setShowMobileOptions(!showMobileOptions)}
          className="text-right"
        >
          <div className="text-xs font-bold text-gray-600">
            <ENSDisplay address={address} />
          </div>
          <div className="text-xs text-green-600">● {walletName}</div>
        </button>

        {showMobileOptions && (
          <>
            <div
              className="fixed inset-0 bg-black bg-opacity-50 z-40"
              onClick={() => setShowMobileOptions(false)}
            />
            <div className="absolute top-full right-0 mt-2 bg-white border-4 border-black z-50 min-w-32">
              <button
                onClick={() => {
                  disconnectWallet();
                  setShowMobileOptions(false);
                }}
                className="w-full text-left px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50"
              >
                DISCONNECT
              </button>
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setShowMobileOptions(!showMobileOptions)}
        disabled={isConnecting}
        className="text-right"
      >
        <div className="text-xs font-bold text-gray-600">
          {isConnecting ? "CONNECTING..." : "AVALANCHE"}
        </div>
        <div className="text-xs text-yellow-600">
          ● {isConnecting ? "WAIT" : "CONNECT"}
        </div>
      </button>

      {showMobileOptions && !isConnected && (
        <>
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-40"
            onClick={() => setShowMobileOptions(false)}
          />
          <div className="absolute top-full right-0 mt-2 bg-white border-4 border-black z-50 min-w-40">
            <div className="p-2 space-y-2">
              <button
                onClick={() => handleConnect("metamask")}
                disabled={isConnecting}
                className="w-full text-left px-3 py-2 text-xs font-bold bg-orange-500 text-white hover:bg-orange-600"
              >
                🦊 METAMASK
              </button>
              <button
                onClick={() => handleConnect("core")}
                disabled={isConnecting}
                className="w-full text-left px-3 py-2 text-xs font-bold bg-red-600 text-white hover:bg-red-700"
              >
                🏔️ CORE
              </button>
              <button
                onClick={() => handleConnect("walletconnect")}
                disabled={isConnecting}
                className="w-full text-left px-3 py-2 text-xs font-bold bg-blue-600 text-white hover:bg-blue-700"
              >
                🔗 WALLETCONNECT
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
