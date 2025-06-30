/**
 * Update the deployed contract with WeatherXM Functions source
 */

const { ethers } = require("ethers");
const fs = require("fs");

// Configuration
const CONFIG = {
  rpcUrl: "https://api.avax-test.network/ext/bc/C/rpc",
  contractAddress: "0x060F0F142D5BfC721a7C53D00B4bAD77Ad82C776",
  privateKey: process.env.PRIVATE_KEY,
};

// Contract ABI for updating functions
const CONTRACT_ABI = [
  "function updateFunctionsConfig(uint64 _subscriptionId, uint32 _gasLimit, bytes32 _donId, string memory _source) external",
  "function getChainlinkConfig() external view returns (uint64 subId, uint32 gasLim, bytes32 donId, string memory source)",
  "function owner() external view returns (address)",
];

async function updateFunctionsSource() {
  console.log("🔧 Updating Chainlink Functions source code...");

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

  // Check ownership
  const owner = await contract.owner();
  console.log("🔑 Contract Owner:", owner);
  console.log(
    "🤔 Are we owner?",
    owner.toLowerCase() === wallet.address.toLowerCase()
  );

  // Read the WeatherXM function source
  const functionSource = fs.readFileSync("functions/simple-test.js", "utf8");
  console.log(
    "📝 Function source length:",
    functionSource.length,
    "characters"
  );

  // Get current config
  console.log("\n📋 Getting current configuration...");
  const [subId, gasLim, donId, currentSource] =
    await contract.getChainlinkConfig();
  console.log("Current subscription ID:", subId.toString());
  console.log("Current gas limit:", gasLim.toString());
  console.log("Current DON ID:", ethers.utils.hexlify(donId));
  console.log("Current source length:", currentSource.length, "characters");

  // Update with new source
  console.log("\n🚀 Updating Functions source...");
  const tx = await contract.updateFunctionsConfig(
    subId,
    gasLim,
    donId,
    functionSource,
    {
      gasLimit: 2000000,
    }
  );

  console.log("🔗 Transaction Hash:", tx.hash);
  console.log("⏳ Waiting for confirmation...");

  const receipt = await tx.wait();
  console.log("✅ Transaction confirmed in block:", receipt.blockNumber);
  console.log("⛽ Gas Used:", receipt.gasUsed.toString());

  // Verify update
  console.log("\n🔍 Verifying update...");
  const [newSubId, newGasLim, newDonId, newSource] =
    await contract.getChainlinkConfig();
  console.log("New source length:", newSource.length, "characters");

  if (newSource === functionSource) {
    console.log("✅ Functions source updated successfully!");
    console.log("🌤️  WeatherXM integration is now active!");
  } else {
    console.log("❌ Source update failed - mismatch detected");
  }
}

// Run the update
updateFunctionsSource()
  .then(() => {
    console.log("\n🎉 Functions source update complete!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Error updating functions source:", error);
    process.exit(1);
  });
