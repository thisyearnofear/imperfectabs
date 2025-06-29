import { ethers } from "ethers";

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
  subscriptionId: 15675, // Your working subscription ID
  gasLimit: 300000,
};

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

// Production ChainlinkFunctionsManager that uses API routes
export class ChainlinkFunctionsManagerProduction {
  private provider: ethers.providers.Provider;
  private signer: ethers.Signer | null = null;
  private subscriptionId: number = CHAINLINK_CONFIG.subscriptionId;
  private encryptedSecretsConfig: EncryptedSecretsConfig | null = null;

  constructor(provider: ethers.providers.Provider) {
    this.provider = provider;
  }

  // Initialize with signer for write operations
  public setSigner(signer: ethers.Signer) {
    this.signer = signer;
  }

  // Check LINK balance using API route
  public async getLinkBalance(address: string): Promise<string> {
    try {
      const response = await fetch('/api/chainlink', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'checkBalance',
          address: address,
        }),
      });

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to check balance');
      }

      return result.balance;
    } catch (error) {
      console.error("Failed to get LINK balance:", error);
      return "0";
    }
  }

  // Create Chainlink Functions subscription (using ethers directly)
  public async createSubscription(): Promise<number> {
    if (!this.signer) {
      throw new Error("Signer required for creating subscription");
    }

    try {
      const routerABI = [
        "function createSubscription() external returns (uint64)",
      ];

      const routerContract = new ethers.Contract(
        CHAINLINK_CONFIG.router,
        routerABI,
        this.signer
      );

      const tx = await routerContract.createSubscription();
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

  // Fund subscription with LINK tokens (using ethers directly)
  public async fundSubscription(
    subscriptionId: number,
    amount: string,
  ): Promise<void> {
    if (!this.signer) {
      throw new Error("Signer required for funding subscription");
    }

    try {
      const linkABI = [
        "function transferAndCall(address to, uint256 value, bytes calldata data) external returns (bool)",
      ];

      const linkContract = new ethers.Contract(
        CHAINLINK_CONFIG.linkToken,
        linkABI,
        this.signer
      );

      const amountWei = ethers.utils.parseEther(amount);

      // Transfer and call to fund subscription
      const data = ethers.utils.defaultAbiCoder.encode(
        ["uint64"],
        [subscriptionId],
      );
      const tx = await linkContract.transferAndCall(
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

  // Upload encrypted secrets using setup script
  public async uploadEncryptedSecrets(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    secrets: Record<string, string>,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    slotId?: number,
  ): Promise<{ slotId: number; version: number }> {
    // For production, secrets should be uploaded using the setup script
    // to avoid build issues with the @chainlink/functions-toolkit package

    console.log("🔐 To upload encrypted secrets, run:");
    console.log("npm run setup:secrets");
    console.log("");
    console.log("Then update your environment variables with the returned slot ID and version.");

    throw new Error(
      "Secrets upload should be done via 'npm run setup:secrets' script. " +
      "This avoids build issues and is more secure for production."
    );
  }

  // Request AI analysis using API route
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

    try {
      const privateKey = await this.getPrivateKey();

      const response = await fetch('/api/chainlink', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'requestAnalysis',
          sessionData: sessionData,
          subscriptionId: subId,
          privateKey: privateKey,
          secretsConfig: this.encryptedSecretsConfig,
        }),
      });

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to submit analysis request');
      }

      return {
        requestId: result.requestId,
        subscriptionId: subId,
        status: "pending",
        sessionData,
        timestamp: Date.now(),
        transactionHash: result.transactionHash,
        gasUsed: result.gasUsed,
      };
    } catch (error) {
      console.error("Failed to request AI analysis:", error);
      throw error;
    }
  }

  // Helper method to get private key from signer
  private async getPrivateKey(): Promise<string> {
    if (!this.signer) {
      throw new Error("Signer required");
    }

    // For wallet-connected signers, we can't access the private key directly
    // This is a limitation - in production you'd handle this differently
    if ((this.signer as ethers.Wallet)._isSigner && (this.signer as ethers.Wallet).privateKey) {
      return (this.signer as ethers.Wallet).privateKey;
    }

    throw new Error(
      "Cannot access private key from wallet signer. " +
      "For production, consider using server-side signing or the setup scripts."
    );
  }

  // Set encrypted secrets configuration
  public setEncryptedSecretsConfig(config: EncryptedSecretsConfig): void {
    this.encryptedSecretsConfig = config;
    console.log("✅ Encrypted secrets configuration set:", config);
  }

  // Get current encrypted secrets configuration
  public getEncryptedSecretsConfig(): EncryptedSecretsConfig | null {
    return this.encryptedSecretsConfig;
  }

  // Check if encrypted secrets are configured
  public hasEncryptedSecrets(): boolean {
    return this.encryptedSecretsConfig !== null;
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
        balance: "2.0", // Assume funded
        owner: await this.signer?.getAddress(),
        consumers: [],
      };
    } catch (error) {
      console.error("Failed to get subscription details:", error);
      return null;
    }
  }
}

// Export utility functions
export const createFunctionsManagerProduction = (provider: ethers.providers.Provider) => {
  return new ChainlinkFunctionsManagerProduction(provider);
};

export const formatLinkAmount = (amount: string): string => {
  return `${parseFloat(amount).toFixed(2)} LINK`;
};

export const estimateRequestCost = (): string => {
  return "0.1";
};
