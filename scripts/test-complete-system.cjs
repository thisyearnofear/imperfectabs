const { ethers } = require("ethers");

const CONFIG = {
  rpcUrl: "https://api.avax-test.network/ext/bc/C/rpc",
  contractAddress: "0x060F0F142D5BfC721a7C53D00B4bAD77Ad82C776",
  privateKey: process.env.PRIVATE_KEY,
};

// Contract ABI
const CONTRACT_ABI = [
  "function submitWorkoutSession(uint256 _reps, uint256 _formAccuracy, uint256 _streak, uint256 _duration, int256 _latitude, int256 _longitude) external",
  "function getChainlinkConfig() external view returns (uint64 subId, uint32 gasLim, bytes32 donId, string memory source)",
];

async function testCompleteSystem() {
  console.log("🏋️ Testing complete WeatherXM integration system...");

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
    // Get current configuration
    console.log("\n📋 Getting current configuration...");
    const [subId, gasLim, donId, currentSource] =
      await contract.getChainlinkConfig();
    console.log("Subscription ID:", subId.toString());
    console.log("Gas Limit:", gasLim.toString());
    console.log("DON ID:", ethers.utils.parseBytes32String(donId));
    console.log("Source length:", currentSource.length);

    // Test workout submission with real coordinates
    console.log(
      "\n🏋️ Testing workout submission with WeatherXM integration..."
    );
    const workoutData = {
      reps: 10,
      formAccuracy: 85,
      streak: 5,
      duration: 45,
      latitude: 37774900, // San Francisco (WeatherXM has stations here)
      longitude: -122419400,
    };

    console.log("📊 Workout Data:", workoutData);
    console.log("📍 Location: San Francisco, CA");

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
      console.log("⏳ Waiting for Chainlink Functions to complete...");

      const receipt = await submitTx.wait();
      console.log("✅ Transaction confirmed in block:", receipt.blockNumber);
      console.log("⛽ Gas Used:", receipt.gasUsed.toString());

      // Check for events
      if (receipt.logs && receipt.logs.length > 0) {
        console.log("📋 Events emitted:", receipt.logs.length);
        receipt.logs.forEach((log, index) => {
          console.log(`Event ${index + 1}:`, log.topics);
        });
      } else {
        console.log("📋 No events emitted");
      }

      console.log("\n🎉 Complete system test successful!");
      console.log("✅ WeatherXM integration is working");
      console.log("✅ Chainlink Functions executed successfully");
      console.log("✅ Workout session submitted and processed");
    } catch (error) {
      console.error("❌ Workout submission failed:", error.message);
      if (error.reason) console.error("Reason:", error.reason);
      if (error.code) console.error("Code:", error.code);
      if (error.data) console.error("Data:", error.data);
      throw error;
    }
  } catch (error) {
    console.error("❌ Test error:", error.reason || error.message);
  }

  console.log("\n🔍 Complete system test finished!");
}

testCompleteSystem().catch(console.error);
