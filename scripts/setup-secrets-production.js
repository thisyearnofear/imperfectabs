#!/usr/bin/env node

/**
 * Setup Encrypted Secrets for Chainlink Functions - PRODUCTION VERSION
 * This script uploads secrets with longer expiration times suitable for production
 */

import { ethers } from "ethers";
import { SecretsManager } from "@chainlink/functions-toolkit";
import readline from "readline";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Chainlink Functions Configuration for Avalanche Fuji
const CHAINLINK_CONFIG = {
  router: "0xA9d587a00A31A52Ed70D6026794a8FC5E2F5dCb0",
  donId: "fun-avalanche-fuji-1",
  rpcUrl: "https://api.avax-test.network/ext/bc/C/rpc",
  chainId: 43113,
  gatewayUrls: [
    "https://01.functions-gateway.testnet.chain.link/",
    "https://02.functions-gateway.testnet.chain.link/",
  ],
};

// Testnet expiration options (Avalanche Fuji max: 72 hours)
const EXPIRATION_OPTIONS = {
  "1h": 60, // 1 hour
  "6h": 60 * 6, // 6 hours
  "24h": 60 * 24, // 24 hours (1 day)
  "48h": 60 * 48, // 48 hours (2 days)
  "72h": 4320, // 72 hours (3 days) - TESTNET MAXIMUM
};

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

// Utility function to prompt user input
const prompt = (question) => {
  return new Promise((resolve) => {
    rl.question(question, resolve);
  });
};

async function main() {
  console.log("🏭 Chainlink Functions - PRODUCTION Encrypted Secrets Setup");
  console.log("==========================================================\n");

  try {
    // Get private key (from env or prompt)
    let privateKey = process.env.PRIVATE_KEY;
    if (!privateKey) {
      privateKey = await prompt(
        "Enter your private key (will not be stored): "
      );
    } else {
      console.log("Using private key from PRIVATE_KEY environment variable");
    }

    if (!privateKey.startsWith("0x")) {
      throw new Error("Private key must start with 0x");
    }

    // Get OpenAI API key (from env or prompt)
    let openaiApiKey = process.env.OPENAI_API_KEY;
    if (!openaiApiKey) {
      openaiApiKey = await prompt(
        "Enter your OpenAI API key (will be encrypted): "
      );
    } else {
      console.log(
        "Using OpenAI API key from OPENAI_API_KEY environment variable"
      );
    }

    if (!openaiApiKey.startsWith("sk-")) {
      console.log("⚠️  Warning: OpenAI API key should start with 'sk-'");
    }

    // Choose expiration time
    console.log("\n⏰ Choose expiration time (Avalanche Fuji testnet limits):");
    console.log("1. 1 hour (testing)");
    console.log("2. 6 hours (short-term)");
    console.log("3. 24 hours (1 day)");
    console.log("4. 48 hours (2 days)");
    console.log("5. 72 hours (3 days) - MAXIMUM for testnet");

    const choice = (await prompt("Enter choice (1-5) [default: 5]: ")) || "5";
    const expirationKeys = Object.keys(EXPIRATION_OPTIONS);
    const selectedKey = expirationKeys[parseInt(choice) - 1] || "24h";
    const expirationMinutes = EXPIRATION_OPTIONS[selectedKey];

    console.log(`Selected: ${selectedKey} (${expirationMinutes} minutes)`);

    // Setup provider and signer
    console.log("\n🔗 Connecting to Avalanche Fuji...");
    const provider = new ethers.providers.JsonRpcProvider(
      CHAINLINK_CONFIG.rpcUrl
    );
    const signer = new ethers.Wallet(privateKey, provider);

    console.log(`Connected with address: ${await signer.getAddress()}`);

    // Initialize SecretsManager
    console.log("\n🔧 Initializing SecretsManager...");
    const secretsManager = new SecretsManager({
      signer: signer,
      functionsRouterAddress: CHAINLINK_CONFIG.router,
      donId: CHAINLINK_CONFIG.donId,
    });

    // Initialize the SecretsManager
    console.log("🔄 Calling initialize()...");
    await secretsManager.initialize();

    // Prepare secrets object
    const secrets = {
      openaiApiKey: openaiApiKey,
    };

    console.log("\n🔒 Encrypting secrets...");

    // Encrypt secrets
    const encryptedSecretsObj = await secretsManager.encryptSecrets(secrets);

    console.log("✅ Secrets encrypted successfully");

    // Upload to DON with production expiration
    console.log(
      `\n📤 Uploading encrypted secrets to DON (expires in ${selectedKey})...`
    );
    console.log("⏳ This may take a few moments...");

    const uploadResult = await secretsManager.uploadEncryptedSecretsToDON({
      encryptedSecretsHexstring: encryptedSecretsObj.encryptedSecrets,
      gatewayUrls: CHAINLINK_CONFIG.gatewayUrls,
      slotId: 0, // Use slot 0 for new upload
      minutesUntilExpiration: expirationMinutes, // Production expiration
    });

    if (!uploadResult.success) {
      throw new Error(
        `Failed to upload secrets: ${uploadResult.message || "Unknown error"}`
      );
    }

    console.log("✅ Secrets uploaded successfully!");

    // Handle different response formats
    const slotId = uploadResult.slotId || uploadResult.slot_id || 0;
    const version =
      uploadResult.version || uploadResult.version_number || Date.now();

    console.log("\n📋 Production Secrets Configuration:");
    console.log(`   Slot ID: ${slotId}`);
    console.log(`   Version: ${version}`);
    console.log(`   Expiration: ${selectedKey} (${expirationMinutes} minutes)`);
    console.log(
      `   Expires At: ${new Date(
        Date.now() + expirationMinutes * 60 * 1000
      ).toISOString()}`
    );

    // Generate configuration for your app
    const config = {
      encryptedSecrets: {
        slotId: slotId,
        version: version,
        secretsLocation: "DONHosted",
        uploadedAt: new Date().toISOString(),
        expiresAt: new Date(
          Date.now() + expirationMinutes * 60 * 1000
        ).toISOString(),
        expirationMinutes: expirationMinutes,
        environment: "production",
      },
      chainlinkConfig: CHAINLINK_CONFIG,
    };

    // Save configuration
    const configPath = path.join(
      __dirname,
      "../encrypted-secrets-production.json"
    );
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

    console.log(`\n💾 Production configuration saved to: ${configPath}`);

    // Generate environment variables
    console.log("\n📝 Add these to your PRODUCTION .env file:");
    console.log(`CHAINLINK_SECRETS_SLOT_ID=${slotId}`);
    console.log(`CHAINLINK_SECRETS_VERSION=${version}`);
    console.log(`CHAINLINK_SECRETS_LOCATION=DONHosted`);
    console.log(`CHAINLINK_SECRETS_ENVIRONMENT=production`);

    console.log("\n🎉 Production setup complete!");
    console.log(
      `⏰ Secrets will expire in ${selectedKey}. Set up monitoring to refresh before expiration.`
    );
  } catch (error) {
    console.error("\n❌ Error:", error.message);
    process.exit(1);
  } finally {
    rl.close();
  }
}

// Handle script execution
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
}

export { main };
