/**
 * Debug script to check if Chainlink Functions requests are being made
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
  "function getChainlinkConfig() external view returns (uint64 subId, uint32 gasLim, bytes32 donId, string memory source)",
  "event WeatherAnalysisRequested(bytes32 indexed requestId, address indexed user, uint256 sessionIndex)",
  "event RequestSent(bytes32 indexed requestId)",
  "event RequestFulfilled(bytes32 indexed requestId)",
];

async function debugChainlinkRequest() {
  console.log("🔍 Debugging Chainlink Functions request...");

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

  // Get current config
  console.log("\n📋 Getting current configuration...");
  const [subId, gasLim, donId, source] = await contract.getChainlinkConfig();
  console.log("Subscription ID:", subId.toString());
  console.log("Gas limit:", gasLim.toString());
  console.log("DON ID:", ethers.utils.hexlify(donId));
  console.log("Source length:", source.length, "characters");
  console.log("Source preview:", source.substring(0, 100) + "...");

  // Set up event listeners
  console.log("\n👂 Setting up event listeners...");

  contract.on(
    "WeatherAnalysisRequested",
    (requestId, user, sessionIndex, event) => {
      console.log("🌤️  WeatherAnalysisRequested Event:");
      console.log("   Request ID:", requestId);
      console.log("   User:", user);
      console.log("   Session Index:", sessionIndex.toString());
      console.log("   Block:", event.blockNumber);
    }
  );

  contract.on("RequestSent", (requestId, event) => {
    console.log("📤 RequestSent Event:");
    console.log("   Request ID:", requestId);
    console.log("   Block:", event.blockNumber);
  });

  contract.on("RequestFulfilled", (requestId, event) => {
    console.log("📥 RequestFulfilled Event:");
    console.log("   Request ID:", requestId);
    console.log("   Block:", event.blockNumber);
  });

  // Submit a test workout
  console.log("\n🏋️ Submitting test workout...");
  const workoutData = {
    reps: 25,
    formAccuracy: 85,
    streak: 15,
    duration: 120,
    latitude: 40712800, // NYC latitude * 1e6
    longitude: -74006000, // NYC longitude * 1e6
  };

  console.log("📊 Workout Data:", workoutData);

  try {
    const tx = await contract.submitWorkoutSession(
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

    console.log("🔗 Transaction Hash:", tx.hash);
    console.log("⏳ Waiting for confirmation...");

    const receipt = await tx.wait();
    console.log("✅ Transaction confirmed in block:", receipt.blockNumber);
    console.log("⛽ Gas Used:", receipt.gasUsed.toString());

    // Parse events
    console.log("\n📋 Transaction Events:");
    receipt.events?.forEach((event, index) => {
      console.log(`  ${index + 1}. ${event.event || "Unknown Event"}`);
      if (event.event === "WeatherAnalysisRequested") {
        console.log(`     Request ID: ${event.args.requestId}`);
        console.log(`     User: ${event.args.user}`);
        console.log(`     Session Index: ${event.args.sessionIndex}`);
      }
    });

    // Wait for potential fulfillment
    console.log("\n⏳ Waiting 30 seconds for potential Chainlink response...");
    await new Promise((resolve) => setTimeout(resolve, 30000));
  } catch (error) {
    console.error("❌ Error submitting workout:", error);
    if (error.reason) {
      console.error("Reason:", error.reason);
    }
  }
}

// Run the debug
debugChainlinkRequest()
  .then(() => {
    console.log("\n🔍 Debug complete!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Debug error:", error);
    process.exit(1);
  });
