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
    localStorage.removeItem("walletconnect");
    localStorage.removeItem("wc@2:client:0.3//session");
    localStorage.removeItem("wc@2:core:0.3//keychain");
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
 * Comprehensive WalletConnect cleanup
 */
export async function cleanupWalletConnect(options: WalletConnectCleanupOptions = {}): Promise<void> {
  const { provider, clearLocalStorage = true, clearGlobalProvider = true } = options;

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

  // Clean up global provider
  if (clearGlobalProvider) {
    await cleanupGlobalWalletConnectProvider();
  }
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
      chains: [43113], // Avalanche Fuji
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
