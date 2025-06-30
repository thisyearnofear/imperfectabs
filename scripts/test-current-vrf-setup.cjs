const { ethers } = require("ethers");

const CONFIG = {
  rpcUrl: "https://api.avax-test.network/ext/bc/C/rpc",
  contractAddress: "0x060F0F142D5BfC721a7C53D00B4bAD77Ad82C776",
  privateKey: process.env.PRIVATE_KEY,
};

// Contract ABI
const CONTRACT_ABI = [
  "function manualChallengeUpdate() external",
  "function getCurrentChallenge() external view returns (tuple(uint256 challengeType, uint256 target, uint256 bonusMultiplier, uint256 expiresAt, bool active))",
  "function i_vrfCoordinator() external view returns (address)",
  "function s_subscriptionId() external view returns (uint64)",
  "function updateVRFConfig(uint64 subscriptionId, bytes32 keyHash) external",
];

async function testCurrentVRFSetup() {
  console.log("🧪 Testing Current VRF Setup...");

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
    // Check current configuration
    console.log("\n📋 Current VRF Configuration:");
    const currentCoordinator = await contract.i_vrfCoordinator();
    const currentSubId = await contract.s_subscriptionId();
    console.log("VRF Coordinator:", currentCoordinator);
    console.log("Subscription ID:", currentSubId.toString());

    // Check current challenge state
    console.log("\n🎯 Current Challenge State:");
    const challenge = await contract.getCurrentChallenge();
    console.log("Type:", challenge.challengeType.toString());
    console.log("Target:", challenge.target.toString());
    console.log("Active:", challenge.active);
    console.log("Bonus:", challenge.bonusMultiplier.toString(), "basis points");

    if (challenge.active && challenge.target.gt(0)) {
      console.log("✅ There's already an active challenge!");
      console.log("🎉 VRF is working!");
      return;
    }

    // Test VRF request with current configuration
    console.log("\n🎲 Testing VRF request with current setup...");
    try {
      const challengeTx = await contract.manualChallengeUpdate({
        gasLimit: 300000,
      });

      console.log("🔗 VRF request transaction:", challengeTx.hash);
      const receipt = await challengeTx.wait();

      if (receipt.status === 1) {
        console.log("✅ VRF request transaction successful");
        console.log("⛽ Gas used:", receipt.gasUsed.toString());

        console.log("⏳ Waiting 2 minutes for VRF response...");
        await new Promise((resolve) => setTimeout(resolve, 120000));

        // Check for challenge update
        const newChallenge = await contract.getCurrentChallenge();
        if (newChallenge.active && newChallenge.target.gt(0)) {
          console.log("🎉 VRF Challenge Generated Successfully!");
          console.log("Challenge Details:");
          console.log("  Type:", newChallenge.challengeType.toString());
          console.log("  Target:", newChallenge.target.toString());
          console.log(
            "  Bonus:",
            newChallenge.bonusMultiplier.toString(),
            "basis points"
          );

          if (newChallenge.expiresAt.gt(0)) {
            console.log(
              "  Expires:",
              new Date(
                newChallenge.expiresAt.toNumber() * 1000
              ).toLocaleString()
            );
          }

          console.log("\n✅ VRF Integration is working perfectly!");
          console.log("🚀 Daily challenges are functional!");
        } else {
          console.log(
            "⏳ VRF response still pending (can take up to 5 minutes)"
          );
          console.log("💡 Check again in a few minutes");
        }
      } else {
        console.log("❌ VRF request transaction failed");
      }
    } catch (error) {
      console.error("❌ VRF request failed:", error.message);
      if (error.reason) console.error("Reason:", error.reason);

      if (error.message.includes("InvalidConsumer")) {
        console.log("\n💡 Issue: Contract not added as VRF consumer");
        console.log("Solution:");
        console.log("1. Go to https://vrf.chain.link/fuji");
        console.log("2. Find your subscription");
        console.log("3. Add consumer:", CONFIG.contractAddress);
      } else if (error.message.includes("InsufficientBalance")) {
        console.log("\n💡 Issue: Insufficient LINK balance in subscription");
        console.log("Solution: Fund the subscription with more LINK");
      } else {
        console.log("\n💡 There might be a configuration mismatch");
        console.log(
          "The contract might be configured for a different subscription"
        );
      }
    }

    console.log("\n📋 Summary:");
    console.log("Current setup uses VRF v2.0 coordinator");
    console.log("Your subscription is VRF v2.5");
    console.log("This might be causing compatibility issues");

    console.log("\n🔄 Options:");
    console.log(
      "1. Try to make current setup work (if subscriptions are compatible)"
    );
    console.log("2. Deploy new contract with VRF v2.5 coordinator");
    console.log("3. Use the working v2.0 subscription (ID 2835) instead");
  } catch (error) {
    console.error("❌ Test error:", error.message);
    if (error.reason) console.error("Reason:", error.reason);
  }
}

testCurrentVRFSetup().catch(console.error);
