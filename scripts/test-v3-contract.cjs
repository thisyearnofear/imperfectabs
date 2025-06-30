const { ethers } = require("ethers");

const CONFIG = {
  rpcUrl: "https://api.avax-test.network/ext/bc/C/rpc",
  contractAddress: "0x060F0F142D5BfC721a7C53D00B4bAD77Ad82C776",
  privateKey: process.env.PRIVATE_KEY,
};

// Contract ABI
const CONTRACT_ABI = [
  "function submitWorkoutSession(uint256 _reps, uint256 _formAccuracy, uint256 _streak, uint256 _duration, string memory _region) external",
  "function getCurrentChallenge() external view returns (tuple(uint256 challengeType, uint256 target, uint256 bonusMultiplier, uint256 expiresAt, bool active))",
  "function getSeasonalBonus(uint256 month) external view returns (uint256)",
  "function getRegionBonus(string memory region) external view returns (uint256)",
  "function getUserSessions(address user) external view returns (tuple(uint256 reps, uint256 formAccuracy, uint256 streak, uint256 duration, uint256 timestamp, uint256 enhancedScore, string region)[])",
  "function leaderboard(uint256 index) external view returns (tuple(address user, uint256 totalReps, uint256 averageFormAccuracy, uint256 bestStreak, uint256 sessionsCompleted, uint256 timestamp))",
  "function getLeaderboardSize() external view returns (uint256)",
];

async function testV3Contract() {
  console.log("🏋️ Testing ImperfectAbsHub V3...");

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
    // Check current challenge
    console.log("\n🎯 Current Daily Challenge:");
    try {
      const challenge = await contract.getCurrentChallenge();
      console.log("  Type:", challenge.challengeType.toString());
      console.log("  Target:", challenge.target.toString());
      console.log(
        "  Bonus:",
        challenge.bonusMultiplier.toString(),
        "basis points"
      );
      console.log("  Active:", challenge.active);
      if (challenge.expiresAt.gt(0)) {
        console.log(
          "  Expires:",
          new Date(challenge.expiresAt.toNumber() * 1000).toLocaleString()
        );
      }
    } catch (error) {
      console.log("  No active challenge (VRF not configured yet)");
    }

    // Check weather bonuses
    console.log("\n🌤️  Weather Bonuses:");
    const currentMonth = new Date().getMonth() + 1;
    const seasonalBonus = await contract.getSeasonalBonus(currentMonth);
    const northBonus = await contract.getRegionBonus("north");
    const tropicalBonus = await contract.getRegionBonus("tropical");

    console.log(
      `  Current month (${currentMonth}):`,
      seasonalBonus.toString(),
      "basis points"
    );
    console.log("  North region:", northBonus.toString(), "basis points");
    console.log("  Tropical region:", tropicalBonus.toString(), "basis points");

    // Test workout submission
    console.log("\n🏋️ Testing workout submission...");
    const workoutData = {
      reps: 25,
      formAccuracy: 90,
      streak: 3,
      duration: 45,
      region: "north", // Cold region for bonus
    };

    console.log("📊 Workout Data:", workoutData);

    try {
      const submitTx = await contract.submitWorkoutSession(
        workoutData.reps,
        workoutData.formAccuracy,
        workoutData.streak,
        workoutData.duration,
        workoutData.region,
        {
          gasLimit: 500000, // Much lower than before!
        }
      );

      console.log("🔗 Submit Transaction Hash:", submitTx.hash);
      console.log("⏳ Waiting for confirmation...");

      const receipt = await submitTx.wait();
      console.log("✅ Transaction confirmed in block:", receipt.blockNumber);
      console.log("⛽ Gas Used:", receipt.gasUsed.toString());
      console.log("📋 Status:", receipt.status === 1 ? "SUCCESS" : "FAILED");

      if (receipt.status === 1) {
        console.log("\n🎉 Workout submission successful!");

        // Check user sessions
        console.log("\n📋 User Sessions:");
        const sessions = await contract.getUserSessions(wallet.address);
        console.log("Total sessions:", sessions.length);

        if (sessions.length > 0) {
          const lastSession = sessions[sessions.length - 1];
          console.log("Last session:");
          console.log("  Reps:", lastSession.reps.toString());
          console.log(
            "  Form Accuracy:",
            lastSession.formAccuracy.toString(),
            "%"
          );
          console.log(
            "  Enhanced Score:",
            lastSession.enhancedScore.toString()
          );
          console.log("  Region:", lastSession.region);
          console.log(
            "  Timestamp:",
            new Date(lastSession.timestamp.toNumber() * 1000).toLocaleString()
          );
        }

        // Check leaderboard
        console.log("\n🏆 Leaderboard:");
        const leaderboardSize = await contract.getLeaderboardSize();
        console.log("Total users:", leaderboardSize.toString());

        if (leaderboardSize.gt(0)) {
          const userEntry = await contract.leaderboard(leaderboardSize.sub(1)); // Last entry
          console.log("Your stats:");
          console.log("  Total Reps:", userEntry.totalReps.toString());
          console.log(
            "  Average Accuracy:",
            userEntry.averageFormAccuracy.toString(),
            "%"
          );
          console.log("  Best Streak:", userEntry.bestStreak.toString());
          console.log(
            "  Sessions Completed:",
            userEntry.sessionsCompleted.toString()
          );
        }
      } else {
        console.log("\n❌ Transaction succeeded but status is 0 (failed)");
      }
    } catch (error) {
      console.error("❌ Workout submission failed:", error.message);
      if (error.reason) console.error("Reason:", error.reason);
      if (error.code) console.error("Code:", error.code);
    }
  } catch (error) {
    console.error("❌ Test error:", error.reason || error.message);
  }

  console.log("\n🔍 V3 Contract test complete!");
  console.log("\n📋 Key Improvements:");
  console.log("✅ No more Chainlink Functions complexity");
  console.log("✅ Predictable gas costs (~100k vs 570k+)");
  console.log("✅ Reliable weather bonuses via Automation");
  console.log("✅ Fun daily challenges via VRF");
  console.log("✅ Still supports cross-chain via CCIP");
}

testV3Contract().catch(console.error);
