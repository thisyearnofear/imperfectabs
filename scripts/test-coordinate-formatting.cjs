/**
 * Test coordinate formatting function
 */

const { ethers } = require("ethers");

// Configuration
const CONFIG = {
  rpcUrl: "https://api.avax-test.network/ext/bc/C/rpc",
  contractAddress: "0x060F0F142D5BfC721a7C53D00B4bAD77Ad82C776",
  privateKey: process.env.PRIVATE_KEY,
};

// Simple contract ABI for testing coordinate formatting
const CONTRACT_ABI = [
  "function _formatCoordinate(int256 coordinate) external pure returns (string memory)",
];

async function testCoordinateFormatting() {
  console.log("🔍 Testing coordinate formatting...");

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
    // Test coordinate formatting
    const testCoordinates = [
      40712800, // NYC latitude * 1e6
      -74006000, // NYC longitude * 1e6
    ];

    console.log("\n🧪 Testing coordinate formatting...");

    for (const coord of testCoordinates) {
      console.log(`\nTesting coordinate: ${coord}`);
      try {
        const formatted = await contract._formatCoordinate(coord);
        console.log(`Formatted result: "${formatted}"`);
      } catch (error) {
        console.error(
          `❌ Error formatting ${coord}:`,
          error.reason || error.message
        );
      }
    }
  } catch (error) {
    console.error("❌ Test error:", error);
  }
}

// Run the test
testCoordinateFormatting()
  .then(() => {
    console.log("\n🔍 Coordinate formatting test complete!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Test script error:", error);
    process.exit(1);
  });
