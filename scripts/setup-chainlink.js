import { ethers } from "ethers";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

// Load environment variables from root .env file
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, "..");
dotenv.config({ path: path.join(rootDir, ".env") });

// Chainlink Functions Configuration for Avalanche Fuji
const CHAINLINK_CONFIG = {
  router: "0xA9d587a00A31A52Ed70D6026794a8FC5E2F5dCb0",
  linkToken: "0x0b9d5D9136855f6FEc3c0993feE6E9CE8a297846",
  donId: "fun-avalanche-fuji-1",
  rpcUrl: "https://api.avax-test.network/ext/bc/C/rpc",
  chainId: 43113,
  gasLimit: 500000, // Higher gas limit for Avalanche
  maxFeePerGas: ethers.utils.parseUnits("30", "gwei"),
  maxPriorityFeePerGas: ethers.utils.parseUnits("2", "gwei"),
};

// Router and LINK token ABIs - Updated for Avalanche Fuji
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

class ChainlinkFunctionsSetup {
  constructor() {
    this.provider = new ethers.providers.JsonRpcProvider(
      CHAINLINK_CONFIG.rpcUrl,
    );
    this.signer = null;
    this.routerContract = null;
    this.linkContract = null;
  }

  async initialize(privateKey) {
    console.log("🔗 Initializing Chainlink Functions Setup...");

    if (!privateKey) {
      throw new Error(
        "Private key required. Set PRIVATE_KEY environment variable.",
      );
    }

    this.signer = new ethers.Wallet(privateKey, this.provider);

    this.routerContract = new ethers.Contract(
      CHAINLINK_CONFIG.router,
      ROUTER_ABI,
      this.signer,
    );

    this.linkContract = new ethers.Contract(
      CHAINLINK_CONFIG.linkToken,
      LINK_ABI,
      this.signer,
    );

    // Test contract connections
    await this.testContractConnections();

    const address = await this.signer.getAddress();
    console.log(`📍 Using address: ${address}`);

    // Check network
    const network = await this.provider.getNetwork();
    if (network.chainId !== CHAINLINK_CONFIG.chainId) {
      throw new Error(
        `Wrong network. Expected ${CHAINLINK_CONFIG.chainId}, got ${network.chainId}`,
      );
    }

    console.log("✅ Connected to Avalanche Fuji Testnet");
  }

  async testContractConnections() {
    console.log("🔗 Testing contract connections...");

    try {
      // Test router contract
      const config = await this.routerContract.getConfig();
      console.log("✅ Router contract connected");

      // Test LINK contract
      const symbol = await this.linkContract.symbol();
      console.log(`✅ LINK contract connected (${symbol})`);
    } catch (error) {
      console.warn("⚠️  Contract connection test failed:", error.message);
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
        "⚠️  Low AVAX balance. Get test AVAX from: https://faucet.avax.network/",
      );
    }

    // Check LINK balance
    const linkBalance = await this.linkContract.balanceOf(address);
    console.log(`LINK: ${ethers.utils.formatEther(linkBalance)} LINK`);

    if (linkBalance.lt(ethers.utils.parseEther("2"))) {
      console.log("⚠️  Need at least 2 LINK tokens for Functions subscription");
      console.log("Get test LINK from: https://faucets.chain.link/fuji");
    }

    return {
      avax: ethers.utils.formatEther(avaxBalance),
      link: ethers.utils.formatEther(linkBalance),
    };
  }

  async createSubscription() {
    console.log("\n🔨 Creating Chainlink Functions subscription...");

    try {
      // Use explicit gas settings for Avalanche
      const gasOverrides = {
        gasLimit: CHAINLINK_CONFIG.gasLimit,
        maxFeePerGas: CHAINLINK_CONFIG.maxFeePerGas,
        maxPriorityFeePerGas: CHAINLINK_CONFIG.maxPriorityFeePerGas,
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

      // Find SubscriptionCreated event
      const event = receipt.events?.find(
        (e) => e.event === "SubscriptionCreated",
      );
      if (!event) {
        throw new Error("SubscriptionCreated event not found in receipt");
      }

      const subscriptionId = event.args.subscriptionId.toNumber();
      console.log(`🎉 Subscription created with ID: ${subscriptionId}`);

      return subscriptionId;
    } catch (error) {
      console.error("❌ Failed to create subscription:", error.message);

      // Check if it's a revert with data
      if (error.error && error.error.data) {
        console.error("Revert data:", error.error.data);
      }

      // Try alternative approach - check if Functions are available on this network
      try {
        console.log("🔍 Checking if Chainlink Functions are available...");
        const config = await this.routerContract.getConfig();
        console.log("Router config:", config);
      } catch (configError) {
        console.error(
          "❌ Cannot access router config. Functions may not be available on this network.",
        );
      }

      throw error;
    }
  }

  async fundSubscription(subscriptionId, amount = "2.0") {
    console.log(
      `\n💸 Funding subscription ${subscriptionId} with ${amount} LINK...`,
    );

    try {
      const amountWei = ethers.utils.parseEther(amount);

      // Encode subscription ID for transferAndCall
      const data = ethers.utils.defaultAbiCoder.encode(
        ["uint64"],
        [subscriptionId],
      );

      const gasOverrides = {
        gasLimit: CHAINLINK_CONFIG.gasLimit,
        maxFeePerGas: CHAINLINK_CONFIG.maxFeePerGas,
        maxPriorityFeePerGas: CHAINLINK_CONFIG.maxPriorityFeePerGas,
      };

      const tx = await this.linkContract.transferAndCall(
        CHAINLINK_CONFIG.router,
        amountWei,
        data,
        gasOverrides,
      );

      console.log(`Transaction sent: ${tx.hash}`);
      const receipt = await tx.wait();
      console.log("✅ Subscription funded successfully");

      return receipt;
    } catch (error) {
      console.error("❌ Failed to fund subscription:", error.message);
      throw error;
    }
  }

  async addConsumer(subscriptionId, consumerAddress) {
    console.log(
      `\n👥 Adding consumer ${consumerAddress} to subscription ${subscriptionId}...`,
    );

    try {
      const gasOverrides = {
        gasLimit: CHAINLINK_CONFIG.gasLimit,
        maxFeePerGas: CHAINLINK_CONFIG.maxFeePerGas,
        maxPriorityFeePerGas: CHAINLINK_CONFIG.maxPriorityFeePerGas,
      };

      const tx = await this.routerContract.addConsumer(
        subscriptionId,
        consumerAddress,
        gasOverrides,
      );
      console.log(`Transaction sent: ${tx.hash}`);

      await tx.wait();
      console.log("✅ Consumer added successfully");
    } catch (error) {
      console.error("❌ Failed to add consumer:", error.message);
      throw error;
    }
  }

  async getSubscriptionDetails(subscriptionId) {
    console.log(`\n📊 Getting subscription ${subscriptionId} details...`);

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
      console.error("❌ Failed to get subscription details:", error.message);
      return null;
    }
  }

  saveConfig(subscriptionId) {
    console.log("\n💾 Saving configuration...");

    const config = {
      subscriptionId,
      router: CHAINLINK_CONFIG.router,
      linkToken: CHAINLINK_CONFIG.linkToken,
      donId: CHAINLINK_CONFIG.donId,
      chainId: CHAINLINK_CONFIG.chainId,
      setupDate: new Date().toISOString(),
    };

    const configPath = path.join(__dirname, "../chainlink-config.json");
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

    console.log(`✅ Configuration saved to: ${configPath}`);

    // Update environment variables example
    console.log("\n📝 Add these to your environment variables:");
    console.log(`NEXT_PUBLIC_CHAINLINK_SUBSCRIPTION_ID=${subscriptionId}`);
    console.log(`CHAINLINK_OPENAI_API_KEY=your_openai_api_key_here`);
  }
}

// Main setup function
async function setupChainlinkFunctions() {
  console.log("🚀 Chainlink Functions Setup for Imperfect Abs");
  console.log("===============================================\n");

  const setup = new ChainlinkFunctionsSetup();

  try {
    // Get private key from environment
    const privateKey = process.env.PRIVATE_KEY;
    if (!privateKey) {
      console.log("❌ Please set PRIVATE_KEY environment variable");
      console.log(
        "Example: PRIVATE_KEY=your_key_without_0x npm run setup:chainlink",
      );
      process.exit(1);
    }

    // Validate private key format
    if (!privateKey.match(/^[a-fA-F0-9]{64}$/)) {
      console.log("❌ Invalid private key format");
      console.log(
        "Private key should be 64 hex characters (without 0x prefix)",
      );
      process.exit(1);
    }

    // Initialize
    await setup.initialize(privateKey);

    // Check balances
    const balances = await setup.checkBalances();

    if (parseFloat(balances.link) < 2) {
      console.log("\n❌ Insufficient LINK balance");
      console.log("Get test LINK from: https://faucets.chain.link/fuji");
      process.exit(1);
    }

    // Get contract address for consumer
    const contractAddress =
      process.env.CONTRACT_ADDRESS ||
      "0xFBE99DcD3b2d93b1c8FFabC26427383dAAbA05d1";

    // Create subscription
    const subscriptionId = await setup.createSubscription();

    // Fund subscription
    await setup.fundSubscription(subscriptionId, "2.0");

    // Add consumer
    await setup.addConsumer(subscriptionId, contractAddress);

    // Verify setup
    await setup.getSubscriptionDetails(subscriptionId);

    // Save configuration
    setup.saveConfig(subscriptionId);

    console.log("\n🎉 Chainlink Functions setup complete!");
    console.log("\nNext steps:");
    console.log("1. Get OpenAI API key: https://platform.openai.com/api-keys");
    console.log("2. Add CHAINLINK_OPENAI_API_KEY to your environment");
    console.log("3. Update your contract to use the subscription ID");
    console.log("4. Deploy and test AI-enhanced form analysis!");
  } catch (error) {
    console.error("\n❌ Setup failed:", error.message);

    if (error.message.includes("execution reverted")) {
      console.log("\n💡 Troubleshooting suggestions:");
      console.log(
        "1. Chainlink Functions may not be fully available on Avalanche Fuji yet",
      );
      console.log("2. Try using a different RPC endpoint");
      console.log("3. Check if your account has sufficient AVAX for gas fees");
      console.log(
        "4. For the hackathon, you can use the simulated Chainlink Functions in the app",
      );
    }

    process.exit(1);
  }
}

// Run setup if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  setupChainlinkFunctions();
}

export { ChainlinkFunctionsSetup, setupChainlinkFunctions, CHAINLINK_CONFIG };
