/**
 * Test with minimal Chainlink Functions source
 */

const { ethers } = require("ethers");

// Configuration
const CONFIG = {
  rpcUrl: "https://api.avax-test.network/ext/bc/C/rpc",
  contractAddress: "0x060F0F142D5BfC721a7C53D00B4bAD77Ad82C776",
  privateKey: process.env.PRIVATE_KEY,
};

// Minimal JavaScript source for testing
const MINIMAL_SOURCE = "return Functions.encodeUint256(42);";

// Contract ABI
const CONTRACT_ABI = [
  "function updateFunctionsConfig(uint64 _subscriptionId, uint32 _gasLimit, bytes32 _donId, string memory _source) external",
  "function submitWorkoutSession(uint256 _reps, uint256 _formAccuracy, uint256 _streak, uint256 _duration, int256 _latitude, int256 _longitude) external",
  "function getChainlinkConfig() external view returns (uint64 subId, uint32 gasLim, bytes32 donId, string memory source)",
];

async function testMinimalFunctions() {
  console.log("🔍 Testing with minimal Chainlink Functions source...");

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
    // Get current config
    console.log("\n📋 Getting current configuration...");
    const [subId, gasLim, donId, currentSource] =
      await contract.getChainlinkConfig();
    console.log("Current source length:", currentSource.length);
    console.log("Minimal source length:", MINIMAL_SOURCE.length);

    // Update to minimal source
    console.log("\n🔄 Updating to minimal source...");
    try {
      const updateTx = await contract.updateFunctionsConfig(
        subId,
        gasLim,
        donId,
        MINIMAL_SOURCE,
        {
          gasLimit: 2000000,
        }
      );

      console.log("🔗 Update Transaction Hash:", updateTx.hash);
      await updateTx.wait();
      console.log("✅ Source updated to minimal version");
    } catch (error) {
      console.error("❌ Update transaction failed:", error.message);
      if (error.reason) console.error("Reason:", error.reason);
      if (error.code) console.error("Code:", error.code);
      if (error.data) console.error("Data:", error.data);
      throw error;
    }

    // Test workout submission with minimal source
    console.log("\n🏋️ Testing workout submission with minimal source...");
    const workoutData = {
      reps: 5,
      formAccuracy: 80,
      streak: 1,
      duration: 30,
      latitude: 40000000,
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
          gasLimit: 1000000,
        }
      );

      console.log("🔗 Submit Transaction Hash:", submitTx.hash);
      const receipt = await submitTx.wait();
      console.log("✅ Transaction confirmed in block:", receipt.blockNumber);
      console.log("⛽ Gas Used:", receipt.gasUsed.toString());
    } catch (error) {
      console.error("❌ Workout submission failed:", error.message);
      if (error.reason) console.error("Reason:", error.reason);
      if (error.code) console.error("Code:", error.code);
      if (error.data) console.error("Data:", error.data);
      throw error;
    }

    // Restore original source
    console.log("\n🔄 Restoring original source...");
    const restoreTx = await contract.updateFunctionsConfig(
      subId,
      gasLim,
      donId,
      currentSource,
      {
        gasLimit: 2000000,
      }
    );

    await restoreTx.wait();
    console.log("✅ Original source restored");
  } catch (error) {
    console.error("❌ Test error:", error.reason || error.message);
  }
}

// Run the test
testMinimalFunctions()
  .then(() => {
    console.log("\n🔍 Minimal Functions test complete!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Test script error:", error);
    process.exit(1);
  });
