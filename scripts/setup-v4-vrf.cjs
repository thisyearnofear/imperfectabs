const { ethers } = require("ethers");

const CONFIG = {
  rpcUrl: "https://api.avax-test.network/ext/bc/C/rpc",
  privateKey: process.env.PRIVATE_KEY,
  // V4 contract address
  contractAddress: "0xD5b2c90Ecffe69D6D7377D74f7371A177d7FfB0d", // V4 with weather regions + compatibility
  // VRF v2.5 configuration
  vrfCoordinatorV25: "0x5C210eF41CD1a72de73bF76eC39637bB0d3d7BEE",
  linkToken: "0x0b9d5D9136855f6FEc3c0993feE6E9CE8a297846",
  // Large VRF v2.5 subscription ID
  subscriptionId:
    "36696123203907487346372099809332344923918001683502737413897043327797370994639",
};

// VRF Coordinator v2.5 ABI (minimal)
const VRF_COORDINATOR_ABI = [
  "function addConsumer(uint256 subId, address consumer) external",
  "function getSubscription(uint256 subId) external view returns (uint96 balance, uint96 nativeBalance, uint64 reqCount, address owner, address[] memory consumers)",
];

// Contract ABI (minimal)
const CONTRACT_ABI = [
  "function manualChallengeUpdate() external",
  "function getCurrentChallenge() external view returns (tuple(uint256 challengeType, uint256 target, uint256 bonusMultiplier, uint256 expiresAt, bool active))",
  "function s_subscriptionId() external view returns (uint256)",
  "function i_vrfCoordinator() external view returns (address)",
];

async function main() {
  console.log("🚀 Setting up VRF v2.5 for ImperfectAbsHubV4...");
  console.log("Contract:", CONFIG.contractAddress);
  console.log("VRF Coordinator v2.5:", CONFIG.vrfCoordinatorV25);
  console.log("Subscription ID:", CONFIG.subscriptionId);

  // Setup provider and signer
  const provider = new ethers.providers.JsonRpcProvider(CONFIG.rpcUrl);
  const signer = new ethers.Wallet(CONFIG.privateKey, provider);

  // Connect to contracts
  const vrfCoordinator = new ethers.Contract(
    CONFIG.vrfCoordinatorV25,
    VRF_COORDINATOR_ABI,
    signer
  );

  const contract = new ethers.Contract(
    CONFIG.contractAddress,
    CONTRACT_ABI,
    signer
  );

  try {
    // Step 1: Verify contract configuration
    console.log("\n🔍 Verifying contract configuration...");
    const configuredSubId = await contract.s_subscriptionId();
    const configuredCoordinator = await contract.i_vrfCoordinator();

    console.log("Configured subscription ID:", configuredSubId.toString());
    console.log("Configured coordinator:", configuredCoordinator);
    console.log("Expected coordinator:", CONFIG.vrfCoordinatorV25);

    if (
      configuredCoordinator.toLowerCase() !==
      CONFIG.vrfCoordinatorV25.toLowerCase()
    ) {
      console.log("❌ Coordinator mismatch!");
      return;
    }

    // Step 2: Check current subscription status
    console.log("\n📊 Checking VRF subscription status...");
    const subscription = await vrfCoordinator.getSubscription(
      CONFIG.subscriptionId
    );
    console.log(
      "Subscription balance:",
      ethers.utils.formatEther(subscription.balance),
      "LINK"
    );
    console.log("Request count:", subscription.reqCount.toString());
    console.log("Owner:", subscription.owner);
    console.log("Current consumers:", subscription.consumers);

    // Step 3: Add contract as consumer if not already added
    const isConsumer = subscription.consumers.some(
      (consumer) =>
        consumer.toLowerCase() === CONFIG.contractAddress.toLowerCase()
    );

    if (isConsumer) {
      console.log("✅ Contract is already a consumer");
    } else {
      console.log("\n🔗 Adding contract as VRF consumer...");
      const addConsumerTx = await vrfCoordinator.addConsumer(
        CONFIG.subscriptionId,
        CONFIG.contractAddress,
        { gasLimit: 200000 }
      );
      await addConsumerTx.wait();
      console.log("✅ Contract added as VRF consumer");
    }

    // Step 4: Test VRF by requesting new challenge
    console.log("\n🎯 Testing VRF by generating new daily challenge...");
    const challengeTx = await contract.manualChallengeUpdate({
      gasLimit: 300000,
    });
    await challengeTx.wait();
    console.log("✅ Challenge generation requested");

    console.log("\n⏳ Waiting 30 seconds for VRF response...");
    await new Promise((resolve) => setTimeout(resolve, 30000));

    // Step 5: Check if challenge was generated
    console.log("\n🔍 Checking generated challenge...");
    const challenge = await contract.getCurrentChallenge();
    console.log("Challenge Type:", challenge.challengeType.toString());
    console.log("Target:", challenge.target.toString());
    console.log("Bonus Multiplier:", challenge.bonusMultiplier.toString());
    console.log(
      "Expires At:",
      new Date(challenge.expiresAt.toNumber() * 1000).toISOString()
    );
    console.log("Active:", challenge.active);

    if (challenge.active && challenge.target.gt(0)) {
      console.log("\n🎉 SUCCESS! VRF v2.5 integration is working!");
      console.log("Daily challenges are now functional!");
    } else {
      console.log(
        "\n⚠️  Challenge not yet generated. VRF might still be processing..."
      );
      console.log("Try checking again in a few minutes.");
    }
  } catch (error) {
    console.error("❌ Error:", error.message);
    if (error.reason) {
      console.error("Reason:", error.reason);
    }
  }
}

main().catch(console.error);
