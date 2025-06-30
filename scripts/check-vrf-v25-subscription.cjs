const { ethers } = require("ethers");

const CONFIG = {
  rpcUrl: "https://api.avax-test.network/ext/bc/C/rpc",
  privateKey: process.env.PRIVATE_KEY,
  // VRF coordinators
  vrfCoordinatorV20: "0x2eD832Ba664535e5886b75D64C46EB9a228C2610",
  vrfCoordinatorV25: "0x5C210eF41CD1a72de73bF76eC39637bB0d3d7BEE",
  // Subscription IDs to test
  largeSubId:
    "36696123203907487346372099809332344923918001683502737413897043327797370994639",
  truncatedSubId: "11719808286385946575", // This is what the old contract was using
};

// VRF Coordinator v2.0 ABI
const VRF_COORDINATOR_V20_ABI = [
  "function getSubscription(uint64 subId) external view returns (uint96 balance, uint64 reqCount, address owner, address[] memory consumers)",
];

// VRF Coordinator v2.5 ABI
const VRF_COORDINATOR_V25_ABI = [
  "function getSubscription(uint256 subId) external view returns (uint96 balance, uint96 nativeBalance, uint64 reqCount, address owner, address[] memory consumers)",
  "function addConsumer(uint256 subId, address consumer) external",
];

async function main() {
  console.log("🔍 Checking VRF subscription compatibility...");

  const provider = new ethers.providers.JsonRpcProvider(CONFIG.rpcUrl);
  const signer = new ethers.Wallet(CONFIG.privateKey, provider);

  // Test VRF v2.0 coordinator
  console.log("\n📊 Testing VRF v2.0 coordinator...");
  const vrfV20 = new ethers.Contract(
    CONFIG.vrfCoordinatorV20,
    VRF_COORDINATOR_V20_ABI,
    signer
  );

  try {
    console.log("Testing truncated subscription ID:", CONFIG.truncatedSubId);
    const subV20 = await vrfV20.getSubscription(CONFIG.truncatedSubId);
    console.log("✅ VRF v2.0 subscription found:");
    console.log("  Balance:", ethers.utils.formatEther(subV20.balance), "LINK");
    console.log("  Request count:", subV20.reqCount.toString());
    console.log("  Owner:", subV20.owner);
    console.log("  Consumers:", subV20.consumers);
  } catch (error) {
    console.log("❌ VRF v2.0 error:", error.message);
  }

  // Test VRF v2.5 coordinator
  console.log("\n📊 Testing VRF v2.5 coordinator...");
  const vrfV25 = new ethers.Contract(
    CONFIG.vrfCoordinatorV25,
    VRF_COORDINATOR_V25_ABI,
    signer
  );

  // Test with large subscription ID
  try {
    console.log("Testing large subscription ID:", CONFIG.largeSubId);
    const subV25Large = await vrfV25.getSubscription(CONFIG.largeSubId);
    console.log("✅ VRF v2.5 subscription found (large ID):");
    console.log(
      "  Balance:",
      ethers.utils.formatEther(subV25Large.balance),
      "LINK"
    );
    console.log("  Request count:", subV25Large.reqCount.toString());
    console.log("  Owner:", subV25Large.owner);
    console.log("  Consumers:", subV25Large.consumers);
  } catch (error) {
    console.log("❌ VRF v2.5 error (large ID):", error.message);
  }

  // Test with truncated subscription ID
  try {
    console.log("Testing truncated subscription ID:", CONFIG.truncatedSubId);
    const subV25Truncated = await vrfV25.getSubscription(CONFIG.truncatedSubId);
    console.log("✅ VRF v2.5 subscription found (truncated ID):");
    console.log(
      "  Balance:",
      ethers.utils.formatEther(subV25Truncated.balance),
      "LINK"
    );
    console.log("  Request count:", subV25Truncated.reqCount.toString());
    console.log("  Owner:", subV25Truncated.owner);
    console.log("  Consumers:", subV25Truncated.consumers);
  } catch (error) {
    console.log("❌ VRF v2.5 error (truncated ID):", error.message);
  }

  // Check if VRF v2.5 coordinator is actually deployed
  console.log("\n🔍 Checking VRF v2.5 coordinator deployment...");
  try {
    const code = await provider.getCode(CONFIG.vrfCoordinatorV25);
    if (code === "0x") {
      console.log("❌ VRF v2.5 coordinator not deployed at this address");
    } else {
      console.log("✅ VRF v2.5 coordinator is deployed");
      console.log("Code length:", code.length);
    }
  } catch (error) {
    console.log("❌ Error checking coordinator:", error.message);
  }

  // Recommendation
  console.log("\n💡 Recommendation:");
  console.log("If VRF v2.5 is not available on Avalanche Fuji, we should:");
  console.log("1. Use VRF v2.0 with existing subscription");
  console.log("2. Or create a new VRF v2.0 subscription for V4 contract");
  console.log("3. Update V4 contract to use VRF v2.0 interfaces");
}

main().catch(console.error);
