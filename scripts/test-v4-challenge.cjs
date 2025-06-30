const { ethers } = require("ethers");

const CONFIG = {
  rpcUrl: "https://api.avax-test.network/ext/bc/C/rpc",
  contractAddress: "0xE376eB9232cF65C0cea18d057a62a3Ba9DBf83D3",
  privateKey: process.env.PRIVATE_KEY
};

// Contract ABI (minimal)
const CONTRACT_ABI = [
  "function getCurrentChallenge() external view returns (tuple(uint256 challengeType, uint256 target, uint256 bonusMultiplier, uint256 expiresAt, bool active))",
  "function manualChallengeUpdate() external",
];

async function main() {
  console.log("🔍 Testing V4 daily challenge generation...");
  console.log("Contract:", CONFIG.contractAddress);

  const provider = new ethers.providers.JsonRpcProvider(CONFIG.rpcUrl);
  const signer = new ethers.Wallet(CONFIG.privateKey, provider);
  const contract = new ethers.Contract(CONFIG.contractAddress, CONTRACT_ABI, signer);

  try {
    // Check current challenge
    console.log("\n📊 Checking current challenge...");
    const challenge = await contract.getCurrentChallenge();
    
    console.log("Challenge Type:", challenge.challengeType.toString());
    console.log("Target:", challenge.target.toString());
    console.log("Bonus Multiplier:", challenge.bonusMultiplier.toString());
    console.log("Expires At:", new Date(challenge.expiresAt.toNumber() * 1000).toISOString());
    console.log("Active:", challenge.active);

    if (challenge.active && challenge.target.gt(0)) {
      console.log("\n🎉 SUCCESS! Daily challenge is working!");
      
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
      
      console.log(`\n🎯 Current Challenge: ${challengeType}`);
      console.log(`📈 Target: ${challenge.target.toString()}`);
      console.log(`💰 Bonus: ${multiplier}%`);
      console.log(`⏰ Expires: ${new Date(challenge.expiresAt.toNumber() * 1000).toLocaleString()}`);
      
    } else {
      console.log("\n⚠️  No active challenge yet. Requesting new one...");
      
      const challengeTx = await contract.manualChallengeUpdate({ gasLimit: 300000 });
      await challengeTx.wait();
      console.log("✅ New challenge requested");
      
      console.log("\n⏳ Waiting 60 seconds for VRF response...");
      await new Promise((resolve) => setTimeout(resolve, 60000));
      
      // Check again
      const newChallenge = await contract.getCurrentChallenge();
      if (newChallenge.active && newChallenge.target.gt(0)) {
        console.log("🎉 SUCCESS! Challenge generated after retry!");
      } else {
        console.log("⚠️  Still waiting for VRF response. Check again later.");
      }
    }

  } catch (error) {
    console.error("❌ Error:", error.message);
    if (error.reason) {
      console.error("Reason:", error.reason);
    }
  }
}

main().catch(console.error);
