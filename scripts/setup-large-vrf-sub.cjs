const { ethers } = require("ethers");

const CONFIG = {
  rpcUrl: "https://api.avax-test.network/ext/bc/C/rpc",
  contractAddress: "0x060F0F142D5BfC721a7C53D00B4bAD77Ad82C776",
  privateKey: process.env.PRIVATE_KEY,
  // Large subscription ID
  subscriptionId:
    "36696123203907487346372099809332344923918001683502737413897043327797370994639",
};

// Contract ABI (minimal)
const CONTRACT_ABI = [
  "function updateVRFConfig(uint64 subscriptionId, bytes32 keyHash) external",
  "function manualChallengeUpdate() external",
  "function getCurrentChallenge() external view returns (tuple(uint256 challengeType, uint256 target, uint256 bonusMultiplier, uint256 expiresAt, bool active))",
  "function s_subscriptionId() external view returns (uint64)",
];

async function setupLargeVRFSub() {
  console.log("🎲 Setting up VRF with large subscription ID...");
  console.log("📄 Contract:", CONFIG.contractAddress);
  console.log("🆔 Subscription ID:", CONFIG.subscriptionId);

  // Setup provider and wallet
  const provider = new ethers.providers.JsonRpcProvider(CONFIG.rpcUrl);
  const wallet = new ethers.Wallet(CONFIG.privateKey, provider);
  const contract = new ethers.Contract(
    CONFIG.contractAddress,
    CONTRACT_ABI,
    wallet
  );

  try {
    // The large subscription ID needs to be converted properly
    // This is likely a uint256 that needs to fit in uint64

    // Try different approaches to handle the large number
    console.log("\n🔧 Attempting to configure VRF...");

    // Approach 1: Try to use the number directly (will likely fail due to uint64 limit)
    try {
      const bigSubId = ethers.BigNumber.from(CONFIG.subscriptionId);
      console.log("BigNumber subscription ID:", bigSubId.toString());

      // Check if it fits in uint64
      const maxUint64 = ethers.BigNumber.from("18446744073709551615"); // 2^64 - 1

      if (bigSubId.gt(maxUint64)) {
        console.log("⚠️  Subscription ID is larger than uint64 max");
        console.log("   This might be a different format or encoding");

        // Try taking modulo to fit in uint64
        const moduloSubId = bigSubId.mod(maxUint64.add(1));
        console.log("Modulo uint64 subscription ID:", moduloSubId.toString());

        // Try using the modulo value
        const keyHash =
          "0x354d2f95da55398f44b7cff77da56283d9c6c829a4bdf1bbcaf2ad6a4d081f61";
        console.log("📝 Updating VRF config with modulo subscription ID...");

        const updateTx = await contract.updateVRFConfig(moduloSubId, keyHash, {
          gasLimit: 200000,
        });
        await updateTx.wait();
        console.log("✅ VRF configuration updated with modulo ID");

        // Verify the configuration
        const configuredSubId = await contract.s_subscriptionId();
        console.log("Configured subscription ID:", configuredSubId.toString());
      } else {
        // Number fits in uint64, use directly
        const keyHash =
          "0x354d2f95da55398f44b7cff77da56283d9c6c829a4bdf1bbcaf2ad6a4d081f61";
        console.log("📝 Updating VRF config with direct subscription ID...");

        const updateTx = await contract.updateVRFConfig(bigSubId, keyHash, {
          gasLimit: 200000,
        });
        await updateTx.wait();
        console.log("✅ VRF configuration updated");
      }
    } catch (error) {
      console.error("❌ VRF config update failed:", error.message);
      if (error.reason) console.error("Reason:", error.reason);

      console.log("\n💡 Alternative approach:");
      console.log(
        "The large subscription ID might need to be handled differently."
      );
      console.log("Let's check what the actual subscription ID should be.");
      console.log("\nPlease verify:");
      console.log("1. Go to https://vrf.chain.link/fuji");
      console.log("2. Find your subscription in the list");
      console.log("3. Check if the ID shown is different from the long number");
      console.log(
        "4. The subscription ID for contracts is usually a smaller number"
      );

      return;
    }

    // Test VRF request
    console.log("\n🎯 Testing VRF request...");
    try {
      const challengeTx = await contract.manualChallengeUpdate({
        gasLimit: 200000,
      });
      console.log("🔗 VRF request transaction:", challengeTx.hash);

      const receipt = await challengeTx.wait();
      console.log("✅ VRF request successful");
      console.log("⛽ Gas used:", receipt.gasUsed.toString());

      console.log("⏳ Waiting 60 seconds for VRF response...");
      await new Promise((resolve) => setTimeout(resolve, 60000));

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
        console.log("✅ VRF integration working with large subscription ID!");
      } else {
        console.log("⏳ VRF response still pending");
      }
    } catch (error) {
      console.error("❌ VRF request failed:", error.message);
      if (error.reason) console.error("Reason:", error.reason);
    }
  } catch (error) {
    console.error("❌ Setup error:", error.message);
    if (error.reason) console.error("Reason:", error.reason);
  }
}

setupLargeVRFSub().catch(console.error);
