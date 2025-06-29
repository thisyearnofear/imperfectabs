#!/usr/bin/env node

/**
 * Fixed Encrypted Secrets Setup for Chainlink Functions
 * This script works around Node.js v20 compatibility issues
 */

import { ethers } from "ethers";
import readline from "readline";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Polyfill for gOPD compatibility issue
if (!global.gOPD) {
  global.gOPD = Object.getOwnPropertyDescriptor;
}

// Fix for dunder-proto compatibility
if (!global.hasOwnProperty) {
  global.hasOwnProperty = Object.prototype.hasOwnProperty;
}

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

// Dynamic import with compatibility fixes
async function loadSecretsManager() {
  try {
    // Apply additional compatibility fixes
    if (!global.Buffer) {
      global.Buffer = (await import('buffer')).Buffer;
    }
    
    console.log("🔧 Loading Chainlink Functions Toolkit with compatibility fixes...");
    const { SecretsManager } = await import("@chainlink/functions-toolkit");
    return SecretsManager;
  } catch (error) {
    console.error("Failed to load Chainlink Functions Toolkit:", error);
    
    // Provide specific error handling for common issues
    if (error.message.includes("gOPD is not a function")) {
      console.log("\n💡 Node.js compatibility issue detected.");
      console.log("Try one of these solutions:");
      console.log("1. Use Node.js v18: nvm use 18");
      console.log("2. Use the manual upload method");
      console.log("3. Use Docker with Node.js v18");
    }
    
    throw new Error(
      "Chainlink Functions Toolkit compatibility issue. Try Node.js v18 or manual upload."
    );
  }
}

async function main() {
  console.log("🔐 Chainlink Functions - Fixed Encrypted Secrets Setup");
  console.log("====================================================\n");

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

    // Initialize SecretsManager with compatibility fixes
    console.log("\n🔧 Initializing SecretsManager with compatibility fixes...");
    const SecretsManager = await loadSecretsManager();
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
    console.log("\n📋 Upload Result:");
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
    console.log(`   Expiration: ${expirationDays} day(s) (${expirationMinutes} minutes)`);

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

    // Update .env file automatically
    const envPath = path.join(__dirname, "../.env");
    let envContent = fs.readFileSync(envPath, 'utf8');
    
    // Replace the placeholder values
    envContent = envContent.replace(
      /NEXT_PUBLIC_CHAINLINK_SECRETS_SLOT_ID=0/,
      `NEXT_PUBLIC_CHAINLINK_SECRETS_SLOT_ID=${slotId}`
    );
    envContent = envContent.replace(
      /NEXT_PUBLIC_CHAINLINK_SECRETS_VERSION=1/,
      `NEXT_PUBLIC_CHAINLINK_SECRETS_VERSION=${version}`
    );
    
    fs.writeFileSync(envPath, envContent);
    console.log("✅ Environment variables updated automatically!");

    console.log("\n🎉 Setup complete! Your secrets are now encrypted and stored in the DON.");
    console.log("🚀 Your app is ready for production with real AI analysis!");

  } catch (error) {
    console.error("\n❌ Error:", error.message);
    
    if (error.message.includes("compatibility")) {
      console.log("\n💡 Alternative solutions:");
      console.log("1. Use Node.js v18: nvm install 18 && nvm use 18");
      console.log("2. Use manual upload via Chainlink Functions UI");
      console.log("3. Use Docker with Node.js v18");
    }
    
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
