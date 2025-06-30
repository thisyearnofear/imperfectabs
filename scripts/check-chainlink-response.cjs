/**
 * Check for Chainlink Functions response
 */

const { ethers } = require("ethers");

// Configuration
const CONFIG = {
  rpcUrl: "https://api.avax-test.network/ext/bc/C/rpc",
  contractAddress: "0x94b359E1c724604b0068F82005BcD3170A48A03E",
  requestId:
    "0x989881271349e032913d7ed0c137a6d8eb6458429ef34212a99112c01fbc4196",
};

// Contract ABI for checking response
const CONTRACT_ABI = [
  "function getUserSessions(address user) external view returns (tuple(uint256 reps, uint256 formAccuracy, uint256 streak, uint256 duration, uint256 timestamp, uint256 enhancedScore, bool analysisComplete, string conditions, uint256 temperature, uint256 weatherBonusBps)[] memory)",
  "event RequestFulfilled(bytes32 indexed requestId)",
  "event WeatherAnalysisCompleted(bytes32 indexed requestId, address indexed user, uint256 sessionIndex, uint256 enhancedScore, string conditions, uint256 temperature, uint256 weatherBonusBps)",
];

async function checkChainlinkResponse() {
  console.log("🔍 Checking for Chainlink Functions response...");

  // Setup provider
  const provider = new ethers.providers.JsonRpcProvider(CONFIG.rpcUrl);
  const contract = new ethers.Contract(
    CONFIG.contractAddress,
    CONTRACT_ABI,
    provider
  );

  console.log("📄 Contract Address:", CONFIG.contractAddress);
  console.log("🔗 Request ID:", CONFIG.requestId);

  // Check for RequestFulfilled events
  console.log("\n📥 Checking for RequestFulfilled events...");
  const currentBlock = await provider.getBlockNumber();
  console.log("Current block:", currentBlock);

  try {
    // Look for RequestFulfilled events in the last 100 blocks
    const filter = contract.filters.RequestFulfilled(CONFIG.requestId);
    const events = await contract.queryFilter(
      filter,
      currentBlock - 100,
      currentBlock
    );

    if (events.length > 0) {
      console.log("✅ Found RequestFulfilled event!");
      events.forEach((event, index) => {
        console.log(
          `  ${index + 1}. Block: ${event.blockNumber}, Request ID: ${
            event.args.requestId
          }`
        );
      });
    } else {
      console.log("⏳ No RequestFulfilled event found yet...");
    }

    // Check for WeatherAnalysisCompleted events
    console.log("\n🌤️  Checking for WeatherAnalysisCompleted events...");
    const weatherFilter = contract.filters.WeatherAnalysisCompleted();
    const weatherEvents = await contract.queryFilter(
      weatherFilter,
      currentBlock - 100,
      currentBlock
    );

    if (weatherEvents.length > 0) {
      console.log("✅ Found WeatherAnalysisCompleted events!");
      weatherEvents.forEach((event, index) => {
        console.log(`  ${index + 1}. Block: ${event.blockNumber}`);
        console.log(`     Request ID: ${event.args.requestId}`);
        console.log(`     User: ${event.args.user}`);
        console.log(`     Session Index: ${event.args.sessionIndex}`);
        console.log(`     Enhanced Score: ${event.args.enhancedScore}`);
        console.log(`     Conditions: ${event.args.conditions}`);
        console.log(`     Temperature: ${event.args.temperature}`);
        console.log(`     Weather Bonus: ${event.args.weatherBonusBps} bps`);
      });
    } else {
      console.log("⏳ No WeatherAnalysisCompleted event found yet...");
    }

    // Check user sessions to see if analysis was completed
    console.log("\n👤 Checking user sessions...");
    const userAddress = "0x55A5705453Ee82c742274154136Fce8149597058";
    const sessions = await contract.getUserSessions(userAddress);

    if (sessions.length > 0) {
      console.log(`✅ Found ${sessions.length} session(s) for user`);
      sessions.forEach((session, index) => {
        console.log(`\n  Session ${index}:`);
        console.log(`    Reps: ${session.reps}`);
        console.log(`    Form Accuracy: ${session.formAccuracy}%`);
        console.log(`    Enhanced Score: ${session.enhancedScore}`);
        console.log(`    Analysis Complete: ${session.analysisComplete}`);
        console.log(`    Conditions: ${session.conditions}`);
        console.log(`    Temperature: ${session.temperature}°F`);
        console.log(`    Weather Bonus: ${session.weatherBonusBps} bps`);
      });
    } else {
      console.log("❌ No sessions found for user");
    }
  } catch (error) {
    console.error("❌ Error checking events:", error);
  }
}

// Run the check
checkChainlinkResponse()
  .then(() => {
    console.log("\n🔍 Response check complete!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Check error:", error);
    process.exit(1);
  });
