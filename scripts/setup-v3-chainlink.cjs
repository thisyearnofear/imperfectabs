const { ethers } = require("ethers");

const CONFIG = {
  rpcUrl: "https://api.avax-test.network/ext/bc/C/rpc",
  privateKey: process.env.PRIVATE_KEY,
  // Avalanche Fuji addresses
  vrfCoordinator: "0x2eD832Ba664535e5886b75D64C46EB9a228C2610",
  linkToken: "0x0b9d5D9136855f6FEc3c0993feE6E9CE8a297846",
  // V3 contract address
  contractAddress: "0xB832c2FB36851b771A05B33C29Ab7268F3622cEC",
};

// VRF Coordinator ABI (minimal)
const VRF_COORDINATOR_ABI = [
  "function createSubscription() external returns (uint64 subId)",
  "function addConsumer(uint64 subId, address consumer) external",
  "function fundSubscription(uint64 subId, uint96 amount) external",
  "function getSubscription(uint64 subId) external view returns (uint96 balance, uint64 reqCount, address owner, address[] memory consumers)",
];

// LINK Token ABI (minimal)
const LINK_TOKEN_ABI = [
  "function transfer(address to, uint256 amount) external returns (bool)",
  "function balanceOf(address account) external view returns (uint256)",
  "function approve(address spender, uint256 amount) external returns (bool)",
];

// Contract ABI (minimal)
const CONTRACT_ABI = [
  "function updateVRFConfig(uint64 subscriptionId, bytes32 keyHash) external",
  "function manualChallengeUpdate() external",
  "function getCurrentChallenge() external view returns (tuple(uint256 challengeType, uint256 target, uint256 bonusMultiplier, uint256 expiresAt, bool active))",
];

async function setupV3Chainlink() {
  console.log("🔧 Setting up Chainlink services for V3...");

  if (!CONFIG.contractAddress) {
    console.error(
      "❌ Please update CONFIG.contractAddress with your deployed V3 contract address"
    );
    return;
  }

  // Setup provider and wallet
  const provider = new ethers.providers.JsonRpcProvider(CONFIG.rpcUrl);
  const wallet = new ethers.Wallet(CONFIG.privateKey, provider);

  console.log("👤 Wallet Address:", wallet.address);
  console.log("📄 Contract Address:", CONFIG.contractAddress);

  try {
    // Connect to contracts
    const vrfCoordinator = new ethers.Contract(
      CONFIG.vrfCoordinator,
      VRF_COORDINATOR_ABI,
      wallet
    );
    const linkToken = new ethers.Contract(
      CONFIG.linkToken,
      LINK_TOKEN_ABI,
      wallet
    );
    const contract = new ethers.Contract(
      CONFIG.contractAddress,
      CONTRACT_ABI,
      wallet
    );

    // Check LINK balance
    console.log("\n💰 Checking LINK balance...");
    const linkBalance = await linkToken.balanceOf(wallet.address);
    console.log("LINK Balance:", ethers.utils.formatEther(linkBalance), "LINK");

    if (linkBalance.lt(ethers.utils.parseEther("5"))) {
      console.log("⚠️  You need at least 5 LINK tokens for setup");
      console.log("Get testnet LINK from: https://faucets.chain.link/fuji");
      return;
    }

    // Step 1: Create VRF subscription
    console.log("\n🎲 Creating VRF subscription...");
    const createTx = await vrfCoordinator.createSubscription();
    const createReceipt = await createTx.wait();

    // Extract subscription ID from events
    const subscriptionCreatedEvent = createReceipt.events?.find(
      (event) => event.event === "SubscriptionCreated"
    );
    const subscriptionId = subscriptionCreatedEvent?.args?.subId;

    if (!subscriptionId) {
      console.error("❌ Failed to get subscription ID from transaction");
      return;
    }

    console.log("✅ VRF Subscription created:", subscriptionId.toString());

    // Step 2: Fund subscription
    console.log("\n💰 Funding VRF subscription...");
    const fundAmount = ethers.utils.parseEther("2"); // 2 LINK

    // Approve LINK transfer
    const approveTx = await linkToken.approve(
      CONFIG.vrfCoordinator,
      fundAmount
    );
    await approveTx.wait();
    console.log("✅ LINK approved for transfer");

    // Fund subscription
    const fundTx = await vrfCoordinator.fundSubscription(
      subscriptionId,
      fundAmount
    );
    await fundTx.wait();
    console.log("✅ Subscription funded with 2 LINK");

    // Step 3: Add contract as consumer
    console.log("\n🔗 Adding contract as VRF consumer...");
    const addConsumerTx = await vrfCoordinator.addConsumer(
      subscriptionId,
      CONFIG.contractAddress
    );
    await addConsumerTx.wait();
    console.log("✅ Contract added as VRF consumer");

    // Step 4: Update contract with subscription ID
    console.log("\n⚙️  Updating contract VRF configuration...");
    const keyHash =
      "0x354d2f95da55398f44b7cff77da56283d9c6c829a4bdf1bbcaf2ad6a4d081f61";
    const updateTx = await contract.updateVRFConfig(subscriptionId, keyHash);
    await updateTx.wait();
    console.log("✅ Contract VRF config updated");

    // Step 5: Test VRF by requesting new challenge
    console.log("\n🎯 Testing VRF by generating new daily challenge...");
    const challengeTx = await contract.manualChallengeUpdate();
    await challengeTx.wait();
    console.log("✅ New challenge generation requested");

    // Wait a bit and check the challenge
    console.log("\n⏳ Waiting for VRF response...");
    await new Promise((resolve) => setTimeout(resolve, 30000)); // Wait 30 seconds

    try {
      const challenge = await contract.getCurrentChallenge();
      console.log("🎯 Current Challenge:");
      console.log("  Type:", challenge.challengeType.toString());
      console.log("  Target:", challenge.target.toString());
      console.log(
        "  Bonus:",
        challenge.bonusMultiplier.toString(),
        "basis points"
      );
      console.log("  Active:", challenge.active);
    } catch (error) {
      console.log("⏳ Challenge still being generated (VRF response pending)");
    }

    // Verify subscription
    console.log("\n🔍 Verifying VRF subscription...");
    const [balance, reqCount, owner, consumers] =
      await vrfCoordinator.getSubscription(subscriptionId);
    console.log("Subscription Details:");
    console.log("  Balance:", ethers.utils.formatEther(balance), "LINK");
    console.log("  Request Count:", reqCount.toString());
    console.log("  Owner:", owner);
    console.log("  Consumers:", consumers.length);

    console.log("\n🎉 V3 Chainlink setup complete!");
    console.log("\n📋 Summary:");
    console.log("✅ VRF Subscription ID:", subscriptionId.toString());
    console.log("✅ Contract configured as VRF consumer");
    console.log("✅ Subscription funded with LINK");
    console.log("✅ Daily challenge system active");
    console.log("\n🔄 Next: Register contract for Chainlink Automation");
    console.log("   Visit: https://automation.chain.link/fuji");
    console.log("   Add contract address:", CONFIG.contractAddress);
  } catch (error) {
    console.error("❌ Setup error:", error.message);
    if (error.reason) console.error("Reason:", error.reason);
  }
}

setupV3Chainlink().catch(console.error);
