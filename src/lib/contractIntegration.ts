// Enhanced Contract Integration for Imperfect Abs Leaderboard
// Optimized for production deployment on Avalanche Fuji

import { ethers } from "ethers";

// Contract configuration
export const CONTRACT_CONFIG = {
  address: "0xFBE99DcD3b2d93b1c8FFabC26427383dAAbA05d1",
  chainId: 43113, // Avalanche Fuji
  rpcUrl: "https://api.avax-test.network/ext/bc/C/rpc",
  explorerUrl: "https://testnet.snowtrace.io",
  submissionFee: "0.01", // AVAX
  cooldownSeconds: 60,
  maxRepsPerSession: 200,
  minFormAccuracy: 50,
} as const;

// Enhanced ABI with all contract functions
export const LEADERBOARD_ABI = [
  // Main submission function
  "function submitWorkoutSession(uint256 _reps, uint256 _formAccuracy, uint256 _streak, uint256 _duration) external payable",

  // View functions
  "function getLeaderboard() external view returns (tuple(address user, uint256 totalReps, uint256 averageFormAccuracy, uint256 bestStreak, uint256 sessionsCompleted, uint256 timestamp)[])",
  "function getTopPerformers(uint256 _count) external view returns (tuple(address user, uint256 totalReps, uint256 averageFormAccuracy, uint256 bestStreak, uint256 sessionsCompleted, uint256 timestamp)[])",
  "function getUserAbsScore(address _user) external view returns (tuple(address user, uint256 totalReps, uint256 averageFormAccuracy, uint256 bestStreak, uint256 sessionsCompleted, uint256 timestamp))",
  "function getUserAbsScoreSafe(address _user) external view returns (tuple(address user, uint256 totalReps, uint256 averageFormAccuracy, uint256 bestStreak, uint256 sessionsCompleted, uint256 timestamp), bool)",
  "function getUserSessions(address _user) external view returns (tuple(uint256 reps, uint256 formAccuracy, uint256 streak, uint256 duration, uint256 timestamp)[])",
  "function getTimeUntilNextSubmission(address _user) external view returns (uint256)",
  "function calculateCompositeScore(uint256 _reps, uint256 _formAccuracy, uint256 _streak) external pure returns (uint256)",

  // Configuration getters
  "function feeConfig() external view returns (tuple(uint256 submissionFee, uint256 ownerShare, uint256 leaderboardShare))",
  "function SUBMISSION_COOLDOWN() external view returns (uint256)",
  "function MAX_REPS_PER_SESSION() external view returns (uint256)",
  "function MIN_FORM_ACCURACY() external view returns (uint256)",
  "function submissionsEnabled() external view returns (bool)",

  // Events
  "event AbsScoreAdded(address indexed user, uint256 reps, uint256 formAccuracy, uint256 streak, uint256 timestamp)",
  "event WorkoutSessionRecorded(address indexed user, uint256 sessionIndex, uint256 reps, uint256 formAccuracy, uint256 duration)",
  "event EcosystemIntegration(string indexed appName, address indexed user, uint256 score)",
] as const;

// TypeScript interfaces
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

export interface SubmissionData {
  reps: number;
  formAccuracy: number;
  streak: number;
  duration: number;
}

export interface FeeConfig {
  submissionFee: string;
  ownerShare: number;
  leaderboardShare: number;
}

export interface ContractError {
  code: string;
  message: string;
  remainingTime?: number;
  maxAllowed?: number;
}

// Enhanced contract integration class
export class ImperfectAbsContract {
  private contract: ethers.Contract | null = null;
  private provider: ethers.providers.Provider | null = null;
  private signer: ethers.Signer | null = null;

  constructor() {}

  // Initialize with wallet connection
  async initialize(provider: ethers.providers.Web3Provider): Promise<void> {
    this.provider = provider;
    this.signer = provider.getSigner();
    this.contract = new ethers.Contract(
      CONTRACT_CONFIG.address,
      LEADERBOARD_ABI,
      this.signer,
    );

    // Verify network
    const network = await provider.getNetwork();
    if (network.chainId !== CONTRACT_CONFIG.chainId) {
      throw new Error(
        `Wrong network. Please switch to Avalanche Fuji testnet.`,
      );
    }
  }

  // Submit workout session to blockchain
  async submitWorkoutSession(
    sessionData: SubmissionData,
    options?: {
      onConfirmation?: (txHash: string) => void;
      onError?: (error: ContractError) => void;
    },
  ): Promise<{ success: boolean; txHash?: string; error?: ContractError }> {
    try {
      if (!this.contract || !this.signer) {
        throw new Error(
          "Contract not initialized. Please connect wallet first.",
        );
      }

      // Validate session data
      const validation = this.validateSessionData(sessionData);
      if (!validation.isValid) {
        return { success: false, error: validation.error };
      }

      // Check cooldown
      const userAddress = await this.signer.getAddress();
      const cooldownCheck = await this.checkCooldown(userAddress);
      if (!cooldownCheck.canSubmit) {
        return {
          success: false,
          error: {
            code: "COOLDOWN_ACTIVE",
            message: `Please wait ${cooldownCheck.remainingTime} seconds before next submission`,
            remainingTime: cooldownCheck.remainingTime,
          },
        };
      }

      // Prepare transaction
      const submissionFee = ethers.utils.parseEther(
        CONTRACT_CONFIG.submissionFee,
      );
      const gasLimit = 300000; // Conservative gas limit for Avalanche

      // Submit transaction
      const tx = await this.contract.submitWorkoutSession(
        sessionData.reps,
        sessionData.formAccuracy,
        sessionData.streak,
        sessionData.duration,
        {
          value: submissionFee,
          gasLimit,
        },
      );

      options?.onConfirmation?.(tx.hash);

      // Wait for confirmation
      const receipt = await tx.wait();

      return {
        success: true,
        txHash: receipt.transactionHash,
      };
    } catch (error: unknown) {
      const contractError = this.parseContractError(error);
      options?.onError?.(contractError);
      return { success: false, error: contractError };
    }
  }

  // Validate session data before submission
  validateSessionData(data: SubmissionData): {
    isValid: boolean;
    error?: ContractError;
  } {
    if (data.reps <= 0) {
      return {
        isValid: false,
        error: {
          code: "INVALID_REPS",
          message: "Reps must be greater than 0",
        },
      };
    }

    if (data.reps > CONTRACT_CONFIG.maxRepsPerSession) {
      return {
        isValid: false,
        error: {
          code: "REPS_TOO_HIGH",
          message: `Maximum ${CONTRACT_CONFIG.maxRepsPerSession} reps per session`,
          maxAllowed: CONTRACT_CONFIG.maxRepsPerSession,
        },
      };
    }

    if (
      data.formAccuracy < CONTRACT_CONFIG.minFormAccuracy ||
      data.formAccuracy > 100
    ) {
      return {
        isValid: false,
        error: {
          code: "INVALID_FORM_ACCURACY",
          message: `Form accuracy must be between ${CONTRACT_CONFIG.minFormAccuracy}% and 100%`,
        },
      };
    }

    if (data.streak > data.reps) {
      return {
        isValid: false,
        error: {
          code: "INVALID_STREAK",
          message: "Streak cannot be higher than total reps",
        },
      };
    }

    return { isValid: true };
  }

  // Check cooldown status
  async checkCooldown(userAddress: string): Promise<{
    canSubmit: boolean;
    remainingTime: number;
  }> {
    try {
      if (!this.contract) {
        throw new Error("Contract not initialized");
      }

      const remainingTime =
        await this.contract.getTimeUntilNextSubmission(userAddress);
      return {
        canSubmit: remainingTime.toNumber() === 0,
        remainingTime: remainingTime.toNumber(),
      };
    } catch (error) {
      console.error("Error checking cooldown:", error);
      return { canSubmit: false, remainingTime: 0 };
    }
  }

  // Get user's abs score
  async getUserScore(userAddress: string): Promise<AbsScore | null> {
    try {
      if (!this.contract) return null;

      const [score, exists] =
        await this.contract.getUserAbsScoreSafe(userAddress);

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
      console.error("Error getting user score:", error);
      return null;
    }
  }

  // Get user's workout sessions
  async getUserSessions(userAddress: string): Promise<WorkoutSession[]> {
    try {
      if (!this.contract) return [];

      const sessions = await this.contract.getUserSessions(userAddress);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return sessions.map((session: any) => ({
        reps: session.reps.toNumber(),
        formAccuracy: session.formAccuracy.toNumber(),
        streak: session.streak.toNumber(),
        duration: session.duration.toNumber(),
        timestamp: session.timestamp.toNumber(),
      }));
    } catch (error) {
      console.error("Error getting user sessions:", error);
      return [];
    }
  }

  // Get leaderboard
  async getLeaderboard(limit?: number): Promise<AbsScore[]> {
    try {
      if (!this.contract) return [];

      const leaderboard = limit
        ? await this.contract.getTopPerformers(limit)
        : await this.contract.getLeaderboard();

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return leaderboard.map((entry: any) => ({
        user: entry.user,
        totalReps: entry.totalReps.toNumber(),
        averageFormAccuracy: entry.averageFormAccuracy.toNumber(),
        bestStreak: entry.bestStreak.toNumber(),
        sessionsCompleted: entry.sessionsCompleted.toNumber(),
        timestamp: entry.timestamp.toNumber(),
      }));
    } catch (error) {
      console.error("Error getting leaderboard:", error);
      return [];
    }
  }

  // Calculate composite score
  async calculateScore(
    reps: number,
    formAccuracy: number,
    streak: number,
  ): Promise<number> {
    try {
      if (!this.contract) return 0;

      const score = await this.contract.calculateCompositeScore(
        reps,
        formAccuracy,
        streak,
      );
      return score.toNumber();
    } catch (error) {
      console.error("Error calculating score:", error);
      return 0;
    }
  }

  // Get contract configuration
  async getContractConfig(): Promise<{
    submissionFee: string;
    cooldown: number;
    maxReps: number;
    minFormAccuracy: number;
    submissionsEnabled: boolean;
  }> {
    try {
      if (!this.contract) {
        return {
          submissionFee: CONTRACT_CONFIG.submissionFee,
          cooldown: CONTRACT_CONFIG.cooldownSeconds,
          maxReps: CONTRACT_CONFIG.maxRepsPerSession,
          minFormAccuracy: CONTRACT_CONFIG.minFormAccuracy,
          submissionsEnabled: true,
        };
      }

      const [
        feeConfig,
        cooldown,
        maxReps,
        minFormAccuracy,
        submissionsEnabled,
      ] = await Promise.all([
        this.contract.feeConfig(),
        this.contract.SUBMISSION_COOLDOWN(),
        this.contract.MAX_REPS_PER_SESSION(),
        this.contract.MIN_FORM_ACCURACY(),
        this.contract.submissionsEnabled(),
      ]);

      return {
        submissionFee: ethers.utils.formatEther(feeConfig.submissionFee),
        cooldown: cooldown.toNumber(),
        maxReps: maxReps.toNumber(),
        minFormAccuracy: minFormAccuracy.toNumber(),
        submissionsEnabled,
      };
    } catch (error) {
      console.error("Error getting contract config:", error);
      return {
        submissionFee: CONTRACT_CONFIG.submissionFee,
        cooldown: CONTRACT_CONFIG.cooldownSeconds,
        maxReps: CONTRACT_CONFIG.maxRepsPerSession,
        minFormAccuracy: CONTRACT_CONFIG.minFormAccuracy,
        submissionsEnabled: true,
      };
    }
  }

  // Subscribe to contract events
  subscribeToEvents(callbacks: {
    onScoreAdded?: (
      user: string,
      reps: number,
      formAccuracy: number,
      streak: number,
    ) => void;
    onSessionRecorded?: (user: string, sessionIndex: number) => void;
  }) {
    if (!this.contract) return;

    if (callbacks.onScoreAdded) {
      this.contract.on("AbsScoreAdded", (user, reps, formAccuracy, streak) => {
        callbacks.onScoreAdded?.(
          user,
          reps.toNumber(),
          formAccuracy.toNumber(),
          streak.toNumber(),
        );
      });
    }

    if (callbacks.onSessionRecorded) {
      this.contract.on("WorkoutSessionRecorded", (user, sessionIndex) => {
        callbacks.onSessionRecorded?.(user, sessionIndex.toNumber());
      });
    }
  }

  // Unsubscribe from events
  unsubscribeFromEvents() {
    if (this.contract) {
      this.contract.removeAllListeners();
    }
  }

  // Parse contract errors into user-friendly messages
  private parseContractError(error: unknown): ContractError {
    const errorObj = error as { message?: string; reason?: string };
    const message = errorObj?.message || errorObj?.reason || "Unknown error";

    // Parse specific contract errors
    if (message.includes("CooldownNotExpired")) {
      const match = message.match(/(\d+)/);
      const remainingTime = match ? parseInt(match[1]) : 60;
      return {
        code: "COOLDOWN_ACTIVE",
        message: `Please wait ${remainingTime} seconds before next submission`,
        remainingTime,
      };
    }

    if (message.includes("ScoreExceedsMaximum")) {
      return {
        code: "REPS_TOO_HIGH",
        message: `Maximum ${CONTRACT_CONFIG.maxRepsPerSession} reps allowed per session`,
        maxAllowed: CONTRACT_CONFIG.maxRepsPerSession,
      };
    }

    if (message.includes("FormAccuracyInvalid")) {
      return {
        code: "INVALID_FORM_ACCURACY",
        message: `Form accuracy must be between ${CONTRACT_CONFIG.minFormAccuracy}% and 100%`,
      };
    }

    if (message.includes("InsufficientFee")) {
      return {
        code: "INSUFFICIENT_FEE",
        message: `Submission requires ${CONTRACT_CONFIG.submissionFee} AVAX fee`,
      };
    }

    if (message.includes("user rejected")) {
      return {
        code: "USER_REJECTED",
        message: "Transaction was cancelled by user",
      };
    }

    if (message.includes("insufficient funds")) {
      return {
        code: "INSUFFICIENT_FUNDS",
        message: `You need at least ${CONTRACT_CONFIG.submissionFee} AVAX to submit`,
      };
    }

    return {
      code: "UNKNOWN_ERROR",
      message: "An unexpected error occurred. Please try again.",
    };
  }

  // Get transaction URL for explorer
  getTransactionUrl(txHash: string): string {
    return `${CONTRACT_CONFIG.explorerUrl}/tx/${txHash}`;
  }

  // Get contract URL for explorer
  getContractUrl(): string {
    return `${CONTRACT_CONFIG.explorerUrl}/address/${CONTRACT_CONFIG.address}`;
  }
}

// Singleton instance
export const imperfectAbsContract = new ImperfectAbsContract();

// Utility functions
export const formatScore = (score: number): string => {
  return score.toLocaleString();
};

export const formatDuration = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
};

export const formatTimestamp = (timestamp: number): string => {
  return new Date(timestamp * 1000).toLocaleDateString();
};

export const formatAddress = (address: string): string => {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};
