/**
 * Update the gas limit on the deployed contract
 */

const { ethers } = require("ethers");

// Configuration
const CONFIG = {
  rpcUrl: "https://api.avax-test.network/ext/bc/C/rpc",
  contractAddress: "0x060F0F142D5BfC721a7C53D00B4bAD77Ad82C776",
  privateKey: process.env.PRIVATE_KEY,
  newGasLimit: 800000, // Increased gas limit
};

// Contract ABI for updating gas limit
const CONTRACT_ABI = [
  "function updateFunctionsConfig(uint64 _subscriptionId, uint32 _gasLimit, bytes32 _donId, string memory _source) external",
  "function getChainlinkConfig() external view returns (uint64 subId, uint32 gasLim, bytes32 donId, string memory source)",
];

async function updateGasLimit() {
  console.log("🔧 Updating Chainlink Functions gas limit...");

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
  const [subId, currentGasLim, donId, source] =
    await contract.getChainlinkConfig();
  console.log("Current subscription ID:", subId.toString());
  console.log("Current gas limit:", currentGasLim.toString());
  console.log("New gas limit:", CONFIG.newGasLimit);
  console.log("DON ID:", ethers.utils.hexlify(donId));
  console.log("Source length:", source.length, "characters");

  // Update with new gas limit
  console.log("\n🚀 Updating gas limit...");
  const tx = await contract.updateFunctionsConfig(
    subId,
    CONFIG.newGasLimit,
    donId,
    source,
    {
      gasLimit: 300000,
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
  console.log("Updated gas limit:", newGasLim.toString());

  if (newGasLim.toString() === CONFIG.newGasLimit.toString()) {
    console.log("✅ Gas limit updated successfully!");
    console.log("🚀 Contract is now ready for WeatherXM callbacks!");
  } else {
    console.log("❌ Gas limit update failed");
  }
}

// Run the update
updateGasLimit()
  .then(() => {
    console.log("\n🎉 Gas limit update complete!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Error updating gas limit:", error);
    process.exit(1);
  });
