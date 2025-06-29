#!/usr/bin/env node

/**
 * Test script to simulate the user flow for Chainlink Functions
 * This helps debug the exact flow that users experience
 */

const { ethers } = require("ethers");

// Configuration
const CONFIG = {
  rpcUrl: "https://api.avax-test.network/ext/bc/C/rpc",
  contractAddress: "0xdf07bD5a057aBf76147231886C94FEb985151ebc",
  privateKey: process.env.PRIVATE_KEY, // Set this in your environment
};

// Contract ABI for testing
const CONTRACT_ABI = [
  "function submitWorkoutSession(uint256 _reps, uint256 _formAccuracy, uint256 _streak, uint256 _duration) external payable",
  "function feeConfig() external view returns (tuple(uint256 submissionFee, uint256 rewardPool, uint256 platformFee))",
  "function aiAnalysisEnabled() external view returns (bool)",
  "event AbsScoreAdded(address indexed user, uint256 reps, uint256 formAccuracy, uint256 streak, uint256 timestamp)",
  "event AIAnalysisRequested(address indexed user, bytes32 indexed requestId, uint256 sessionIndex)",
  "event AIAnalysisCompleted(address indexed user, bytes32 indexed requestId, uint256 enhancedScore, uint256 sessionIndex)",
  "event AIAnalysisFailed(address indexed user, bytes32 indexed requestId, uint256 sessionIndex, string reason)"
];

class UserFlowTester {
  constructor() {
    if (!CONFIG.privateKey) {
      throw new Error("Please set PRIVATE_KEY environment variable");
    }
    
    this.provider = new ethers.providers.JsonRpcProvider(CONFIG.rpcUrl);
    this.wallet = new ethers.Wallet(CONFIG.privateKey, this.provider);
    this.contract = new ethers.Contract(CONFIG.contractAddress, CONTRACT_ABI, this.wallet);
    
    console.log("🔗 Connected to Avalanche Fuji");
    console.log("👤 Wallet Address:", this.wallet.address);
    console.log("📄 Contract Address:", CONFIG.contractAddress);
  }

  async checkPrerequisites() {
    console.log("\n🔍 Checking prerequisites...");
    
    try {
      // Check wallet balance
      const balance = await this.wallet.getBalance();
      console.log("💰 Wallet Balance:", ethers.utils.formatEther(balance), "AVAX");
      
      if (balance.lt(ethers.utils.parseEther("0.1"))) {
        console.log("⚠️  Low AVAX balance. You may need more for gas fees.");
      }

      // Check contract state
      const aiEnabled = await this.contract.aiAnalysisEnabled();
      const feeConfig = await this.contract.feeConfig();
      
      console.log("🤖 AI Analysis Enabled:", aiEnabled);
      console.log("💸 Submission Fee:", ethers.utils.formatEther(feeConfig.submissionFee), "AVAX");
      
      return {
        balance: ethers.utils.formatEther(balance),
        aiEnabled,
        submissionFee: feeConfig.submissionFee
      };
    } catch (error) {
      console.error("❌ Error checking prerequisites:", error.message);
      throw error;
    }
  }

  async simulateWorkoutSubmission() {
    console.log("\n🏋️ Simulating workout submission...");
    
    // Sample workout data
    const workoutData = {
      reps: 25,
      formAccuracy: 85,
      streak: 15,
      duration: 120 // 2 minutes
    };
    
    console.log("📊 Workout Data:", workoutData);
    
    try {
      // Get submission fee
      const feeConfig = await this.contract.feeConfig();
      const submissionFee = feeConfig.submissionFee;
      
      console.log("💰 Paying submission fee:", ethers.utils.formatEther(submissionFee), "AVAX");
      
      // Submit workout session
      console.log("📤 Submitting workout session...");
      const tx = await this.contract.submitWorkoutSession(
        workoutData.reps,
        workoutData.formAccuracy,
        workoutData.streak,
        workoutData.duration,
        {
          value: submissionFee,
          gasLimit: 500000 // Higher gas limit for Chainlink Functions
        }
      );
      
      console.log("🔗 Transaction Hash:", tx.hash);
      console.log("⏳ Waiting for confirmation...");
      
      const receipt = await tx.wait();
      console.log("✅ Transaction confirmed in block:", receipt.blockNumber);
      console.log("⛽ Gas Used:", receipt.gasUsed.toString());
      
      // Parse events
      console.log("\n📋 Transaction Events:");
      receipt.events?.forEach((event, index) => {
        console.log(`  ${index + 1}. ${event.event || 'Unknown Event'}`);
        if (event.event === 'AIAnalysisRequested') {
          console.log(`     🔗 Request ID: ${event.args.requestId}`);
          console.log(`     👤 User: ${event.args.user}`);
          console.log(`     📊 Session Index: ${event.args.sessionIndex}`);
        }
      });
      
      // Extract Chainlink request ID if available
      const aiRequestEvent = receipt.events?.find(e => e.event === 'AIAnalysisRequested');
      const requestId = aiRequestEvent?.args?.requestId;
      
      if (requestId) {
        console.log("\n🎯 Chainlink Request ID found:", requestId);
        return { success: true, txHash: receipt.transactionHash, requestId };
      } else {
        console.log("\n⚠️  No Chainlink request ID found in events");
        return { success: true, txHash: receipt.transactionHash, requestId: null };
      }
      
    } catch (error) {
      console.error("❌ Error submitting workout:", error.message);
      if (error.reason) {
        console.error("Reason:", error.reason);
      }
      throw error;
    }
  }

  async monitorChainlinkResponse(requestId, timeoutMinutes = 5) {
    if (!requestId) {
      console.log("⚠️  No request ID to monitor");
      return;
    }
    
    console.log(`\n👀 Monitoring Chainlink response for request: ${requestId}`);
    console.log(`⏰ Timeout: ${timeoutMinutes} minutes`);
    
    const startTime = Date.now();
    const timeoutMs = timeoutMinutes * 60 * 1000;
    let attempts = 0;
    
    return new Promise((resolve) => {
      const checkInterval = setInterval(async () => {
        attempts++;
        const elapsed = Date.now() - startTime;
        
        console.log(`🔍 Check ${attempts} (${Math.round(elapsed/1000)}s elapsed)`);
        
        if (elapsed > timeoutMs) {
          clearInterval(checkInterval);
          console.log("⏰ Timeout reached - no response received");
          resolve({ status: 'timeout' });
          return;
        }
        
        try {
          // Check for completion events
          const completedFilter = this.contract.filters.AIAnalysisCompleted(this.wallet.address, requestId);
          const completedEvents = await this.contract.queryFilter(completedFilter, -100);
          
          if (completedEvents.length > 0) {
            clearInterval(checkInterval);
            const event = completedEvents[0];
            console.log("✅ AI Analysis Completed!");
            console.log("📊 Enhanced Score:", event.args.enhancedScore.toString());
            console.log("🔗 Fulfillment TX:", event.transactionHash);
            resolve({ 
              status: 'completed', 
              enhancedScore: event.args.enhancedScore.toString(),
              txHash: event.transactionHash 
            });
            return;
          }
          
          // Check for failure events
          const failedFilter = this.contract.filters.AIAnalysisFailed(this.wallet.address, requestId);
          const failedEvents = await this.contract.queryFilter(failedFilter, -100);
          
          if (failedEvents.length > 0) {
            clearInterval(checkInterval);
            const event = failedEvents[0];
            console.log("❌ AI Analysis Failed!");
            console.log("📝 Reason:", event.args.reason);
            console.log("🔗 Failure TX:", event.transactionHash);
            resolve({ 
              status: 'failed', 
              reason: event.args.reason,
              txHash: event.transactionHash 
            });
            return;
          }
          
        } catch (error) {
          console.error("❌ Error checking for response:", error.message);
        }
      }, 10000); // Check every 10 seconds
    });
  }

  async runFullTest() {
    console.log("🚀 Starting Full User Flow Test");
    console.log("=".repeat(50));
    
    try {
      // Step 1: Check prerequisites
      await this.checkPrerequisites();
      
      // Step 2: Submit workout
      const submission = await this.simulateWorkoutSubmission();
      
      // Step 3: Monitor response
      if (submission.requestId) {
        const response = await this.monitorChainlinkResponse(submission.requestId);
        
        console.log("\n📋 FINAL RESULT:");
        console.log("=".repeat(30));
        console.log("Submission TX:", submission.txHash);
        console.log("Request ID:", submission.requestId);
        console.log("Response Status:", response.status);
        
        if (response.status === 'completed') {
          console.log("Enhanced Score:", response.enhancedScore);
          console.log("✅ SUCCESS: Full flow completed!");
        } else if (response.status === 'failed') {
          console.log("Failure Reason:", response.reason);
          console.log("❌ FAILED: Chainlink Functions failed");
        } else {
          console.log("⏰ TIMEOUT: No response received");
        }
      } else {
        console.log("\n❌ ISSUE: No Chainlink request was created");
      }
      
    } catch (error) {
      console.error("\n💥 Test failed:", error.message);
    }
  }
}

// Main execution
async function main() {
  if (!process.env.PRIVATE_KEY) {
    console.error("❌ Please set PRIVATE_KEY environment variable");
    console.log("Example: PRIVATE_KEY=0x... node scripts/test-user-flow.js");
    process.exit(1);
  }
  
  const tester = new UserFlowTester();
  await tester.runFullTest();
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { UserFlowTester };
