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

// Chainlink Functions JavaScript source code for AI analysis
export const AI_ANALYSIS_SOURCE = `
// Chainlink Functions JavaScript code for enhanced form analysis
// This code runs in the Chainlink DON

const sessionDataString = args[0];
const sessionData = JSON.parse(sessionDataString);

// OpenAI API integration
const openAIApiKey = secrets.openaiApiKey;

if (!openAIApiKey) {
  throw Error("OpenAI API key not provided");
}

// Prepare data for analysis
const { reps, formAccuracy, streak, duration, poses, angles } = sessionData;

// Create prompt for biomechanical analysis
const analysisPrompt = \`Analyze this abs exercise session data:

Exercise Type: Abs/Core exercises (sit-ups, crunches)
Total Reps: \${reps}
Current Form Score: \${formAccuracy}%
Best Streak: \${streak}
Session Duration: \${duration} seconds
Pose Angles: \${angles ? angles.slice(0, 10).join(', ') : 'N/A'}

Provide enhanced form analysis considering:
1. Movement consistency and rhythm
2. Proper angle ranges for abs exercises (45-65° up, 95-115° down)
3. Exercise tempo and control
4. Safety and injury prevention
5. Biomechanical efficiency

Return ONLY a numeric score from 0-100 representing enhanced form quality.
Consider the original score of \${formAccuracy}% but provide more accurate assessment based on the full movement data.

Score:\`;

// Make OpenAI API request
const openAIRequest = Functions.makeHttpRequest({
  url: "https://api.openai.com/v1/chat/completions",
  method: "POST",
  headers: {
    "Authorization": \`Bearer \${openAIApiKey}\`,
    "Content-Type": "application/json"
  },
  data: {
    model: "gpt-4",
    messages: [
      {
        role: "system",
        content: "You are a professional fitness trainer and biomechanics expert. Analyze exercise form data and provide accurate scoring."
      },
      {
        role: "user",
        content: analysisPrompt
      }
    ],
    max_tokens: 100,
    temperature: 0.1
  }
});

const openAIResponse = await openAIRequest;

if (openAIResponse.error) {
  console.error("OpenAI API error:", openAIResponse.error);
  throw Error(\`OpenAI API error: \${openAIResponse.error}\`);
}

// Extract score from response
const responseText = openAIResponse.data.choices[0].message.content;
const scoreMatch = responseText.match(/\d+/);
const enhancedScore = scoreMatch ? parseInt(scoreMatch[0]) : formAccuracy;

// Validate score range
const finalScore = Math.max(0, Math.min(100, enhancedScore));

// Return encoded result
return Functions.encodeUint256(finalScore);
`;

// Secrets for Chainlink Functions (encrypted)
export const REQUIRED_SECRETS = {
  openaiApiKey: "YOUR_OPENAI_API_KEY", // Replace with actual key
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

export class ChainlinkFunctionsManager {
  private provider: ethers.providers.Provider;
  private signer: ethers.Signer | null = null;
  private routerContract: ethers.Contract;
  private linkContract: ethers.Contract;
  private subscriptionId: number = 0;

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

  // Add consumer contract to subscription
  public async addConsumer(
    subscriptionId: number,
    consumerAddress: string,
  ): Promise<void> {
    if (!this.signer) {
      throw new Error("Signer required for adding consumer");
    }

    try {
      const tx = await this.routerContract.addConsumer(
        subscriptionId,
        consumerAddress,
      );
      await tx.wait();
    } catch (error) {
      console.error("Failed to add consumer:", error);
      throw error;
    }
  }

  // Request AI analysis via Chainlink Functions
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
      // Prepare request data
      const args = [JSON.stringify(sessionData)];

      // Encode request data
      const requestData = ethers.utils.defaultAbiCoder.encode(
        ["string[]", "bytes"],
        [args, "0x"], // No encrypted secrets for now
      );

      // Send request
      const tx = await this.routerContract.sendRequest(
        subId,
        requestData,
        1, // dataVersion
        CHAINLINK_CONFIG.gasLimit,
        ethers.utils.formatBytes32String(CHAINLINK_CONFIG.donId),
      );

      const receipt = await tx.wait();

      // Extract request ID from events
      const event = receipt.events?.find(
        (e: { event: string }) => e.event === "RequestSent",
      );
      const requestId = (event as { args: { requestId: string } })?.args
        ?.requestId;

      if (!requestId) {
        throw new Error("Failed to extract request ID");
      }

      return {
        requestId: requestId,
        subscriptionId: subId,
        status: "pending",
        sessionData,
        timestamp: Date.now(),
        transactionHash: receipt.transactionHash,
      };
    } catch (error) {
      console.error("Failed to request AI analysis:", error);
      throw error;
    }
  }

  // Get subscription details
  public async getSubscriptionDetails(subscriptionId: number): Promise<{
    balance: string;
    owner?: string;
    consumers: string[];
  } | null> {
    try {
      // This would call getSubscription on the router
      // For now, return placeholder data based on subscription ID
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
}

// Export utility functions
export const createFunctionsManager = (provider: ethers.providers.Provider) => {
  return new ChainlinkFunctionsManager(provider);
};

export const formatLinkAmount = (amount: string): string => {
  return `${parseFloat(amount).toFixed(2)} LINK`;
};

export const estimateRequestCost = (): string => {
  // Rough estimate: ~0.1 LINK per request
  return "0.1";
};
