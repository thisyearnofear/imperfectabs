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
    subscriptionId:
      "36696123203907487346372099809332344923918001683502737413897043327797370994639",
  },
};

// Router ABI (minimal)
const ROUTER_ABI = [
  "function getSubscription(uint64 subscriptionId) external view returns (uint96 balance, address owner, address[] memory consumers)",
  "function getConfig() external view returns (uint16, uint32, bytes32[] memory)",
];

// VRF Coordinator ABIs (minimal)
const VRF_COORDINATOR_ABI_V3 = [
  "function getSubscription(uint64 subId) external view returns (uint96 balance, uint64 reqCount, address owner, address[] memory consumers)",
];

const VRF_COORDINATOR_ABI_V4 = [
  "function getSubscription(uint256 subId) external view returns (uint96 balance, uint96 nativeBalance, uint64 reqCount, address owner, address[] memory consumers)",
];

// Contract ABIs (minimal)
const CONTRACT_ABI_DEFAULT = [
  "function getUserSessionCount(address user) external view returns (uint256)",
  "function getUserSessions(address user) external view returns (tuple(uint256 reps, uint256 formAccuracy, uint256 streak, uint256 duration, uint256 score, uint256 timestamp, bool aiEnhanced)[])",
  "function getTimeUntilNextSubmission(address user) external view returns (uint256)",
  "function SUBMISSION_COOLDOWN() external view returns (uint256)",
  "function feeConfig() external view returns (tuple(uint256 submissionFee, uint256 ownerPercentage, uint256 participantsPercentage))",
];

const CONTRACT_ABI_VRF = [
  "function getCurrentChallenge() external view returns (tuple(uint256 challengeType, uint256 target, uint256 bonusMultiplier, uint256 expiresAt, bool active))",
  "function s_subscriptionId() external view returns (uint256)",
  "function i_vrfCoordinator() external view returns (address)",
];

class ChainlinkDebug {
  constructor() {
    this.provider = new ethers.providers.JsonRpcProvider(CONFIG.rpcUrl);
    this.signer = null;
  }

  async initialize(privateKey) {
    console.log("🔍 Initializing Chainlink Debug Tools...");

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

  async debugChainlinkFunctions(subscriptionId) {
    console.log("\n🔍 Debugging Chainlink Functions Integration...");

    try {
      const routerContract = new ethers.Contract(
        CONFIG.functions.router,
        ROUTER_ABI,
        this.signer
      );
      console.log(`Router Address: ${CONFIG.functions.router}`);

      // Check subscription details
      console.log(`\n📊 Subscription ID: ${subscriptionId}`);
      const subscriptionDetails = await routerContract.getSubscription(
        subscriptionId
      );
      console.log(
        `Balance: ${ethers.utils.formatEther(subscriptionDetails.balance)} LINK`
      );
      console.log(`Owner: ${subscriptionDetails.owner}`);
      console.log(`Consumers: ${subscriptionDetails.consumers.length}`);
      for (let i = 0; i < subscriptionDetails.consumers.length; i++) {
        console.log(`  Consumer ${i + 1}: ${subscriptionDetails.consumers[i]}`);
      }

      // Check router configuration
      const config = await routerContract.getConfig();
      console.log("\n⚙️ Router Configuration:");
      console.log(`  Minimum Gas Limit: ${config[0].toString()}`);
      console.log(`  Gas Per DON Transmission: ${config[1].toString()}`);
      console.log(`  DON IDs: ${config[2].length}`);

      return true;
    } catch (error) {
      console.error("❌ Failed to debug Chainlink Functions:", error.message);
      if (error.reason) console.error("Reason:", error.reason);
      return false;
    }
  }

  async debugContractSubmission(contractAddress) {
    console.log("\n🔍 Debugging Contract Submission...");

    try {
      const contract = new ethers.Contract(
        contractAddress,
        CONTRACT_ABI_DEFAULT,
        this.signer
      );
      console.log(`Contract Address: ${contractAddress}`);

      // Check contract fee configuration
      const feeConfig = await contract.feeConfig();
      console.log("\n💰 Fee Configuration:");
      console.log(
        `  Submission Fee: ${ethers.utils.formatEther(
          feeConfig.submissionFee
        )} AVAX`
      );
      console.log(
        `  Owner Percentage: ${feeConfig.ownerPercentage.toString()}%`
      );
      console.log(
        `  Participants Percentage: ${feeConfig.participantsPercentage.toString()}%`
      );

      // Check cooldown configuration
      const cooldown = await contract.SUBMISSION_COOLDOWN();
      console.log(`\n⏳ Submission Cooldown: ${cooldown.toString()} seconds`);

      // Check user submission status
      const address = await this.signer.getAddress();
      const timeUntilNext = await contract.getTimeUntilNextSubmission(address);
      console.log(
        `Time Until Next Submission: ${timeUntilNext.toString()} seconds`
      );

      // Check user sessions
      const sessionCount = await contract.getUserSessionCount(address);
      console.log(`User Session Count: ${sessionCount.toString()}`);

      if (sessionCount.gt(0)) {
        const sessions = await contract.getUserSessions(address);
        console.log("\n📋 User Sessions:");
        for (let i = 0; i < sessions.length; i++) {
          const session = sessions[i];
          console.log(`  Session ${i + 1}:`);
          console.log(`    Reps: ${session.reps.toString()}`);
          console.log(`    Form Accuracy: ${session.formAccuracy.toString()}%`);
          console.log(`    Score: ${session.score.toString()}`);
          console.log(`    Timestamp: ${session.timestamp.toString()}`);
          console.log(`    AI Enhanced: ${session.aiEnhanced}`);
        }
      }

      return true;
    } catch (error) {
      console.error("❌ Failed to debug contract submission:", error.message);
      if (error.reason) console.error("Reason:", error.reason);
      return false;
    }
  }

  async debugVRFIntegration(contractAddress, version) {
    console.log(`\n🔍 Debugging VRF Integration for ${version}...`);

    try {
      const contract = new ethers.Contract(
        contractAddress,
        CONTRACT_ABI_VRF,
        this.signer
      );
      console.log(`Contract Address: ${contractAddress}`);

      // Check VRF configuration
      const subscriptionId = await contract.s_subscriptionId();
      const coordinator = await contract.i_vrfCoordinator();
      console.log("\n⚙️ VRF Configuration:");
      console.log(`  Subscription ID: ${subscriptionId.toString()}`);
      console.log(`  Coordinator: ${coordinator}`);

      // Check current challenge
      const challenge = await contract.getCurrentChallenge();
      console.log("\n🎯 Current Challenge:");
      console.log(`  Type: ${challenge.challengeType.toString()}`);
      console.log(`  Target: ${challenge.target.toString()}`);
      console.log(
        `  Bonus Multiplier: ${challenge.bonusMultiplier.toString()}`
      );
      console.log(
        `  Expires At: ${new Date(
          challenge.expiresAt.toNumber() * 1000
        ).toISOString()}`
      );
      console.log(`  Active: ${challenge.active}`);

      // Check VRF subscription details
      const vrfCoordinatorAddress =
        version === "V3"
          ? CONFIG.vrfV3.vrfCoordinator
          : CONFIG.vrfV4.vrfCoordinator;
      const vrfCoordinatorABI =
        version === "V3" ? VRF_COORDINATOR_ABI_V3 : VRF_COORDINATOR_ABI_V4;
      const vrfCoordinator = new ethers.Contract(
        vrfCoordinatorAddress,
        vrfCoordinatorABI,
        this.signer
      );
      console.log(
        `\n📊 VRF Subscription Details (ID: ${subscriptionId.toString()}):`
      );

      if (version === "V3") {
        const subscriptionDetails = await vrfCoordinator.getSubscription(
          subscriptionId
        );
        console.log(
          `  Balance: ${ethers.utils.formatEther(
            subscriptionDetails.balance
          )} LINK`
        );
        console.log(
          `  Request Count: ${subscriptionDetails.reqCount.toString()}`
        );
        console.log(`  Owner: ${subscriptionDetails.owner}`);
        console.log(`  Consumers: ${subscriptionDetails.consumers.length}`);
        for (let i = 0; i < subscriptionDetails.consumers.length; i++) {
          console.log(
            `    Consumer ${i + 1}: ${subscriptionDetails.consumers[i]}`
          );
        }
      } else {
        const subscriptionDetails = await vrfCoordinator.getSubscription(
          subscriptionId
        );
        console.log(
          `  Balance: ${ethers.utils.formatEther(
            subscriptionDetails.balance
          )} LINK`
        );
        console.log(
          `  Request Count: ${subscriptionDetails.reqCount.toString()}`
        );
        console.log(`  Owner: ${subscriptionDetails.owner}`);
        console.log(`  Consumers: ${subscriptionDetails.consumers.length}`);
        for (let i = 0; i < subscriptionDetails.consumers.length; i++) {
          console.log(
            `    Consumer ${i + 1}: ${subscriptionDetails.consumers[i]}`
          );
        }
      }

      return true;
    } catch (error) {
      console.error(
        `❌ Failed to debug VRF integration for ${version}:`,
        error.message
      );
      if (error.reason) console.error("Reason:", error.reason);
      return false;
    }
  }

  async runAllDebugs(contractAddress, subscriptionId, version) {
    console.log("\n🔍 Running All Debug Tools...");

    const results = {
      chainlinkFunctions: false,
      contractSubmission: false,
      vrfIntegration: version ? false : undefined,
    };

    results.chainlinkFunctions = await this.debugChainlinkFunctions(
      subscriptionId
    );
    results.contractSubmission = await this.debugContractSubmission(
      contractAddress
    );

    if (version) {
      results.vrfIntegration = await this.debugVRFIntegration(
        contractAddress,
        version
      );
    }

    console.log("\n📊 Debug Results Summary:");
    console.log(
      `Chainlink Functions: ${
        results.chainlinkFunctions ? "✅ Completed" : "❌ Failed"
      }`
    );
    console.log(
      `Contract Submission: ${
        results.contractSubmission ? "✅ Completed" : "❌ Failed"
      }`
    );
    if (version) {
      console.log(
        `VRF Integration (${version}): ${
          results.vrfIntegration ? "✅ Completed" : "❌ Failed"
        }`
      );
    }

    return results;
  }
}

async function runDebug(debugType, contractVersion, subscriptionId) {
  console.log(
    `🚀 Running ${debugType || "All"} Debug for Imperfect Abs${
      contractVersion ? ` (${contractVersion})` : ""
    }`
  );
  console.log("===============================================\n");

  const debuggerTool = new ChainlinkDebug();

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

    await debuggerTool.initialize(privateKey);

    const contractAddress =
      contractVersion === "V3"
        ? CONFIG.contracts.v3
        : contractVersion === "V4"
        ? CONFIG.contracts.v4
        : CONFIG.contracts.default;
    const subId =
      subscriptionId ||
      process.env.NEXT_PUBLIC_CHAINLINK_SUBSCRIPTION_ID ||
      15675;

    if (debugType === "chainlink-functions") {
      await debuggerTool.debugChainlinkFunctions(subId);
    } else if (debugType === "contract-submission") {
      await debuggerTool.debugContractSubmission(contractAddress);
    } else if (debugType === "vrf-integration" && contractVersion) {
      await debuggerTool.debugVRFIntegration(contractAddress, contractVersion);
    } else {
      await debuggerTool.runAllDebugs(contractAddress, subId, contractVersion);
    }

    console.log("\n🎉 Debugging complete!");
  } catch (error) {
    console.error("\n❌ Debug suite failed:", error.message);
    process.exit(1);
  }
}

// Run debug based on command line arguments
if (require.main === module) {
  const args = process.argv.slice(2);
  const debugType = args[0] || undefined;
  const contractVersion = args[1] || undefined;
  const subscriptionId = args[2] || undefined;
  runDebug(debugType, contractVersion, subscriptionId);
}

module.exports = { ChainlinkDebug, runDebug };
