#!/usr/bin/env node

/**
 * Setup script for Chainlink Functions WeatherXM API secrets
 * Uploads WeatherXM API key to Chainlink Functions DON
 */

const { SecretsManager } = require("@chainlink/functions-toolkit");
const { ethers } = require("ethers");

// Configuration
const CONFIG = {
  rpcUrl: "https://api.avax-test.network/ext/bc/C/rpc",
  routerAddress: "0xA9d587a00A31A52Ed70D6026794a8FC5E2F5dCb0",
  donId: "fun-avalanche-fuji-1",
  gatewayUrls: [
    "https://01.functions-gateway.testnet.chain.link/",
    "https://02.functions-gateway.testnet.chain.link/",
  ],
};

async function setupWeatherSecrets() {
  console.log(
    "🌤️  Setting up WeatherXM API secrets for Chainlink Functions..."
  );

  // Check for required environment variables
  const privateKey = process.env.PRIVATE_KEY;
  const weatherxmApiKey = process.env.WEATHERXM_API_KEY;

  if (!privateKey) {
    console.error("❌ Please set PRIVATE_KEY environment variable");
    process.exit(1);
  }

  if (!weatherxmApiKey) {
    console.error("❌ Please set WEATHERXM_API_KEY environment variable");
    console.log("Get your free API key at: https://pro.weatherxm.com/");
    console.log(
      "WeatherXM provides hyperlocal weather data from 8,500+ DePIN stations"
    );
    process.exit(1);
  }

  try {
    // Initialize provider and signer
    const provider = new ethers.providers.JsonRpcProvider(CONFIG.rpcUrl);
    const signer = new ethers.Wallet(privateKey, provider);

    console.log("👤 Using wallet:", signer.address);

    // Initialize secrets manager
    const secretsManager = new SecretsManager({
      signer: signer,
      functionsRouterAddress: CONFIG.routerAddress,
      donId: CONFIG.donId,
    });

    await secretsManager.initialize();

    // Prepare secrets object
    const secrets = {
      WEATHERXM_API_KEY: weatherxmApiKey,
    };

    console.log("🔐 Uploading WeatherXM API secrets...");

    // Upload secrets with 72-hour expiration (max for Fuji testnet)
    const encryptedSecretsObj = await secretsManager.encryptSecrets(secrets);

    const uploadResult = await secretsManager.uploadEncryptedSecretsToDON({
      encryptedSecretsHexstring: encryptedSecretsObj.encryptedSecrets,
      gatewayUrls: CONFIG.gatewayUrls,
      slotId: 0,
      minutesUntilExpiration: 4320, // 72 hours (max for testnet)
    });

    if (uploadResult.success) {
      console.log("✅ WeatherXM secrets uploaded successfully!");
      console.log("📋 Upload Details:");
      console.log("   - Slot ID:", uploadResult.slotId);
      console.log("   - Version:", uploadResult.version);
      console.log(
        "   - Expiration:",
        new Date(Date.now() + 4320 * 60 * 1000).toISOString()
      );

      console.log("\n🔧 Update your contract with these values:");
      console.log(`   - Secrets Slot ID: ${uploadResult.slotId}`);
      console.log(`   - Secrets Version: ${uploadResult.version}`);

      console.log("\n🌤️  WeatherXM integration ready!");
      console.log(
        "You can now submit workouts with coordinates for hyperlocal weather-enhanced scoring."
      );
      console.log(
        "WeatherXM provides data from 8,500+ community-owned weather stations worldwide!"
      );
    } else {
      console.error("❌ Failed to upload secrets:", uploadResult.error);
    }
  } catch (error) {
    console.error("❌ Error setting up weather secrets:", error.message);
    if (error.message.includes("expiration too long")) {
      console.log(
        "💡 Try reducing the expiration time (max 72 hours for testnet)"
      );
    }
  }
}

// Main execution
if (require.main === module) {
  setupWeatherSecrets().catch(console.error);
}

module.exports = { setupWeatherSecrets };
