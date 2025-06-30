const { ethers } = require("ethers");

const CONFIG = {
  rpcUrl: "https://api.avax-test.network/ext/bc/C/rpc",
  contractAddress: "0x060F0F142D5BfC721a7C53D00B4bAD77Ad82C776",
  privateKey: process.env.PRIVATE_KEY,
  // VRF v2.5 coordinator for Avalanche Fuji (might be different from v2.0)
  vrfCoordinatorV25: "0x5C210eF41CD1a72de73bF76eC39637bB0d3d7BEE", // VRF v2.5 coordinator
  vrfCoordinatorV20: "0x2eD832Ba664535e5886b75D64C46EB9a228C2610", // VRF v2.0 coordinator
};

// VRF Coordinator ABI (works for both v2.0 and v2.5)
const VRF_COORDINATOR_ABI = [
  "function getSubscription(uint64 subId) external view returns (uint96 balance, uint64 reqCount, address owner, address[] memory consumers)",
];

// Contract ABI
const CONTRACT_ABI = [
  "function i_vrfCoordinator() external view returns (address)",
  "function s_subscriptionId() external view returns (uint64)",
  "function updateVRFConfig(uint64 subscriptionId, bytes32 keyHash) external",
];

async function checkVRFv25() {
  console.log("🔍 Checking VRF v2.5 Configuration...");

  // Setup provider and wallet
  const provider = new ethers.providers.JsonRpcProvider(CONFIG.rpcUrl);
  const wallet = new ethers.Wallet(CONFIG.privateKey, provider);
  const contract = new ethers.Contract(
    CONFIG.contractAddress,
    CONTRACT_ABI,
    wallet
  );

  console.log("👤 Wallet Address:", wallet.address);
  console.log("📄 Contract Address:", CONFIG.contractAddress);

  try {
    // Check what coordinator the contract is currently using
    console.log("\n🔧 Current Contract Configuration:");
    const currentCoordinator = await contract.i_vrfCoordinator();
    const currentSubId = await contract.s_subscriptionId();

    console.log("Current VRF Coordinator:", currentCoordinator);
    console.log("Current Subscription ID:", currentSubId.toString());

    // Check if it's using v2.0 or v2.5 coordinator
    if (
      currentCoordinator.toLowerCase() ===
      CONFIG.vrfCoordinatorV20.toLowerCase()
    ) {
      console.log("📋 Contract is using VRF v2.0 coordinator");
    } else if (
      currentCoordinator.toLowerCase() ===
      CONFIG.vrfCoordinatorV25.toLowerCase()
    ) {
      console.log("📋 Contract is using VRF v2.5 coordinator");
    } else {
      console.log(
        "📋 Contract is using unknown coordinator:",
        currentCoordinator
      );
    }

    // Test both coordinators to see which one has the subscription
    console.log("\n🔍 Testing Subscription Access:");

    // Test v2.0 coordinator
    try {
      const coordinatorV20 = new ethers.Contract(
        CONFIG.vrfCoordinatorV20,
        VRF_COORDINATOR_ABI,
        provider
      );
      const [balanceV20, reqCountV20, ownerV20, consumersV20] =
        await coordinatorV20.getSubscription(currentSubId);
      console.log("✅ VRF v2.0 Coordinator - Subscription found:");
      console.log("  Balance:", ethers.utils.formatEther(balanceV20), "LINK");
      console.log("  Owner:", ownerV20);
      console.log("  Consumers:", consumersV20.length);
    } catch (error) {
      console.log("❌ VRF v2.0 Coordinator - Subscription not found");
    }

    // Test v2.5 coordinator
    try {
      const coordinatorV25 = new ethers.Contract(
        CONFIG.vrfCoordinatorV25,
        VRF_COORDINATOR_ABI,
        provider
      );
      const [balanceV25, reqCountV25, ownerV25, consumersV25] =
        await coordinatorV25.getSubscription(currentSubId);
      console.log("✅ VRF v2.5 Coordinator - Subscription found:");
      console.log("  Balance:", ethers.utils.formatEther(balanceV25), "LINK");
      console.log("  Owner:", ownerV25);
      console.log("  Consumers:", consumersV25.length);
    } catch (error) {
      console.log("❌ VRF v2.5 Coordinator - Subscription not found");
    }

    // If contract is using wrong coordinator, suggest update
    console.log("\n💡 Recommendations:");
    console.log("Since your subscription is v2.5, you should:");
    console.log("1. Use VRF v2.5 coordinator:", CONFIG.vrfCoordinatorV25);
    console.log("2. Update contract configuration if needed");
    console.log("3. Use subscription ID that works with v2.5");

    // The large subscription ID you mentioned might be the correct one for v2.5
    console.log("\n🔢 About the large subscription ID:");
    console.log("VRF v2.5 might use different ID formats than v2.0");
    console.log(
      "The large number you provided might be the correct v2.5 subscription ID"
    );
  } catch (error) {
    console.error("❌ Check error:", error.message);
    if (error.reason) console.error("Reason:", error.reason);
  }
}

checkVRFv25().catch(console.error);
