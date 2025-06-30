const { ethers } = require("ethers");

const CONFIG = {
  rpcUrl: "https://api.avax-test.network/ext/bc/C/rpc",
  contractAddress: "0xE376eB9232cF65C0cea18d057a62a3Ba9DBf83D3",
  privateKey: process.env.PRIVATE_KEY,
  // Correct VRF v2.5 key hash for Avalanche Fuji
  correctKeyHash: "0xc799bd1e3bd4d1a41cd4968997a4e03dfd2a3c7c04b695881138580163f42887",
  subscriptionId: "36696123203907487346372099809332344923918001683502737413897043327797370994639"
};

// Contract ABI (minimal)
const CONTRACT_ABI = [
  "function updateVRFConfig(uint256 subscriptionId, bytes32 keyHash) external",
  "function manualChallengeUpdate() external",
  "function getCurrentChallenge() external view returns (tuple(uint256 challengeType, uint256 target, uint256 bonusMultiplier, uint256 expiresAt, bool active))",
  "function s_keyHash() external view returns (bytes32)",
];

async function main() {
  console.log("🔧 Updating V4 contract with correct VRF v2.5 key hash...");
  console.log("Contract:", CONFIG.contractAddress);
  console.log("Correct Key Hash:", CONFIG.correctKeyHash);

  const provider = new ethers.providers.JsonRpcProvider(CONFIG.rpcUrl);
  const signer = new ethers.Wallet(CONFIG.privateKey, provider);
  const contract = new ethers.Contract(CONFIG.contractAddress, CONTRACT_ABI, signer);

  try {
    // Check current key hash
    console.log("\n🔍 Checking current key hash...");
    const currentKeyHash = await contract.s_keyHash();
    console.log("Current Key Hash:", currentKeyHash);
    console.log("Expected Key Hash:", CONFIG.correctKeyHash);

    if (currentKeyHash.toLowerCase() === CONFIG.correctKeyHash.toLowerCase()) {
      console.log("✅ Key hash is already correct!");
    } else {
      console.log("\n🔧 Updating VRF configuration...");
      const updateTx = await contract.updateVRFConfig(
        CONFIG.subscriptionId,
        CONFIG.correctKeyHash,
        { gasLimit: 200000 }
      );
      await updateTx.wait();
      console.log("✅ VRF configuration updated");

      // Verify the update
      const newKeyHash = await contract.s_keyHash();
      console.log("New Key Hash:", newKeyHash);
    }

    // Test VRF with correct key hash
    console.log("\n🎯 Testing VRF with correct key hash...");
    const challengeTx = await contract.manualChallengeUpdate({ gasLimit: 300000 });
    await challengeTx.wait();
    console.log("✅ Challenge generation requested");

    console.log("\n⏳ Waiting 60 seconds for VRF response...");
    await new Promise((resolve) => setTimeout(resolve, 60000));

    // Check if challenge was generated
    console.log("\n🔍 Checking generated challenge...");
    const challenge = await contract.getCurrentChallenge();
    
    console.log("Challenge Type:", challenge.challengeType.toString());
    console.log("Target:", challenge.target.toString());
    console.log("Bonus Multiplier:", challenge.bonusMultiplier.toString());
    console.log("Expires At:", new Date(challenge.expiresAt.toNumber() * 1000).toISOString());
    console.log("Active:", challenge.active);

    if (challenge.active && challenge.target.gt(0)) {
      console.log("\n🎉 SUCCESS! VRF v2.5 is working with correct key hash!");
      
      // Decode challenge type
      const challengeTypes = [
        "Reps Challenge",
        "Duration Challenge", 
        "Streak Challenge",
        "Accuracy Challenge",
        "Combo Challenge"
      ];
      
      const challengeType = challengeTypes[challenge.challengeType.toNumber()] || "Unknown";
      const multiplier = challenge.bonusMultiplier.toNumber() / 100; // Convert from basis points
      
      console.log(`\n🎯 Generated Challenge: ${challengeType}`);
      console.log(`📈 Target: ${challenge.target.toString()}`);
      console.log(`💰 Bonus: ${multiplier}%`);
      console.log(`⏰ Expires: ${new Date(challenge.expiresAt.toNumber() * 1000).toLocaleString()}`);
      
      console.log("\n✅ VRF v2.5 upgrade is COMPLETE!");
      console.log("Daily challenges are now fully functional!");
      
    } else {
      console.log("\n⚠️  Challenge not yet generated. Check VRF subscription UI for status.");
    }

  } catch (error) {
    console.error("❌ Error:", error.message);
    if (error.reason) {
      console.error("Reason:", error.reason);
    }
  }
}

main().catch(console.error);
