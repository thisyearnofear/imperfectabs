"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import { ethers } from "ethers";
import { connectWallet as connectWalletLib } from "../lib/contract";
import { CONTRACT_CONFIG } from "../lib/contractIntegration";
import EthereumProvider from "@walletconnect/ethereum-provider";
import { QRCodeDisplay } from "../components/WalletConnectModal";
import {
  processWalletConnection,
  saveWalletConnection,
  parseWalletError,
} from "../utils/walletUtils";
import {
  cleanupWalletConnect,
  getWalletConnectProvider,
  createConnectionTimeout,
  forceDisconnectAllSessions,
} from "../utils/walletConnectUtils";

interface WalletState {
  isConnected: boolean;
  address: string;
  isConnecting: boolean;
  error: string | null;
  provider: ethers.providers.Web3Provider | null;
  signer: ethers.Signer | null;
  chainId: number | null;
  balance: string;
  connectedWallet: "metamask" | "walletconnect" | "core" | null;
}

interface WalletContextType extends WalletState {
  connectWallet: (
    walletType?: "metamask" | "walletconnect" | "core"
  ) => Promise<void>;
  disconnectWallet: () => void;
  clearError: () => void;
  checkConnection: () => Promise<void>;
  connectMetaMask: () => Promise<void>;
  connectWalletConnect: () => Promise<void>;
  connectCore: () => Promise<void>;
  switchNetwork: (chainId: number) => Promise<void>;
}

const initialState: WalletState = {
  isConnected: false,
  address: "",
  isConnecting: false,
  error: null,
  provider: null,
  signer: null,
  chainId: null,
  balance: "0.0",
  connectedWallet: null,
};

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export const useWallet = (): WalletContextType => {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error("useWallet must be used within a WalletProvider");
  }
  return context;
};

interface WalletProviderProps {
  children: ReactNode;
}

export const WalletProvider: React.FC<WalletProviderProps> = ({ children }) => {
  const [state, setState] = useState<WalletState>(initialState);
  const [walletConnectProvider, setWalletConnectProvider] =
    useState<EthereumProvider | null>(null);

  // WalletConnect modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalUri, setModalUri] = useState<string | null>(null);
  const [isModalConnecting, setIsModalConnecting] = useState(false);

  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  const updateBalance = useCallback(
    async (provider: ethers.providers.Web3Provider, address: string) => {
      try {
        // Wait a bit for network to stabilize
        await new Promise((resolve) => setTimeout(resolve, 500));

        // Force provider to detect current network before balance fetch
        await provider.detectNetwork();

        const balance = await provider.getBalance(address);
        const balanceFormatted = ethers.utils.formatEther(balance);
        setState((prev) => ({
          ...prev,
          balance: parseFloat(balanceFormatted).toFixed(4),
        }));
      } catch (error) {
        console.error("Failed to fetch balance:", error);
        // Don't throw error, just log it - balance fetch shouldn't break the app
      }
    },
    []
  );

  const connectMetaMask = useCallback(async () => {
    try {
      if (!window.ethereum) {
        throw new Error(
          "MetaMask not detected. Please install MetaMask to connect your wallet."
        );
      }

      const signer = await connectWalletLib();
      const provider = signer.provider as ethers.providers.Web3Provider;

      const walletState = await processWalletConnection(
        provider,
        signer,
        "metamask"
      );
      setState((prev) => ({ ...prev, ...walletState }));

      await updateBalance(provider, walletState.address);
      saveWalletConnection(walletState.address, "metamask");
    } catch (error: unknown) {
      throw error;
    }
  }, [updateBalance]);

  const connectWalletConnect = useCallback(async () => {
    try {
      console.log("🔗 Starting WalletConnect connection...");

      const projectId = process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID;
      if (!projectId) {
        throw new Error("WalletConnect Project ID not configured");
      }

      // Clean up existing provider
      await cleanupWalletConnect({
        provider: walletConnectProvider || undefined,
        clearLocalStorage: true,
        clearGlobalProvider: true,
      });
      setWalletConnectProvider(null);

      // Clear modal state
      setIsModalOpen(false);
      setModalUri(null);
      setIsModalConnecting(false);

      // Get or create provider using singleton pattern
      const wcProvider = await getWalletConnectProvider(projectId);
      setWalletConnectProvider(wcProvider);

      // Set up fresh event listeners
      wcProvider.on("display_uri", (uri: string) => {
        console.log("📱 URI received:", uri);
        setModalUri(uri);
        setIsModalOpen(true);
      });

      wcProvider.on("connect", () => {
        console.log("🎉 Connected");
        setIsModalConnecting(true);
      });

      wcProvider.on("disconnect", () => {
        console.log("👋 Disconnected");
        setIsModalOpen(false);
        setModalUri(null);
        setIsModalConnecting(false);
      });

      // Show modal and enable with timeout
      setIsModalOpen(true);

      const connectionTimeout = createConnectionTimeout(() => {
        setIsModalOpen(false);
        setModalUri(null);
        setIsModalConnecting(false);
      });

      try {
        await wcProvider.enable();
        clearTimeout(connectionTimeout);
      } catch (error) {
        clearTimeout(connectionTimeout);
        throw error;
      }

      const ethersProvider = new ethers.providers.Web3Provider(wcProvider);
      const signer = ethersProvider.getSigner();

      const walletState = await processWalletConnection(
        ethersProvider,
        signer,
        "walletconnect"
      );
      setState((prev) => ({ ...prev, ...walletState }));

      await updateBalance(ethersProvider, walletState.address);
      saveWalletConnection(walletState.address, "walletconnect");

      setIsModalOpen(false);
      setModalUri(null);
      setIsModalConnecting(false);
    } catch (error: unknown) {
      setIsModalOpen(false);
      setModalUri(null);
      setIsModalConnecting(false);
      throw error;
    }
  }, [updateBalance, walletConnectProvider]);

  // Cleanup on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      if (walletConnectProvider) {
        try {
          walletConnectProvider.removeListener("display_uri", () => {});
          walletConnectProvider.removeListener("connect", () => {});
          walletConnectProvider.removeListener("disconnect", () => {});
        } catch (e) {
          console.log("Cleanup on unmount error (expected):", e);
        }
      }
    };
  }, [walletConnectProvider]);

  const connectCore = useCallback(async () => {
    try {
      // Core Wallet detection
      if (
        !window.ethereum ||
        !(window.ethereum as unknown as { isAvalanche?: boolean }).isAvalanche
      ) {
        throw new Error(
          "Core Wallet not detected. Please install Core Wallet to connect."
        );
      }

      await window.ethereum.request({ method: "eth_requestAccounts" });
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();
      const network = await provider.getNetwork();

      // Ensure we're on Avalanche network
      if (network.chainId !== 43113) {
        await window.ethereum.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: "0xA869" }],
        });
      }

      const walletState = await processWalletConnection(
        provider,
        signer,
        "core"
      );
      setState((prev) => ({ ...prev, ...walletState }));

      await updateBalance(provider, walletState.address);
      saveWalletConnection(walletState.address, "core");
    } catch (error: unknown) {
      throw error;
    }
  }, [updateBalance]);

  const connectWallet = useCallback(
    async (walletType?: "metamask" | "walletconnect" | "core") => {
      if (state.isConnecting) return;

      setState((prev) => ({ ...prev, isConnecting: true, error: null }));

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
          default:
            // Try MetaMask first, then Core, then WalletConnect
            try {
              await connectMetaMask();
            } catch {
              try {
                await connectCore();
              } catch {
                await connectWalletConnect();
              }
            }
        }
      } catch (error: unknown) {
        const errorMessage = parseWalletError(error);

        setState((prev) => ({
          ...prev,
          error: errorMessage,
        }));
      } finally {
        setState((prev) => ({ ...prev, isConnecting: false }));
      }
    },
    [state.isConnecting, connectMetaMask, connectWalletConnect, connectCore]
  );

  const switchNetwork = useCallback(
    async (chainId: number) => {
      if (!state.provider) {
        setState((prev) => ({ ...prev, error: "Wallet not connected" }));
        return;
      }

      console.log(`🔄 Attempting to switch to network ${chainId}...`);
      const chainIdHex = `0x${chainId.toString(16)}`;

      try {
        // Clear any previous errors
        setState((prev) => ({ ...prev, error: null }));

        // For WalletConnect, we might need to handle differently
        if (state.connectedWallet === "walletconnect") {
          console.log("🔗 Switching network via WalletConnect...");
          // WalletConnect might need special handling
          await state.provider.send("wallet_switchEthereumChain", [
            { chainId: chainIdHex },
          ]);
        } else {
          // For MetaMask and Core
          console.log("🦊 Switching network via browser wallet...");
          await state.provider.send("wallet_switchEthereumChain", [
            { chainId: chainIdHex },
          ]);
        }

        console.log(`✅ Successfully switched to network ${chainId}`);

        // Update the chain ID in state
        setState((prev) => ({ ...prev, chainId }));
      } catch (switchError: unknown) {
        console.error("❌ Network switch error:", switchError);

        // This error code indicates that the chain has not been added to MetaMask.
        if ((switchError as { code: number }).code === 4902) {
          console.log("🔧 Network not found, attempting to add...");
          try {
            await state.provider.send("wallet_addEthereumChain", [
              {
                chainId: chainIdHex,
                chainName: "Avalanche Fuji C-Chain",
                nativeCurrency: {
                  name: "Avalanche",
                  symbol: "AVAX",
                  decimals: 18,
                },
                rpcUrls: [CONTRACT_CONFIG.rpcUrl],
                blockExplorerUrls: [CONTRACT_CONFIG.explorerUrl],
              },
            ]);
            console.log("✅ Network added successfully");
            setState((prev) => ({ ...prev, chainId }));
          } catch (addError) {
            console.error("❌ Failed to add network:", addError);
            setState((prev) => ({
              ...prev,
              error: "Failed to add the network. Please add it manually.",
            }));
          }
        } else {
          const errorMessage =
            (switchError as Error).message || "Failed to switch network";
          setState((prev) => ({
            ...prev,
            error: errorMessage,
          }));
        }
      }
    },
    [state.provider, state.connectedWallet]
  );

  const disconnectWallet = useCallback(async () => {
    // Force disconnect WalletConnect if active
    if (walletConnectProvider) {
      try {
        await forceDisconnectAllSessions(walletConnectProvider);
        await cleanupWalletConnect({
          provider: walletConnectProvider,
          clearLocalStorage: true,
          clearGlobalProvider: true,
        });
      } catch (e) {
        console.log("WalletConnect disconnect cleanup error:", e);
      }
      setWalletConnectProvider(null);
    }

    setState(initialState);
    localStorage.removeItem("walletConnected");
    localStorage.removeItem("walletAddress");
    localStorage.removeItem("connectedWallet");

    // Clear modal state
    setIsModalOpen(false);
    setModalUri(null);
    setIsModalConnecting(false);
  }, [walletConnectProvider]);

  const checkConnection = useCallback(async () => {
    try {
      const connectedWallet = localStorage.getItem("connectedWallet") as
        | "metamask"
        | "walletconnect"
        | "core"
        | null;
      const wasConnected = localStorage.getItem("walletConnected");

      if (wasConnected !== "true" || !connectedWallet) return;

      switch (connectedWallet) {
        case "metamask":
        case "core":
          if (!window.ethereum) return;
          const accounts = (await window.ethereum.request({
            method: "eth_accounts",
          })) as string[];
          if (accounts.length > 0) {
            const provider = new ethers.providers.Web3Provider(window.ethereum);
            const signer = provider.getSigner();
            const network = await provider.getNetwork();

            setState((prev) => ({
              ...prev,
              isConnected: true,
              address: accounts[0],
              provider,
              signer,
              chainId: network.chainId,
              connectedWallet,
            }));

            await updateBalance(provider, accounts[0]);
          }
          break;

        case "walletconnect":
          // WalletConnect auto-reconnection would be handled by the provider
          // For now, we'll prompt user to reconnect
          break;
      }
    } catch (error) {
      console.error("Failed to check wallet connection:", error);
    }
  }, [updateBalance]);

  // Check for existing connection on mount
  useEffect(() => {
    const wasConnected = localStorage.getItem("walletConnected");
    if (wasConnected === "true") {
      checkConnection();
    }
  }, [checkConnection]);

  // Listen for account changes
  useEffect(() => {
    if (!window.ethereum) return;

    const handleAccountsChanged = (...args: unknown[]) => {
      const accounts = args[0] as string[];
      if (accounts.length === 0) {
        disconnectWallet();
      } else if (accounts[0] !== state.address) {
        checkConnection();
      }
    };

    const handleChainChanged = () => {
      checkConnection();
    };

    const handleDisconnect = () => {
      disconnectWallet();
    };

    (
      window.ethereum as unknown as {
        on: (event: string, handler: (...args: unknown[]) => void) => void;
      }
    ).on("accountsChanged", handleAccountsChanged);
    (
      window.ethereum as unknown as {
        on: (event: string, handler: (...args: unknown[]) => void) => void;
      }
    ).on("chainChanged", handleChainChanged);
    (
      window.ethereum as unknown as {
        on: (event: string, handler: (...args: unknown[]) => void) => void;
      }
    ).on("disconnect", handleDisconnect);

    return () => {
      if (
        (
          window.ethereum as unknown as {
            removeListener?: (
              event: string,
              handler: (...args: unknown[]) => void
            ) => void;
          }
        )?.removeListener
      ) {
        (
          window.ethereum as unknown as {
            removeListener: (
              event: string,
              handler: (...args: unknown[]) => void
            ) => void;
          }
        ).removeListener("accountsChanged", handleAccountsChanged);
        (
          window.ethereum as unknown as {
            removeListener: (
              event: string,
              handler: (...args: unknown[]) => void
            ) => void;
          }
        ).removeListener("chainChanged", handleChainChanged);
        (
          window.ethereum as unknown as {
            removeListener: (
              event: string,
              handler: (...args: unknown[]) => void
            ) => void;
          }
        ).removeListener("disconnect", handleDisconnect);
      }
    };
  }, [state.address, checkConnection, disconnectWallet]);

  // Auto-refresh balance every 30 seconds when connected
  useEffect(() => {
    if (!state.isConnected || !state.provider || !state.address) return;

    const interval = setInterval(() => {
      updateBalance(state.provider!, state.address);
    }, 30000);

    return () => clearInterval(interval);
  }, [state.isConnected, state.provider, state.address, updateBalance]);

  // Listen for network changes
  useEffect(() => {
    if (!state.provider || !window.ethereum) return;

    const handleChainChanged = async (chainId: string) => {
      const newChainId = parseInt(chainId, 16);
      console.log(`🔄 Network changed to: ${newChainId}`);

      // Always recreate provider to avoid NETWORK_ERROR
      try {
        // Add a small delay to let the network change settle
        await new Promise((resolve) => setTimeout(resolve, 500));

        const newProvider = new ethers.providers.Web3Provider(
          window.ethereum!,
          "any"
        );
        await newProvider.detectNetwork(); // Force network detection
        const newSigner = newProvider.getSigner();

        setState((prev) => ({
          ...prev,
          chainId: newChainId,
          provider: newProvider,
          signer: newSigner,
          error: null, // Clear any previous errors
        }));

        // Update balance for new network if user is connected
        if (state.address) {
          try {
            await updateBalance(newProvider, state.address);
          } catch (balanceError) {
            console.warn(
              "Could not update balance after network change:",
              balanceError
            );
          }
        }
      } catch (error) {
        console.error("Error handling network change:", error);
        // Set a user-friendly error state
        setState((prev) => ({
          ...prev,
          chainId: newChainId,
          error:
            "Network changed. Please refresh the page if you experience issues.",
        }));
      }
    };

    const handleAccountsChanged = (accounts: string[]) => {
      if (accounts.length === 0) {
        // User disconnected
        disconnectWallet();
      } else if (accounts[0] !== state.address) {
        // User switched accounts
        console.log(`👤 Account changed to: ${accounts[0]}`);
        setState((prev) => ({ ...prev, address: accounts[0] }));
        updateBalance(state.provider!, accounts[0]);
      }
    };

    // Add event listeners (with proper typing)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ethereum = window.ethereum as any;
    if (ethereum?.on) {
      ethereum.on("chainChanged", handleChainChanged);
      ethereum.on("accountsChanged", handleAccountsChanged);
    }

    return () => {
      // Clean up event listeners
      if (ethereum?.removeListener) {
        ethereum.removeListener("chainChanged", handleChainChanged);
        ethereum.removeListener("accountsChanged", handleAccountsChanged);
      }
    };
  }, [state.provider, state.address, updateBalance, disconnectWallet]);

  const contextValue: WalletContextType = {
    ...state,
    connectWallet,
    disconnectWallet,
    clearError,
    checkConnection,
    connectMetaMask,
    connectWalletConnect,
    connectCore,
    switchNetwork,
  };

  return (
    <WalletContext.Provider value={contextValue}>
      {children}
      {/* WalletConnect Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black bg-opacity-75 backdrop-blur-sm"
            onClick={() => {
              setIsModalOpen(false);
              setModalUri(null);
              setIsModalConnecting(false);
            }}
          />
          <div
            className="relative w-full max-w-md mx-4 bg-white border-8 border-black"
            style={{ boxShadow: "1rem 1rem 0 0 black" }}
          >
            <div className="bg-black text-white p-6 relative">
              <button
                onClick={() => {
                  setIsModalOpen(false);
                  setModalUri(null);
                  setIsModalConnecting(false);
                }}
                className="absolute top-4 right-4 text-white hover:text-gray-300 text-2xl font-bold"
              >
                ✕
              </button>
              <h2 className="text-2xl font-black uppercase">
                Connect Your Wallet
              </h2>
              <p className="text-sm font-mono mt-2">
                {isModalConnecting
                  ? "Approve connection in your wallet"
                  : "Scan QR code with your mobile wallet"}
              </p>
            </div>
            <div className="p-6 text-center">
              {isModalConnecting ? (
                <div className="py-8">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 border-4 border-green-600 rounded-full mb-4">
                    <div className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin"></div>
                  </div>
                  <h3 className="text-lg font-black uppercase mb-2">
                    Connecting...
                  </h3>
                </div>
              ) : (
                <div>
                  {/* QR Code Display */}
                  <div className="mb-6">
                    {modalUri ? (
                      <div className="inline-block p-4 bg-white border-4 border-black">
                        <QRCodeDisplay
                          value={modalUri}
                          size={256}
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
                  <div className="mb-6">
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

                  <button
                    onClick={() => {
                      setIsModalOpen(false);
                      setModalUri(null);
                      setIsModalConnecting(false);
                    }}
                    className="abs-btn-primary bg-gray-600 text-white px-4 py-2"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </WalletContext.Provider>
  );
};

// Hook for wallet connection status
export const useWalletConnection = () => {
  const { isConnected, address, isConnecting } = useWallet();
  return { isConnected, address, isConnecting };
};

// Hook for wallet actions
export const useWalletActions = () => {
  const { connectWallet, disconnectWallet, clearError } = useWallet();
  return { connectWallet, disconnectWallet, clearError };
};

// Hook for wallet data
export const useWalletData = () => {
  const { provider, signer, chainId, balance, error } = useWallet();
  return { provider, signer, chainId, balance, error };
};
