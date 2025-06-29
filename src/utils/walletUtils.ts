import { ethers } from 'ethers';

export interface WalletConnectionResult {
  provider: ethers.providers.Web3Provider;
  signer: ethers.Signer;
  address: string;
  chainId: number;
}

export interface WalletStateUpdate {
  isConnected: boolean;
  address: string;
  provider: ethers.providers.Web3Provider;
  signer: ethers.Signer;
  chainId: number;
  connectedWallet: "metamask" | "walletconnect" | "core";
  error: null;
}

/**
 * Common wallet connection result processing
 */
export async function processWalletConnection(
  provider: ethers.providers.Web3Provider,
  signer: ethers.Signer,
  walletType: "metamask" | "walletconnect" | "core"
): Promise<WalletStateUpdate> {
  const address = await signer.getAddress();
  const network = await provider.getNetwork();

  return {
    isConnected: true,
    address,
    provider,
    signer,
    chainId: network.chainId,
    connectedWallet: walletType,
    error: null,
  };
}

/**
 * Save wallet connection to localStorage
 */
export function saveWalletConnection(
  address: string,
  walletType: "metamask" | "walletconnect" | "core"
): void {
  localStorage.setItem("walletConnected", "true");
  localStorage.setItem("walletAddress", address);
  localStorage.setItem("connectedWallet", walletType);
}

/**
 * Clear wallet connection from localStorage
 */
export function clearWalletConnection(): void {
  localStorage.removeItem("walletConnected");
  localStorage.removeItem("walletAddress");
  localStorage.removeItem("connectedWallet");
}

/**
 * Parse wallet connection error
 */
export function parseWalletError(error: unknown): string {
  if ((error as { code?: number }).code === 4001) {
    return "Connection rejected by user";
  }
  if ((error as { code?: number }).code === -32002) {
    return "Connection request already pending";
  }
  if ((error as { message?: string }).message) {
    return (error as { message: string }).message;
  }
  return "Failed to connect wallet";
}

/**
 * Format address for display
 */
export function formatAddress(address: string, chars: number = 4): string {
  if (!address) return '';
  return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`;
}

/**
 * Format balance for display
 */
export function formatBalance(balance: string, decimals: number = 4): string {
  const num = parseFloat(balance);
  if (num === 0) return '0.0';
  if (num < 0.0001) return '< 0.0001';
  return num.toFixed(decimals);
}

/**
 * Check if address is valid
 */
export function isValidAddress(address: string): boolean {
  try {
    return ethers.utils.isAddress(address);
  } catch {
    return false;
  }
}

/**
 * Get network name from chain ID
 */
export function getNetworkName(chainId: number): string {
  const networks: Record<number, string> = {
    1: 'Ethereum Mainnet',
    43114: 'Avalanche Mainnet',
    43113: 'Avalanche Fuji Testnet',
    137: 'Polygon Mainnet',
    80001: 'Polygon Mumbai Testnet',
  };
  return networks[chainId] || `Unknown Network (${chainId})`;
}
