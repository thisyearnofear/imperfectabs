// Bridge User Data Script
// Bridges fitness data from deployed contracts on other chains to Avalanche CCIP hub

import { ethers } from "ethers";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Network configurations for CCIP bridges
const BRIDGE_ADDRESSES = {
  polygon: "0x0000000000000000000000000000000000000000", // To be updated after deployment
  base: "0x0000000000000000000000000000000000000000", // To be updated after deployment
  celo: "0x0000000000000000000000000000000000000000", // To be updated after deployment
  monad: "0x0000000000000000000000000000000000000000", // To be updated after deployment
};

const NETWORK_INFO = {
  polygon: {
    name: "Polygon Mainnet",
    rpc: "https://polygon-rpc.com",
    chainId: 137,
    fitnessContract: "0xc783d6E12560dc251F5067A62426A5f3b45b6888",
  },
  base: {
    name: "Base Mainnet",
    rpc: "https://mainnet.base.org",
    chainId: 8453,
    fitnessContract: "0x60228F4f4F1A71e9b43ebA8C5A7ecaA7e4d4950B",
  },
  celo: {
    name: "Celo Mainnet",
    rpc: "https://forno.celo.org",
    chainId: 42220,
    fitnessContract: "0xB0cbC7325EbC744CcB14211CA74C5a764928F273",
  },
  monad: {
    name: "Monad Testnet",
    rpc: "https://testnet-rpc.monad.xyz",
    chainId: 41454,
    fitnessContract: "0x653d41Fba630381aA44d8598a4b35Ce257924d65",
  },
};

// Bridge contract ABI (minimal for interaction)
const BRIDGE_ABI = [
  "function bridgeUserData(address user) external payable returns (bytes32)",
  "function bridgeMultipleUsers(address[] calldata users) external payable returns (bytes32[])",
  "function getEstimatedFee(address user) external view returns (uint256)",
  "function getUserBridgeInfo(address user) external view returns (uint256 lastScore, uint256 lastTime, uint256 currentScore, bool canBridge)",
  "function getNetworkConfig() external view returns (tuple(address router, uint64 destinationChainSelector, address destinationReceiver, address fitnessContract, bool isActive))",
  "event MessageSent(bytes32 indexed messageId, uint64 indexed destinationChainSelector, address receiver, address user, uint256 score, uint256 fees)",
];

// Fitness contract ABI (for reading scores)
const FITNESS_ABI = [
  "function getUserScore(address user) external view returns (address userAddr, uint256 pushups, uint256 squats, uint256 timestamp)",
  "function getUserScoreSafe(address user) external view returns (address userAddr, uint256 pushups, uint256 squats, uint256 timestamp, bool exists)",
];

class FitnessBridge {
  constructor() {
    this.results = {
      bridges: {},
      errors: {},
      transactions: {},
    };
  }

  async bridgeUserFromNetwork(networkName, userAddress, options = {}) {
    console.log(`\n🌉 Bridging user data from ${networkName}`);
    console.log("=======================================");

    const networkInfo = NETWORK_INFO[networkName];
    if (!networkInfo) {
      throw new Error(`Network ${networkName} not supported`);
    }

    const bridgeAddress = BRIDGE_ADDRESSES[networkName];
    if (
      !bridgeAddress ||
      bridgeAddress === "0x0000000000000000000000000000000000000000"
    ) {
      throw new Error(`Bridge not deployed on ${networkName}`);
    }

    try {
      // Connect to network
      console.log(`📡 Connecting to ${networkInfo.name}...`);
      const provider = new ethers.providers.JsonRpcProvider(networkInfo.rpc);
      const signer = new ethers.Wallet(process.env.PRIVATE_KEY || "", provider);

      // Get contracts
      const bridgeContract = new ethers.Contract(
        bridgeAddress,
        BRIDGE_ABI,
        signer
      );
      const fitnessContract = new ethers.Contract(
        networkInfo.fitnessContract,
        FITNESS_ABI,
        provider
      );

      // Check user's current score
      console.log(`👤 Checking user score for ${userAddress}...`);
      let userScore;
      try {
        const scoreData = await fitnessContract.getUserScoreSafe(userAddress);
        if (!scoreData.exists) {
          console.log(`⚠️ User has no score on ${networkName}`);
          return null;
        }
        userScore = {
          pushups: scoreData.pushups.toNumber(),
          squats: scoreData.squats.toNumber(),
          total: scoreData.pushups.add(scoreData.squats).toNumber(),
          timestamp: scoreData.timestamp.toNumber(),
        };
      } catch (error) {
        // Fallback to basic getUserScore
        const scoreData = await fitnessContract.getUserScore(userAddress);
        userScore = {
          pushups: scoreData.pushups.toNumber(),
          squats: scoreData.squats.toNumber(),
          total: scoreData.pushups.add(scoreData.squats).toNumber(),
          timestamp: scoreData.timestamp.toNumber(),
        };
      }

      console.log(`  💪 Pushups: ${userScore.pushups}`);
      console.log(`  🦵 Squats: ${userScore.squats}`);
      console.log(`  📊 Total Score: ${userScore.total}`);

      if (userScore.total === 0) {
        console.log(`⚠️ User has zero score - nothing to bridge`);
        return null;
      }

      // Check bridge info
      console.log(`\n🔍 Checking bridge status...`);
      const bridgeInfo = await bridgeContract.getUserBridgeInfo(userAddress);

      console.log(`  📈 Current Score: ${bridgeInfo.currentScore}`);
      console.log(`  📈 Last Bridged: ${bridgeInfo.lastScore}`);
      console.log(
        `  ⏰ Last Bridge Time: ${new Date(
          bridgeInfo.lastTime * 1000
        ).toLocaleString()}`
      );
      console.log(`  ✅ Can Bridge: ${bridgeInfo.canBridge}`);

      if (!bridgeInfo.canBridge) {
        if (bridgeInfo.currentScore <= bridgeInfo.lastScore) {
          console.log(
            `⚠️ No new score to bridge (current: ${bridgeInfo.currentScore}, last: ${bridgeInfo.lastScore})`
          );
        } else {
          console.log(`⚠️ Bridge cooldown active or other restriction`);
        }
        return null;
      }

      // Get estimated fee
      console.log(`\n💰 Calculating bridge fee...`);
      const estimatedFee = await bridgeContract.getEstimatedFee(userAddress);
      console.log(
        `  Estimated fee: ${ethers.utils.formatEther(estimatedFee)} ETH`
      );

      // Check signer balance
      const balance = await signer.getBalance();
      console.log(`  Signer balance: ${ethers.utils.formatEther(balance)} ETH`);

      if (balance.lt(estimatedFee)) {
        throw new Error(
          `Insufficient balance. Need ${ethers.utils.formatEther(
            estimatedFee
          )} ETH`
        );
      }

      // Execute bridge (unless dry run)
      if (options.dryRun) {
        console.log(
          `\n🔄 DRY RUN - Would bridge ${
            userScore.total
          } points for ${ethers.utils.formatEther(estimatedFee)} ETH`
        );
        return {
          network: networkName,
          user: userAddress,
          score: userScore.total,
          fee: estimatedFee.toString(),
          dryRun: true,
        };
      }

      console.log(`\n🚀 Bridging user data...`);

      // Add 10% buffer to fee
      const feeWithBuffer = estimatedFee.mul(110).div(100);

      const tx = await bridgeContract.bridgeUserData(userAddress, {
        value: feeWithBuffer,
        gasLimit: 500000,
      });

      console.log(`⏳ Transaction sent: ${tx.hash}`);
      console.log(`   Waiting for confirmation...`);

      const receipt = await tx.wait();
      console.log(`✅ Transaction confirmed in block ${receipt.blockNumber}`);

      // Extract message ID from events
      const messageEvent = receipt.events?.find(
        (e) => e.event === "MessageSent"
      );
      const messageId = messageEvent?.args?.messageId;

      console.log(`📨 CCIP Message ID: ${messageId || "Not found"}`);
      console.log(`⛽ Gas used: ${receipt.gasUsed.toString()}`);

      const result = {
        network: networkName,
        user: userAddress,
        score: userScore.total,
        fee: estimatedFee.toString(),
        txHash: tx.hash,
        messageId: messageId || null,
        gasUsed: receipt.gasUsed.toString(),
        blockNumber: receipt.blockNumber,
        timestamp: Date.now(),
      };

      this.results.bridges[`${networkName}-${userAddress}`] = result;
      return result;
    } catch (error) {
      console.error(`❌ Bridge failed:`, error.message);
      this.results.errors[`${networkName}-${userAddress}`] = error.message;
      throw error;
    }
  }

  async bridgeMultipleUsers(networkName, userAddresses, options = {}) {
    console.log(`\n🌉 Bridging multiple users from ${networkName}`);
    console.log("============================================");

    const results = [];
    const errors = [];

    for (const userAddress of userAddresses) {
      try {
        const result = await this.bridgeUserFromNetwork(
          networkName,
          userAddress,
          options
        );
        if (result) {
          results.push(result);
        }
      } catch (error) {
        console.error(`❌ Failed to bridge ${userAddress}:`, error.message);
        errors.push({ user: userAddress, error: error.message });
      }

      // Add delay between bridges to avoid rate limiting
      if (!options.dryRun) {
        console.log(`⏳ Waiting 2 seconds before next bridge...`);
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }

    return { results, errors };
  }

  async bridgeAllNetworks(userAddress, options = {}) {
    console.log(`\n🌍 Bridging user across all networks`);
    console.log("====================================");

    const results = {};
    const errors = {};

    for (const networkName of Object.keys(NETWORK_INFO)) {
      try {
        console.log(`\n📡 Processing ${networkName}...`);
        const result = await this.bridgeUserFromNetwork(
          networkName,
          userAddress,
          options
        );
        if (result) {
          results[networkName] = result;
        }
      } catch (error) {
        console.error(`❌ Failed on ${networkName}:`, error.message);
        errors[networkName] = error.message;
      }
    }

    return { results, errors };
  }

  async checkUserScoresOnAllNetworks(userAddress) {
    console.log(`\n📊 Checking user scores across all networks`);
    console.log("==========================================");

    const scores = {};

    for (const [networkName, networkInfo] of Object.entries(NETWORK_INFO)) {
      try {
        console.log(`\n📡 Checking ${networkInfo.name}...`);
        const provider = new ethers.providers.JsonRpcProvider(networkInfo.rpc);
        const fitnessContract = new ethers.Contract(
          networkInfo.fitnessContract,
          FITNESS_ABI,
          provider
        );

        let userScore;
        try {
          const scoreData = await fitnessContract.getUserScoreSafe(userAddress);
          if (scoreData.exists) {
            userScore = {
              pushups: scoreData.pushups.toNumber(),
              squats: scoreData.squats.toNumber(),
              total: scoreData.pushups.add(scoreData.squats).toNumber(),
              timestamp: scoreData.timestamp.toNumber(),
              exists: true,
            };
          } else {
            userScore = { exists: false, total: 0 };
          }
        } catch (error) {
          // Fallback to basic getUserScore
          try {
            const scoreData = await fitnessContract.getUserScore(userAddress);
            userScore = {
              pushups: scoreData.pushups.toNumber(),
              squats: scoreData.squats.toNumber(),
              total: scoreData.pushups.add(scoreData.squats).toNumber(),
              timestamp: scoreData.timestamp.toNumber(),
              exists: true,
            };
          } catch (fallbackError) {
            userScore = {
              exists: false,
              total: 0,
              error: fallbackError.message,
            };
          }
        }

        scores[networkName] = userScore;

        if (userScore.exists) {
          console.log(
            `  ✅ Found score: ${userScore.total} points (${userScore.pushups} pushups + ${userScore.squats} squats)`
          );
        } else {
          console.log(`  ⚠️ No score found`);
        }
      } catch (error) {
        console.error(`❌ Error checking ${networkName}:`, error.message);
        scores[networkName] = { exists: false, total: 0, error: error.message };
      }
    }

    return scores;
  }

  saveResults(filename = "bridge-results.json") {
    const resultsPath = path.join(__dirname, filename);
    fs.writeFileSync(resultsPath, JSON.stringify(this.results, null, 2));
    console.log(`\n💾 Results saved to: ${resultsPath}`);
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  const bridge = new FitnessBridge();

  try {
    switch (command) {
      case "bridge-user":
        const networkName = args[1];
        const userAddress = args[2];
        if (!networkName || !userAddress) {
          console.log(
            "Usage: node bridge-user-data.js bridge-user <network> <user-address>"
          );
          console.log("Networks:", Object.keys(NETWORK_INFO).join(", "));
          process.exit(1);
        }
        await bridge.bridgeUserFromNetwork(networkName, userAddress);
        break;

      case "bridge-user-dry":
        const networkNameDry = args[1];
        const userAddressDry = args[2];
        if (!networkNameDry || !userAddressDry) {
          console.log(
            "Usage: node bridge-user-data.js bridge-user-dry <network> <user-address>"
          );
          process.exit(1);
        }
        await bridge.bridgeUserFromNetwork(networkNameDry, userAddressDry, {
          dryRun: true,
        });
        break;

      case "bridge-all":
        const userAddressAll = args[1];
        if (!userAddressAll) {
          console.log(
            "Usage: node bridge-user-data.js bridge-all <user-address>"
          );
          process.exit(1);
        }
        await bridge.bridgeAllNetworks(userAddressAll);
        break;

      case "check-scores":
        const userAddressCheck = args[1];
        if (!userAddressCheck) {
          console.log(
            "Usage: node bridge-user-data.js check-scores <user-address>"
          );
          process.exit(1);
        }
        const scores = await bridge.checkUserScoresOnAllNetworks(
          userAddressCheck
        );
        console.log("\n📊 Summary:", scores);
        break;

      case "update-addresses":
        console.log("Current bridge addresses:", BRIDGE_ADDRESSES);
        console.log(
          "Update the BRIDGE_ADDRESSES object with deployed contract addresses"
        );
        break;

      default:
        console.log("🌉 Fitness CCIP Bridge CLI");
        console.log("Commands:");
        console.log(
          "  bridge-user <network> <address>     - Bridge user from specific network"
        );
        console.log(
          "  bridge-user-dry <network> <address> - Dry run bridge (no transaction)"
        );
        console.log(
          "  bridge-all <address>                - Bridge user from all networks"
        );
        console.log(
          "  check-scores <address>              - Check user scores on all networks"
        );
        console.log(
          "  update-addresses                    - Show current bridge addresses"
        );
        console.log("\nNetworks:", Object.keys(NETWORK_INFO).join(", "));
        console.log("\nExample:");
        console.log(
          "  node bridge-user-data.js check-scores 0x742d35Cc6C4B2e4bF587c0D7de3a0B1Ad37Ee7A0"
        );
        console.log(
          "  node bridge-user-data.js bridge-user polygon 0x742d35Cc6C4B2e4bF587c0D7de3a0B1Ad37Ee7A0"
        );
    }

    bridge.saveResults();
  } catch (error) {
    console.error("❌ Script failed:", error);
    bridge.saveResults("bridge-errors.json");
    process.exit(1);
  }
}

// Export for use in other scripts
export {
  FitnessBridge,
  BRIDGE_ADDRESSES,
  NETWORK_INFO,
  BRIDGE_ABI,
  FITNESS_ABI,
};

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
