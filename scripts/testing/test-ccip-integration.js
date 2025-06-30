// CCIP Cross-Chain Integration Test Script
// Tests cross-chain fitness score aggregation between networks
// Run with: node scripts/testing/test-ccip-integration.js

import { ethers } from "ethers";
import { config } from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
config({ path: join(__dirname, "../../.env.local") });

// Network configurations
const NETWORKS = {
  avalanche: {
    name: "Avalanche Fuji",
    rpc: "https://api.avax-test.network/ext/bc/C/rpc",
    chainId: 43113,
    contract: "0x060F0F142D5BfC721a7C53D00B4bAD77Ad82C776", // Main hub
    chainSelector: "14767482510784806043", // Avalanche Fuji CCIP selector
  },
  polygon: {
    name: "Polygon Mainnet",
    rpc: "https://polygon-rpc.com",
    chainId: 137,
    contract: "0xc783d6E12560dc251F5067A62426A5f3b45b6888",
    chainSelector: "4051577828743386545", // Polygon CCIP selector
  },
  base: {
    name: "Base Mainnet",
    rpc: "https://mainnet.base.org",
    chainId: 8453,
    contract: "0x60228F4f4F1A71e9b43ebA8C5A7ecaA7e4d4950B",
    chainSelector: "15971525489660198786", // Base CCIP selector
  },
  celo: {
    name: "Celo Mainnet",
    rpc: "https://forno.celo.org",
    chainId: 42220,
    contract: "0xB0cbC7325EbC744CcB14211CA74C5a764928F273",
    chainSelector: "1346049177634351622", // Celo CCIP selector
  },
  monad: {
    name: "Monad Testnet",
    rpc: "https://testnet-rpc.monad.xyz",
    chainId: 41454,
    contract: "0x653d41Fba630381aA44d8598a4b35Ce257924d65",
    chainSelector: "0", // Placeholder - Monad may not have CCIP yet
  },
};

// Minimal ABI for testing
const MINIMAL_ABI = [
  "function getUserStats(address user) external view returns (uint256 totalWorkouts, uint256 totalReps, uint256 bestScore, uint256 averageFormAccuracy, uint256 bestStreak, uint256 totalRewards)",
  "function getLeaderboard(uint256 limit) external view returns (address[] memory users, uint256[] memory scores)",
  "function crossChainData(address user) external view returns (uint128 polygonScore, uint128 baseScore, uint128 celoScore, uint128 monadScore)",
  "function whitelistedSourceChains(uint64 chainSelector) external view returns (bool)",
  "function sourceChainNames(uint64 chainSelector) external view returns (string)",
  "function getCompositeScore(address user) external view returns (uint256)",
  "function getChainConfig() external view returns (address ccipRouter, address functionsRouter)",
  "event CrossChainScoreReceived(bytes32 indexed messageId, uint64 indexed sourceChainSelector, address indexed user, uint256 score)",
];

// Test wallet addresses (replace with actual test addresses)
const TEST_ADDRESSES = [
  "0x742d35Cc6C4B2e4bF587c0D7de3a0B1Ad37Ee7A0", // Test address 1
  "0x8ba1f109551bD432803012645Hac136c9c1fcd21", // Test address 2
  "0x9f8a4D5C2e1B7F6A8C3D9E0F1A2B3C4D5E6F7G8H", // Test address 3
];

console.log("🌐 CCIP Cross-Chain Integration Test");
console.log("====================================\n");

class CCIPTester {
  constructor() {
    this.providers = {};
    this.contracts = {};
    this.results = {
      networkConnections: {},
      crossChainData: {},
      ccipConfiguration: {},
      scoreAggregation: {},
    };
  }

  async initialize() {
    console.log("🔌 Initializing network connections...");

    for (const [key, network] of Object.entries(NETWORKS)) {
      try {
        const provider = new ethers.providers.JsonRpcProvider(network.rpc);
        await provider.getNetwork(); // Test connection

        this.providers[key] = provider;
        this.contracts[key] = new ethers.Contract(
          network.contract,
          MINIMAL_ABI,
          provider
        );

        this.results.networkConnections[key] = {
          status: "✅ Connected",
          chainId: network.chainId,
          contract: network.contract,
        };

        console.log(`  ✅ ${network.name}: Connected`);
      } catch (error) {
        this.results.networkConnections[key] = {
          status: "❌ Failed",
          error: error.message,
        };
        console.log(`  ❌ ${network.name}: ${error.message}`);
      }
    }
  }

  async testCCIPConfiguration() {
    console.log("\n🔧 Testing CCIP Configuration...");

    if (!this.contracts.avalanche) {
      console.log("❌ Avalanche hub not available for CCIP testing");
      return;
    }

    try {
      // Test whitelisted chains
      for (const [key, network] of Object.entries(NETWORKS)) {
        if (key === "avalanche" || !network.chainSelector) continue;

        try {
          const isWhitelisted = await this.contracts.avalanche.whitelistedSourceChains(
            network.chainSelector
          );
          const chainName = await this.contracts.avalanche.sourceChainNames(
            network.chainSelector
          );

          this.results.ccipConfiguration[key] = {
            chainSelector: network.chainSelector,
            whitelisted: isWhitelisted,
            registeredName: chainName || "Not registered",
            status: isWhitelisted ? "✅ Enabled" : "⚠️ Not whitelisted",
          };

          console.log(
            `  ${network.name}: ${
              isWhitelisted ? "✅ Whitelisted" : "⚠️ Not whitelisted"
            }`
          );
        } catch (error) {
          this.results.ccipConfiguration[key] = {
            status: "❌ Error",
            error: error.message,
          };
          console.log(`  ${network.name}: ❌ ${error.message}`);
        }
      }

      // Test CCIP router configuration
      try {
        const [ccipRouter, functionsRouter] = await this.contracts.avalanche.getChainConfig();
        this.results.ccipConfiguration.routers = {
          ccipRouter,
          functionsRouter,
          status: "✅ Configured",
        };
        console.log(`  CCIP Router: ${ccipRouter}`);
        console.log(`  Functions Router: ${functionsRouter}`);
      } catch (error) {
        console.log(`  Router config error: ${error.message}`);
      }
    } catch (error) {
      console.log(`❌ CCIP configuration test failed: ${error.message}`);
    }
  }

  async testCrossChainData() {
    console.log("\n📊 Testing Cross-Chain Data Aggregation...");

    if (!this.contracts.avalanche) {
      console.log("❌ Avalanche hub not available for cross-chain testing");
      return;
    }

    for (const testAddress of TEST_ADDRESSES) {
      console.log(`\n👤 Testing address: ${testAddress}`);

      try {
        // Get cross-chain data from Avalanche hub
        const crossChainData = await this.contracts.avalanche.crossChainData(
          testAddress
        );
        const compositeScore = await this.contracts.avalanche.getCompositeScore(
          testAddress
        );

        const chainScores = {
          polygon: crossChainData.polygonScore.toString(),
          base: crossChainData.baseScore.toString(),
          celo: crossChainData.celoScore.toString(),
          monad: crossChainData.monadScore.toString(),
        };

        this.results.crossChainData[testAddress] = {
          chainScores,
          compositeScore: compositeScore.toString(),
          totalChains: Object.values(chainScores).filter(
            (score) => score !== "0"
          ).length,
        };

        console.log(`  Cross-chain scores:`);
        for (const [chain, score] of Object.entries(chainScores)) {
          if (score !== "0") {
            console.log(`    ${chain}: ${score} points`);
          }
        }
        console.log(`  Composite score: ${compositeScore}`);
        console.log(
          `  Active chains: ${
            Object.values(chainScores).filter((score) => score !== "0").length
          }`
        );

        // Test individual network data
        for (const [key, network] of Object.entries(NETWORKS)) {
          if (!this.contracts[key]) continue;

          try {
            const stats = await this.contracts[key].getUserStats(testAddress);
            if (stats.totalWorkouts.gt(0)) {
              console.log(
                `    ${network.name}: ${stats.totalWorkouts} workouts, best score: ${stats.bestScore}`
              );
            }
          } catch (error) {
            console.log(`    ${network.name}: Error reading stats`);
          }
        }
      } catch (error) {
        console.log(`  ❌ Error testing ${testAddress}: ${error.message}`);
        this.results.crossChainData[testAddress] = {
          status: "❌ Error",
          error: error.message,
        };
      }
    }
  }

  async testScoreAggregation() {
    console.log("\n🧮 Testing Score Aggregation Logic...");

    if (!this.contracts.avalanche) {
      console.log("❌ Avalanche hub not available for aggregation testing");
      return;
    }

    try {
      // Get leaderboard from main hub
      const leaderboard = await this.contracts.avalanche.getLeaderboard(10);
      const [users, scores] = [leaderboard[0], leaderboard[1]];

      console.log("  📈 Top 10 Cross-Chain Leaderboard:");
      for (let i = 0; i < users.length && i < 10; i++) {
        if (scores[i].gt(0)) {
          const crossChainData = await this.contracts.avalanche.crossChainData(
            users[i]
          );
          const activeChains = [
            crossChainData.polygonScore,
            crossChainData.baseScore,
            crossChainData.celoScore,
            crossChainData.monadScore,
          ].filter((score) => score.gt(0)).length;

          console.log(
            `    ${i + 1}. ${users[i].slice(0, 6)}...${users[i].slice(
              -4
            )}: ${scores[i]} points (${activeChains} chains)`
          );

          this.results.scoreAggregation[users[i]] = {
            rank: i + 1,
            score: scores[i].toString(),
            activeChains,
          };
        }
      }

      // Test multi-chain bonus calculation
      console.log("\n  💰 Multi-chain bonus analysis:");
      const multiChainUsers = users.filter(async (user, index) => {
        const crossChainData = await this.contracts.avalanche.crossChainData(
          user
        );
        const activeChains = [
          crossChainData.polygonScore,
          crossChainData.baseScore,
          crossChainData.celoScore,
          crossChainData.monadScore,
        ].filter((score) => score.gt(0)).length;
        return activeChains > 1;
      });

      console.log(`    Users with multi-chain bonuses: ${multiChainUsers.length}`);
    } catch (error) {
      console.log(`❌ Score aggregation test failed: ${error.message}`);
    }
  }

  async testCCIPEvents() {
    console.log("\n📡 Testing CCIP Event History...");

    if (!this.contracts.avalanche) {
      console.log("❌ Avalanche hub not available for event testing");
      return;
    }

    try {
      // Query recent CrossChainScoreReceived events
      const filter = this.contracts.avalanche.filters.CrossChainScoreReceived();
      const events = await this.contracts.avalanche.queryFilter(
        filter,
        -10000 // Last 10k blocks
      );

      console.log(`  Found ${events.length} cross-chain score events`);

      if (events.length > 0) {
        console.log("  📋 Recent cross-chain activity:");
        events.slice(-5).forEach((event, index) => {
          const { messageId, sourceChainSelector, user, score } = event.args;
          const sourceName =
            Object.values(NETWORKS).find(
              (n) => n.chainSelector === sourceChainSelector.toString()
            )?.name || "Unknown";

          console.log(
            `    ${index + 1}. ${user.slice(0, 6)}...${user.slice(
              -4
            )}: ${score} points from ${sourceName}`
          );
        });
      } else {
        console.log("  ⚠️ No recent cross-chain events found");
      }

      this.results.ccipEvents = {
        totalEvents: events.length,
        recentEvents: events.slice(-5).map((e) => ({
          messageId: e.args.messageId,
          sourceChain: e.args.sourceChainSelector.toString(),
          user: e.args.user,
          score: e.args.score.toString(),
          blockNumber: e.blockNumber,
        })),
      };
    } catch (error) {
      console.log(`❌ CCIP events test failed: ${error.message}`);
    }
  }

  async generateReport() {
    console.log("\n📋 CCIP Integration Test Report");
    console.log("================================");

    // Network Status
    console.log("\n🌐 Network Connections:");
    for (const [network, result] of Object.entries(
      this.results.networkConnections
    )) {
      console.log(`  ${network}: ${result.status}`);
    }

    // CCIP Configuration Status
    console.log("\n🔧 CCIP Configuration:");
    for (const [network, config] of Object.entries(
      this.results.ccipConfiguration
    )) {
      if (network !== "routers") {
        console.log(`  ${network}: ${config.status}`);
      }
    }

    // Cross-chain Activity Summary
    const crossChainUsers = Object.keys(this.results.crossChainData).filter(
      (addr) => this.results.crossChainData[addr].totalChains > 0
    );
    console.log(`\n📊 Cross-chain Activity:`);
    console.log(`  Users with cross-chain data: ${crossChainUsers.length}`);
    console.log(
      `  Multi-chain users: ${
        crossChainUsers.filter(
          (addr) => this.results.crossChainData[addr].totalChains > 1
        ).length
      }`
    );

    // Recommendations
    console.log("\n💡 Recommendations:");
    if (Object.values(this.results.ccipConfiguration).some(c => c.status?.includes("Not whitelisted"))) {
      console.log("  • Whitelist more source chains to enable full cross-chain functionality");
    }
    if (crossChainUsers.length === 0) {
      console.log("  • Test cross-chain message sending to verify CCIP integration");
    }
    if (this.results.ccipEvents?.totalEvents === 0) {
      console.log("  • No cross-chain events detected - CCIP may not be actively used yet");
    }

    console.log("\n🎯 CCIP Integration Status:");
    const workingNetworks = Object.values(this.results.networkConnections).filter(
      (r) => r.status.includes("✅")
    ).length;
    const configuredChains = Object.values(this.results.ccipConfiguration).filter(
      (r) => r.status?.includes("✅")
    ).length;

    if (workingNetworks >= 2 && configuredChains > 0) {
      console.log("  ✅ CCIP integration is properly configured and ready!");
    } else if (workingNetworks >= 2) {
      console.log("  ⚠️ CCIP partially configured - some chains need whitelisting");
    } else {
      console.log("  ❌ CCIP integration needs setup - insufficient network connections");
    }

    // Save detailed results
    console.log(`\n💾 Detailed results saved to: ccip-test-results.json`);

    return this.results;
  }
}

// Run the test
async function runCCIPTest() {
  const tester = new CCIPTester();

  try {
    await tester.initialize();
    await tester.testCCIPConfiguration();
    await tester.testCrossChainData();
    await tester.testScoreAggregation();
    await tester.testCCIPEvents();

    const results = await tester.generateReport();

    // Write results to file for detailed analysis
    const fs = await import('fs/promises');
    await fs.writeFile(
      join(__dirname, 'ccip-test-results.json'),
      JSON.stringify(results, null, 2)
    );

  } catch (error) {
    console.error("❌ CCIP test failed:", error);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runCCIPTest();
}

export default CCIPTester;
