const { ethers } = require("ethers");
const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");

// Load environment variables from root .env file
const rootDir = path.join(__dirname, "..");
dotenv.config({ path: path.join(rootDir, ".env") });

// Configuration for Avalanche Fuji Testnet
const CONFIG = {
  rpcUrl: "https://api.avax-test.network/ext/bc/C/rpc",
  chainId: 43113,
  privateKey: process.env.PRIVATE_KEY,
  // Contract Addresses
  contracts: {
    v3: "0xB832c2FB36851b771A05B33C29Ab7268F3622cEC", // V3 contract
    v4: "0xD5b2c90Ecffe69D6D7377D74f7371A177d7FfB0d", // V4 contract
    default:
      process.env.CONTRACT_ADDRESS ||
      "0xFBE99DcD3b2d93b1c8FFabC26427383dAAbA05d1",
  },
  // Chainlink Functions Configuration
  functions: {
    router: "0xA9d587a00A31A52Ed70D6026794a8FC5E2F5dCb0",
    linkToken: "0x0b9d5D9136855f6FEc3c0993feE6E9CE8a297846",
  },
  // Chainlink VRF Configuration for V3
  vrfV3: {
    vrfCoordinator: "0x2eD832Ba664535e5886b75D64C46EB9a228C2610",
  },
  // Chainlink VRF Configuration for V4 (v2.5)
  vrfV4: {
    vrfCoordinator: "0x5C210eF41CD1a72de73bF76eC39637bB0d3d7BEE",
  },
};

// Contract ABIs (minimal)
const CONTRACT_ABI_DEFAULT = [
  "function submitWorkoutSession(uint256 reps, uint256 formAccuracy, uint256 streak, uint256 duration) external payable",
  "function getLeaderboard() external view returns (tuple(address user, uint256 totalScore, uint256 totalReps, uint256 bestFormAccuracy, uint256 bestStreak, uint256 totalDuration)[])",
  "function getUserAbsScore(address user) external view returns (tuple(address user, uint256 totalScore, uint256 totalReps, uint256 bestFormAccuracy, uint256 bestStreak, uint256 totalDuration))",
  "function getUserSessionCount(address user) external view returns (uint256)",
  "function getUserSessions(address user) external view returns (tuple(uint256 reps, uint256 formAccuracy, uint256 streak, uint256 duration, uint256 score, uint256 timestamp, bool aiEnhanced)[])",
  "function feeConfig() external view returns (tuple(uint256 submissionFee, uint256 ownerPercentage, uint256 participantsPercentage))",
  "function getTimeUntilNextSubmission(address user) external view returns (uint256)",
  "function SUBMISSION_COOLDOWN() external view returns (uint256)",
  "function MIN_FORM_ACCURACY() external view returns (uint256)",
  "function MAX_REPS_PER_SESSION() external view returns (uint256)",
];

const CONTRACT_ABI_VRF_V3 = [
  "function getCurrentChallenge() external view returns (tuple(uint256 challengeType, uint256 target, uint256 bonusMultiplier, uint256 expiresAt, bool active))",
  "function manualChallengeUpdate() external",
];

const CONTRACT_ABI_VRF_V4 = [
  "function getCurrentChallenge() external view returns (tuple(uint256 challengeType, uint256 target, uint256 bonusMultiplier, uint256 expiresAt, bool active))",
  "function manualChallengeUpdate() external",
];

class ChainlinkTest {
  constructor() {
    this.provider = new ethers.providers.JsonRpcProvider(CONFIG.rpcUrl);
    this.signer = null;
  }

  async initialize(privateKey) {
    console.log("🔍 Initializing Chainlink Test Suite...");

    if (!privateKey) {
      throw new Error(
        "Private key required. Set PRIVATE_KEY environment variable."
      );
    }

    this.signer = new ethers.Wallet(privateKey, this.provider);

    const address = await this.signer.getAddress();
    console.log(`📍 Using address: ${address}`);

    // Check network
    const network = await this.provider.getNetwork();
    if (network.chainId !== CONFIG.chainId) {
      throw new Error(
        `Wrong network. Expected ${CONFIG.chainId}, got ${network.chainId}`
      );
    }

    console.log("✅ Connected to Avalanche Fuji Testnet");
  }

  async checkBalances() {
    console.log("\n💰 Checking balances...");

    const address = await this.signer.getAddress();

    // Check AVAX balance
    const avaxBalance = await this.provider.getBalance(address);
    console.log(`AVAX: ${ethers.utils.formatEther(avaxBalance)} AVAX`);

    if (avaxBalance.lt(ethers.utils.parseEther("0.1"))) {
      console.log(
        "⚠️ Low AVAX balance. Get test AVAX from: https://faucet.avax.network/"
      );
    }

    // Check LINK balance (assuming same token for Functions and VRF)
    const linkContract = new ethers.Contract(
      CONFIG.functions.linkToken,
      ["function balanceOf(address account) external view returns (uint256)"],
      this.signer
    );
    const linkBalance = await linkContract.balanceOf(address);
    console.log(`LINK: ${ethers.utils.formatEther(linkBalance)} LINK`);

    return {
      avax: ethers.utils.formatEther(avaxBalance),
      link: ethers.utils.formatEther(linkBalance),
    };
  }

  async testBasicSubmission(contractAddress) {
    console.log("\n🧪 Testing Basic Workout Submission...");

    try {
      const contract = new ethers.Contract(
        contractAddress,
        CONTRACT_ABI_DEFAULT,
        this.signer
      );
      const feeConfig = await contract.feeConfig();
      const submissionFee = feeConfig.submissionFee;
      console.log(
        `Submission Fee: ${ethers.utils.formatEther(submissionFee)} AVAX`
      );

      // Check cooldown
      const address = await this.signer.getAddress();
      const timeUntilNext = await contract.getTimeUntilNextSubmission(address);
      if (timeUntilNext.gt(0)) {
        console.log(
          `⚠️ Cooldown active. Can submit again in ${timeUntilNext.toString()} seconds.`
        );
        return false;
      }

      // Submit a workout session
      const reps = 25;
      const formAccuracy = 80;
      const streak = 5;
      const duration = 300;
      console.log(
        `Submitting workout: ${reps} reps, ${formAccuracy}% form accuracy, streak of ${streak}, duration ${duration}s`
      );

      const tx = await contract.submitWorkoutSession(
        reps,
        formAccuracy,
        streak,
        duration,
        { value: submissionFee }
      );
      console.log(`Transaction sent: ${tx.hash}`);
      await tx.wait();
      console.log("✅ Workout submission successful");

      // Check user session count
      const sessionCount = await contract.getUserSessionCount(address);
      console.log(`User session count: ${sessionCount.toString()}`);

      // Check user score
      const userScore = await contract.getUserAbsScore(address);
      console.log("User Score Details:");
      console.log(`  Total Score: ${userScore.totalScore.toString()}`);
      console.log(`  Total Reps: ${userScore.totalReps.toString()}`);
      console.log(
        `  Best Form Accuracy: ${userScore.bestFormAccuracy.toString()}%`
      );
      console.log(`  Best Streak: ${userScore.bestStreak.toString()}`);
      console.log(`  Total Duration: ${userScore.totalDuration.toString()}s`);

      return true;
    } catch (error) {
      console.error("❌ Failed to test basic submission:", error.message);
      if (error.reason) console.error("Reason:", error.reason);
      return false;
    }
  }

  async testCompleteIntegration(contractAddress) {
    console.log("\n🧪 Testing Complete Integration...");

    try {
      const contract = new ethers.Contract(
        contractAddress,
        CONTRACT_ABI_DEFAULT,
        this.signer
      );
      const feeConfig = await contract.feeConfig();
      const submissionFee = feeConfig.submissionFee;

      // Check cooldown
      const address = await this.signer.getAddress();
      const timeUntilNext = await contract.getTimeUntilNextSubmission(address);
      if (timeUntilNext.gt(0)) {
        console.log(
          `⚠️ Cooldown active. Can submit again in ${timeUntilNext.toString()} seconds.`
        );
        return false;
      }

      // Submit multiple workout sessions to test integration
      const workouts = [
        { reps: 20, formAccuracy: 75, streak: 3, duration: 240 },
        { reps: 30, formAccuracy: 85, streak: 4, duration: 360 },
      ];

      for (const workout of workouts) {
        console.log(
          `Submitting workout: ${workout.reps} reps, ${workout.formAccuracy}% form accuracy, streak of ${workout.streak}, duration ${workout.duration}s`
        );
        const tx = await contract.submitWorkoutSession(
          workout.reps,
          workout.formAccuracy,
          workout.streak,
          workout.duration,
          { value: submissionFee }
        );
        console.log(`Transaction sent: ${tx.hash}`);
        await tx.wait();
        console.log("✅ Workout submission successful");
      }

      // Check leaderboard
      const leaderboard = await contract.getLeaderboard();
      console.log("Leaderboard (Top Entries):");
      for (let i = 0; i < Math.min(3, leaderboard.length); i++) {
        const entry = leaderboard[i];
        console.log(
          `  Rank ${i + 1}: Address ${
            entry.user
          }, Total Score: ${entry.totalScore.toString()}, Total Reps: ${entry.totalReps.toString()}`
        );
      }

      // Check user sessions
      const userSessions = await contract.getUserSessions(address);
      console.log("User Sessions:");
      for (const session of userSessions) {
        console.log(
          `  Session: ${session.reps.toString()} reps, Score: ${session.score.toString()}, Timestamp: ${session.timestamp.toString()}`
        );
      }

      return true;
    } catch (error) {
      console.error("❌ Failed to test complete integration:", error.message);
      if (error.reason) console.error("Reason:", error.reason);
      return false;
    }
  }

  async testUserFlow(contractAddress) {
    console.log("\n🧪 Testing User Flow...");

    try {
      const contract = new ethers.Contract(
        contractAddress,
        CONTRACT_ABI_DEFAULT,
        this.signer
      );
      const feeConfig = await contract.feeConfig();
      const submissionFee = feeConfig.submissionFee;

      // Check cooldown
      const address = await this.signer.getAddress();
      const timeUntilNext = await contract.getTimeUntilNextSubmission(address);
      if (timeUntilNext.gt(0)) {
        console.log(
          `⚠️ Cooldown active. Can submit again in ${timeUntilNext.toString()} seconds.`
        );
        return false;
      }

      // Simulate a new user flow: initial submission
      const initialWorkout = {
        reps: 15,
        formAccuracy: 70,
        streak: 1,
        duration: 180,
      };
      console.log(
        `Submitting initial workout: ${initialWorkout.reps} reps, ${initialWorkout.formAccuracy}% form accuracy, streak of ${initialWorkout.streak}, duration ${initialWorkout.duration}s`
      );
      const tx = await contract.submitWorkoutSession(
        initialWorkout.reps,
        initialWorkout.formAccuracy,
        initialWorkout.streak,
        initialWorkout.duration,
        { value: submissionFee }
      );
      console.log(`Transaction sent: ${tx.hash}`);
      await tx.wait();
      console.log("✅ Initial workout submission successful");

      // Check user score after submission
      const userScore = await contract.getUserAbsScore(address);
      console.log("User Score After Submission:");
      console.log(`  Total Score: ${userScore.totalScore.toString()}`);
      console.log(`  Total Reps: ${userScore.totalReps.toString()}`);

      return true;
    } catch (error) {
      console.error("❌ Failed to test user flow:", error.message);
      if (error.reason) console.error("Reason:", error.reason);
      return false;
    }
  }

  async testVRFChallenge(contractAddress, version) {
    console.log(`\n🧪 Testing VRF Challenge for ${version}...`);

    try {
      const abi = version === "V3" ? CONTRACT_ABI_VRF_V3 : CONTRACT_ABI_VRF_V4;
      const contract = new ethers.Contract(contractAddress, abi, this.signer);

      const challengeBefore = await contract.getCurrentChallenge();
      console.log("Current Challenge Before Test:");
      console.log("  Type:", challengeBefore.challengeType.toString());
      console.log("  Target:", challengeBefore.target.toString());
      console.log("  Active:", challengeBefore.active);

      // Request a new challenge
      console.log("Requesting new challenge...");
      const tx = await contract.manualChallengeUpdate(
        version === "V4" ? { gasLimit: 300000 } : {}
      );
      await tx.wait();
      console.log("✅ New challenge generation requested");

      console.log(`\n⏳ Waiting 30 seconds for VRF response for ${version}...`);
      await new Promise((resolve) => setTimeout(resolve, 30000));

      const challengeAfter = await contract.getCurrentChallenge();
      console.log("Current Challenge After Test:");
      console.log("  Type:", challengeAfter.challengeType.toString());
      console.log("  Target:", challengeAfter.target.toString());
      console.log("  Active:", challengeAfter.active);

      if (challengeAfter.active && challengeAfter.target.gt(0)) {
        console.log(`\n🎉 SUCCESS! VRF integration is working for ${version}!`);
        return true;
      } else {
        console.log(
          `\n⚠️ Challenge not yet generated. VRF might still be processing for ${version}...`
        );
        console.log("Try checking again in a few minutes.");
        return false;
      }
    } catch (error) {
      console.error(
        `❌ Failed to test VRF challenge for ${version}:`,
        error.message
      );
      return false;
    }
  }

  async runAllTests(contractAddress, version) {
    console.log("\n🧪 Running All Tests...");

    const results = {
      basicSubmission: false,
      completeIntegration: false,
      userFlow: false,
      vrfChallenge: version ? false : undefined,
    };

    results.basicSubmission = await this.testBasicSubmission(contractAddress);
    results.completeIntegration = await this.testCompleteIntegration(
      contractAddress
    );
    results.userFlow = await this.testUserFlow(contractAddress);

    if (version) {
      results.vrfChallenge = await this.testVRFChallenge(
        contractAddress,
        version
      );
    }

    console.log("\n📊 Test Results Summary:");
    console.log(
      `Basic Submission: ${results.basicSubmission ? "✅ Passed" : "❌ Failed"}`
    );
    console.log(
      `Complete Integration: ${
        results.completeIntegration ? "✅ Passed" : "❌ Failed"
      }`
    );
    console.log(`User Flow: ${results.userFlow ? "✅ Passed" : "❌ Failed"}`);
    if (version) {
      console.log(
        `VRF Challenge (${version}): ${
          results.vrfChallenge ? "✅ Passed" : "❌ Failed"
        }`
      );
    }

    return results;
  }
}

async function runTests(testType, contractVersion) {
  console.log(
    `🚀 Running ${testType || "All"} Tests for Imperfect Abs${
      contractVersion ? ` (${contractVersion})` : ""
    }`
  );
  console.log("===============================================\n");

  const tester = new ChainlinkTest();

  try {
    const privateKey = CONFIG.privateKey;
    if (!privateKey) {
      console.log("❌ Please set PRIVATE_KEY environment variable");
      process.exit(1);
    }

    if (!privateKey.match(/^[a-fA-F0-9]{64}$/)) {
      console.log("❌ Invalid private key format");
      console.log(
        "Private key should be 64 hex characters (without 0x prefix)"
      );
      process.exit(1);
    }

    await tester.initialize(privateKey);
    await tester.checkBalances();

    const contractAddress =
      contractVersion === "V3"
        ? CONFIG.contracts.v3
        : contractVersion === "V4"
        ? CONFIG.contracts.v4
        : CONFIG.contracts.default;

    if (testType === "basic-submission") {
      await tester.testBasicSubmission(contractAddress);
    } else if (testType === "complete-integration") {
      await tester.testCompleteIntegration(contractAddress);
    } else if (testType === "user-flow") {
      await tester.testUserFlow(contractAddress);
    } else if (testType === "vrf-challenge" && contractVersion) {
      await tester.testVRFChallenge(contractAddress, contractVersion);
    } else {
      await tester.runAllTests(contractAddress, contractVersion);
    }

    console.log("\n🎉 Testing complete!");
  } catch (error) {
    console.error("\n❌ Test suite failed:", error.message);
    process.exit(1);
  }
}

// Run tests based on command line arguments
if (require.main === module) {
  const args = process.argv.slice(2);
  const testType = args[0] || undefined;
  const contractVersion = args[1] || undefined;
  runTests(testType, contractVersion);
}

module.exports = { ChainlinkTest, runTests };
