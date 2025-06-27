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
import EthereumProvider from "@walletconnect/ethereum-provider";
import { QRCodeDisplay } from "../components/WalletConnectModal";

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
    walletType?: "metamask" | "walletconnect" | "core",
  ) => Promise<void>;
  disconnectWallet: () => void;
  clearError: () => void;
  checkConnection: () => Promise<void>;
  connectMetaMask: () => Promise<void>;
  connectWalletConnect: () => Promise<void>;
  connectCore: () => Promise<void>;
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
        const balance = await provider.getBalance(address);
        const balanceFormatted = ethers.utils.formatEther(balance);
        setState((prev) => ({
          ...prev,
          balance: parseFloat(balanceFormatted).toFixed(4),
        }));
      } catch (error) {
        console.error("Failed to fetch balance:", error);
      }
    },
    [],
  );

  const connectMetaMask = useCallback(async () => {
    try {
      if (!window.ethereum) {
        throw new Error(
          "MetaMask not detected. Please install MetaMask to connect your wallet.",
        );
      }

      const signer = await connectWalletLib();
      const provider = signer.provider as ethers.providers.Web3Provider;
      const address = await signer.getAddress();
      const network = await provider.getNetwork();

      setState((prev) => ({
        ...prev,
        isConnected: true,
        address,
        provider,
        signer,
        chainId: network.chainId,
        connectedWallet: "metamask",
        error: null,
      }));

      await updateBalance(provider, address);
      localStorage.setItem("walletConnected", "true");
      localStorage.setItem("walletAddress", address);
      localStorage.setItem("connectedWallet", "metamask");
    } catch (error: unknown) {
      throw error;
    }
  }, [updateBalance]);

  const connectWalletConnect = useCallback(async () => {
    try {
      const projectId = process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID;
      if (!projectId) {
        throw new Error("WalletConnect Project ID not configured");
      }

      const wcProvider = await EthereumProvider.init({
        projectId,
        chains: [43113], // Avalanche Fuji
        showQrModal: false, // We'll handle our own modal
        metadata: {
          name: "Imperfect Abs",
          description: "AI-Powered Core Workout Tracker",
          url: window.location.origin,
          icons: ["https://walletconnect.com/walletconnect-logo.png"],
        },
      });

      // Get the connection URI for our custom modal
      const uri = (wcProvider as unknown as { connector?: { uri?: string } })
        .connector?.uri;
      if (uri) {
        setModalUri(uri);
        setIsModalOpen(true);
      }

      // Set up event listeners
      wcProvider.on("display_uri", (uri: string) => {
        setModalUri(uri);
        setIsModalOpen(true);
      });

      wcProvider.on("connect", () => {
        setIsModalConnecting(true);
      });

      wcProvider.on("disconnect", () => {
        setIsModalOpen(false);
        setModalUri(null);
        setIsModalConnecting(false);
      });

      await wcProvider.enable();
      setIsModalConnecting(true);
      setWalletConnectProvider(wcProvider);

      const ethersProvider = new ethers.providers.Web3Provider(wcProvider);
      const signer = ethersProvider.getSigner();
      const address = await signer.getAddress();
      const network = await ethersProvider.getNetwork();

      setState((prev) => ({
        ...prev,
        isConnected: true,
        address,
        provider: ethersProvider,
        signer,
        chainId: network.chainId,
        connectedWallet: "walletconnect",
        error: null,
      }));

      await updateBalance(ethersProvider, address);
      localStorage.setItem("walletConnected", "true");
      localStorage.setItem("walletAddress", address);
      localStorage.setItem("connectedWallet", "walletconnect");

      setIsModalOpen(false);
      setModalUri(null);
      setIsModalConnecting(false);
    } catch (error: unknown) {
      setIsModalOpen(false);
      setModalUri(null);
      setIsModalConnecting(false);
      throw error;
    }
  }, [updateBalance]);

  const connectCore = useCallback(async () => {
    try {
      // Core Wallet detection
      if (
        !window.ethereum ||
        !(window.ethereum as unknown as { isAvalanche?: boolean }).isAvalanche
      ) {
        throw new Error(
          "Core Wallet not detected. Please install Core Wallet to connect.",
        );
      }

      await window.ethereum.request({ method: "eth_requestAccounts" });
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();
      const address = await signer.getAddress();
      const network = await provider.getNetwork();

      // Ensure we're on Avalanche network
      if (network.chainId !== 43113) {
        await window.ethereum.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: "0xA869" }],
        });
      }

      setState((prev) => ({
        ...prev,
        isConnected: true,
        address,
        provider,
        signer,
        chainId: network.chainId,
        connectedWallet: "core",
        error: null,
      }));

      await updateBalance(provider, address);
      localStorage.setItem("walletConnected", "true");
      localStorage.setItem("walletAddress", address);
      localStorage.setItem("connectedWallet", "core");
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
        let errorMessage = "Failed to connect wallet";

        if ((error as { code?: number }).code === 4001) {
          errorMessage = "Connection rejected by user";
        } else if ((error as { code?: number }).code === -32002) {
          errorMessage = "Connection request already pending";
        } else if ((error as { message?: string }).message) {
          errorMessage = (error as { message: string }).message;
        }

        setState((prev) => ({
          ...prev,
          error: errorMessage,
        }));
      } finally {
        setState((prev) => ({ ...prev, isConnecting: false }));
      }
    },
    [state.isConnecting, connectMetaMask, connectWalletConnect, connectCore],
  );

  const disconnectWallet = useCallback(async () => {
    // Disconnect WalletConnect if active
    if (walletConnectProvider) {
      await walletConnectProvider.disconnect();
      setWalletConnectProvider(null);
    }

    setState(initialState);
    localStorage.removeItem("walletConnected");
    localStorage.removeItem("walletAddress");
    localStorage.removeItem("connectedWallet");
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
              handler: (...args: unknown[]) => void,
            ) => void;
          }
        )?.removeListener
      ) {
        (
          window.ethereum as unknown as {
            removeListener: (
              event: string,
              handler: (...args: unknown[]) => void,
            ) => void;
          }
        ).removeListener("accountsChanged", handleAccountsChanged);
        (
          window.ethereum as unknown as {
            removeListener: (
              event: string,
              handler: (...args: unknown[]) => void,
            ) => void;
          }
        ).removeListener("chainChanged", handleChainChanged);
        (
          window.ethereum as unknown as {
            removeListener: (
              event: string,
              handler: (...args: unknown[]) => void,
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

  const contextValue: WalletContextType = {
    ...state,
    connectWallet,
    disconnectWallet,
    clearError,
    checkConnection,
    connectMetaMask,
    connectWalletConnect,
    connectCore,
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
