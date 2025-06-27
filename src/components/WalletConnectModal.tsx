"use client";

import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import QRCode from "qrcode";

interface WalletConnectModalProps {
  isOpen: boolean;
  onCloseAction: () => void;
  uri: string | null;
  isConnecting: boolean;
}

export default function WalletConnectModal({
  isOpen,
  onCloseAction,
  uri,
  isConnecting,
}: WalletConnectModalProps) {
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>("");
  const [isCopied, setIsCopied] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);

  // Generate QR code when URI changes
  useEffect(() => {
    if (uri) {
      QRCode.toDataURL(uri, {
        width: 300,
        margin: 2,
        color: {
          dark: "#000000",
          light: "#ffffff",
        },
      })
        .then(setQrCodeDataUrl)
        .catch((error) => {
          console.error("Failed to generate QR code:", error);
        });
    }
  }, [uri]);

  // Copy URI to clipboard
  const copyToClipboard = async () => {
    if (!uri) return;

    try {
      await navigator.clipboard.writeText(uri);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy to clipboard:", error);
    }
  };

  // Handle escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onCloseAction();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onCloseAction]);

  // Popular mobile wallet apps
  const walletApps = [
    {
      name: "MetaMask",
      icon: "🦊",
      deepLink: uri
        ? `https://metamask.app.link/wc?uri=${encodeURIComponent(uri)}`
        : "",
    },
    {
      name: "Rainbow",
      icon: "🌈",
      deepLink: uri
        ? `https://rnbwapp.com/wc?uri=${encodeURIComponent(uri)}`
        : "",
    },
    {
      name: "Trust Wallet",
      icon: "🛡️",
      deepLink: uri
        ? `https://link.trustwallet.com/wc?uri=${encodeURIComponent(uri)}`
        : "",
    },
    {
      name: "Coinbase Wallet",
      icon: "💙",
      deepLink: uri
        ? `https://go.cb-w.com/wc?uri=${encodeURIComponent(uri)}`
        : "",
    },
    {
      name: "Core Wallet",
      icon: "🏔️",
      deepLink: uri
        ? `https://wallet.avax.network/wc?uri=${encodeURIComponent(uri)}`
        : "",
    },
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black bg-opacity-75 backdrop-blur-sm"
        onClick={onCloseAction}
      />

      {/* Modal Content */}
      <div
        ref={modalRef}
        className="relative w-full max-w-md mx-4 bg-white border-8 border-black"
        style={{ boxShadow: "1rem 1rem 0 0 black" }}
      >
        {/* Header */}
        <div className="bg-black text-white p-6 relative">
          <button
            onClick={onCloseAction}
            className="absolute top-4 right-4 text-white hover:text-gray-300 text-2xl font-bold"
          >
            ✕
          </button>
          <h2 className="text-2xl font-black uppercase">Connect Your Wallet</h2>
          <p className="text-sm font-mono mt-2">
            Scan QR code with your mobile wallet
          </p>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Connection Status */}
          {isConnecting ? (
            <div className="text-center py-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 border-4 border-green-600 rounded-full mb-4">
                <div className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin"></div>
              </div>
              <h3 className="text-lg font-black uppercase mb-2">
                Connecting...
              </h3>
              <p className="text-sm text-gray-600 font-mono">
                Approve connection in your wallet
              </p>
            </div>
          ) : (
            <>
              {/* QR Code Section */}
              <div className="text-center mb-6">
                {qrCodeDataUrl ? (
                  <div className="inline-block p-4 bg-white border-4 border-black">
                    <Image
                      src={qrCodeDataUrl}
                      alt="WalletConnect QR Code"
                      width={256}
                      height={256}
                      className="mx-auto"
                    />
                  </div>
                ) : (
                  <div className="inline-flex items-center justify-center w-64 h-64 bg-gray-100 border-4 border-black">
                    <div className="text-center">
                      <div className="w-8 h-8 border-4 border-gray-400 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                      <p className="text-sm text-gray-600 font-mono">
                        Generating QR Code...
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Instructions */}
              <div className="text-center mb-6">
                <h3 className="text-lg font-black uppercase mb-2">
                  How to Connect:
                </h3>
                <ol className="text-sm text-gray-700 font-mono text-left space-y-1">
                  <li>1. Open your mobile wallet app</li>
                  <li>2. Tap &quot;WalletConnect&quot; or scan QR code</li>
                  <li>3. Point camera at QR code above</li>
                  <li>4. Approve connection in your wallet</li>
                </ol>
              </div>

              {/* Quick Connect Buttons */}
              <div className="mb-6">
                <h4 className="text-sm font-bold uppercase mb-3 text-center">
                  Or open directly in:
                </h4>
                <div className="grid grid-cols-2 gap-2">
                  {walletApps.map((wallet) => (
                    <a
                      key={wallet.name}
                      href={wallet.deepLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center p-3 border-2 border-black bg-gray-50 hover:bg-gray-100 transition-colors font-mono text-sm"
                      style={{ boxShadow: "0.25rem 0.25rem 0 0 black" }}
                    >
                      <span className="mr-2">{wallet.icon}</span>
                      {wallet.name}
                    </a>
                  ))}
                </div>
              </div>

              {/* Copy URI Button */}
              {uri && (
                <div className="text-center">
                  <button
                    onClick={copyToClipboard}
                    className="abs-btn-primary bg-blue-600 text-white px-4 py-2 text-sm"
                  >
                    {isCopied ? "✓ COPIED!" : "📋 COPY URI"}
                  </button>
                  <p className="text-xs text-gray-500 mt-2 font-mono">
                    Copy connection URI to paste in wallet manually
                  </p>
                </div>
              )}
            </>
          )}

          {/* Footer */}
          <div className="mt-6 pt-4 border-t-2 border-gray-200 text-center">
            <p className="text-xs text-gray-500 font-mono">
              Don&apos;t have a wallet?{" "}
              <a
                href="https://ethereum.org/en/wallets/find-wallet/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                Get one here
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Hook for WalletConnect modal state
export function useWalletConnectModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [uri, setUri] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  const openModal = (connectionUri: string) => {
    setUri(connectionUri);
    setIsOpen(true);
    setIsConnecting(false);
  };

  const closeModal = () => {
    setIsOpen(false);
    setUri(null);
    setIsConnecting(false);
  };

  const setConnecting = (connecting: boolean) => {
    setIsConnecting(connecting);
  };

  return {
    isOpen,
    uri,
    isConnecting,
    openModal,
    closeModal,
    setConnecting,
  };
}

// Utility component for mobile detection
export function isMobile() {
  if (typeof window === "undefined") return false;

  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent,
  );
}

// Alternative QR code component with fallback
interface QRCodeDisplayProps {
  value: string;
  size?: number;
  className?: string;
}

export function QRCodeDisplay({
  value,
  size = 256,
  className = "",
}: QRCodeDisplayProps) {
  const [qrCodeUrl, setQrCodeUrl] = useState<string>("");
  const [error, setError] = useState<string>("");

  useEffect(() => {
    if (!value) return;

    QRCode.toDataURL(value, {
      width: size,
      margin: 2,
      color: {
        dark: "#000000",
        light: "#ffffff",
      },
    })
      .then(setQrCodeUrl)
      .catch((err) => {
        console.error("QR Code generation failed:", err);
        setError("Failed to generate QR code");
      });
  }, [value, size]);

  if (error) {
    return (
      <div
        className={`flex items-center justify-center bg-gray-100 border-2 border-gray-300 ${className}`}
        style={{ width: size, height: size }}
      >
        <span className="text-gray-500 text-sm">QR Error</span>
      </div>
    );
  }

  if (!qrCodeUrl) {
    return (
      <div
        className={`flex items-center justify-center bg-gray-100 border-2 border-gray-300 ${className}`}
        style={{ width: size, height: size }}
      >
        <div className="w-6 h-6 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <Image
      src={qrCodeUrl}
      alt="QR Code"
      width={size}
      height={size}
      className={className}
    />
  );
}
