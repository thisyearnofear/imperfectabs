// CCIP Bridge Deployment Script
// Deploys FitnessCCIPBridge contracts on each network to send data to Avalanche hub

const { ethers } = require("hardhat");

// Network configurations for CCIP
const NETWORK_CONFIG = {
  polygon: {
    name: "Polygon Mainnet",
    ccipRouter: "0x3C3D92629A02a8D95D5CB9650fe49C3544f69B43",
    destinationChainSelector: "14767482510784806043", // Avalanche Fuji
    destinationReceiver: "0x060F0F142D5BfC721a7C53D00B4bAD77Ad82C776", // Your Avalanche hub
    fitnessContract: "0xc783d6E12560dc251F5067A62426A5f3b45b6888",
    chainId: 137
  },
  base: {
    name: "Base Mainnet",
    ccipRouter: "0x881e3A65B4d4a04dD529061dd0071cf975F58bCD",
    destinationChainSelector: "14767482510784806043", // Avalanche Fuji
    destinationReceiver: "0x060F0F142D5BfC721a7C53D00B4bAD77Ad82C776", // Your Avalanche hub
    fitnessContract: "0x60228F4f4F1A71e9b43ebA8C5A7ecaA7e4d4950B",
    chainId: 8453
  },
  celo: {
    name: "Celo Mainnet",
    ccipRouter: "0x2967E7Bb9DaA5711Ac332cAF874BD47ef99B3820",
    destinationChainSelector: "14767482510784806043", // Avalanche Fuji
    destinationReceiver: "0x060F0F142D5BfC721a7C53D00B4bAD77Ad82C776", // Your Avalanche hub
    fitnessContract: "0xB0cbC7325EbC744CcB14211CA74C5a764928F273",
    chainId: 42220
  },
  monad: {
    name: "Monad Testnet",
    ccipRouter: "0x0000000000000000000000000000000000000000", // Placeholder - Monad may not have CCIP
    destinationChainSelector: "14767482510784806043", // Avalanche Fuji
    destinationReceiver: "0x060F0F142D5BfC721a7C53D00B4bAD77Ad82C776", // Your Avalanche hub
    fitnessContract: "0x653d41Fba630381aA44d8598a4b35Ce257924d65",
    chainId: 41454
  }
};

// Deployment results storage
const deploymentResults = {
  timestamp: new Date().toISOString(),
  deployedContracts: {},
  errors: {}
};

async function main() {
  console.log("🌉 CCIP Bridge Deployment Script");
  console.log("================================\n");

  // Get network from hardhat config
  const networkName = hre.network.name;
  const config = NETWORK_CONFIG[networkName];

  if (!config) {
    console.error(`❌ Network ${networkName} not supported`);
    console.log("Supported networks:", Object.keys(NETWORK_CONFIG).join(", "));
    process.exit(1);
  }

  console.log(`📡 Deploying on ${config.name} (Chain ID: ${config.chainId})`);
  console.log(`🎯 Target: Avalanche Hub (${config.destinationReceiver})`);
  console.log(`📋 Fitness Contract: ${config.fitnessContract}`);
  console.log(`🔗 CCIP Router: ${config.ccipRouter}\n`);

  // Check if CCIP router is available
  if (config.ccipRouter === "0x0000000000000000000000000000000000000000") {
    console.log(`⚠️ CCIP not available on ${config.name} - skipping deployment`);
    return;
  }

  try {
    // Get deployer account
    const [deployer] = await ethers.getSigners();
    console.log(`🔑 Deploying with account: ${deployer.address}`);

    // Check balance
    const balance = await deployer.getBalance();
    console.log(`💰 Account balance: ${ethers.utils.formatEther(balance)} ETH\n`);

    if (balance.lt(ethers.utils.parseEther("0.001"))) {
      console.warn("⚠️ Low balance - deployment may fail");
    }

    // Deploy FitnessCCIPBridge
    console.log("🚀 Deploying FitnessCCIPBridge...");

    const FitnessCCIPBridge = await ethers.getContractFactory("FitnessCCIPBridge");
    const bridgeContract = await FitnessCCIPBridge.deploy(
      config.ccipRouter,
      config.destinationChainSelector,
      config.destinationReceiver,
      config.fitnessContract
    );

    console.log(`⏳ Waiting for deployment...`);
    await bridgeContract.deployed();

    const bridgeAddress = bridgeContract.address;
    console.log(`✅ FitnessCCIPBridge deployed to: ${bridgeAddress}`);

    // Verify deployment
    console.log("\n🔍 Verifying deployment...");
    const networkConfigFromContract = await bridgeContract.getNetworkConfig();

    console.log(`  Router: ${networkConfigFromContract.router}`);
    console.log(`  Destination Chain: ${networkConfigFromContract.destinationChainSelector}`);
    console.log(`  Destination Receiver: ${networkConfigFromContract.destinationReceiver}`);
    console.log(`  Fitness Contract: ${networkConfigFromContract.fitnessContract}`);
    console.log(`  Is Active: ${networkConfigFromContract.isActive}`);

    // Test fee calculation (optional)
    try {
      console.log("\n💰 Testing fee calculation...");
      const testUser = deployer.address;
      const estimatedFee = await bridgeContract.getEstimatedFee(testUser);
      console.log(`  Estimated bridge fee: ${ethers.utils.formatEther(estimatedFee)} ETH`);
    } catch (error) {
      console.log(`  ⚠️ Could not estimate fee: ${error.message}`);
    }

    // Store deployment results
    deploymentResults.deployedContracts[networkName] = {
      network: config.name,
      chainId: config.chainId,
      bridgeAddress: bridgeAddress,
      ccipRouter: config.ccipRouter,
      destinationChainSelector: config.destinationChainSelector,
      destinationReceiver: config.destinationReceiver,
      fitnessContract: config.fitnessContract,
      deploymentHash: bridgeContract.deployTransaction.hash,
      gasUsed: bridgeContract.deployTransaction.gasLimit?.toString(),
      gasPrice: bridgeContract.deployTransaction.gasPrice?.toString()
    };

    console.log("\n🎉 Deployment successful!");
    console.log(`📝 Transaction: ${bridgeContract.deployTransaction.hash}`);

    // Instructions for next steps
    console.log("\n📋 Next Steps:");
    console.log(`1. Fund the bridge contract with ETH for CCIP fees:`);
    console.log(`   Send ETH to: ${bridgeAddress}`);
    console.log(`2. Test bridging with: npm run bridge-user ${networkName} <user-address>`);
    console.log(`3. Monitor cross-chain messages on CCIP Explorer`);

  } catch (error) {
    console.error(`❌ Deployment failed:`, error);
    deploymentResults.errors[networkName] = {
      message: error.message,
      stack: error.stack
    };
    throw error;
  }
}

// Deploy on all networks function
async function deployAll() {
  console.log("🌍 Deploying CCIP Bridges on All Networks");
  console.log("==========================================\n");

  const networks = Object.keys(NETWORK_CONFIG);

  for (const network of networks) {
    if (NETWORK_CONFIG[network].ccipRouter === "0x0000000000000000000000000000000000000000") {
      console.log(`⏭️ Skipping ${network} (CCIP not available)`);
      continue;
    }

    try {
      console.log(`\n📡 Switching to ${network}...`);
      // Note: This would require changing networks in hardhat config
      // For now, run script manually for each network

    } catch (error) {
      console.error(`❌ Failed to deploy on ${network}:`, error.message);
      deploymentResults.errors[network] = error.message;
    }
  }

  // Save deployment results
  const fs = require('fs');
  const resultsPath = './deployment-results.json';
  fs.writeFileSync(resultsPath, JSON.stringify(deploymentResults, null, 2));
  console.log(`\n💾 Deployment results saved to: ${resultsPath}`);
}

// Contract verification helper
async function verifyContract(address, constructorArgs) {
  console.log("\n🔍 Verifying contract on block explorer...");

  try {
    await hre.run("verify:verify", {
      address: address,
      constructorArguments: constructorArgs,
    });
    console.log("✅ Contract verification successful");
  } catch (error) {
    console.log(`⚠️ Verification failed: ${error.message}`);
  }
}

// Usage examples and utilities
function printUsageExamples(bridgeAddress, networkName) {
  console.log("\n📚 Usage Examples:");
  console.log("==================");

  console.log("\n1. Bridge single user:");
  console.log(`   const bridge = await ethers.getContractAt("FitnessCCIPBridge", "${bridgeAddress}");`);
  console.log(`   const fee = await bridge.getEstimatedFee("0x...");`);
  console.log(`   await bridge.bridgeUserData("0x...", {value: fee});`);

  console.log("\n2. Bridge multiple users:");
  console.log(`   const users = ["0x...", "0x...", "0x..."];`);
  console.log(`   const totalFee = fee * users.length;`);
  console.log(`   await bridge.bridgeMultipleUsers(users, {value: totalFee});`);

  console.log("\n3. Check bridge status:");
  console.log(`   const info = await bridge.getUserBridgeInfo("0x...");`);
  console.log(`   console.log("Can bridge:", info.canBridge);`);
}

// Error handling and cleanup
process.on('SIGINT', () => {
  console.log('\n👋 Deployment interrupted');
  process.exit(0);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Export for use in other scripts
module.exports = {
  main,
  deployAll,
  verifyContract,
  NETWORK_CONFIG,
  deploymentResults
};

// Run if called directly
if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
