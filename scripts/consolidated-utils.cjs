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
  // Function source file path
  functionSourcePath: path.join(rootDir, "functions/fitness-analysis.js"),
};

// Router ABI (minimal)
const ROUTER_ABI = [
  "function getSubscription(uint64 subscriptionId) external view returns (uint96 balance, address owner, address[] memory consumers)",
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
  "function updateFunctionSource(string source) external",
  "function updateGasLimit(uint32 newLimit) external",
  "function getTimeUntilNextSubmission(address user) external view returns (uint256)",
  "function SUBMISSION_COOLDOWN() external view returns (uint256)",
  "function owner() external view returns (address)",
];

const CONTRACT_ABI_VRF = [
  "function s_subscriptionId() external view returns (uint256)",
  "function i_vrfCoordinator() external view returns (address)",
  "function updateVRFConfig(uint64 subscriptionId, bytes32 keyHash) external",
  "function updateKeyHash(bytes32 newKeyHash) external",
];

class ChainlinkUtils {
  constructor() {
    this.provider = new ethers.providers.JsonRpcProvider(CONFIG.rpcUrl);
    this.signer = null;
  }

  async initialize(privateKey) {
    console.log("🔧 Initializing Chainlink Utility Tools...");

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

  async updateFunctionsSource(contractAddress) {
    console.log("\n🔄 Updating Chainlink Functions Source...");

    try {
      const contract = new ethers.Contract(
        contractAddress,
        CONTRACT_ABI_DEFAULT,
        this.signer
      );
      console.log(`Contract Address: ${contractAddress}`);

      // Read the function source code
      if (!fs.existsSync(CONFIG.functionSourcePath)) {
        console.error(
          `❌ Function source file not found at: ${CONFIG.functionSourcePath}`
        );
        return false;
      }

      const sourceCode = fs.readFileSync(CONFIG.functionSourcePath, "utf8");
      console.log(`Function Source Length: ${sourceCode.length} characters`);

      // Update the function source on the contract
      const tx = await contract.updateFunctionSource(sourceCode);
      console.log(`Transaction sent: ${tx.hash}`);
      await tx.wait();
      console.log("✅ Function source updated successfully");

      return true;
    } catch (error) {
      console.error("❌ Failed to update function source:", error.message);
      if (error.reason) console.error("Reason:", error.reason);
      return false;
    }
  }

  async updateGasLimit(contractAddress, newGasLimit) {
    console.log(`\n🔄 Updating Gas Limit to ${newGasLimit}...`);

    try {
      const contract = new ethers.Contract(
        contractAddress,
        CONTRACT_ABI_DEFAULT,
        this.signer
      );
      console.log(`Contract Address: ${contractAddress}`);

      // Update the gas limit on the contract
      const tx = await contract.updateGasLimit(newGasLimit);
      console.log(`Transaction sent: ${tx.hash}`);
      await tx.wait();
      console.log(`✅ Gas limit updated to ${newGasLimit}`);

      return true;
    } catch (error) {
      console.error("❌ Failed to update gas limit:", error.message);
      if (error.reason) console.error("Reason:", error.reason);
      return false;
    }
  }

  async checkChainlinkResponse(subscriptionId) {
    console.log("\n🔍 Checking Chainlink Functions Response...");

    try {
      const routerContract = new ethers.Contract(
        CONFIG.functions.router,
        ROUTER_ABI,
        this.signer
      );
      console.log(`Router Address: ${CONFIG.functions.router}`);

      // Check subscription details for any response activity
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

      console.log(
        "\nℹ️ Note: Detailed response logs are typically available in the Chainlink Functions dashboard."
      );
      console.log("Visit: https://functions.chain.link/fuji/" + subscriptionId);

      return true;
    } catch (error) {
      console.error("❌ Failed to check Chainlink response:", error.message);
      if (error.reason) console.error("Reason:", error.reason);
      return false;
    }
  }

  async checkCooldown(contractAddress, userAddress) {
    console.log("\n⏳ Checking Submission Cooldown...");

    try {
      const contract = new ethers.Contract(
        contractAddress,
        CONTRACT_ABI_DEFAULT,
        this.signer
      );
      console.log(`Contract Address: ${contractAddress}`);

      // Check cooldown configuration
      const cooldown = await contract.SUBMISSION_COOLDOWN();
      console.log(`Cooldown Period: ${cooldown.toString()} seconds`);

      // Check user cooldown status
      const address = userAddress || (await this.signer.getAddress());
      console.log(`User Address: ${address}`);
      const timeUntilNext = await contract.getTimeUntilNextSubmission(address);
      console.log(
        `Time Until Next Submission: ${timeUntilNext.toString()} seconds`
      );

      if (timeUntilNext.gt(0)) {
        console.log("⚠️ User is still in cooldown period.");
      } else {
        console.log("✅ User can submit a new workout now.");
      }

      return true;
    } catch (error) {
      console.error("❌ Failed to check cooldown:", error.message);
      if (error.reason) console.error("Reason:", error.reason);
      return false;
    }
  }

  async checkOwner(contractAddress) {
    console.log("\n👤 Checking Contract Owner...");

    try {
      const contract = new ethers.Contract(
        contractAddress,
        CONTRACT_ABI_DEFAULT,
        this.signer
      );
      console.log(`Contract Address: ${contractAddress}`);

      // Check contract owner
      const owner = await contract.owner();
      console.log(`Contract Owner: ${owner}`);

      const currentAddress = await this.signer.getAddress();
      if (currentAddress.toLowerCase() === owner.toLowerCase()) {
        console.log("✅ Current account is the contract owner.");
      } else {
        console.log("⚠️ Current account is NOT the contract owner.");
      }

      return true;
    } catch (error) {
      console.error("❌ Failed to check owner:", error.message);
      if (error.reason) console.error("Reason:", error.reason);
      return false;
    }
  }

  async checkSubscription(subscriptionId) {
    console.log("\n📊 Checking Chainlink Subscription...");

    try {
      const routerContract = new ethers.Contract(
        CONFIG.functions.router,
        ROUTER_ABI,
        this.signer
      );
      console.log(`Router Address: ${CONFIG.functions.router}`);

      // Check subscription details
      console.log(`Subscription ID: ${subscriptionId}`);
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

      if (subscriptionDetails.balance.lt(ethers.utils.parseEther("0.5"))) {
        console.log(
          "⚠️ Low LINK balance in subscription. Consider funding it."
        );
      } else {
        console.log("✅ Subscription balance is sufficient.");
      }

      return true;
    } catch (error) {
      console.error("❌ Failed to check subscription:", error.message);
      if (error.reason) console.error("Reason:", error.reason);
      return false;
    }
  }

  async checkVRFStatus(contractAddress, version) {
    console.log(`\n🔍 Checking VRF Status for ${version}...`);

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

        if (subscriptionDetails.balance.lt(ethers.utils.parseEther("0.5"))) {
          console.log(
            "⚠️ Low LINK balance in VRF subscription. Consider funding it."
          );
        } else {
          console.log("✅ VRF subscription balance is sufficient.");
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

        if (subscriptionDetails.balance.lt(ethers.utils.parseEther("0.5"))) {
          console.log(
            "⚠️ Low LINK balance in VRF subscription. Consider funding it."
          );
        } else {
          console.log("✅ VRF subscription balance is sufficient.");
        }
      }

      return true;
    } catch (error) {
      console.error(
        `❌ Failed to check VRF status for ${version}:`,
        error.message
      );
      if (error.reason) console.error("Reason:", error.reason);
      return false;
    }
  }

  async updateToVRFV25(contractAddress) {
    console.log("\n🔄 Updating to VRF v2.5...");

    try {
      const contract = new ethers.Contract(
        contractAddress,
        CONTRACT_ABI_VRF,
        this.signer
      );
      console.log(`Contract Address: ${contractAddress}`);

      // Update VRF configuration to v2.5
      const subscriptionId = CONFIG.vrfV4.subscriptionId;
      const keyHash =
        "0x354d2f95da55398f44b7cff77da56283d9c6c829a4bdf1bbcaf2ad6a4d081f61"; // Same as V3 for now, update if needed
      const tx = await contract.updateVRFConfig(subscriptionId, keyHash);
      console.log(`Transaction sent: ${tx.hash}`);
      await tx.wait();
      console.log("✅ Updated to VRF v2.5 configuration");

      return true;
    } catch (error) {
      console.error("❌ Failed to update to VRF v2.5:", error.message);
      if (error.reason) console.error("Reason:", error.reason);
      return false;
    }
  }

  async updateVRFKeyHash(contractAddress, newKeyHash) {
    console.log(`\n🔄 Updating VRF Key Hash to ${newKeyHash}...`);

    try {
      const contract = new ethers.Contract(
        contractAddress,
        CONTRACT_ABI_VRF,
        this.signer
      );
      console.log(`Contract Address: ${contractAddress}`);

      // Update VRF key hash
      const tx = await contract.updateKeyHash(newKeyHash);
      console.log(`Transaction sent: ${tx.hash}`);
      await tx.wait();
      console.log(`✅ VRF Key Hash updated to ${newKeyHash}`);

      return true;
    } catch (error) {
      console.error("❌ Failed to update VRF Key Hash:", error.message);
      if (error.reason) console.error("Reason:", error.reason);
      return false;
    }
  }

  async runAllUtils(contractAddress, subscriptionId, version) {
    console.log("\n🔧 Running All Utility Tools...");

    const results = {
      updateFunctionsSource: false,
      updateGasLimit: false,
      checkChainlinkResponse: false,
      checkCooldown: false,
      checkOwner: false,
      checkSubscription: false,
      checkVRFStatus: version ? false : undefined,
      updateToVRFV25: version === "V4" ? false : undefined,
    };

    // Example gas limit for updateGasLimit, adjust as needed
    const newGasLimit = 500000;
    const newKeyHash =
      "0x354d2f95da55398f44b7cff77da56283d9c6c829a4bdf1bbcaf2ad6a4d081f61"; // Example, adjust as needed

    results.updateFunctionsSource = await this.updateFunctionsSource(
      contractAddress
    );
    results.updateGasLimit = await this.updateGasLimit(
      contractAddress,
      newGasLimit
    );
    results.checkChainlinkResponse = await this.checkChainlinkResponse(
      subscriptionId
    );
    results.checkCooldown = await this.checkCooldown(
      contractAddress,
      await this.signer.getAddress()
    );
    results.checkOwner = await this.checkOwner(contractAddress);
    results.checkSubscription = await this.checkSubscription(subscriptionId);

    if (version) {
      results.checkVRFStatus = await this.checkVRFStatus(
        contractAddress,
        version
      );
      if (version === "V4") {
        results.updateToVRFV25 = await this.updateToVRFV25(contractAddress);
        // Optionally update key hash if needed
        // results.updateVRFKeyHash = await this.updateVRFKeyHash(contractAddress, newKeyHash);
      }
    }

    console.log("\n📊 Utility Tools Results Summary:");
    console.log(
      `Update Functions Source: ${
        results.updateFunctionsSource ? "✅ Completed" : "❌ Failed"
      }`
    );
    console.log(
      `Update Gas Limit: ${
        results.updateGasLimit ? "✅ Completed" : "❌ Failed"
      }`
    );
    console.log(
      `Check Chainlink Response: ${
        results.checkChainlinkResponse ? "✅ Completed" : "❌ Failed"
      }`
    );
    console.log(
      `Check Cooldown: ${results.checkCooldown ? "✅ Completed" : "❌ Failed"}`
    );
    console.log(
      `Check Owner: ${results.checkOwner ? "✅ Completed" : "❌ Failed"}`
    );
    console.log(
      `Check Subscription: ${
        results.checkSubscription ? "✅ Completed" : "❌ Failed"
      }`
    );
    if (version) {
      console.log(
        `Check VRF Status (${version}): ${
          results.checkVRFStatus ? "✅ Completed" : "❌ Failed"
        }`
      );
      if (version === "V4") {
        console.log(
          `Update to VRF v2.5: ${
            results.updateToVRFV25 ? "✅ Completed" : "❌ Failed"
          }`
        );
      }
    }

    return results;
  }
}

async function runUtils(
  utilType,
  contractVersion,
  subscriptionId,
  param1,
  param2
) {
  console.log(
    `🚀 Running ${utilType || "All"} Utility for Imperfect Abs${
      contractVersion ? ` (${contractVersion})` : ""
    }`
  );
  console.log("===============================================\n");

  const utilsTool = new ChainlinkUtils();

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

    await utilsTool.initialize(privateKey);

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

    if (utilType === "update-functions-source") {
      await utilsTool.updateFunctionsSource(contractAddress);
    } else if (utilType === "update-gas-limit") {
      const newGasLimit = param1 ? parseInt(param1) : 500000;
      await utilsTool.updateGasLimit(contractAddress, newGasLimit);
    } else if (utilType === "check-chainlink-response") {
      await utilsTool.checkChainlinkResponse(subId);
    } else if (utilType === "check-cooldown") {
      const userAddress = param1 || (await utilsTool.signer.getAddress());
      await utilsTool.checkCooldown(contractAddress, userAddress);
    } else if (utilType === "check-owner") {
      await utilsTool.checkOwner(contractAddress);
    } else if (utilType === "check-subscription") {
      await utilsTool.checkSubscription(subId);
    } else if (utilType === "check-vrf-status" && contractVersion) {
      await utilsTool.checkVRFStatus(contractAddress, contractVersion);
    } else if (utilType === "update-to-vrf-v25" && contractVersion === "V4") {
      await utilsTool.updateToVRFV25(contractAddress);
    } else if (utilType === "update-vrf-keyhash" && contractVersion) {
      const newKeyHash =
        param1 ||
        "0x354d2f95da55398f44b7cff77da56283d9c6c829a4bdf1bbcaf2ad6a4d081f61";
      await utilsTool.updateVRFKeyHash(contractAddress, newKeyHash);
    } else {
      await utilsTool.runAllUtils(contractAddress, subId, contractVersion);
    }

    console.log("\n🎉 Utility operation complete!");
  } catch (error) {
    console.error("\n❌ Utility suite failed:", error.message);
    process.exit(1);
  }
}

// Run utils based on command line arguments
if (require.main === module) {
  const args = process.argv.slice(2);
  const utilType = args[0] || undefined;
  const contractVersion = args[1] || undefined;
  const subscriptionId = args[2] || undefined;
  const param1 = args[3] || undefined;
  const param2 = args[4] || undefined;
  runUtils(utilType, contractVersion, subscriptionId, param1, param2);
}

module.exports = { ChainlinkUtils, runUtils };
