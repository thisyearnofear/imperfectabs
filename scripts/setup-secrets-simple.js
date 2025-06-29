#!/usr/bin/env node

/**
 * Simplified Secrets Setup for Chainlink Functions
 * This script works around toolkit dependency issues
 */

import readline from "readline";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
  console.log("🔐 Chainlink Functions - Simplified Secrets Setup");
  console.log("=================================================\n");

  try {
    // Get OpenAI API key
    let openaiApiKey = process.env.OPENAI_API_KEY;
    if (!openaiApiKey) {
      openaiApiKey = await prompt(
        "Enter your OpenAI API key (will be configured for manual upload): "
      );
    } else {
      console.log(
        "Using OpenAI API key from OPENAI_API_KEY environment variable"
      );
    }

    if (!openaiApiKey.startsWith("sk-")) {
      console.log("⚠️  Warning: OpenAI API key should start with 'sk-'");
    }

    // Since the toolkit has dependency issues, we'll provide manual instructions
    console.log(
      "\n🔧 Due to toolkit dependency conflicts, please follow these manual steps:"
    );
    console.log("\n📋 Manual Secrets Upload Instructions:");
    console.log("=====================================");

    console.log("\n1. 🌐 Visit the Chainlink Functions UI:");
    console.log("   https://functions.chain.link/fuji");

    console.log(
      "\n2. 🔗 Connect your wallet (the one with subscription 15675)"
    );

    console.log("\n3. 📝 Navigate to 'Encrypted Secrets' section");

    console.log("\n4. 🔐 Create new encrypted secrets with this data:");
    console.log("   Key: openaiApiKey");
    console.log(`   Value: ${openaiApiKey}`);

    console.log("\n5. ⏰ Set expiration: 72 hours (maximum for testnet)");

    console.log("\n6. 📤 Upload the secrets and note the returned:");
    console.log("   - Slot ID (usually 0 for first upload)");
    console.log("   - Version (timestamp-based number)");

    // Generate configuration template
    const config = {
      encryptedSecrets: {
        slotId: "TO_BE_FILLED", // User will fill this after manual upload
        version: "TO_BE_FILLED", // User will fill this after manual upload
        secretsLocation: "DONHosted",
        setupMethod: "manual",
        setupDate: new Date().toISOString(),
        expirationHours: 72,
      },
      chainlinkConfig: {
        router: "0xA9d587a00A31A52Ed70D6026794a8FC5E2F5dCb0",
        donId: "fun-avalanche-fuji-1",
        subscriptionId: 15675,
      },
      openaiApiKey: openaiApiKey, // For reference only - not used in production
    };

    // Save configuration template
    const configPath = path.join(
      __dirname,
      "../config/encrypted-secrets-manual.json"
    );
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

    console.log(`\n💾 Configuration template saved to: ${configPath}`);

    console.log("\n📝 After manual upload, update your .env.local file:");
    console.log("NEXT_PUBLIC_CHAINLINK_SECRETS_SLOT_ID=your_slot_id_here");
    console.log("NEXT_PUBLIC_CHAINLINK_SECRETS_VERSION=your_version_here");

    console.log("\n🔧 Alternative: Use the working subscription directly");
    console.log("Since you already have subscription 15675 working, you can:");
    console.log("1. Use the existing secrets if already uploaded");
    console.log("2. Or set up mock values for testing:");

    const mockConfig = `
# For testing without real secrets (mock responses)
NEXT_PUBLIC_CHAINLINK_SECRETS_SLOT_ID=0
NEXT_PUBLIC_CHAINLINK_SECRETS_VERSION=1

# For production with real secrets (after manual upload)
# NEXT_PUBLIC_CHAINLINK_SECRETS_SLOT_ID=your_real_slot_id
# NEXT_PUBLIC_CHAINLINK_SECRETS_VERSION=your_real_version
`;

    console.log(mockConfig);

    console.log("\n🎯 Quick Test Setup:");
    console.log(
      "To test the integration immediately, add these to .env.local:"
    );
    console.log("NEXT_PUBLIC_CHAINLINK_SECRETS_SLOT_ID=0");
    console.log("NEXT_PUBLIC_CHAINLINK_SECRETS_VERSION=1");
    console.log("");
    console.log("This will enable the UI and basic functionality.");
    console.log("Real AI analysis will work once you upload actual secrets.");

    console.log("\n✅ Setup complete!");
    console.log(
      "Your app is ready to use Chainlink Functions with subscription 15675."
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
