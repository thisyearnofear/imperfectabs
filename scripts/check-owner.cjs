const { ethers } = require("ethers");
require("dotenv").config({ path: ".env.local" });
require("dotenv").config();

const CONTRACT_ADDRESS = "0x060F0F142D5BfC721a7C53D00B4bAD77Ad82C776";
const RPC_URL = "https://api.avax-test.network/ext/bc/C/rpc";

const CONTRACT_ABI = [
  "function owner() external view returns (address)",
  "function getChainlinkConfig() external view returns (uint64, uint32, bytes32, string memory)",
];

async function checkOwner() {
  console.log("🔍 Checking contract owner...");

  const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
  const contract = new ethers.Contract(
    CONTRACT_ADDRESS,
    CONTRACT_ABI,
    provider
  );

  try {
    const owner = await contract.owner();
    console.log("👑 Contract owner:", owner);

    // Check current wallet
    const currentPrivateKey = process.env.PRIVATE_KEY;
    if (currentPrivateKey) {
      const currentWallet = new ethers.Wallet(currentPrivateKey);
      console.log("🔑 Current wallet:", currentWallet.address);

      if (currentWallet.address.toLowerCase() === owner.toLowerCase()) {
        console.log(
          "✅ Current wallet IS the owner! Ready to upload function."
        );
      } else {
        console.log("❌ Current wallet is NOT the owner.");
        console.log(
          "💡 You need to use the owner's private key to upload the function."
        );
      }
    } else {
      console.log("⚠️ No PRIVATE_KEY found in environment variables");
    }

    // Also check current Chainlink config
    try {
      const config = await contract.getChainlinkConfig();
      console.log("\n📋 Current Chainlink Config:");
      console.log("   Subscription ID:", config[0].toString());
      console.log("   Gas Limit:", config[1].toString());
      console.log("   DON ID:", config[2]);
      console.log("   Source length:", config[3].length, "characters");
    } catch (error) {
      console.log("ℹ️ Could not fetch current config");
    }
  } catch (error) {
    console.error("❌ Error checking owner:", error.message);
  }
}

checkOwner();
