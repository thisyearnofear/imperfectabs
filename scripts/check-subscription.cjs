const { ethers } = require("ethers");

const CONFIG = {
  rpcUrl: "https://api.avax-test.network/ext/bc/C/rpc",
  subscriptionId: 15675,
  functionsRouter: "0xA9d587a00A31A52Ed70D6026794a8FC5E2F5dCb0",
  privateKey: process.env.PRIVATE_KEY,
};

// Functions Router ABI (minimal)
const FUNCTIONS_ROUTER_ABI = [
  "function getSubscription(uint64 subscriptionId) external view returns (uint96 balance, uint96 reqCount, address owner, address[] memory consumers)",
];

async function checkSubscription() {
  console.log("🔍 Checking Chainlink Functions subscription...");

  // Setup provider and wallet
  const provider = new ethers.providers.JsonRpcProvider(CONFIG.rpcUrl);
  const wallet = new ethers.Wallet(CONFIG.privateKey, provider);

  console.log("👤 Wallet Address:", wallet.address);
  console.log("📄 Functions Router:", CONFIG.functionsRouter);
  console.log("🆔 Subscription ID:", CONFIG.subscriptionId);

  try {
    const router = new ethers.Contract(
      CONFIG.functionsRouter,
      FUNCTIONS_ROUTER_ABI,
      provider
    );

    console.log("\n📋 Getting subscription details...");
    const [balance, reqCount, owner, consumers] = await router.getSubscription(
      CONFIG.subscriptionId
    );

    console.log("💰 Balance:", ethers.utils.formatEther(balance), "LINK");
    console.log("📊 Request Count:", reqCount.toString());
    console.log("👑 Owner:", owner);
    console.log("🔗 Consumers:", consumers.length);

    if (consumers.length > 0) {
      console.log("Consumer addresses:");
      consumers.forEach((consumer, index) => {
        console.log(`  ${index + 1}. ${consumer}`);
      });
    }

    // Check if our contract is a consumer
    const ourContract = "0x060F0F142D5BfC721a7C53D00B4bAD77Ad82C776";
    const isConsumer = consumers.some(
      (consumer) => consumer.toLowerCase() === ourContract.toLowerCase()
    );

    console.log("\n🔍 Analysis:");
    console.log("✅ Subscription exists:", true);
    console.log("💰 Has LINK balance:", balance.gt(0));
    console.log(
      "👑 Wallet is owner:",
      owner.toLowerCase() === wallet.address.toLowerCase()
    );
    console.log("🔗 Contract is consumer:", isConsumer);

    if (balance.eq(0)) {
      console.log("⚠️  WARNING: Subscription has no LINK balance!");
      console.log("   Functions requests will fail without LINK funding.");
    }

    if (!isConsumer) {
      console.log("⚠️  WARNING: Contract is not added as a consumer!");
      console.log("   Contract address:", ourContract);
      console.log("   Add it to the subscription to enable Functions calls.");
    }
  } catch (error) {
    console.error("❌ Error checking subscription:", error.message);
    if (error.reason) console.error("Reason:", error.reason);
  }

  console.log("\n🔍 Subscription check complete!");
}

checkSubscription().catch(console.error);
