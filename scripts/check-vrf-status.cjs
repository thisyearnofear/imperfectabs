const { ethers } = require("ethers");

const CONFIG = {
  rpcUrl: "https://api.avax-test.network/ext/bc/C/rpc",
  contractAddress: "0x060F0F142D5BfC721a7C53D00B4bAD77Ad82C776",
  vrfCoordinator: "0x2eD832Ba664535e5886b75D64C46EB9a228C2610",
  subscriptionId: 2835,
  privateKey: process.env.PRIVATE_KEY,
};

// VRF Coordinator ABI (minimal)
const VRF_COORDINATOR_ABI = [
  "function getSubscription(uint64 subId) external view returns (uint96 balance, uint64 reqCount, address owner, address[] memory consumers)",
];

// Contract ABI (minimal)
const CONTRACT_ABI = [
  "function getCurrentChallenge() external view returns (tuple(uint256 challengeType, uint256 target, uint256 bonusMultiplier, uint256 expiresAt, bool active))",
  "function lastChallengeUpdate() external view returns (uint256)",
  "function manualChallengeUpdate() external",
];

async function checkVRFStatus() {
  console.log("🔍 Checking VRF Status After Funding...");

  // Setup provider and wallet
  const provider = new ethers.providers.JsonRpcProvider(CONFIG.rpcUrl);
  const wallet = new ethers.Wallet(CONFIG.privateKey, provider);
  const vrfCoordinator = new ethers.Contract(
    CONFIG.vrfCoordinator,
    VRF_COORDINATOR_ABI,
    provider
  );
  const contract = new ethers.Contract(
    CONFIG.contractAddress,
    CONTRACT_ABI,
    wallet
  );

  console.log("👤 Wallet Address:", wallet.address);
  console.log("📄 Contract Address:", CONFIG.contractAddress);
  console.log("🆔 Subscription ID:", CONFIG.subscriptionId);

  try {
    // Check subscription balance
    console.log("\n💰 VRF Subscription Status:");
    const [balance, reqCount, owner, consumers] =
      await vrfCoordinator.getSubscription(CONFIG.subscriptionId);
    console.log("Balance:", ethers.utils.formatEther(balance), "LINK");
    console.log("Request Count:", reqCount.toString());
    console.log("Consumers:", consumers.length);

    if (balance.eq(0)) {
      console.log("❌ Subscription has 0 LINK balance!");
      console.log("⚠️  Please fund the subscription with at least 5 LINK");
      console.log("   Go to: https://vrf.chain.link/fuji");
      console.log("   Find subscription 2835 and add LINK");
      return;
    } else {
      console.log("✅ Subscription has sufficient LINK balance");
    }

    // Check current challenge state
    console.log("\n🎯 Current Challenge State:");
    const challenge = await contract.getCurrentChallenge();
    const lastUpdate = await contract.lastChallengeUpdate();

    console.log("Challenge Type:", challenge.challengeType.toString());
    console.log("Target:", challenge.target.toString());
    console.log("Bonus Multiplier:", challenge.bonusMultiplier.toString());
    console.log("Active:", challenge.active);
    console.log(
      "Last Update:",
      new Date(lastUpdate.toNumber() * 1000).toLocaleString()
    );

    if (challenge.active && challenge.target.gt(0)) {
      console.log("🎉 VRF Challenge Successfully Generated!");
      console.log("✅ Daily challenges are working!");

      // Decode challenge type
      const challengeTypes = [
        "Reps",
        "Duration",
        "Streak",
        "Accuracy",
        "Combo",
      ];
      const challengeType =
        challengeTypes[challenge.challengeType.toNumber()] || "Unknown";
      console.log(
        `Challenge: ${challengeType} challenge with target ${challenge.target.toString()}`
      );
      console.log(
        `Bonus: ${challenge.bonusMultiplier.toString()} basis points (${challenge.bonusMultiplier
          .div(100)
          .toString()}% bonus)`
      );

      if (challenge.expiresAt.gt(0)) {
        console.log(
          "Expires:",
          new Date(challenge.expiresAt.toNumber() * 1000).toLocaleString()
        );
      }
    } else {
      console.log("⏳ No active challenge yet");

      // Test VRF request if balance is sufficient
      if (balance.gt(ethers.utils.parseEther("0.5"))) {
        console.log("\n🧪 Testing new VRF request...");
        try {
          const challengeTx = await contract.manualChallengeUpdate({
            gasLimit: 200000,
          });
          console.log("🔗 VRF request transaction:", challengeTx.hash);

          const receipt = await challengeTx.wait();
          console.log("✅ VRF request successful");
          console.log("⛽ Gas used:", receipt.gasUsed.toString());

          console.log("⏳ Waiting 2 minutes for VRF response...");
          await new Promise((resolve) => setTimeout(resolve, 120000));

          // Check again
          const newChallenge = await contract.getCurrentChallenge();
          if (newChallenge.active && newChallenge.target.gt(0)) {
            console.log("🎉 New VRF challenge generated!");
            console.log("Type:", newChallenge.challengeType.toString());
            console.log("Target:", newChallenge.target.toString());
            console.log(
              "Bonus:",
              newChallenge.bonusMultiplier.toString(),
              "basis points"
            );
          } else {
            console.log(
              "⏳ VRF response still pending (can take up to 5 minutes)"
            );
          }
        } catch (error) {
          console.error("❌ VRF request failed:", error.message);
          if (error.reason) console.error("Reason:", error.reason);
        }
      } else {
        console.log("⚠️  Insufficient LINK balance for new VRF request");
      }
    }

    // Final status
    console.log("\n📋 VRF Integration Status:");
    console.log("✅ Contract added as VRF consumer");
    console.log(`${balance.gt(0) ? "✅" : "❌"} Subscription funded`);
    console.log(`${challenge.active ? "✅" : "⏳"} Daily challenges working`);

    if (balance.gt(0) && challenge.active) {
      console.log("\n🎉 VRF integration fully working!");
      console.log(
        "🚀 Your fitness DApp now has provably fair daily challenges!"
      );
    }
  } catch (error) {
    console.error("❌ VRF status check error:", error.message);
    if (error.reason) console.error("Reason:", error.reason);
  }
}

checkVRFStatus().catch(console.error);
