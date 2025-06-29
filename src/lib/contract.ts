import { ethers } from "ethers";

// Extend window type for ethereum
declare global {
  interface Window {
    ethereum?: {
      request: (args: {
        method: string;
        params?: unknown[];
      }) => Promise<unknown>;
    };
  }
}

// Contract Configuration
export const CONTRACT_ADDRESS =
  process.env.NEXT_PUBLIC_CONTRACT_ADDRESS ||
  "0xFBE99DcD3b2d93b1c8FFabC26427383dAAbA05d1";
export const AVALANCHE_FUJI_RPC =
  process.env.NEXT_PUBLIC_AVALANCHE_FUJI_RPC ||
  "https://api.avax-test.network/ext/bc/C/rpc";
export const ETH_MAINNET_RPC =
  process.env.NEXT_PUBLIC_ETH_MAINNET_RPC || "https://cloudflare-eth.com";
export const CHAIN_ID = parseInt(process.env.NEXT_PUBLIC_CHAIN_ID || "43113");
export const ENS_CHAIN_ID = parseInt(
  process.env.NEXT_PUBLIC_ENS_CHAIN_ID || "1",
);
export const TELEPORTER_MESSENGER =
  "0x253b2784c75e510dD0fF1da844684a1aC0aa5fcf";
export const TELEPORTER_REGISTRY = "0xF86Cb19Ad8405AEFa7d09C778215D2Cb6eBfB228";

// Chainlink Functions Configuration
export const CHAINLINK_FUNCTIONS_ROUTER =
  "0xA9d587a00A31A52Ed70D6026794a8FC5E2F5dCb0"; // Fuji testnet
export const CHAINLINK_DON_ID = "fun-avalanche-fuji-1";
export const CHAINLINK_SUBSCRIPTION_ID = 0; // You'll need to create a subscription

// Contract ABI (essential functions only)
export const CONTRACT_ABI = [
  // Read functions
  "function getLeaderboard() external view returns (tuple(address user, uint256 totalReps, uint256 averageFormAccuracy, uint256 bestStreak, uint256 sessionsCompleted, uint256 timestamp)[] memory)",
  "function getUserAbsScore(address _user) external view returns (tuple(address user, uint256 totalReps, uint256 averageFormAccuracy, uint256 bestStreak, uint256 sessionsCompleted, uint256 timestamp) memory)",
  "function getUserAbsScoreSafe(address _user) external view returns (tuple(address user, uint256 totalReps, uint256 averageFormAccuracy, uint256 bestStreak, uint256 sessionsCompleted, uint256 timestamp) memory, bool)",
  "function getTimeUntilNextSubmission(address _user) external view returns (uint256)",
  "function getUserSessions(address _user) external view returns (tuple(uint256 reps, uint256 formAccuracy, uint256 streak, uint256 duration, uint256 timestamp)[] memory)",
  "function getTopPerformers(uint256 _count) external view returns (tuple(address user, uint256 totalReps, uint256 averageFormAccuracy, uint256 bestStreak, uint256 sessionsCompleted, uint256 timestamp)[] memory)",
  "function calculateCompositeScore(uint256 _reps, uint256 _formAccuracy, uint256 _streak) external pure returns (uint256)",
  "function feeConfig() external view returns (tuple(uint256 submissionFee, uint256 ownerShare, uint256 leaderboardShare))",
  "function isAvalancheFuji() external view returns (bool)",
  "function getEcosystemInfo() external pure returns (string memory, string memory, string memory)",

  // Write functions
  "function submitWorkoutSession(uint256 _reps, uint256 _formAccuracy, uint256 _streak, uint256 _duration) external payable",
  "function claimRewards() external",

  // Chainlink Functions (to be added in contract upgrade)
  "function requestFormAnalysis(string memory sessionData) external returns (bytes32)",
  "function fulfillFormAnalysis(bytes32 requestId, uint256 enhancedFormScore) external",

  // Events
  "event AbsScoreAdded(address indexed user, uint256 reps, uint256 formAccuracy, uint256 streak, uint256 timestamp)",
  "event WorkoutSessionRecorded(address indexed user, uint256 sessionIndex, uint256 reps, uint256 formAccuracy, uint256 duration)",
  "event EcosystemIntegration(string indexed appName, address indexed user, uint256 score)",
  "event RewardClaimed(address indexed user, uint256 amount)",
  "event ChainlinkRequestSent(bytes32 indexed requestId, address indexed user, string sessionData)",
  "event ChainlinkResponseReceived(bytes32 indexed requestId, uint256 enhancedScore)",
];

// Types
export interface AbsScore {
  user: string;
  totalReps: number;
  averageFormAccuracy: number;
  bestStreak: number;
  sessionsCompleted: number;
  timestamp: number;
}

export interface WorkoutSession {
  reps: number;
  formAccuracy: number;
  streak: number;
  duration: number;
  timestamp: number;
}

export interface FeeConfig {
  submissionFee: string;
  ownerShare: number;
  leaderboardShare: number;
}

export interface ChainlinkRequest {
  requestId: string;
  status: "pending" | "fulfilled" | "failed";
  sessionData: string;
  enhancedScore?: number;
  timestamp: number;
}

// Chainlink Functions JavaScript source code for AI analysis
export const CHAINLINK_AI_SOURCE = `
// Chainlink Functions source code for enhanced form analysis
const sessionData = args[0]; // JSON string with pose data
const apiKey = secrets.openaiKey; // OpenAI API key from secrets

// Parse session data
const session = JSON.parse(sessionData);
const { poses, angles, timestamps } = session;

// Enhanced AI analysis using OpenAI
const prompt = \`Analyze this abs exercise session data and provide an enhanced form score (0-100):
Pose data: \${JSON.stringify(poses.slice(0, 10))} // First 10 poses
Angle measurements: \${JSON.stringify(angles.slice(0, 10))}
Duration: \${session.duration}s
Reps: \${session.reps}

Consider:
1. Consistency of movement patterns
2. Proper angle ranges for abs exercises
3. Tempo and rhythm analysis
4. Safety and injury prevention
5. Efficiency of movement

Return only a numeric score from 0-100.\`;

const response = await Functions.makeHttpRequest({
  url: 'https://api.openai.com/v1/chat/completions',
  method: 'POST',
  headers: {
    'Authorization': \`Bearer \${apiKey}\`,
    'Content-Type': 'application/json'
  },
  data: {
    model: 'gpt-4',
    messages: [{
      role: 'user',
      content: prompt
    }],
    max_tokens: 50,
    temperature: 0.1
  }
});

if (response.error) {
  throw new Error(\`API request failed: \${response.error}\`);
}

const aiScore = parseInt(response.data.choices[0].message.content.trim());
return Functions.encodeUint256(Math.max(0, Math.min(100, aiScore)));
`;

// Utility functions
export const getProvider = () => {
  return new ethers.providers.JsonRpcProvider(AVALANCHE_FUJI_RPC);
};

export const getENSProvider = () => {
  return new ethers.providers.JsonRpcProvider(ETH_MAINNET_RPC);
};

export const getContract = (
  signerOrProvider: ethers.Signer | ethers.providers.Provider,
) => {
  return new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signerOrProvider);
};

export const connectWallet = async () => {
  if (typeof window.ethereum !== "undefined") {
    try {
      await window.ethereum!.request({ method: "eth_requestAccounts" });
      const provider = new ethers.providers.Web3Provider(window.ethereum!);

      // Check if we're on the correct network
      const network = await provider.getNetwork();
      if (network.chainId !== CHAIN_ID) {
        try {
          await window.ethereum!.request({
            method: "wallet_switchEthereumChain",
            params: [{ chainId: `0x${CHAIN_ID.toString(16)}` }],
          });
        } catch (switchError: unknown) {
          // If the chain hasn't been added to MetaMask, add it
          if ((switchError as { code: number }).code === 4902) {
            await window.ethereum!.request({
              method: "wallet_addEthereumChain",
              params: [
                {
                  chainId: `0x${CHAIN_ID.toString(16)}`,
                  chainName: "Avalanche Fuji Testnet",
                  nativeCurrency: {
                    name: "AVAX",
                    symbol: "AVAX",
                    decimals: 18,
                  },
                  rpcUrls: [AVALANCHE_FUJI_RPC],
                  blockExplorerUrls: ["https://testnet.snowtrace.io/"],
                },
              ],
            });
          }
        }
      }

      return provider.getSigner();
    } catch (error) {
      console.error("Failed to connect wallet:", error);
      throw new Error("Failed to connect wallet");
    }
  } else {
    throw new Error("MetaMask not found");
  }
};

export const submitWorkoutSession = async (
  signer: ethers.Signer,
  reps: number,
  formAccuracy: number,
  streak: number,
  duration: number,
  poseData?: unknown[],
) => {
  try {
    console.log("🏋️ Starting workout session submission...");
    console.log("📊 Session data:", { reps, formAccuracy, streak, duration });

    const contract = getContract(signer);

    // Get submission fee
    console.log("💰 Getting submission fee...");
    const feeConfig = await contract.feeConfig();
    const submissionFee = feeConfig.submissionFee;
    console.log("💸 Submission fee:", ethers.utils.formatEther(submissionFee), "AVAX");

    // Submit basic workout session
    console.log("📤 Submitting transaction to contract...");
    const tx = await contract.submitWorkoutSession(
      reps,
      formAccuracy,
      streak,
      duration,
      {
        value: submissionFee,
        gasLimit: 500000 // Higher gas limit for Chainlink Functions
      },
    );

    console.log("🔗 Transaction hash:", tx.hash);
    console.log("⏳ Waiting for confirmation...");

    const receipt = await tx.wait();
    console.log("✅ Transaction confirmed in block:", receipt.blockNumber);
    console.log("⛽ Gas used:", receipt.gasUsed.toString());

    // Log all events
    console.log("📋 Transaction events:");
    receipt.events?.forEach((event, index) => {
      console.log(`  ${index + 1}. ${event.event || 'Unknown Event'}`);
      if (event.event === 'AIAnalysisRequested') {
        console.log(`     🔗 Chainlink Request ID: ${event.args?.requestId}`);
        console.log(`     👤 User: ${event.args?.user}`);
        console.log(`     📊 Session Index: ${event.args?.sessionIndex}`);
      }
      if (event.args && Object.keys(event.args).length > 0) {
        console.log("     Args:", event.args);
      }
    });

    // If pose data is available, trigger Chainlink Functions for enhanced analysis
    if (poseData && poseData.length > 0) {
      console.log("🤖 Requesting enhanced analysis with pose data...");
      await requestEnhancedAnalysis(signer, {
        reps,
        formAccuracy,
        streak,
        duration,
        poses: poseData,
        angles: extractAngles(poseData),
        timestamps: poseData.map(
          (_, i) => Date.now() - (poseData.length - i) * 100,
        ),
      });
    }

    return receipt;
  } catch (error) {
    console.error("❌ Failed to submit workout session:", error);
    if (error instanceof Error) {
      console.error("Error message:", error.message);
      console.error("Error stack:", error.stack);
    }
    throw error;
  }
};

export const requestEnhancedAnalysis = async (
  signer: ethers.Signer,
  sessionData: unknown,
) => {
  try {
    // This would call a Chainlink Functions request
    // For now, we'll simulate the enhanced analysis
    console.log("Enhanced AI analysis requested for session:", sessionData);

    // In a real implementation, this would:
    // 1. Create a Chainlink Functions subscription
    // 2. Fund the subscription with LINK
    // 3. Call the contract's requestFormAnalysis function
    // 4. Wait for the callback with enhanced score

    return {
      requestId: `0x${Math.random().toString(16).substr(2, 64)}`,
      status: "pending",
    };
  } catch (error) {
    console.error("Failed to request enhanced analysis:", error);
    throw error;
  }
};

export const getUserStats = async (
  userAddress: string,
): Promise<AbsScore | null> => {
  try {
    const provider = getProvider();
    const contract = getContract(provider);

    const [score, exists] = await contract.getUserAbsScoreSafe(userAddress);

    if (!exists) return null;

    return {
      user: score.user,
      totalReps: score.totalReps.toNumber(),
      averageFormAccuracy: score.averageFormAccuracy.toNumber(),
      bestStreak: score.bestStreak.toNumber(),
      sessionsCompleted: score.sessionsCompleted.toNumber(),
      timestamp: score.timestamp.toNumber(),
    };
  } catch (error) {
    console.error("Failed to get user stats:", error);
    return null;
  }
};

export const getLeaderboard = async (limit?: number): Promise<AbsScore[]> => {
  try {
    const provider = getProvider();
    const contract = getContract(provider);

    const leaderboardData = limit
      ? await contract.getTopPerformers(limit)
      : await contract.getLeaderboard();

    return leaderboardData.map(
      (entry: {
        user: string;
        totalReps: { toNumber(): number };
        averageFormAccuracy: { toNumber(): number };
        bestStreak: { toNumber(): number };
        sessionsCompleted: { toNumber(): number };
        timestamp: { toNumber(): number };
      }) => ({
        user: entry.user,
        totalReps: entry.totalReps.toNumber(),
        averageFormAccuracy: entry.averageFormAccuracy.toNumber(),
        bestStreak: entry.bestStreak.toNumber(),
        sessionsCompleted: entry.sessionsCompleted.toNumber(),
        timestamp: entry.timestamp.toNumber(),
      }),
    );
  } catch (error) {
    console.error("Failed to get leaderboard:", error);
    return [];
  }
};

export const getUserSessions = async (
  userAddress: string,
): Promise<WorkoutSession[]> => {
  try {
    const provider = getProvider();
    const contract = getContract(provider);

    const sessions = await contract.getUserSessions(userAddress);

    return sessions.map(
      (session: {
        reps: { toNumber(): number };
        formAccuracy: { toNumber(): number };
        streak: { toNumber(): number };
        duration: { toNumber(): number };
        timestamp: { toNumber(): number };
      }) => ({
        reps: session.reps.toNumber(),
        formAccuracy: session.formAccuracy.toNumber(),
        streak: session.streak.toNumber(),
        duration: session.duration.toNumber(),
        timestamp: session.timestamp.toNumber(),
      }),
    );
  } catch (error) {
    console.error("Failed to get user sessions:", error);
    return [];
  }
};

export const getTimeUntilNextSubmission = async (
  userAddress: string,
): Promise<number> => {
  try {
    const provider = getProvider();
    const contract = getContract(provider);

    const timeRemaining =
      await contract.getTimeUntilNextSubmission(userAddress);
    return timeRemaining.toNumber();
  } catch (error) {
    console.error("Failed to get submission cooldown:", error);
    return 0;
  }
};

export const claimRewards = async (signer: ethers.Signer) => {
  try {
    const contract = getContract(signer);
    const tx = await contract.claimRewards();
    return await tx.wait();
  } catch (error) {
    console.error("Failed to claim rewards:", error);
    throw error;
  }
};

export const calculateCompositeScore = async (
  reps: number,
  formAccuracy: number,
  streak: number,
): Promise<number> => {
  try {
    const provider = getProvider();
    const contract = getContract(provider);

    const score = await contract.calculateCompositeScore(
      reps,
      formAccuracy,
      streak,
    );
    return score.toNumber();
  } catch (error) {
    console.error("Failed to calculate composite score:", error);
    return 0;
  }
};

export const getFeeConfig = async (): Promise<FeeConfig> => {
  try {
    const provider = getProvider();
    const contract = getContract(provider);

    const config = await contract.feeConfig();

    return {
      submissionFee: ethers.utils.formatEther(config.submissionFee),
      ownerShare: config.ownerShare,
      leaderboardShare: config.leaderboardShare,
    };
  } catch (error) {
    console.error("Failed to get fee config:", error);
    return {
      submissionFee: "0.01",
      ownerShare: 7000,
      leaderboardShare: 3000,
    };
  }
};

export const getEcosystemInfo = async (): Promise<{
  ecosystemName: string;
  appName: string;
  version: string;
}> => {
  try {
    const provider = getProvider();
    const contract = getContract(provider);

    const [ecosystemName, appName, version] = await contract.getEcosystemInfo();

    return { ecosystemName, appName, version };
  } catch (error) {
    console.error("Failed to get ecosystem info:", error);
    return {
      ecosystemName: "Imperfect Fitness",
      appName: "Imperfect Abs",
      version: "1.0.0",
    };
  }
};

// Helper function to extract angles from pose data
const extractAngles = (poseData: unknown[]): number[] => {
  return poseData.map((pose) => {
    if (!pose || typeof pose !== "object" || !("landmarks" in pose)) return 0;

    // Calculate abs exercise angle (simplified)
    // In a real implementation, this would use the actual pose detection library
    // Simple angle calculation (would be more sophisticated in practice)
    return Math.random() * 180; // Placeholder
  });
};

// Network verification
export const verifyNetwork = async (): Promise<boolean> => {
  if (typeof window.ethereum === "undefined") return false;

  try {
    const provider = new ethers.providers.Web3Provider(window.ethereum!);
    const network = await provider.getNetwork();
    return network.chainId === CHAIN_ID;
  } catch {
    return false;
  }
};

// Contract event listeners
export const subscribeToEvents = (
  callback: (event: {
    type: string;
    user?: string;
    reps?: number;
    formAccuracy?: number;
    streak?: number;
    timestamp?: number;
    transactionHash?: string;
    requestId?: string;
    enhancedScore?: number;
  }) => void,
) => {
  const provider = getProvider();
  const contract = getContract(provider);

  // Listen for score additions
  contract.on(
    "AbsScoreAdded",
    (user, reps, formAccuracy, streak, timestamp, event) => {
      callback({
        type: "AbsScoreAdded",
        user,
        reps: reps.toNumber(),
        formAccuracy: formAccuracy.toNumber(),
        streak: streak.toNumber(),
        timestamp: timestamp.toNumber(),
        transactionHash: event.transactionHash,
      });
    },
  );

  // Listen for Chainlink responses (when implemented)
  contract.on(
    "ChainlinkResponseReceived",
    (requestId, enhancedScore, event) => {
      callback({
        type: "ChainlinkResponseReceived",
        requestId,
        enhancedScore: enhancedScore.toNumber(),
        transactionHash: event.transactionHash,
      });
    },
  );

  return () => {
    contract.removeAllListeners();
  };
};

const contractAPI = {
  CONTRACT_ADDRESS,
  connectWallet,
  submitWorkoutSession,
  getUserStats,
  getLeaderboard,
  getUserSessions,
  getTimeUntilNextSubmission,
  claimRewards,
  requestEnhancedAnalysis,
  calculateCompositeScore,
  getFeeConfig,
  getEcosystemInfo,
  verifyNetwork,
  subscribeToEvents,
  getProvider,
  getENSProvider,
  CHAIN_ID,
  ENS_CHAIN_ID,
};

export default contractAPI;
