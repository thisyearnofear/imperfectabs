const { ethers } = require("ethers");

const CONFIG = {
  rpcUrl: "https://api.avax-test.network/ext/bc/C/rpc",
  contractAddress: "0x060F0F142D5BfC721a7C53D00B4bAD77Ad82C776",
  privateKey: process.env.PRIVATE_KEY,
};

// Contract ABI (minimal)
const CONTRACT_ABI = [
  "function lastSubmissionTime(address user) external view returns (uint256)",
  "function SUBMISSION_COOLDOWN() external view returns (uint256)",
  "function getUserSessions(address user) external view returns (tuple(uint256 reps, uint256 formAccuracy, uint256 streak, uint256 duration, uint256 timestamp, uint256 enhancedScore, string region)[])",
];

async function checkCooldown() {
  console.log("⏰ Checking workout submission cooldown...");

  // Setup provider and wallet
  const provider = new ethers.providers.JsonRpcProvider(CONFIG.rpcUrl);
  const wallet = new ethers.Wallet(CONFIG.privateKey, provider);
  const contract = new ethers.Contract(
    CONFIG.contractAddress,
    CONTRACT_ABI,
    provider
  );

  console.log("👤 Wallet Address:", wallet.address);

  try {
    // Get current time and last submission time
    const currentTime = Math.floor(Date.now() / 1000);
    const lastSubmissionTime = await contract.lastSubmissionTime(
      wallet.address
    );
    const cooldownPeriod = await contract.SUBMISSION_COOLDOWN();

    console.log("\n⏰ Cooldown Status:");
    console.log("Current time:", new Date(currentTime * 1000).toLocaleString());
    console.log(
      "Last submission:",
      new Date(lastSubmissionTime.toNumber() * 1000).toLocaleString()
    );
    console.log(
      "Cooldown period:",
      cooldownPeriod.toString(),
      "seconds (",
      cooldownPeriod.div(3600).toString(),
      "hours)"
    );

    const nextAllowedTime = lastSubmissionTime.add(cooldownPeriod);
    const timeRemaining = nextAllowedTime.sub(currentTime);

    console.log(
      "Next allowed:",
      new Date(nextAllowedTime.toNumber() * 1000).toLocaleString()
    );

    if (timeRemaining.gt(0)) {
      const hoursRemaining = Math.floor(timeRemaining.toNumber() / 3600);
      const minutesRemaining = Math.floor(
        (timeRemaining.toNumber() % 3600) / 60
      );
      console.log(
        "⏳ Time remaining:",
        hoursRemaining,
        "hours",
        minutesRemaining,
        "minutes"
      );
      console.log("❌ Cooldown active - cannot submit workout yet");
    } else {
      console.log("✅ Cooldown expired - can submit workout now");
    }

    // Check user sessions
    console.log("\n📋 Your Workout History:");
    const sessions = await contract.getUserSessions(wallet.address);
    console.log("Total sessions:", sessions.length);

    if (sessions.length > 0) {
      console.log("\nRecent sessions:");
      sessions.slice(-3).forEach((session, index) => {
        console.log(
          `${sessions.length - 2 + index}. ${session.reps} reps, ${
            session.formAccuracy
          }% accuracy, score: ${session.enhancedScore}, region: ${
            session.region
          }`
        );
        console.log(
          `   Time: ${new Date(
            session.timestamp.toNumber() * 1000
          ).toLocaleString()}`
        );
      });
    }
  } catch (error) {
    console.error("❌ Error checking cooldown:", error.message);
  }
}

checkCooldown().catch(console.error);
