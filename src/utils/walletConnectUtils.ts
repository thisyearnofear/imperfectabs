import EthereumProvider from "@walletconnect/ethereum-provider";

export interface WalletConnectCleanupOptions {
  provider?: EthereumProvider;
  clearLocalStorage?: boolean;
  clearGlobalProvider?: boolean;
}

/**
 * Clean up WalletConnect event listeners
 */
export function cleanupWalletConnectListeners(provider: EthereumProvider): void {
  try {
    provider.removeListener("display_uri", () => {});
    provider.removeListener("connect", () => {});
    provider.removeListener("disconnect", () => {});
  } catch (e) {
    console.log("Listener cleanup error (expected):", e);
  }
}

/**
 * Clean up WalletConnect localStorage data
 */
export function cleanupWalletConnectStorage(): void {
  try {
    // Clear all WalletConnect related localStorage keys
    const keysToRemove = [
      "walletconnect",
      "wc@2:client:0.3//session",
      "wc@2:core:0.3//keychain",
      "wc@2:core:0.3//messages",
      "wc@2:core:0.3//publisher",
      "wc@2:core:0.3//subscriber",
      "wc@2:universal_provider:/optionalNamespaces",
      "wc@2:universal_provider:/namespaces",
      "wc@2:ethereum_provider:/chainId",
      "wc@2:ethereum_provider:/accounts"
    ];

    keysToRemove.forEach(key => {
      localStorage.removeItem(key);
    });

    // Also clear any keys that start with wc@2:
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('wc@2:') || key.startsWith('walletconnect')) {
        localStorage.removeItem(key);
      }
    });
  } catch (e) {
    console.log("localStorage cleanup error (expected):", e);
  }
}

/**
 * Clean up global WalletConnect provider
 */
export async function cleanupGlobalWalletConnectProvider(): Promise<void> {
  interface WindowWithWC extends Window {
    __walletConnectProvider?: EthereumProvider;
  }
  const windowWithWC = window as WindowWithWC;
  
  if (windowWithWC.__walletConnectProvider) {
    try {
      await windowWithWC.__walletConnectProvider.disconnect();
      cleanupWalletConnectListeners(windowWithWC.__walletConnectProvider);
      delete windowWithWC.__walletConnectProvider;
    } catch (e) {
      console.log("Global provider cleanup error (expected):", e);
    }
  }
}

/**
 * Clean up WalletConnect IndexedDB data
 */
export async function cleanupWalletConnectIndexedDB(): Promise<void> {
  try {
    // Clear WalletConnect IndexedDB databases
    const dbNames = ['walletconnect', 'wc@2:core', 'wc@2:client'];

    for (const dbName of dbNames) {
      try {
        const deleteReq = indexedDB.deleteDatabase(dbName);
        await new Promise((resolve, reject) => {
          deleteReq.onsuccess = () => resolve(undefined);
          deleteReq.onerror = () => reject(deleteReq.error);
          deleteReq.onblocked = () => {
            console.log(`IndexedDB ${dbName} deletion blocked`);
            resolve(undefined);
          };
        });
      } catch (e) {
        console.log(`IndexedDB cleanup error for ${dbName}:`, e);
      }
    }
  } catch (e) {
    console.log("IndexedDB cleanup error (expected):", e);
  }
}

/**
 * Comprehensive WalletConnect cleanup
 */
export async function cleanupWalletConnect(options: WalletConnectCleanupOptions = {}): Promise<void> {
  const { provider, clearLocalStorage = true, clearGlobalProvider = true } = options;

  console.log("🧹 Starting comprehensive WalletConnect cleanup...");

  // Clean up provided provider
  if (provider) {
    try {
      await provider.disconnect();
      cleanupWalletConnectListeners(provider);
    } catch (e) {
      console.log("Provider cleanup error (expected):", e);
    }
  }

  // Clean up localStorage
  if (clearLocalStorage) {
    cleanupWalletConnectStorage();
  }

  // Clean up IndexedDB
  await cleanupWalletConnectIndexedDB();

  // Clean up global provider
  if (clearGlobalProvider) {
    await cleanupGlobalWalletConnectProvider();
  }

  console.log("✅ WalletConnect cleanup complete");
}

/**
 * Get or create WalletConnect provider with singleton pattern
 */
export async function getWalletConnectProvider(projectId: string): Promise<EthereumProvider> {
  interface WindowWithWC extends Window {
    __walletConnectProvider?: EthereumProvider;
  }
  const windowWithWC = window as WindowWithWC;
  let wcProvider = windowWithWC.__walletConnectProvider;

  // Check if existing provider is still valid
  if (wcProvider && wcProvider.session?.expiry && wcProvider.session.expiry < Date.now()) {
    await cleanupWalletConnect({ provider: wcProvider });
    wcProvider = undefined;
  }

  // Create new provider if needed
  if (!wcProvider) {
    wcProvider = await EthereumProvider.init({
      projectId,
      chains: [43113, 43114, 1], // Avalanche Fuji, Avalanche mainnet, Ethereum mainnet
      optionalChains: [43113, 43114, 1], // Include all as optional
      rpcMap: {
        43113: "https://api.avax-test.network/ext/bc/C/rpc", // Fuji testnet
        43114: "https://api.avax.network/ext/bc/C/rpc", // Avalanche mainnet
        1: "https://eth.llamarpc.com" // Ethereum mainnet (for ENS resolution)
      },
      showQrModal: false,
      metadata: {
        name: "Imperfect Abs",
        description: "AI-Powered Core Workout Tracker",
        url: window.location.origin,
        icons: ["https://walletconnect.com/walletconnect-logo.png"],
      },
    });

    // Store globally to prevent re-initialization
    windowWithWC.__walletConnectProvider = wcProvider;
  }

  return wcProvider;
}

/**
 * Force disconnect all WalletConnect sessions
 */
export async function forceDisconnectAllSessions(provider: EthereumProvider): Promise<void> {
  try {
    // Simply call disconnect without parameters - it handles all sessions
    await provider.disconnect();
  } catch (e) {
    console.log("Force disconnect error (expected):", e);
  }
}

/**
 * Nuclear option: Clear ALL WalletConnect data from browser
 */
export async function nuclearCleanupWalletConnect(): Promise<void> {
  console.log("☢️ Nuclear WalletConnect cleanup initiated...");

  try {
    // Clear localStorage
    cleanupWalletConnectStorage();

    // Clear sessionStorage
    Object.keys(sessionStorage).forEach(key => {
      if (key.startsWith('wc@2:') || key.startsWith('walletconnect')) {
        sessionStorage.removeItem(key);
      }
    });

    // Clear IndexedDB
    await cleanupWalletConnectIndexedDB();

    // Clear global provider
    await cleanupGlobalWalletConnectProvider();

    console.log("☢️ Nuclear cleanup complete - all WalletConnect data purged");
  } catch (e) {
    console.log("Nuclear cleanup error:", e);
  }
}

/**
 * Create connection timeout
 */
export function createConnectionTimeout(
  onTimeout: () => void,
  timeoutMs: number = 120000
): NodeJS.Timeout {
  return setTimeout(() => {
    console.log("⏰ Connection timeout");
    onTimeout();
  }, timeoutMs);
}
