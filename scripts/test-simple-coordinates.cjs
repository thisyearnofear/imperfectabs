/**
 * Test with simpler coordinates to isolate the issue
 */

const { ethers } = require("ethers");

// Configuration
const CONFIG = {
  rpcUrl: "https://api.avax-test.network/ext/bc/C/rpc",
  contractAddress: "0x060F0F142D5BfC721a7C53D00B4bAD77Ad82C776",
  privateKey: process.env.PRIVATE_KEY,
};

// Contract ABI for testing
const CONTRACT_ABI = [
  "function submitWorkoutSession(uint256 _reps, uint256 _formAccuracy, uint256 _streak, uint256 _duration, int256 _latitude, int256 _longitude) external",
  "function lastSubmissionTime(address user) external view returns (uint256)",
  "function SUBMISSION_COOLDOWN() external view returns (uint256)",
];

async function testSimpleCoordinates() {
  console.log("🔍 Testing with simpler coordinates...");

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
    // Check cooldown first
    const lastSubmission = await contract.lastSubmissionTime(wallet.address);
    const cooldown = await contract.SUBMISSION_COOLDOWN();
    const currentTime = Math.floor(Date.now() / 1000);
    const nextAllowedTime = lastSubmission.toNumber() + cooldown.toNumber();

    console.log("Current Time:", currentTime);
    console.log("Next Allowed Time:", nextAllowedTime);

    if (currentTime < nextAllowedTime) {
      const waitTime = nextAllowedTime - currentTime;
      console.log(
        "⏳ Need to wait",
        waitTime,
        "seconds before next submission"
      );
      return;
    }

    // Test with very simple coordinates (integers)
    const workoutData = {
      reps: 10,
      formAccuracy: 80,
      streak: 5,
      duration: 60,
      latitude: 40000000, // Simple: 40.0 * 1e6
      longitude: -74000000, // Simple: -74.0 * 1e6
    };

    console.log("\n🏋️ Testing with simple coordinates...");
    console.log("📊 Workout Data:", workoutData);

    // Try gas estimation first
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
      console.log("✅ Gas Estimate:", gasEstimate.toString());

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
          gasLimit: gasEstimate.mul(120).div(100), // 20% buffer
        }
      );

      console.log("🔗 Transaction Hash:", tx.hash);
      console.log("⏳ Waiting for confirmation...");

      const receipt = await tx.wait();
      console.log("✅ Transaction confirmed in block:", receipt.blockNumber);
      console.log("⛽ Gas Used:", receipt.gasUsed.toString());
    } catch (gasError) {
      console.error(
        "❌ Gas estimation failed:",
        gasError.reason || gasError.message
      );

      // Try with even simpler data
      console.log("\n🧪 Trying with minimal data...");
      const minimalData = {
        reps: 1,
        formAccuracy: 50,
        streak: 1,
        duration: 30,
        latitude: 1000000, // 1.0 * 1e6
        longitude: 1000000, // 1.0 * 1e6
      };

      console.log("📊 Minimal Data:", minimalData);

      try {
        const minimalGasEstimate =
          await contract.estimateGas.submitWorkoutSession(
            minimalData.reps,
            minimalData.formAccuracy,
            minimalData.streak,
            minimalData.duration,
            minimalData.latitude,
            minimalData.longitude
          );
        console.log("✅ Minimal Gas Estimate:", minimalGasEstimate.toString());
      } catch (minimalError) {
        console.error(
          "❌ Even minimal data failed:",
          minimalError.reason || minimalError.message
        );
      }
    }
  } catch (error) {
    console.error("❌ Test error:", error);
  }
}

// Run the test
testSimpleCoordinates()
  .then(() => {
    console.log("\n🔍 Simple coordinates test complete!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Test script error:", error);
    process.exit(1);
  });
