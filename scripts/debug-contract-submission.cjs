/**
 * Debug contract submission issues step by step
 */

const { ethers } = require("ethers");

// Configuration
const CONFIG = {
  rpcUrl: "https://api.avax-test.network/ext/bc/C/rpc",
  contractAddress: "0x060F0F142D5BfC721a7C53D00B4bAD77Ad82C776",
  privateKey: process.env.PRIVATE_KEY,
};

// Contract ABI for debugging
const CONTRACT_ABI = [
  "function submitWorkoutSession(uint256 _reps, uint256 _formAccuracy, uint256 _streak, uint256 _duration, int256 _latitude, int256 _longitude) external",
  "function lastSubmissionTime(address user) external view returns (uint256)",
  "function SUBMISSION_COOLDOWN() external view returns (uint256)",
  "function MAX_REPS_PER_SESSION() external view returns (uint256)",
  "function getUserSessions(address user) external view returns (tuple(uint256 reps, uint256 formAccuracy, uint256 streak, uint256 duration, uint256 timestamp, uint256 enhancedScore, bool analysisComplete, string conditions, uint256 temperature, uint256 weatherBonusBps)[] memory)",
  "function owner() external view returns (address)",
];

async function debugContractSubmission() {
  console.log("🔍 Debugging contract submission issues...");

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
    // Check basic contract state
    console.log("\n📋 Checking contract state...");

    const owner = await contract.owner();
    console.log("Contract Owner:", owner);
    console.log(
      "Are we owner?",
      owner.toLowerCase() === wallet.address.toLowerCase()
    );

    const cooldown = await contract.SUBMISSION_COOLDOWN();
    console.log("Submission Cooldown:", cooldown.toString(), "seconds");

    const maxReps = await contract.MAX_REPS_PER_SESSION();
    console.log("Max Reps Per Session:", maxReps.toString());

    const lastSubmission = await contract.lastSubmissionTime(wallet.address);
    console.log("Last Submission Time:", lastSubmission.toString());

    const currentTime = Math.floor(Date.now() / 1000);
    const nextAllowedTime = lastSubmission.toNumber() + cooldown.toNumber();
    console.log("Current Time:", currentTime);
    console.log("Next Allowed Time:", nextAllowedTime);
    console.log("Cooldown Active?", currentTime < nextAllowedTime);

    if (currentTime < nextAllowedTime) {
      const waitTime = nextAllowedTime - currentTime;
      console.log(
        "⏳ Need to wait",
        waitTime,
        "seconds before next submission"
      );
      return;
    }

    // Check user sessions
    console.log("\n👤 Checking user sessions...");
    const sessions = await contract.getUserSessions(wallet.address);
    console.log("Current sessions count:", sessions.length);

    // Test workout data
    const workoutData = {
      reps: 25,
      formAccuracy: 85,
      streak: 15,
      duration: 120,
      latitude: 40712800, // NYC latitude * 1e6
      longitude: -74006000, // NYC longitude * 1e6
    };

    console.log("\n🏋️ Testing workout submission...");
    console.log("📊 Workout Data:", workoutData);

    // Validate inputs against contract constraints
    console.log("\n✅ Validating inputs...");
    console.log(
      "Reps valid?",
      workoutData.reps > 0 && workoutData.reps <= maxReps.toNumber()
    );
    console.log("Form accuracy valid?", workoutData.formAccuracy <= 100);

    // Try to estimate gas first
    console.log("\n⛽ Estimating gas...");
    try {
      const gasEstimate = await contract.estimateGas.submitWorkoutSession(
        workoutData.reps,
        workoutData.formAccuracy,
        workoutData.streak,
        workoutData.duration,
        workoutData.latitude,
        workoutData.longitude
      );
      console.log("Gas Estimate:", gasEstimate.toString());
    } catch (gasError) {
      console.error(
        "❌ Gas estimation failed:",
        gasError.reason || gasError.message
      );

      // Try to get more details about the error
      if (gasError.reason) {
        console.log("Error reason:", gasError.reason);
      }
      if (gasError.data) {
        console.log("Error data:", gasError.data);
      }

      return;
    }

    // If gas estimation succeeds, try the actual transaction
    console.log("\n🚀 Attempting transaction...");
    const tx = await contract.submitWorkoutSession(
      workoutData.reps,
      workoutData.formAccuracy,
      workoutData.streak,
      workoutData.duration,
      workoutData.latitude,
      workoutData.longitude,
      {
        gasLimit: 1000000, // High gas limit for debugging
      }
    );

    console.log("🔗 Transaction Hash:", tx.hash);
    console.log("⏳ Waiting for confirmation...");

    const receipt = await tx.wait();
    console.log("✅ Transaction confirmed in block:", receipt.blockNumber);
    console.log("⛽ Gas Used:", receipt.gasUsed.toString());

    // Check events
    console.log("\n📋 Transaction Events:");
    receipt.events?.forEach((event, index) => {
      console.log(`  ${index + 1}. ${event.event || "Unknown Event"}`);
    });
  } catch (error) {
    console.error("❌ Debug error:", error);

    if (error.reason) {
      console.error("Reason:", error.reason);
    }
    if (error.data) {
      console.error("Error data:", error.data);
    }
    if (error.transaction) {
      console.error("Failed transaction:", error.transaction.hash);
    }
  }
}

// Run the debug
debugContractSubmission()
  .then(() => {
    console.log("\n🔍 Debug complete!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Debug script error:", error);
    process.exit(1);
  });
