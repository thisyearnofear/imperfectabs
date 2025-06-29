import { ethers } from "ethers";

// Build-safe version of Chainlink Functions that doesn't import the toolkit
// This file can be safely imported during build without causing webpack issues

// Chainlink Functions Configuration for Avalanche Fuji
export const CHAINLINK_CONFIG = {
  router: "0xA9d587a00A31A52Ed70D6026794a8FC5E2F5dCb0", // Fuji testnet
  donId: "fun-avalanche-fuji-1",
  gatewayUrls: [
    "https://01.functions-gateway.testnet.chain.link/",
    "https://02.functions-gateway.testnet.chain.link/",
  ],
  explorerUrl: "https://testnet.snowtrace.io",
  linkToken: "0x0b9d5D9136855f6FEc3c0993feE6E9CE8a297846", // LINK on Fuji
  subscriptionId: 0, // Will be set after creating subscription
  gasLimit: 300000,
};

// Chainlink Functions Router ABI (minimal)
const FUNCTIONS_ROUTER_ABI = [
  "function sendRequest(uint64 subscriptionId, bytes calldata data, uint16 dataVersion, uint32 callbackGasLimit, bytes32 donId) external returns (bytes32)",
  "function createSubscription() external returns (uint64)",
  "function fundSubscription(uint64 subscriptionId, uint96 amount) external",
  "function addConsumer(uint64 subscriptionId, address consumer) external",
  "event RequestSent(bytes32 indexed requestId, address indexed requestingContract, address indexed requestInitiator, uint64 indexed subscriptionId, address subscriptionOwner, bytes data)",
];

// LINK Token ABI (minimal)
const LINK_TOKEN_ABI = [
  "function transfer(address to, uint256 value) external returns (bool)",
  "function transferAndCall(address to, uint256 value, bytes calldata data) external returns (bool)",
  "function balanceOf(address account) external view returns (uint256)",
];

// Interface for Chainlink Functions request
export interface ChainlinkFunctionsRequest {
  requestId: string;
  subscriptionId: number;
  status: "pending" | "fulfilled" | "failed";
  sessionData: unknown;
  enhancedScore?: number;
  gasUsed?: number;
  cost?: string;
  timestamp: number;
  transactionHash?: string;
  fulfillmentTxHash?: string;
}

// Encrypted secrets configuration
export interface EncryptedSecretsConfig {
  slotId: number;
  version: number;
  secretsLocation: "DONHosted" | "Inline" | "Remote";
}

// Build-safe ChainlinkFunctionsManager that doesn't use the toolkit
export class ChainlinkFunctionsManagerSafe {
  private provider: ethers.providers.Provider;
  private signer: ethers.Signer | null = null;
  private routerContract: ethers.Contract;
  private linkContract: ethers.Contract;
  private subscriptionId: number = 0;
  private encryptedSecretsConfig: EncryptedSecretsConfig | null = null;

  constructor(provider: ethers.providers.Provider) {
    this.provider = provider;
    this.routerContract = new ethers.Contract(
      CHAINLINK_CONFIG.router,
      FUNCTIONS_ROUTER_ABI,
      provider,
    );
    this.linkContract = new ethers.Contract(
      CHAINLINK_CONFIG.linkToken,
      LINK_TOKEN_ABI,
      provider,
    );
  }

  // Initialize with signer for write operations
  public setSigner(signer: ethers.Signer) {
    this.signer = signer;
    this.routerContract = this.routerContract.connect(signer);
    this.linkContract = this.linkContract.connect(signer);
  }

  // Check LINK balance
  public async getLinkBalance(address: string): Promise<string> {
    try {
      const balance = await this.linkContract.balanceOf(address);
      return ethers.utils.formatEther(balance);
    } catch (error) {
      console.error("Failed to get LINK balance:", error);
      return "0";
    }
  }

  // Create Chainlink Functions subscription
  public async createSubscription(): Promise<number> {
    if (!this.signer) {
      throw new Error("Signer required for creating subscription");
    }

    try {
      const tx = await this.routerContract.createSubscription();
      const receipt = await tx.wait();

      // Extract subscription ID from events
      const event = receipt.events?.find(
        (e: { event: string }) => e.event === "SubscriptionCreated",
      );
      const subscriptionId = (
        event as { args: { subscriptionId: { toNumber(): number } } }
      )?.args?.subscriptionId?.toNumber();

      if (!subscriptionId) {
        throw new Error("Failed to extract subscription ID");
      }

      this.subscriptionId = subscriptionId;
      return subscriptionId;
    } catch (error) {
      console.error("Failed to create subscription:", error);
      throw error;
    }
  }

  // Fund subscription with LINK tokens
  public async fundSubscription(
    subscriptionId: number,
    amount: string,
  ): Promise<void> {
    if (!this.signer) {
      throw new Error("Signer required for funding subscription");
    }

    try {
      const amountWei = ethers.utils.parseEther(amount);

      // Transfer and call to fund subscription
      const data = ethers.utils.defaultAbiCoder.encode(
        ["uint64"],
        [subscriptionId],
      );
      const tx = await this.linkContract.transferAndCall(
        CHAINLINK_CONFIG.router,
        amountWei,
        data,
      );

      await tx.wait();
    } catch (error) {
      console.error("Failed to fund subscription:", error);
      throw error;
    }
  }

  // Get subscription details (placeholder implementation)
  public async getSubscriptionDetails(subscriptionId: number): Promise<{
    balance: string;
    owner?: string;
    consumers: string[];
  } | null> {
    try {
      console.log(`Getting details for subscription ${subscriptionId}`);
      return {
        balance: "0",
        owner: await this.signer?.getAddress(),
        consumers: [],
      };
    } catch (error) {
      console.error("Failed to get subscription details:", error);
      return null;
    }
  }

  // Set encrypted secrets configuration
  public setEncryptedSecretsConfig(config: EncryptedSecretsConfig): void {
    this.encryptedSecretsConfig = config;
    console.log("✅ Encrypted secrets configuration set:", config);
  }

  // Request AI analysis (simplified version without real Chainlink Functions)
  public async requestAIAnalysis(
    sessionData: unknown,
    subscriptionId?: number,
  ): Promise<ChainlinkFunctionsRequest> {
    if (!this.signer) {
      throw new Error("Signer required for making requests");
    }

    const subId = subscriptionId || this.subscriptionId;
    if (!subId) {
      throw new Error("Subscription ID required");
    }

    // For now, return a mock request since we can't use the real toolkit
    const mockRequestId = `0x${Math.random().toString(16).substr(2, 64)}`;
    
    console.log("Mock AI analysis request created:", mockRequestId);
    console.warn("Real Chainlink Functions integration requires runtime loading of the toolkit");

    return {
      requestId: mockRequestId,
      subscriptionId: subId,
      status: "pending",
      sessionData,
      timestamp: Date.now(),
      transactionHash: `0x${Math.random().toString(16).substr(2, 64)}`,
    };
  }
}

// Export utility functions
export const createFunctionsManagerSafe = (provider: ethers.providers.Provider) => {
  return new ChainlinkFunctionsManagerSafe(provider);
};

export const formatLinkAmount = (amount: string): string => {
  return `${parseFloat(amount).toFixed(2)} LINK`;
};

export const estimateRequestCost = (): string => {
  return "0.1";
};
