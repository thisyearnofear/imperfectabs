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
  subscriptionId: 15675, // Your created subscription
  contractAddress: "0xFBE99DcD3b2d93b1c8FFabC26427383dAAbA05d1", // Your deployed contract
  gasLimit: 500000,
  maxFeePerGas: ethers.utils.parseUnits("30", "gwei"),
  maxPriorityFeePerGas: ethers.utils.parseUnits("2", "gwei"),
};

// Router ABI
const ROUTER_ABI = [
  "function addConsumer(uint64 subscriptionId, address consumer) external",
  "function getSubscription(uint64 subscriptionId) external view returns (uint96 balance, address owner, address[] memory consumers)",
];

// LINK Token ABI
const LINK_ABI = [
  "function balanceOf(address account) external view returns (uint256)",
  "function transferAndCall(address to, uint256 value, bytes calldata data) external returns (bool)",
];

class ChainlinkFunctionsComplete {
  constructor() {
    this.provider = new ethers.providers.JsonRpcProvider(
      CHAINLINK_CONFIG.rpcUrl,
    );
    this.signer = null;
    this.routerContract = null;
    this.linkContract = null;
  }

  async initialize(privateKey) {
    console.log("🔗 Initializing Chainlink Functions Complete Setup...");

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

  async checkSubscriptionStatus() {
    console.log(`\n📊 Checking subscription ${CHAINLINK_CONFIG.subscriptionId} status...`);

    try {
      const details = await this.routerContract.getSubscription(CHAINLINK_CONFIG.subscriptionId);

      const info = {
        balance: ethers.utils.formatEther(details.balance),
        owner: details.owner,
        consumers: details.consumers,
      };

      console.log(`Balance: ${info.balance} LINK`);
      console.log(`Owner: ${info.owner}`);
      console.log(`Consumers: ${info.consumers.length}`);

      if (info.consumers.length > 0) {
        console.log("Consumer addresses:");
        info.consumers.forEach((consumer, index) => {
          console.log(`  ${index + 1}. ${consumer}`);
        });
      }

      // Check if our contract is already a consumer
      const isConsumer = info.consumers.includes(CHAINLINK_CONFIG.contractAddress);
      console.log(`Contract ${CHAINLINK_CONFIG.contractAddress} is consumer: ${isConsumer ? '✅' : '❌'}`);

      return { ...info, isConsumer };
    } catch (error) {
      console.error("❌ Failed to get subscription details:", error.message);
      return null;
    }
  }

  async addConsumer() {
    console.log(`\n👥 Adding consumer ${CHAINLINK_CONFIG.contractAddress} to subscription ${CHAINLINK_CONFIG.subscriptionId}...`);

    try {
      const gasOverrides = {
        gasLimit: CHAINLINK_CONFIG.gasLimit,
        maxFeePerGas: CHAINLINK_CONFIG.maxFeePerGas,
        maxPriorityFeePerGas: CHAINLINK_CONFIG.maxPriorityFeePerGas,
      };

      const tx = await this.routerContract.addConsumer(
        CHAINLINK_CONFIG.subscriptionId,
        CHAINLINK_CONFIG.contractAddress,
        gasOverrides,
      );
      console.log(`Transaction sent: ${tx.hash}`);

      const receipt = await tx.wait();
      console.log("✅ Consumer added successfully");

      return receipt;
    } catch (error) {
      console.error("❌ Failed to add consumer:", error.message);

      // Check if already added
      if (error.message.includes("consumer is already registered")) {
        console.log("ℹ️  Consumer is already registered to this subscription");
        return { alreadyRegistered: true };
      }

      throw error;
    }
  }

  async fundMoreIfNeeded(minBalance = "2.0") {
    console.log(`\n💰 Checking if subscription needs more funding (minimum: ${minBalance} LINK)...`);

    try {
      const details = await this.routerContract.getSubscription(CHAINLINK_CONFIG.subscriptionId);
      const currentBalance = parseFloat(ethers.utils.formatEther(details.balance));
      const requiredBalance = parseFloat(minBalance);

      console.log(`Current balance: ${currentBalance} LINK`);

      if (currentBalance < requiredBalance) {
        const needed = requiredBalance - currentBalance;
        console.log(`⚠️  Need to add ${needed.toFixed(2)} more LINK`);
        console.log("Add funds manually at: https://functions.chain.link/fuji");
        return false;
      } else {
        console.log("✅ Subscription has sufficient balance");
        return true;
      }
    } catch (error) {
      console.error("❌ Failed to check balance:", error.message);
      return false;
    }
  }

  saveConfiguration() {
    console.log("\n💾 Saving Chainlink Functions configuration...");

    const config = {
      subscriptionId: CHAINLINK_CONFIG.subscriptionId,
      contractAddress: CHAINLINK_CONFIG.contractAddress,
      router: CHAINLINK_CONFIG.router,
      linkToken: CHAINLINK_CONFIG.linkToken,
      donId: CHAINLINK_CONFIG.donId,
      chainId: CHAINLINK_CONFIG.chainId,
      rpcUrl: CHAINLINK_CONFIG.rpcUrl,
      setupComplete: true,
      setupDate: new Date().toISOString(),
    };

    const configPath = path.join(__dirname, "../chainlink-functions-config.json");
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

    console.log(`✅ Configuration saved to: ${configPath}`);

    // Create .env updates
    const envUpdates = [
      `NEXT_PUBLIC_CHAINLINK_SUBSCRIPTION_ID=${CHAINLINK_CONFIG.subscriptionId}`,
      `NEXT_PUBLIC_CHAINLINK_ROUTER=${CHAINLINK_CONFIG.router}`,
      `NEXT_PUBLIC_CHAINLINK_DON_ID=${CHAINLINK_CONFIG.donId}`,
      `CHAINLINK_OPENAI_API_KEY=your_openai_api_key_here`,
    ];

    console.log("\n📝 Add these to your .env file:");
    envUpdates.forEach(line => console.log(line));

    return config;
  }

  generateExampleFunction() {
    console.log("\n📝 Generating example Chainlink Function for fitness data analysis...");

    const functionCode = `
// Chainlink Functions JavaScript code for Imperfect Abs
// This function analyzes workout data and provides AI-enhanced feedback

const reps = args[0];
const formAccuracy = args[1];
const duration = args[2];

// Simulate AI analysis (replace with actual OpenAI API call)
const analysisPrompt = \`Analyze this abs workout: \${reps} reps, \${formAccuracy}% form accuracy, \${duration} seconds duration. Provide brief feedback.\`;

// For now, return mock analysis (integrate OpenAI API later)
const mockAnalysis = {
  score: Math.min(100, Math.floor((parseInt(reps) * parseInt(formAccuracy)) / 10)),
  feedback: formAccuracy > 80 ? "Excellent form!" : formAccuracy > 60 ? "Good work, focus on form" : "Work on maintaining proper form",
  recommendation: parseInt(reps) < 20 ? "Try to increase reps gradually" : "Great rep count!"
};

return Functions.encodeString(JSON.stringify(mockAnalysis));
`;

    const examplePath = path.join(__dirname, "../functions/fitness-analysis.js");

    // Create functions directory if it doesn't exist
    const functionsDir = path.join(__dirname, "../functions");
    if (!fs.existsSync(functionsDir)) {
      fs.mkdirSync(functionsDir, { recursive: true });
    }

    fs.writeFileSync(examplePath, functionCode.trim());
    console.log(`✅ Example function saved to: ${examplePath}`);

    return examplePath;
  }
}

// Main completion function
async function completeChainlinkSetup() {
  console.log("🚀 Completing Chainlink Functions Setup for Imperfect Abs");
  console.log("=====================================================\n");

  const setup = new ChainlinkFunctionsComplete();

  try {
    // Get private key from environment
    const privateKey = process.env.PRIVATE_KEY;
    if (!privateKey) {
      console.log("❌ Please set PRIVATE_KEY environment variable");
      console.log("Example: PRIVATE_KEY=your_key_without_0x npm run complete:chainlink");
      process.exit(1);
    }

    // Initialize
    await setup.initialize(privateKey);

    // Check current subscription status
    const subscriptionInfo = await setup.checkSubscriptionStatus();

    if (!subscriptionInfo) {
      console.log("❌ Could not retrieve subscription information");
      process.exit(1);
    }

    // Add consumer if not already added
    if (!subscriptionInfo.isConsumer) {
      console.log("\n🔧 Adding contract as consumer...");
      await setup.addConsumer();
    } else {
      console.log("\n✅ Contract is already registered as consumer");
    }

    // Check funding
    await setup.fundMoreIfNeeded("2.0");

    // Verify final setup
    console.log("\n🔍 Verifying final setup...");
    const finalStatus = await setup.checkSubscriptionStatus();

    if (finalStatus && finalStatus.isConsumer) {
      console.log("✅ Consumer registration confirmed");
    } else {
      console.log("❌ Consumer registration verification failed");
    }

    // Save configuration
    const config = setup.saveConfiguration();

    // Generate example function
    setup.generateExampleFunction();

    console.log("\n🎉 Chainlink Functions setup complete!");
    console.log("\n📋 Summary:");
    console.log(`- Subscription ID: ${CHAINLINK_CONFIG.subscriptionId}`);
    console.log(`- Contract Address: ${CHAINLINK_CONFIG.contractAddress}`);
    console.log(`- Balance: ${finalStatus ? finalStatus.balance : 'Unknown'} LINK`);
    console.log(`- Consumers: ${finalStatus ? finalStatus.consumers.length : 'Unknown'}`);

    console.log("\n🔄 Next Steps:");
    console.log("1. Get OpenAI API key: https://platform.openai.com/api-keys");
    console.log("2. Add CHAINLINK_OPENAI_API_KEY to your .env file");
    console.log("3. Test the Functions integration in your app");
    console.log("4. Deploy to Avalanche L1 for bonus hackathon points!");
    console.log("\n📱 Test your app: npm run dev");

  } catch (error) {
    console.error("\n❌ Setup completion failed:", error.message);

    console.log("\n💡 Troubleshooting:");
    console.log("1. Ensure you have enough AVAX for gas fees");
    console.log("2. Verify your subscription has sufficient LINK balance");
    console.log("3. Check that you're the owner of the subscription");
    console.log("4. Try adding the consumer manually via the Chainlink Functions UI");
    console.log("   URL: https://functions.chain.link/fuji");

    process.exit(1);
  }
}

// Run setup if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  completeChainlinkSetup();
}

export { ChainlinkFunctionsComplete, completeChainlinkSetup, CHAINLINK_CONFIG };
