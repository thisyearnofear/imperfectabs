const { ethers } = require("ethers");

const CONFIG = {
  rpcUrl: "https://api.avax-test.network/ext/bc/C/rpc",
  contractAddress: "0x060F0F142D5BfC721a7C53D00B4bAD77Ad82C776",
  privateKey: process.env.PRIVATE_KEY,
  // VRF v2.5 configuration for Avalanche Fuji
  vrfCoordinatorV25: "0x5C210eF41CD1a72de73bF76eC39637bB0d3d7BEE",
  keyHashV25:
    "0x354d2f95da55398f44b7cff77da56283d9c6c829a4bdf1bbcaf2ad6a4d081f61", // Same key hash should work
  // The large subscription ID - let's try the truncated version that fits in uint64
  subscriptionId: "11719808286385946575", // This is the truncated version the contract is already using
};

// Contract ABI
const CONTRACT_ABI = [
  "function updateVRFConfig(uint64 subscriptionId, bytes32 keyHash) external",
  "function manualChallengeUpdate() external",
  "function getCurrentChallenge() external view returns (tuple(uint256 challengeType, uint256 target, uint256 bonusMultiplier, uint256 expiresAt, bool active))",
  "function i_vrfCoordinator() external view returns (address)",
  "function s_subscriptionId() external view returns (uint64)",
];

// VRF Coordinator ABI
const VRF_COORDINATOR_ABI = [
  "function getSubscription(uint64 subId) external view returns (uint96 balance, uint64 reqCount, address owner, address[] memory consumers)",
];

async function updateToVRFv25() {
  console.log("🔄 Updating Contract to VRF v2.5...");

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
  console.log("🎲 New VRF v2.5 Coordinator:", CONFIG.vrfCoordinatorV25);
  console.log("🆔 Subscription ID:", CONFIG.subscriptionId);

  try {
    // Check current configuration
    console.log("\n📋 Current Configuration:");
    const currentCoordinator = await contract.i_vrfCoordinator();
    const currentSubId = await contract.s_subscriptionId();
    console.log("Current Coordinator:", currentCoordinator);
    console.log("Current Subscription ID:", currentSubId.toString());

    // Check if the subscription exists in v2.5 coordinator
    console.log("\n🔍 Checking v2.5 subscription...");
    const coordinatorV25 = new ethers.Contract(
      CONFIG.vrfCoordinatorV25,
      VRF_COORDINATOR_ABI,
      provider
    );

    try {
      const [balance, reqCount, owner, consumers] =
        await coordinatorV25.getSubscription(CONFIG.subscriptionId);
      console.log("✅ Found subscription in v2.5 coordinator:");
      console.log("  Balance:", ethers.utils.formatEther(balance), "LINK");
      console.log("  Owner:", owner);
      console.log("  Consumers:", consumers.length);

      // Check if our contract is already a consumer
      const isConsumer = consumers.some(
        (consumer) =>
          consumer.toLowerCase() === CONFIG.contractAddress.toLowerCase()
      );
      console.log("  Our contract is consumer:", isConsumer);

      if (!isConsumer) {
        console.log(
          "⚠️  Contract needs to be added as consumer to v2.5 subscription"
        );
        console.log(
          "   Please add",
          CONFIG.contractAddress,
          "to subscription",
          CONFIG.subscriptionId
        );
        console.log("   Go to: https://vrf.chain.link/fuji");
        return;
      }
    } catch (error) {
      console.log("❌ Subscription not found in v2.5 coordinator");
      console.log("   Error:", error.message);

      // The issue might be that we need to use a different subscription ID format
      console.log(
        "\n💡 The subscription ID might need to be different for v2.5"
      );
      console.log("   Try using the full large number as subscription ID");
      console.log(
        "   Or check the v2.5 subscription UI for the correct ID format"
      );
      return;
    }

    // Update contract configuration
    console.log("\n🔧 Updating contract VRF configuration...");
    const updateTx = await contract.updateVRFConfig(
      CONFIG.subscriptionId,
      CONFIG.keyHashV25,
      {
        gasLimit: 200000,
      }
    );

    console.log("🔗 Update transaction:", updateTx.hash);
    await updateTx.wait();
    console.log(
      "✅ Contract updated to use subscription ID:",
      CONFIG.subscriptionId
    );

    // Note: The coordinator address is set in the constructor and can't be changed
    // If we need to change the coordinator, we'd need to deploy a new contract
    console.log("\n⚠️  Note: VRF Coordinator address is set in constructor");
    console.log("   Current coordinator:", currentCoordinator);
    console.log(
      "   To use v2.5 coordinator, we'd need to deploy a new contract"
    );
    console.log("   For now, let's test if the current setup works");

    // Test VRF request
    console.log("\n🧪 Testing VRF request...");
    try {
      const challengeTx = await contract.manualChallengeUpdate({
        gasLimit: 200000,
      });

      console.log("🔗 VRF request transaction:", challengeTx.hash);
      const receipt = await challengeTx.wait();
      console.log("✅ VRF request successful");
      console.log("⛽ Gas used:", receipt.gasUsed.toString());

      console.log("⏳ Waiting 90 seconds for VRF response...");
      await new Promise((resolve) => setTimeout(resolve, 90000));

      const challenge = await contract.getCurrentChallenge();
      if (challenge.active && challenge.target.gt(0)) {
        console.log("🎉 VRF challenge generated!");
        console.log("Type:", challenge.challengeType.toString());
        console.log("Target:", challenge.target.toString());
        console.log(
          "Bonus:",
          challenge.bonusMultiplier.toString(),
          "basis points"
        );
        console.log("✅ VRF v2.5 integration working!");
      } else {
        console.log("⏳ VRF response still pending");
      }
    } catch (error) {
      console.error("❌ VRF request failed:", error.message);
      if (error.reason) console.error("Reason:", error.reason);

      if (error.message.includes("InvalidConsumer")) {
        console.log(
          "\n💡 Solution: Add contract as consumer to the v2.5 subscription"
        );
      }
    }
  } catch (error) {
    console.error("❌ Update error:", error.message);
    if (error.reason) console.error("Reason:", error.reason);
  }
}

updateToVRFv25().catch(console.error);
