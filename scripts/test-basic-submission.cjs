const { ethers } = require("ethers");

const CONFIG = {
  rpcUrl: "https://api.avax-test.network/ext/bc/C/rpc",
  contractAddress: "0x060F0F142D5BfC721a7C53D00B4bAD77Ad82C776",
  privateKey: process.env.PRIVATE_KEY,
};

// Contract ABI
const CONTRACT_ABI = [
  "function submitWorkoutSession(uint256 _reps, uint256 _formAccuracy, uint256 _streak, uint256 _duration, int256 _latitude, int256 _longitude) external",
];

async function testBasicSubmission() {
  console.log("🏋️ Testing basic workout submission...");

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
    // Test with very simple data
    console.log("\n🏋️ Testing with simple workout data...");
    const workoutData = {
      reps: 5,
      formAccuracy: 80,
      streak: 1,
      duration: 30,
      latitude: 40000000, // Simple coordinates
      longitude: -74000000,
    };

    console.log("📊 Workout Data:", workoutData);

    try {
      const submitTx = await contract.submitWorkoutSession(
        workoutData.reps,
        workoutData.formAccuracy,
        workoutData.streak,
        workoutData.duration,
        workoutData.latitude,
        workoutData.longitude,
        {
          gasLimit: 2000000,
        }
      );

      console.log("🔗 Submit Transaction Hash:", submitTx.hash);
      console.log("⏳ Waiting for confirmation...");

      const receipt = await submitTx.wait();
      console.log("✅ Transaction confirmed in block:", receipt.blockNumber);
      console.log("⛽ Gas Used:", receipt.gasUsed.toString());
      console.log("📋 Status:", receipt.status === 1 ? "SUCCESS" : "FAILED");

      // Check for events
      if (receipt.logs && receipt.logs.length > 0) {
        console.log("📋 Events emitted:", receipt.logs.length);
        receipt.logs.forEach((log, index) => {
          console.log(`Event ${index + 1}:`, log.topics);
        });
      } else {
        console.log("📋 No events emitted");
      }

      if (receipt.status === 1) {
        console.log("\n🎉 Basic submission test successful!");
      } else {
        console.log("\n❌ Transaction succeeded but status is 0 (failed)");
      }
    } catch (error) {
      console.error("❌ Workout submission failed:", error.message);
      if (error.reason) console.error("Reason:", error.reason);
      if (error.code) console.error("Code:", error.code);
      if (error.data) console.error("Data:", error.data);

      // Try to get more details about the error
      if (error.transaction) {
        console.log("Transaction details:");
        console.log("- Gas limit:", error.transaction.gasLimit?.toString());
        console.log("- Gas price:", error.transaction.gasPrice?.toString());
      }

      if (error.receipt) {
        console.log("Receipt details:");
        console.log("- Gas used:", error.receipt.gasUsed?.toString());
        console.log("- Status:", error.receipt.status);
      }
    }
  } catch (error) {
    console.error("❌ Test error:", error.reason || error.message);
  }

  console.log("\n🔍 Basic submission test finished!");
}

testBasicSubmission().catch(console.error);
