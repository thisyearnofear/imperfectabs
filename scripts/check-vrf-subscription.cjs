const { ethers } = require("ethers");

const CONFIG = {
  rpcUrl: "https://api.avax-test.network/ext/bc/C/rpc",
  privateKey: process.env.PRIVATE_KEY,
  vrfCoordinator: "0x2eD832Ba664535e5886b75D64C46EB9a228C2610",
};

// VRF Coordinator ABI (minimal)
const VRF_COORDINATOR_ABI = [
  "function getSubscription(uint64 subId) external view returns (uint96 balance, uint64 reqCount, address owner, address[] memory consumers)",
  "event SubscriptionCreated(uint64 indexed subId, address owner)",
  "event SubscriptionFunded(uint64 indexed subId, uint256 oldBalance, uint256 newBalance)",
];

async function checkVRFSubscription() {
  console.log("🔍 Checking VRF subscription details...");
  
  // Setup provider and wallet
  const provider = new ethers.providers.JsonRpcProvider(CONFIG.rpcUrl);
  const wallet = new ethers.Wallet(CONFIG.privateKey, provider);
  
  console.log("👤 Wallet Address:", wallet.address);
  
  const vrfCoordinator = new ethers.Contract(CONFIG.vrfCoordinator, VRF_COORDINATOR_ABI, provider);
  
  try {
    // The large number you provided might be a hash or encoded value
    const providedId = "36696123203907487346372099809332344923918001683502737413897043327797370994639";
    console.log("📋 Provided ID:", providedId);
    console.log("📋 ID Length:", providedId.length);
    
    // Try to convert to different formats
    console.log("\n🔄 Trying different interpretations:");
    
    // 1. Try as hex (remove leading digits to make it fit uint64)
    try {
      const hexValue = "0x" + providedId.slice(-16); // Take last 16 hex chars for uint64
      const uint64Value = ethers.BigNumber.from(hexValue);
      console.log("1. As hex (last 16 chars):", uint64Value.toString());
      
      // Test this subscription ID
      try {
        const [balance, reqCount, owner, consumers] = await vrfCoordinator.getSubscription(uint64Value);
        console.log("   ✅ Valid subscription found!");
        console.log("   Balance:", ethers.utils.formatEther(balance), "LINK");
        console.log("   Owner:", owner);
        console.log("   Consumers:", consumers.length);
        return uint64Value.toString();
      } catch (error) {
        console.log("   ❌ Not a valid subscription");
      }
    } catch (error) {
      console.log("1. Hex conversion failed");
    }
    
    // 2. Try taking modulo to fit in uint64
    try {
      const bigNum = ethers.BigNumber.from(providedId);
      const maxUint64 = ethers.BigNumber.from("18446744073709551615"); // 2^64 - 1
      const moduloValue = bigNum.mod(maxUint64);
      console.log("2. Modulo uint64 max:", moduloValue.toString());
      
      try {
        const [balance, reqCount, owner, consumers] = await vrfCoordinator.getSubscription(moduloValue);
        console.log("   ✅ Valid subscription found!");
        console.log("   Balance:", ethers.utils.formatEther(balance), "LINK");
        console.log("   Owner:", owner);
        console.log("   Consumers:", consumers.length);
        return moduloValue.toString();
      } catch (error) {
        console.log("   ❌ Not a valid subscription");
      }
    } catch (error) {
      console.log("2. Modulo conversion failed");
    }
    
    // 3. Try some common small subscription IDs for your wallet
    console.log("\n🔍 Checking recent subscription IDs for your wallet...");
    for (let i = 1; i <= 100; i++) {
      try {
        const [balance, reqCount, owner, consumers] = await vrfCoordinator.getSubscription(i);
        if (owner.toLowerCase() === wallet.address.toLowerCase()) {
          console.log(`✅ Found your subscription ID: ${i}`);
          console.log("   Balance:", ethers.utils.formatEther(balance), "LINK");
          console.log("   Request Count:", reqCount.toString());
          console.log("   Consumers:", consumers.length);
          
          // Check if our contract is already a consumer
          const ourContract = "0xB832c2FB36851b771A05B33C29Ab7268F3622cEC";
          const isConsumer = consumers.some(consumer => 
            consumer.toLowerCase() === ourContract.toLowerCase()
          );
          console.log("   Our contract is consumer:", isConsumer);
          
          return i.toString();
        }
      } catch (error) {
        // Subscription doesn't exist, continue
      }
    }
    
    console.log("\n❌ Could not find a valid subscription ID");
    console.log("\n📋 Please check:");
    console.log("1. Go to https://vrf.chain.link/fuji");
    console.log("2. Connect your wallet");
    console.log("3. Look for your subscription in the list");
    console.log("4. The subscription ID should be a small number (1-1000 typically)");
    console.log("5. Make sure the subscription is funded and has our contract as consumer");
    
  } catch (error) {
    console.error("❌ Error:", error.message);
  }
}

checkVRFSubscription().catch(console.error);
