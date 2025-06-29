#!/usr/bin/env node

/**
 * Debug script for Chainlink Functions integration
 * Checks contract state and Chainlink configuration
 */

const { ethers } = require("ethers");
const fs = require("fs");
const path = require("path");

// Configuration
const CONFIG = {
  rpcUrl: "https://api.avax-test.network/ext/bc/C/rpc",
  contractAddress: "0xdf07bD5a057aBf76147231886C94FEb985151ebc", // Your deployed contract
  chainlinkRouter: "0xA9d587a00A31A52Ed70D6026794a8FC5E2F5dCb0",
  subscriptionId: 15675,
};

// Contract ABI (minimal for debugging)
const CONTRACT_ABI = [
  "function aiAnalysisEnabled() external view returns (bool)",
  "function subscriptionId() external view returns (uint64)",
  "function donID() external view returns (bytes32)",
  "function submissionsEnabled() external view returns (bool)",
  "function feeConfig() external view returns (tuple(uint256 submissionFee, uint256 rewardPool, uint256 platformFee))",
  "function getUserSessions(address user) external view returns (tuple(uint256 reps, uint256 formAccuracy, uint256 streak, uint256 duration, uint256 timestamp, uint256 enhancedScore, bool aiAnalysisComplete)[])",
  "event AIAnalysisRequested(address indexed user, bytes32 indexed requestId, uint256 sessionIndex)",
  "event AIAnalysisCompleted(address indexed user, bytes32 indexed requestId, uint256 enhancedScore, uint256 sessionIndex)",
  "event AIAnalysisFailed(address indexed user, bytes32 indexed requestId, uint256 sessionIndex, string reason)",
];

class ChainlinkDebugger {
  constructor() {
    this.provider = new ethers.providers.JsonRpcProvider(CONFIG.rpcUrl);
    this.contract = new ethers.Contract(
      CONFIG.contractAddress,
      CONTRACT_ABI,
      this.provider
    );
  }

  async checkContractState() {
    console.log("🔍 Checking contract state...");
    console.log("Contract Address:", CONFIG.contractAddress);

    try {
      const aiEnabled = await this.contract.aiAnalysisEnabled();
      const submissionsEnabled = await this.contract.submissionsEnabled();
      const subscriptionId = await this.contract.subscriptionId();
      const donID = await this.contract.donID();
      const feeConfig = await this.contract.feeConfig();

      console.log("\n📊 Contract Configuration:");
      console.log("- AI Analysis Enabled:", aiEnabled);
      console.log("- Submissions Enabled:", submissionsEnabled);
      console.log("- Subscription ID:", subscriptionId.toString());
      console.log("- DON ID:", ethers.utils.parseBytes32String(donID));
      console.log(
        "- Submission Fee:",
        ethers.utils.formatEther(feeConfig.submissionFee),
        "AVAX"
      );

      return {
        aiEnabled,
        submissionsEnabled,
        subscriptionId: subscriptionId.toString(),
        donID: ethers.utils.parseBytes32String(donID),
        submissionFee: ethers.utils.formatEther(feeConfig.submissionFee),
      };
    } catch (error) {
      console.error("❌ Error checking contract state:", error.message);
      throw error;
    }
  }

  async checkRecentEvents(userAddress = null, blockRange = 1000) {
    console.log("\n🔍 Checking recent Chainlink events...");

    try {
      const currentBlock = await this.provider.getBlockNumber();
      const fromBlock = currentBlock - blockRange;

      console.log(`Scanning blocks ${fromBlock} to ${currentBlock}`);

      // Check for AIAnalysisRequested events
      const requestedFilter =
        this.contract.filters.AIAnalysisRequested(userAddress);
      const requestedEvents = await this.contract.queryFilter(
        requestedFilter,
        fromBlock
      );

      console.log(
        `\n📤 AIAnalysisRequested Events (${requestedEvents.length}):`
      );
      requestedEvents.forEach((event, index) => {
        console.log(
          `  ${index + 1}. Block: ${event.blockNumber}, User: ${
            event.args.user
          }, RequestID: ${event.args.requestId}`
        );
      });

      // Check for AIAnalysisCompleted events
      const completedFilter =
        this.contract.filters.AIAnalysisCompleted(userAddress);
      const completedEvents = await this.contract.queryFilter(
        completedFilter,
        fromBlock
      );

      console.log(
        `\n✅ AIAnalysisCompleted Events (${completedEvents.length}):`
      );
      completedEvents.forEach((event, index) => {
        console.log(
          `  ${index + 1}. Block: ${event.blockNumber}, User: ${
            event.args.user
          }, RequestID: ${event.args.requestId}, Score: ${
            event.args.enhancedScore
          }`
        );
      });

      // Check for AIAnalysisFailed events
      const failedFilter = this.contract.filters.AIAnalysisFailed(userAddress);
      const failedEvents = await this.contract.queryFilter(
        failedFilter,
        fromBlock
      );

      console.log(`\n❌ AIAnalysisFailed Events (${failedEvents.length}):`);
      failedEvents.forEach((event, index) => {
        console.log(
          `  ${index + 1}. Block: ${event.blockNumber}, User: ${
            event.args.user
          }, RequestID: ${event.args.requestId}, Reason: ${event.args.reason}`
        );
      });

      return {
        requested: requestedEvents.length,
        completed: completedEvents.length,
        failed: failedEvents.length,
        events: {
          requested: requestedEvents,
          completed: completedEvents,
          failed: failedEvents,
        },
      };
    } catch (error) {
      console.error("❌ Error checking events:", error.message);
      throw error;
    }
  }

  async checkUserSessions(userAddress) {
    if (!userAddress) {
      console.log("\n⚠️ No user address provided, skipping session check");
      return;
    }

    console.log(`\n🔍 Checking sessions for user: ${userAddress}`);

    try {
      const sessions = await this.contract.getUserSessions(userAddress);

      console.log(`\n📊 User Sessions (${sessions.length}):`);
      sessions.forEach((session, index) => {
        console.log(`  Session ${index + 1}:`);
        console.log(`    - Reps: ${session.reps}`);
        console.log(`    - Form Accuracy: ${session.formAccuracy}%`);
        console.log(`    - Enhanced Score: ${session.enhancedScore}`);
        console.log(
          `    - AI Analysis Complete: ${session.aiAnalysisComplete}`
        );
        console.log(
          `    - Timestamp: ${new Date(session.timestamp * 1000).toISOString()}`
        );
      });

      return sessions;
    } catch (error) {
      console.error("❌ Error checking user sessions:", error.message);
      throw error;
    }
  }

  async runFullDiagnostic(userAddress = null) {
    console.log("🚀 Starting Chainlink Functions Diagnostic...\n");

    try {
      // Check contract state
      const contractState = await this.checkContractState();

      // Check recent events
      const eventSummary = await this.checkRecentEvents(userAddress);

      // Check user sessions if address provided
      if (userAddress) {
        await this.checkUserSessions(userAddress);
      }

      // Summary
      console.log("\n📋 DIAGNOSTIC SUMMARY:");
      console.log("=".repeat(50));
      console.log(
        `✅ Contract State: ${
          contractState.aiEnabled ? "AI Enabled" : "AI Disabled"
        }`
      );
      console.log(`📤 Recent Requests: ${eventSummary.requested}`);
      console.log(`✅ Completed Requests: ${eventSummary.completed}`);
      console.log(`❌ Failed Requests: ${eventSummary.failed}`);

      if (
        eventSummary.requested > 0 &&
        eventSummary.completed === 0 &&
        eventSummary.failed === 0
      ) {
        console.log(
          "\n⚠️  ISSUE DETECTED: Requests are being made but not fulfilled!"
        );
        console.log(
          "   This suggests a problem with Chainlink Functions execution."
        );
        console.log("   Check subscription balance and DON configuration.");
      } else if (eventSummary.failed > 0) {
        console.log("\n⚠️  ISSUE DETECTED: Some requests are failing!");
        console.log("   Check the failure reasons above for details.");
      } else if (eventSummary.requested === eventSummary.completed) {
        console.log("\n✅ All requests are being fulfilled successfully!");
      }
    } catch (error) {
      console.error("\n❌ Diagnostic failed:", error.message);
    }
  }
}

// Main execution
async function main() {
  const chainlinkDebugger = new ChainlinkDebugger();

  // Get user address from command line argument if provided
  const userAddress = process.argv[2];

  if (userAddress && !ethers.utils.isAddress(userAddress)) {
    console.error("❌ Invalid user address provided");
    process.exit(1);
  }

  await chainlinkDebugger.runFullDiagnostic(userAddress);
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { ChainlinkDebugger, CONFIG };
