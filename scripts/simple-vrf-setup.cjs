const { ethers } = require("ethers");

const CONFIG = {
  rpcUrl: "https://api.avax-test.network/ext/bc/C/rpc",
  privateKey: process.env.PRIVATE_KEY,
  contractAddress: "0x060F0F142D5BfC721a7C53D00B4bAD77Ad82C776",
  vrfCoordinator: "0x2eD832Ba664535e5886b75D64C46EB9a228C2610",
  linkToken: "0x0b9d5D9136855f6FEc3c0993feE6E9CE8a297846",
};

// Contract ABI (minimal)
const CONTRACT_ABI = [
  "function updateVRFConfig(uint64 subscriptionId, bytes32 keyHash) external",
  "function manualChallengeUpdate() external",
  "function getCurrentChallenge() external view returns (tuple(uint256 challengeType, uint256 target, uint256 bonusMultiplier, uint256 expiresAt, bool active))",
];

async function simpleVRFSetup() {
  console.log("🎲 Simple VRF Setup for V3 Contract");
  console.log("📄 Contract:", CONFIG.contractAddress);

  // For now, let's use a manual approach
  console.log("\n📋 Manual VRF Setup Instructions:");
  console.log("1. Go to: https://vrf.chain.link/fuji");
  console.log("2. Connect your wallet");
  console.log("3. Create a new subscription");
  console.log("4. Fund it with at least 2 LINK");
  console.log("5. Add consumer:", CONFIG.contractAddress);
  console.log("6. Copy the subscription ID and run this script with it");

  // Check if subscription ID is provided as argument
  const subscriptionId = process.argv[2];

  if (!subscriptionId) {
    console.log("\n⚠️  Please provide subscription ID as argument:");
    console.log("   node scripts/simple-vrf-setup.cjs <SUBSCRIPTION_ID>");
    return;
  }

  console.log(
    "\n🔧 Configuring contract with subscription ID:",
    subscriptionId
  );

  // Setup provider and wallet
  const provider = new ethers.providers.JsonRpcProvider(CONFIG.rpcUrl);
  const wallet = new ethers.Wallet(CONFIG.privateKey, provider);
  const contract = new ethers.Contract(
    CONFIG.contractAddress,
    CONTRACT_ABI,
    wallet
  );

  try {
    // Update VRF config
    const keyHash =
      "0x354d2f95da55398f44b7cff77da56283d9c6c829a4bdf1bbcaf2ad6a4d081f61";
    console.log("📝 Updating VRF configuration...");

    const updateTx = await contract.updateVRFConfig(subscriptionId, keyHash);
    await updateTx.wait();
    console.log("✅ VRF configuration updated");

    // Test by requesting new challenge
    console.log("🎯 Testing VRF by generating new challenge...");
    const challengeTx = await contract.manualChallengeUpdate();
    await challengeTx.wait();
    console.log("✅ Challenge generation requested");

    console.log("\n⏳ Waiting 30 seconds for VRF response...");
    await new Promise((resolve) => setTimeout(resolve, 30000));

    // Check challenge
    try {
      const challenge = await contract.getCurrentChallenge();
      console.log("\n🎯 Generated Challenge:");
      console.log("  Type:", challenge.challengeType.toString());
      console.log("  Target:", challenge.target.toString());
      console.log(
        "  Bonus:",
        challenge.bonusMultiplier.toString(),
        "basis points"
      );
      console.log("  Active:", challenge.active);
      console.log(
        "  Expires:",
        new Date(challenge.expiresAt.toNumber() * 1000).toLocaleString()
      );

      if (challenge.active) {
        console.log("\n🎉 VRF setup successful! Daily challenges are working!");
      } else {
        console.log("\n⏳ Challenge still being generated...");
      }
    } catch (error) {
      console.log("⏳ Challenge data not ready yet (VRF response pending)");
    }

    console.log("\n📋 Next Steps:");
    console.log("1. Register contract for Chainlink Automation:");
    console.log("   - Visit: https://automation.chain.link/fuji");
    console.log("   - Add contract:", CONFIG.contractAddress);
    console.log("   - This will enable automatic weather bonus updates");
    console.log("2. Test workout submissions with the new contract");
  } catch (error) {
    console.error("❌ Setup error:", error.message);
    if (error.reason) console.error("Reason:", error.reason);
  }
}

simpleVRFSetup().catch(console.error);
