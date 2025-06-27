import { ethers } from "ethers";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, "..");
dotenv.config({ path: path.join(rootDir, ".env") });

// Configuration
const CONFIG = {
  rpcUrl: "https://api.avax-test.network/ext/bc/C/rpc",
  chainId: 43113,
  subscriptionId: 15675,
  contractAddress: "0xFBE99DcD3b2d93b1c8FFabC26427383dAAbA05d1",
  router: "0xA9d587a00A31A52Ed70D6026794a8FC5E2F5dCb0",
  linkToken: "0x0b9d5D9136855f6FEc3c0993feE6E9CE8a297846",
};

// Minimal ABI for verification
const ROUTER_ABI = [
  "function addConsumer(uint64 subscriptionId, address consumer) external",
];

const LINK_ABI = [
  "function balanceOf(address account) external view returns (uint256)",
];

async function verifyChainlinkSetup() {
  console.log("🔍 Verifying Chainlink Functions Setup");
  console.log("=====================================\n");

  try {
    // Initialize provider
    const provider = new ethers.providers.JsonRpcProvider(CONFIG.rpcUrl);

    // Check network
    const network = await provider.getNetwork();
    console.log(`📡 Network: ${network.name} (Chain ID: ${network.chainId})`);

    if (network.chainId !== CONFIG.chainId) {
      console.log(`❌ Wrong network! Expected ${CONFIG.chainId}, got ${network.chainId}`);
      return;
    }

    // Check if private key is available
    const privateKey = process.env.PRIVATE_KEY;
    if (!privateKey) {
      console.log("⚠️  PRIVATE_KEY not found in environment");
      console.log("📋 Current Configuration:");
      console.log(`   Subscription ID: ${CONFIG.subscriptionId}`);
      console.log(`   Contract Address: ${CONFIG.contractAddress}`);
      console.log(`   Router: ${CONFIG.router}`);
      console.log(`   LINK Token: ${CONFIG.linkToken}`);
      console.log("\n✅ Configuration looks good!");
      console.log("\n📝 Next Steps:");
      console.log("1. Add consumer manually at: https://functions.chain.link/fuji/15675");
      console.log("2. Enter contract address: 0xFBE99DcD3b2d93b1c8FFabC26427383dAAbA05d1");
      console.log("3. Get OpenAI API key: https://platform.openai.com/api-keys");
      console.log("4. Add to .env: CHAINLINK_OPENAI_API_KEY=your_key_here");
      return;
    }

    // Initialize signer and contracts
    const signer = new ethers.Wallet(privateKey, provider);
    const address = await signer.getAddress();

    console.log(`👤 Wallet Address: ${address}`);

    // Check AVAX balance
    const avaxBalance = await provider.getBalance(address);
    console.log(`💰 AVAX Balance: ${ethers.utils.formatEther(avaxBalance)} AVAX`);

    // Check LINK balance
    const linkContract = new ethers.Contract(CONFIG.linkToken, LINK_ABI, provider);
    const linkBalance = await linkContract.balanceOf(address);
    console.log(`🔗 LINK Balance: ${ethers.utils.formatEther(linkBalance)} LINK`);

    // Check contract existence
    const contractCode = await provider.getCode(CONFIG.contractAddress);
    const isContractDeployed = contractCode !== "0x";
    console.log(`📜 Contract Deployed: ${isContractDeployed ? '✅' : '❌'}`);

    if (!isContractDeployed) {
      console.log("❌ Contract not found at specified address!");
      return;
    }

    // Router contract check
    const routerCode = await provider.getCode(CONFIG.router);
    const isRouterValid = routerCode !== "0x";
    console.log(`🔧 Router Available: ${isRouterValid ? '✅' : '❌'}`);

    console.log("\n📋 Setup Summary:");
    console.log("==================");
    console.log(`Subscription ID: ${CONFIG.subscriptionId}`);
    console.log(`Contract Address: ${CONFIG.contractAddress}`);
    console.log(`Router Address: ${CONFIG.router}`);
    console.log(`Network: Avalanche Fuji (${CONFIG.chainId})`);

    console.log("\n✅ Basic setup verification complete!");

    console.log("\n📝 Manual Steps Required:");
    console.log("1. Visit: https://functions.chain.link/fuji/15675");
    console.log("2. Click 'Add consumer'");
    console.log(`3. Enter: ${CONFIG.contractAddress}`);
    console.log("4. Confirm transaction");
    console.log("5. Get OpenAI API key and add to .env");

    console.log("\n🔗 Useful Links:");
    console.log(`- Subscription: https://functions.chain.link/fuji/${CONFIG.subscriptionId}`);
    console.log(`- Contract: https://testnet.snowtrace.io/address/${CONFIG.contractAddress}`);
    console.log("- Faucet: https://faucets.chain.link/fuji");
    console.log("- OpenAI Keys: https://platform.openai.com/api-keys");

  } catch (error) {
    console.error("\n❌ Verification failed:", error.message);

    console.log("\n🔧 Troubleshooting:");
    console.log("1. Check internet connection");
    console.log("2. Verify RPC endpoint is working");
    console.log("3. Ensure addresses are correct");
    console.log("4. Try again in a few moments");
  }
}

// Export for use in other scripts
export { verifyChainlinkSetup, CONFIG };

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  verifyChainlinkSetup();
}
