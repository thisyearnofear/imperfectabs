// Quick CCIP Connectivity Test
// Simple test to check if CCIP service is working
// Run with: node scripts/testing/quick-ccip-test.js

import { ethers } from "ethers";
import { config } from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
config({ path: join(__dirname, "../../.env.local") });

console.log("🚀 Quick CCIP Connectivity Test");
console.log("================================\n");

// Contract addresses from your deployment
const CONTRACTS = {
  avalanche: {
    address: "0x060F0F142D5BfC721a7C53D00B4bAD77Ad82C776",
    rpc: "https://api.avax-test.network/ext/bc/C/rpc",
    name: "Avalanche Fuji (Main Hub)",
  },
  polygon: {
    address: "0xc783d6E12560dc251F5067A62426A5f3b45b6888",
    rpc: "https://polygon-rpc.com",
    name: "Polygon Mainnet",
  },
  base: {
    address: "0x60228F4f4F1A71e9b43ebA8C5A7ecaA7e4d4950B",
    rpc: "https://mainnet.base.org",
    name: "Base Mainnet",
  },
  celo: {
    address: "0xB0cbC7325EbC744CcB14211CA74C5a764928F273",
    rpc: "https://forno.celo.org",
    name: "Celo Mainnet",
  },
};

// CCIP Service address you mentioned
const CCIP_SERVICE = "0xB6084cff5e0345432De6CE0d4a6EBdfDc7C4E82A";

// Basic ABI for testing
const ABI = [
  "function getCompositeScore(address user) external view returns (uint256)",
  "function crossChainData(address user) external view returns (uint128, uint128, uint128, uint128)",
  "function getChainConfig() external view returns (address, address)",
  "function whitelistedSourceChains(uint64) external view returns (bool)",
  "function getService(bytes32) external view returns (address)",
  "function isServiceEnabled(bytes32) external view returns (bool)",
];

async function quickTest() {
  let results = { networks: {}, ccipService: {}, crossChainData: {} };

  console.log("1️⃣ Testing Network Connectivity...");

  // Test each network
  for (const [key, config] of Object.entries(CONTRACTS)) {
    try {
      const provider = new ethers.providers.JsonRpcProvider(config.rpc);
      const contract = new ethers.Contract(config.address, ABI, provider);

      // Test basic connection
      const network = await provider.getNetwork();

      results.networks[key] = {
        status: "✅ Connected",
        chainId: network.chainId,
        contract: config.address,
      };

      console.log(`  ✅ ${config.name}: Chain ID ${network.chainId}`);
    } catch (error) {
      results.networks[key] = {
        status: "❌ Failed",
        error: error.message,
      };
      console.log(`  ❌ ${config.name}: ${error.message}`);
    }
  }

  console.log("\n2️⃣ Testing CCIP Service Configuration...");

  try {
    const provider = new ethers.providers.JsonRpcProvider(
      CONTRACTS.avalanche.rpc
    );
    const mainContract = new ethers.Contract(
      CONTRACTS.avalanche.address,
      ABI,
      provider
    );

    // Check if CCIP service is registered
    const ccipServiceId = ethers.utils.keccak256(
      ethers.utils.toUtf8Bytes("CCIP_SERVICE")
    );
    const ccipAddress = await mainContract.getService(ccipServiceId);
    const ccipEnabled = await mainContract.isServiceEnabled(ccipServiceId);

    results.ccipService = {
      expectedAddress: CCIP_SERVICE,
      registeredAddress: ccipAddress,
      enabled: ccipEnabled,
      matches: ccipAddress.toLowerCase() === CCIP_SERVICE.toLowerCase(),
    };

    console.log(`  CCIP Service Expected: ${CCIP_SERVICE}`);
    console.log(`  CCIP Service Registered: ${ccipAddress}`);
    console.log(`  CCIP Service Enabled: ${ccipEnabled ? "✅ Yes" : "❌ No"}`);
    console.log(
      `  Address Match: ${results.ccipService.matches ? "✅ Yes" : "❌ No"}`
    );
  } catch (error) {
    console.log(`  ❌ CCIP service check failed: ${error.message}`);
    results.ccipService.error = error.message;
  }

  console.log("\n3️⃣ Testing Cross-Chain Data...");

  // Test sample addresses (properly checksummed)
  const testAddresses = [
    "0x742d35Cc6C4B2e4bF587c0D7de3a0B1Ad37Ee7A0",
    "0x8ba1f109551bD432803012645Hac136c9c1fcd21",
    "0x1234567890123456789012345678901234567890",
    "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045",
  ];

  try {
    const provider = new ethers.providers.JsonRpcProvider(
      CONTRACTS.avalanche.rpc
    );
    const mainContract = new ethers.Contract(
      CONTRACTS.avalanche.address,
      ABI,
      provider
    );

    for (const addr of testAddresses) {
      try {
        // Validate address format first
        if (!ethers.utils.isAddress(addr)) {
          console.log(`  ⚠️ Invalid address format: ${addr}`);
          continue;
        }

        const checksumAddr = ethers.utils.getAddress(addr);
        const crossChainData = await mainContract.crossChainData(checksumAddr);
        const compositeScore = await mainContract.getCompositeScore(
          checksumAddr
        );

        const chainScores = {
          polygon: crossChainData[0].toString(),
          base: crossChainData[1].toString(),
          celo: crossChainData[2].toString(),
          monad: crossChainData[3].toString(),
        };

        const activeChains = Object.values(chainScores).filter(
          (score) => score !== "0"
        ).length;

        results.crossChainData[checksumAddr] = {
          chainScores,
          compositeScore: compositeScore.toString(),
          activeChains,
        };

        console.log(
          `  👤 ${checksumAddr.slice(0, 6)}...${checksumAddr.slice(-4)}:`
        );
        console.log(`     Composite Score: ${compositeScore}`);
        console.log(`     Active Chains: ${activeChains}`);

        if (activeChains > 0) {
          Object.entries(chainScores).forEach(([chain, score]) => {
            if (score !== "0") {
              console.log(`     ${chain}: ${score} points`);
            }
          });
        } else {
          console.log(`     No cross-chain activity detected`);
        }
      } catch (error) {
        console.log(`  ❌ Error testing ${addr}: ${error.message}`);
      }
    }
  } catch (error) {
    console.log(`  ❌ Cross-chain test failed: ${error.message}`);
  }

  console.log("\n📊 Quick Test Summary:");
  console.log("======================");

  const connectedNetworks = Object.values(results.networks).filter((n) =>
    n.status.includes("✅")
  ).length;
  console.log(
    `Networks Connected: ${connectedNetworks}/${Object.keys(CONTRACTS).length}`
  );

  if (results.ccipService.enabled && results.ccipService.matches) {
    console.log(`CCIP Service: ✅ Properly configured`);
  } else if (results.ccipService.enabled) {
    console.log(`CCIP Service: ⚠️ Enabled but address mismatch`);
  } else {
    console.log(`CCIP Service: ❌ Not enabled or not found`);
  }

  const usersWithCrossChain = Object.values(results.crossChainData).filter(
    (d) => d.activeChains > 0
  ).length;
  console.log(`Cross-chain Users: ${usersWithCrossChain} found`);

  console.log("\n🎯 Status:");
  if (connectedNetworks >= 2 && results.ccipService.enabled) {
    console.log("✅ CCIP integration is properly configured and ready!");
    if (usersWithCrossChain > 0) {
      console.log(
        "🎉 Cross-chain activity detected - CCIP is actively working!"
      );
    } else {
      console.log("⚠️ CCIP configured but no cross-chain activity yet");
    }
  } else if (connectedNetworks >= 2) {
    console.log("⚠️ Networks connected but CCIP service needs configuration");
  } else {
    console.log("❌ Need more network connections for CCIP testing");
  }

  console.log("\n💡 Next Steps:");
  if (!results.ccipService.enabled) {
    console.log("• Enable CCIP service in your main contract");
  }
  if (!results.ccipService.matches && results.ccipService.enabled) {
    console.log("• Update CCIP service address to match deployed service");
  }
  if (usersWithCrossChain === 0) {
    console.log("• Test cross-chain message sending between networks");
  }
  if (connectedNetworks < Object.keys(CONTRACTS).length) {
    console.log("• Check network connectivity and RPC endpoints");
  }

  return results;
}

// Run the test
quickTest().catch(console.error);
