#!/usr/bin/env node

/**
 * Setup Encrypted Secrets for Chainlink Functions
 * This script properly encrypts and uploads secrets to the DON
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
  console.log("🔐 Chainlink Functions - Encrypted Secrets Setup");
  console.log("================================================\n");

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

    // Upload to DON
    console.log("\n📤 Uploading encrypted secrets to DON...");
    console.log("⏳ This may take a few moments...");

    // Use maximum allowed expiration for Avalanche Fuji testnet: 72 hours (3 days)
    const expirationMinutes = 4320; // 72 hours = 4320 minutes (testnet maximum)

    console.log("📅 Using 3-day expiration (testnet maximum)...");

    const uploadResult = await secretsManager.uploadEncryptedSecretsToDON({
      encryptedSecretsHexstring: encryptedSecretsObj.encryptedSecrets,
      gatewayUrls: CHAINLINK_CONFIG.gatewayUrls,
      slotId: 0,
      minutesUntilExpiration: expirationMinutes,
    });

    if (!uploadResult.success) {
      throw new Error(
        `Failed to upload secrets: ${uploadResult.message || "Unknown error"}`
      );
    }

    console.log("✅ Secrets uploaded successfully!");
    console.log("\n📋 Upload Result Debug:");
    console.log(JSON.stringify(uploadResult, null, 2));

    // Handle different response formats
    const slotId = uploadResult.slotId || uploadResult.slot_id || 0;
    const version =
      uploadResult.version || uploadResult.version_number || Date.now();

    const expirationHours = Math.floor(expirationMinutes / 60);
    const expirationDays = Math.floor(expirationHours / 24);

    console.log("\n📋 Secrets Configuration:");
    console.log(`   Slot ID: ${slotId}`);
    console.log(`   Version: ${version}`);
    if (expirationDays >= 1) {
      console.log(
        `   Expiration: ${expirationDays} day(s) (${expirationMinutes} minutes)`
      );
    } else {
      console.log(
        `   Expiration: ${expirationHours} hour(s) (${expirationMinutes} minutes)`
      );
    }

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
      },
      chainlinkConfig: CHAINLINK_CONFIG,
    };

    // Save configuration
    const configPath = path.join(__dirname, "../encrypted-secrets-config.json");
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

    console.log(`\n💾 Configuration saved to: ${configPath}`);

    // Generate environment variables
    console.log("\n📝 Add these to your .env.local file:");
    console.log(`NEXT_PUBLIC_CHAINLINK_SECRETS_SLOT_ID=${slotId}`);
    console.log(`NEXT_PUBLIC_CHAINLINK_SECRETS_VERSION=${version}`);
    console.log(
      `# CHAINLINK_SECRETS_LOCATION=DONHosted  # (for reference only)`
    );

    // Generate code snippet
    console.log("\n🔧 Update your ChainlinkFunctionsManager with:");
    console.log(`
// Set encrypted secrets configuration
functionsManager.setEncryptedSecretsConfig({
  slotId: ${slotId},
  version: ${version},
  secretsLocation: "DONHosted"
});
`);

    console.log(
      "\n🎉 Setup complete! Your secrets are now encrypted and stored in the DON."
    );

    if (expirationDays >= 1) {
      console.log(
        `⏰ Secrets expire in ${expirationDays} day(s). Set a calendar reminder to refresh before expiration.`
      );
    } else {
      console.log(
        `⏰ Secrets expire in ${expirationHours} hour(s). Set a reminder to refresh before expiration.`
      );
    }
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
