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
  // Chainlink Functions Configuration
  functions: {
    router: "0xA9d587a00A31A52Ed70D6026794a8FC5E2F5dCb0",
    linkToken: "0x0b9d5D9136855f6FEc3c0993feE6E9CE8a297846",
    donId: "fun-avalanche-fuji-1",
    gasLimit: 500000,
    maxFeePerGas: ethers.utils.parseUnits("30", "gwei"),
    maxPriorityFeePerGas: ethers.utils.parseUnits("2", "gwei"),
  },
  // Chainlink VRF Configuration for V3
  vrfV3: {
    vrfCoordinator: "0x2eD832Ba664535e5886b75D64C46EB9a228C2610",
    linkToken: "0x0b9d5D9136855f6FEc3c0993feE6E9CE8a297846",
    keyHash:
      "0x354d2f95da55398f44b7cff77da56283d9c6c829a4bdf1bbcaf2ad6a4d081f61",
  },
  // Chainlink VRF Configuration for V4 (v2.5)
  vrfV4: {
    vrfCoordinator: "0x5C210eF41CD1a72de73bF76eC39637bB0d3d7BEE",
    linkToken: "0x0b9d5D9136855f6FEc3c0993feE6E9CE8a297846",
    subscriptionId:
      "36696123203907487346372099809332344923918001683502737413897043327797370994639",
  },
  // Contract Addresses
  contracts: {
    v3: "0xB832c2FB36851b771A05B33C29Ab7268F3622cEC", // V3 contract
    v4: "0xD5b2c90Ecffe69D6D7377D74f7371A177d7FfB0d", // V4 contract
    default:
      process.env.CONTRACT_ADDRESS ||
      "0xFBE99DcD3b2d93b1c8FFabC26427383dAAbA05d1",
  },
};

// Router and LINK token ABIs for Functions
const ROUTER_ABI = [
  "function createSubscription() external returns (uint64)",
  "function fundSubscription(uint64 subscriptionId, uint96 amount) external",
  "function addConsumer(uint64 subscriptionId, address consumer) external",
  "function getSubscription(uint64 subscriptionId) external view returns (uint96 balance, address owner, address[] memory consumers)",
  "function acceptSubscriptionOwnerTransfer(uint64 subscriptionId) external",
  "function getConfig() external view returns (uint16, uint32, bytes32[] memory)",
  "event SubscriptionCreated(uint64 indexed subscriptionId, address owner)",
  "event SubscriptionFunded(uint64 indexed subscriptionId, uint256 oldBalance, uint256 newBalance)",
];

const LINK_ABI = [
  "function transfer(address to, uint256 value) external returns (bool)",
  "function transferAndCall(address to, uint256 value, bytes calldata data) external returns (bool)",
  "function balanceOf(address account) external view returns (uint256)",
  "function approve(address spender, uint256 amount) external returns (bool)",
];

// VRF Coordinator ABIs
const VRF_COORDINATOR_ABI_V3 = [
  "function createSubscription() external returns (uint64 subId)",
  "function addConsumer(uint64 subId, address consumer) external",
  "function fundSubscription(uint64 subId, uint96 amount) external",
  "function getSubscription(uint64 subId) external view returns (uint96 balance, uint64 reqCount, address owner, address[] memory consumers)",
  "event SubscriptionCreated(uint64 indexed subId, address owner)",
];

const VRF_COORDINATOR_ABI_V4 = [
  "function addConsumer(uint256 subId, address consumer) external",
  "function getSubscription(uint256 subId) external view returns (uint96 balance, uint96 nativeBalance, uint64 reqCount, address owner, address[] memory consumers)",
];

// Contract ABIs (minimal)
const CONTRACT_ABI_FUNCTIONS = [
  // Add specific ABI for Functions if needed
];

const CONTRACT_ABI_VRF_V3 = [
  "function updateVRFConfig(uint64 subscriptionId, bytes32 keyHash) external",
  "function manualChallengeUpdate() external",
  "function getCurrentChallenge() external view returns (tuple(uint256 challengeType, uint256 target, uint256 bonusMultiplier, uint256 expiresAt, bool active))",
];

const CONTRACT_ABI_VRF_V4 = [
  "function manualChallengeUpdate() external",
  "function getCurrentChallenge() external view returns (tuple(uint256 challengeType, uint256 target, uint256 bonusMultiplier, uint256 expiresAt, bool active))",
  "function s_subscriptionId() external view returns (uint256)",
  "function i_vrfCoordinator() external view returns (address)",
];

class ChainlinkSetup {
  constructor() {
    this.provider = new ethers.providers.JsonRpcProvider(CONFIG.rpcUrl);
    this.signer = null;
    this.routerContract = null;
    this.linkContractFunctions = null;
    this.vrfCoordinatorV3 = null;
    this.vrfCoordinatorV4 = null;
    this.linkContractV3 = null;
    this.linkContractV4 = null;
  }

  async initialize(privateKey) {
    console.log("🔗 Initializing Chainlink Setup...");

    if (!privateKey) {
      throw new Error(
        "Private key required. Set PRIVATE_KEY environment variable."
      );
    }

    this.signer = new ethers.Wallet(privateKey, this.provider);

    // Initialize contracts for Functions
    this.routerContract = new ethers.Contract(
      CONFIG.functions.router,
      ROUTER_ABI,
      this.signer
    );
    this.linkContractFunctions = new ethers.Contract(
      CONFIG.functions.linkToken,
      LINK_ABI,
      this.signer
    );

    // Initialize contracts for VRF V3
    this.vrfCoordinatorV3 = new ethers.Contract(
      CONFIG.vrfV3.vrfCoordinator,
      VRF_COORDINATOR_ABI_V3,
      this.signer
    );
    this.linkContractV3 = new ethers.Contract(
      CONFIG.vrfV3.linkToken,
      LINK_ABI,
      this.signer
    );

    // Initialize contracts for VRF V4
    this.vrfCoordinatorV4 = new ethers.Contract(
      CONFIG.vrfV4.vrfCoordinator,
      VRF_COORDINATOR_ABI_V4,
      this.signer
    );
    this.linkContractV4 = new ethers.Contract(
      CONFIG.vrfV4.linkToken,
      LINK_ABI,
      this.signer
    );

    // Test contract connections
    await this.testContractConnections();

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

  async testContractConnections() {
    console.log("🔗 Testing contract connections...");

    try {
      // Test router contract for Functions
      const config = await this.routerContract.getConfig();
      console.log("✅ Router contract for Functions connected");

      // Test LINK contract for Functions
      const symbolFunctions = await this.linkContractFunctions.symbol();
      console.log(
        `✅ LINK contract for Functions connected (${symbolFunctions})`
      );

      // Test VRF Coordinator for V3
      console.log("✅ VRF Coordinator for V3 connection assumed (minimal ABI)");

      // Test LINK contract for V3
      const symbolV3 = await this.linkContractV3.symbol();
      console.log(`✅ LINK contract for V3 connected (${symbolV3})`);

      // Test VRF Coordinator for V4
      console.log("✅ VRF Coordinator for V4 connection assumed (minimal ABI)");

      // Test LINK contract for V4
      const symbolV4 = await this.linkContractV4.symbol();
      console.log(`✅ LINK contract for V4 connected (${symbolV4})`);
    } catch (error) {
      console.warn("⚠️ Contract connection test failed:", error.message);
      // Continue anyway as this might work during actual calls
    }
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
    const linkBalance = await this.linkContractFunctions.balanceOf(address);
    console.log(`LINK: ${ethers.utils.formatEther(linkBalance)} LINK`);

    if (linkBalance.lt(ethers.utils.parseEther("5"))) {
      console.log("⚠️ Need at least 5 LINK tokens for subscriptions");
      console.log("Get test LINK from: https://faucets.chain.link/fuji");
    }

    return {
      avax: ethers.utils.formatEther(avaxBalance),
      link: ethers.utils.formatEther(linkBalance),
    };
  }

  async createFunctionsSubscription() {
    console.log("\n🔨 Creating Chainlink Functions subscription...");

    try {
      const gasOverrides = {
        gasLimit: CONFIG.functions.gasLimit,
        maxFeePerGas: CONFIG.functions.maxFeePerGas,
        maxPriorityFeePerGas: CONFIG.functions.maxPriorityFeePerGas,
      };

      console.log("⛽ Using gas settings:", {
        gasLimit: gasOverrides.gasLimit.toString(),
        maxFeePerGas:
          ethers.utils.formatUnits(gasOverrides.maxFeePerGas, "gwei") + " gwei",
        maxPriorityFeePerGas:
          ethers.utils.formatUnits(gasOverrides.maxPriorityFeePerGas, "gwei") +
          " gwei",
      });

      const tx = await this.routerContract.createSubscription(gasOverrides);
      console.log(`Transaction sent: ${tx.hash}`);

      const receipt = await tx.wait();
      console.log("✅ Transaction confirmed");

      const event = receipt.events?.find(
        (e) => e.event === "SubscriptionCreated"
      );
      if (!event) {
        throw new Error("SubscriptionCreated event not found in receipt");
      }

      const subscriptionId = event.args.subscriptionId.toNumber();
      console.log(
        `🎉 Functions Subscription created with ID: ${subscriptionId}`
      );

      return subscriptionId;
    } catch (error) {
      console.error(
        "❌ Failed to create Functions subscription:",
        error.message
      );
      throw error;
    }
  }

  async fundFunctionsSubscription(subscriptionId, amount = "2.0") {
    console.log(
      `\n💸 Funding Functions subscription ${subscriptionId} with ${amount} LINK...`
    );

    try {
      const amountWei = ethers.utils.parseEther(amount);
      const data = ethers.utils.defaultAbiCoder.encode(
        ["uint64"],
        [subscriptionId]
      );
      const gasOverrides = {
        gasLimit: CONFIG.functions.gasLimit,
        maxFeePerGas: CONFIG.functions.maxFeePerGas,
        maxPriorityFeePerGas: CONFIG.functions.maxPriorityFeePerGas,
      };

      const tx = await this.linkContractFunctions.transferAndCall(
        CONFIG.functions.router,
        amountWei,
        data,
        gasOverrides
      );

      console.log(`Transaction sent: ${tx.hash}`);
      await tx.wait();
      console.log("✅ Functions Subscription funded successfully");
    } catch (error) {
      console.error("❌ Failed to fund Functions subscription:", error.message);
      throw error;
    }
  }

  async addFunctionsConsumer(subscriptionId, consumerAddress) {
    console.log(
      `\n👥 Adding consumer ${consumerAddress} to Functions subscription ${subscriptionId}...`
    );

    try {
      const gasOverrides = {
        gasLimit: CONFIG.functions.gasLimit,
        maxFeePerGas: CONFIG.functions.maxFeePerGas,
        maxPriorityFeePerGas: CONFIG.functions.maxPriorityFeePerGas,
      };

      const tx = await this.routerContract.addConsumer(
        subscriptionId,
        consumerAddress,
        gasOverrides
      );
      console.log(`Transaction sent: ${tx.hash}`);
      await tx.wait();
      console.log("✅ Consumer added to Functions subscription successfully");
    } catch (error) {
      console.error(
        "❌ Failed to add consumer to Functions subscription:",
        error.message
      );
      throw error;
    }
  }

  async getFunctionsSubscriptionDetails(subscriptionId) {
    console.log(
      `\n📊 Getting Functions subscription ${subscriptionId} details...`
    );

    try {
      const details = await this.routerContract.getSubscription(subscriptionId);
      const info = {
        balance: ethers.utils.formatEther(details.balance),
        owner: details.owner,
        consumers: details.consumers,
      };

      console.log(`Balance: ${info.balance} LINK`);
      console.log(`Owner: ${info.owner}`);
      console.log(`Consumers: ${info.consumers.length}`);

      return info;
    } catch (error) {
      console.error(
        "❌ Failed to get Functions subscription details:",
        error.message
      );
      return null;
    }
  }

  async createVRFSubscriptionV3() {
    console.log("\n🎲 Creating VRF subscription for V3...");

    try {
      const createTx = await this.vrfCoordinatorV3.createSubscription();
      const createReceipt = await createTx.wait();

      const subscriptionCreatedEvent = createReceipt.events?.find(
        (event) => event.event === "SubscriptionCreated"
      );
      const subscriptionId = subscriptionCreatedEvent?.args?.subId;

      if (!subscriptionId) {
        throw new Error("Subscription ID not found in transaction receipt");
      }

      console.log(
        "✅ VRF Subscription for V3 created:",
        subscriptionId.toString()
      );
      return subscriptionId;
    } catch (error) {
      console.error(
        "❌ Failed to create VRF subscription for V3:",
        error.message
      );
      throw error;
    }
  }

  async fundVRFSubscriptionV3(subscriptionId, amount = "2.0") {
    console.log(
      `\n💰 Funding VRF subscription for V3 (${subscriptionId}) with ${amount} LINK...`
    );

    try {
      const fundAmount = ethers.utils.parseEther(amount);
      const approveTx = await this.linkContractV3.approve(
        CONFIG.vrfV3.vrfCoordinator,
        fundAmount
      );
      await approveTx.wait();
      console.log("✅ LINK approved for transfer for V3");

      const fundTx = await this.vrfCoordinatorV3.fundSubscription(
        subscriptionId,
        fundAmount
      );
      await fundTx.wait();
      console.log("✅ VRF Subscription for V3 funded with 2 LINK");
    } catch (error) {
      console.error(
        "❌ Failed to fund VRF subscription for V3:",
        error.message
      );
      throw error;
    }
  }

  async addVRFConsumerV3(subscriptionId, consumerAddress) {
    console.log(
      `\n🔗 Adding contract as VRF consumer for V3 (${consumerAddress})...`
    );

    try {
      const addConsumerTx = await this.vrfCoordinatorV3.addConsumer(
        subscriptionId,
        consumerAddress
      );
      await addConsumerTx.wait();
      console.log("✅ Contract added as VRF consumer for V3");
    } catch (error) {
      console.error("❌ Failed to add VRF consumer for V3:", error.message);
      throw error;
    }
  }

  async updateVRFConfigV3(subscriptionId, consumerAddress) {
    console.log(`\n⚙️ Updating contract VRF configuration for V3...`);

    try {
      const contract = new ethers.Contract(
        consumerAddress,
        CONTRACT_ABI_VRF_V3,
        this.signer
      );
      const updateTx = await contract.updateVRFConfig(
        subscriptionId,
        CONFIG.vrfV3.keyHash
      );
      await updateTx.wait();
      console.log("✅ Contract VRF config updated for V3");
    } catch (error) {
      console.error("❌ Failed to update VRF config for V3:", error.message);
      throw error;
    }
  }

  async testVRFChallengeV3(consumerAddress) {
    console.log("\n🎯 Testing VRF by generating new daily challenge for V3...");

    try {
      const contract = new ethers.Contract(
        consumerAddress,
        CONTRACT_ABI_VRF_V3,
        this.signer
      );
      const challengeTx = await contract.manualChallengeUpdate();
      await challengeTx.wait();
      console.log("✅ New challenge generation requested for V3");

      console.log("\n⏳ Waiting for VRF response for V3...");
      await new Promise((resolve) => setTimeout(resolve, 30000)); // Wait 30 seconds

      const challenge = await contract.getCurrentChallenge();
      console.log("🎯 Current Challenge for V3:");
      console.log("  Type:", challenge.challengeType.toString());
      console.log("  Target:", challenge.target.toString());
      console.log(
        "  Bonus:",
        challenge.bonusMultiplier.toString(),
        "basis points"
      );
      console.log("  Active:", challenge.active);
    } catch (error) {
      console.error("❌ Failed to test VRF challenge for V3:", error.message);
      console.log(
        "⏳ Challenge might still be generating (VRF response pending)"
      );
    }
  }

  async addVRFConsumerV4(subscriptionId, consumerAddress) {
    console.log(
      `\n🔗 Adding contract as VRF consumer for V4 (${consumerAddress})...`
    );

    try {
      const addConsumerTx = await this.vrfCoordinatorV4.addConsumer(
        subscriptionId,
        consumerAddress,
        { gasLimit: 200000 }
      );
      await addConsumerTx.wait();
      console.log("✅ Contract added as VRF consumer for V4");
    } catch (error) {
      console.error("❌ Failed to add VRF consumer for V4:", error.message);
      throw error;
    }
  }

  async testVRFChallengeV4(consumerAddress) {
    console.log("\n🎯 Testing VRF by generating new daily challenge for V4...");

    try {
      const contract = new ethers.Contract(
        consumerAddress,
        CONTRACT_ABI_VRF_V4,
        this.signer
      );
      const challengeTx = await contract.manualChallengeUpdate({
        gasLimit: 300000,
      });
      await challengeTx.wait();
      console.log("✅ Challenge generation requested for V4");

      console.log("\n⏳ Waiting 30 seconds for VRF response for V4...");
      await new Promise((resolve) => setTimeout(resolve, 30000));

      console.log("\n🔍 Checking generated challenge for V4...");
      const challenge = await contract.getCurrentChallenge();
      console.log("Challenge Type:", challenge.challengeType.toString());
      console.log("Target:", challenge.target.toString());
      console.log("Bonus Multiplier:", challenge.bonusMultiplier.toString());
      console.log(
        "Expires At:",
        new Date(challenge.expiresAt.toNumber() * 1000).toISOString()
      );
      console.log("Active:", challenge.active);

      if (challenge.active && challenge.target.gt(0)) {
        console.log("\n🎉 SUCCESS! VRF v2.5 integration is working for V4!");
        console.log("Daily challenges are now functional!");
      } else {
        console.log(
          "\n⚠️ Challenge not yet generated. VRF might still be processing for V4..."
        );
        console.log("Try checking again in a few minutes.");
      }
    } catch (error) {
      console.error("❌ Failed to test VRF challenge for V4:", error.message);
    }
  }

  async getVRFSubscriptionDetailsV4(subscriptionId) {
    console.log(
      `\n📊 Checking VRF subscription status for V4 (${subscriptionId})...`
    );

    try {
      const subscription = await this.vrfCoordinatorV4.getSubscription(
        subscriptionId
      );
      console.log(
        "Subscription balance:",
        ethers.utils.formatEther(subscription.balance),
        "LINK"
      );
      console.log("Request count:", subscription.reqCount.toString());
      console.log("Owner:", subscription.owner);
      console.log("Current consumers:", subscription.consumers);
      return subscription;
    } catch (error) {
      console.error(
        "❌ Failed to get VRF subscription details for V4:",
        error.message
      );
      return null;
    }
  }

  saveConfig(subscriptionId, type) {
    console.log("\n💾 Saving configuration...");

    const config = {
      subscriptionId,
      type,
      router: type === "functions" ? CONFIG.functions.router : undefined,
      linkToken: type === "functions" ? CONFIG.functions.linkToken : undefined,
      vrfCoordinator:
        type === "vrfV3"
          ? CONFIG.vrfV3.vrfCoordinator
          : type === "vrfV4"
          ? CONFIG.vrfV4.vrfCoordinator
          : undefined,
      donId: type === "functions" ? CONFIG.functions.donId : undefined,
      chainId: CONFIG.chainId,
      setupDate: new Date().toISOString(),
    };

    const configPath = path.join(__dirname, `../chainlink-config-${type}.json`);
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

    console.log(`✅ Configuration saved to: ${configPath}`);

    console.log("\n📝 Add these to your environment variables if applicable:");
    if (type === "functions") {
      console.log(`NEXT_PUBLIC_CHAINLINK_SUBSCRIPTION_ID=${subscriptionId}`);
    }
  }
}

async function setupChainlink(type, version) {
  console.log(
    `🚀 Chainlink ${
      type.charAt(0).toUpperCase() + type.slice(1)
    } Setup for Imperfect Abs${version ? ` (${version})` : ""}`
  );
  console.log("===============================================\n");

  const setup = new ChainlinkSetup();

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

    await setup.initialize(privateKey);
    const balances = await setup.checkBalances();

    if (parseFloat(balances.link) < 5) {
      console.log("\n❌ Insufficient LINK balance");
      console.log("Get test LINK from: https://faucets.chain.link/fuji");
      process.exit(1);
    }

    if (type === "functions") {
      const contractAddress = CONFIG.contracts.default;
      const subscriptionId = await setup.createFunctionsSubscription();
      await setup.fundFunctionsSubscription(subscriptionId, "2.0");
      await setup.addFunctionsConsumer(subscriptionId, contractAddress);
      await setup.getFunctionsSubscriptionDetails(subscriptionId);
      setup.saveConfig(subscriptionId, "functions");
      console.log("\n🎉 Chainlink Functions setup complete!");
    } else if (type === "vrf") {
      if (version === "V3") {
        const contractAddress = CONFIG.contracts.v3;
        const subscriptionId = await setup.createVRFSubscriptionV3();
        await setup.fundVRFSubscriptionV3(subscriptionId, "2.0");
        await setup.addVRFConsumerV3(subscriptionId, contractAddress);
        await setup.updateVRFConfigV3(subscriptionId, contractAddress);
        await setup.testVRFChallengeV3(contractAddress);
        setup.saveConfig(subscriptionId, "vrfV3");
        console.log("\n🎉 Chainlink VRF setup for V3 complete!");
      } else if (version === "V4") {
        const contractAddress = CONFIG.contracts.v4;
        const subscriptionId = CONFIG.vrfV4.subscriptionId;
        const subscriptionDetails = await setup.getVRFSubscriptionDetailsV4(
          subscriptionId
        );
        const isConsumer = subscriptionDetails.consumers.some(
          (consumer) => consumer.toLowerCase() === contractAddress.toLowerCase()
        );

        if (isConsumer) {
          console.log("✅ Contract is already a consumer for V4");
        } else {
          await setup.addVRFConsumerV4(subscriptionId, contractAddress);
        }
        await setup.testVRFChallengeV4(contractAddress);
        setup.saveConfig(subscriptionId, "vrfV4");
        console.log("\n🎉 Chainlink VRF setup for V4 complete!");
      } else {
        throw new Error("Unsupported VRF version. Use 'V3' or 'V4'.");
      }
    } else {
      throw new Error("Unsupported setup type. Use 'functions' or 'vrf'.");
    }
  } catch (error) {
    console.error("\n❌ Setup failed:", error.message);
    process.exit(1);
  }
}

// Run setup based on command line arguments
if (require.main === module) {
  const args = process.argv.slice(2);
  const type = args[0] || "functions";
  const version = args[1] || (type === "vrf" ? "V4" : undefined);
  setupChainlink(type, version);
}

module.exports = { ChainlinkSetup, setupChainlink };
