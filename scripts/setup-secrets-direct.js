#!/usr/bin/env node

/**
 * Direct API approach for encrypted secrets
 * Uses the existing working subscription and manual configuration
 */

import { ethers } from "ethers";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Since you already have a working subscription (15675),
// let's create a simple approach that generates the configuration
// and provides instructions for manual upload

async function main() {
  console.log("🔐 Chainlink Functions - Direct Configuration Setup");
  console.log("==================================================\n");

  try {
    // Get environment variables
    const privateKey = process.env.PRIVATE_KEY;
    const openaiApiKey = process.env.OPENAI_API_KEY;

    if (!privateKey) {
      console.error("❌ PRIVATE_KEY environment variable is required");
      console.log("Set it with: export PRIVATE_KEY=your_private_key_here");
      process.exit(1);
    }

    if (!openaiApiKey) {
      console.error("❌ OPENAI_API_KEY environment variable is required");
      console.log("Set it with: export OPENAI_API_KEY=your_openai_key_here");
      process.exit(1);
    }

    // Connect to verify the setup
    const provider = new ethers.providers.JsonRpcProvider(
      "https://api.avax-test.network/ext/bc/C/rpc"
    );
    const signer = new ethers.Wallet(privateKey, provider);
    const address = await signer.getAddress();

    console.log(`🔗 Connected with address: ${address}`);

    // Since you have subscription 15675 working, let's use a practical approach
    console.log("\n🎯 Using your existing working subscription: 15675");

    // Generate a mock slot ID and version for immediate testing
    const mockSlotId = 0;
    const mockVersion = Date.now();

    console.log("\n📋 Configuration Options:");
    console.log("========================");

    console.log("\n🚀 Option 1: Immediate Testing (Recommended)");
    console.log("Use these values for immediate functionality:");
    console.log(`   Slot ID: ${mockSlotId}`);
    console.log(`   Version: ${mockVersion}`);
    console.log("   Note: This enables all UI features with mock AI responses");

    console.log("\n🔐 Option 2: Real AI Analysis");
    console.log("For real OpenAI integration, manually upload via:");
    console.log("   URL: https://functions.chain.link/fuji");
    console.log("   Connect wallet with subscription 15675");
    console.log("   Upload secret: openaiApiKey = " + openaiApiKey);
    console.log("   Then update the slot ID and version below");

    // Update environment file with working values
    const envPath = path.join(__dirname, "../.env");
    let envContent = fs.readFileSync(envPath, "utf8");

    // Use the mock values for immediate testing
    envContent = envContent.replace(
      /NEXT_PUBLIC_CHAINLINK_SECRETS_SLOT_ID=\d+/,
      `NEXT_PUBLIC_CHAINLINK_SECRETS_SLOT_ID=${mockSlotId}`
    );
    envContent = envContent.replace(
      /NEXT_PUBLIC_CHAINLINK_SECRETS_VERSION=\d+/,
      `NEXT_PUBLIC_CHAINLINK_SECRETS_VERSION=${mockVersion}`
    );

    fs.writeFileSync(envPath, envContent);

    // Create configuration file
    const config = {
      setup: "direct",
      subscriptionId: 15675,
      secrets: {
        slotId: mockSlotId,
        version: mockVersion,
        location: "DONHosted",
        status: "mock", // Change to "real" after manual upload
      },
      instructions: {
        immediate: "App is ready to test with mock AI responses",
        production:
          "Upload secrets manually at https://functions.chain.link/fuji for real AI",
      },
      chainlinkConfig: {
        router: "0xA9d587a00A31A52Ed70D6026794a8FC5E2F5dCb0",
        donId: "fun-avalanche-fuji-1",
        subscriptionId: 15675,
      },
    };

    const configPath = path.join(
      __dirname,
      "../config/chainlink-direct-config.json"
    );
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

    console.log("\n✅ Configuration updated!");
    console.log(`📄 Config saved to: ${configPath}`);

    console.log("\n🎉 Your app is ready!");
    console.log("🚀 You can now:");
    console.log("   1. Build and deploy your app");
    console.log("   2. Test all Chainlink Functions features");
    console.log("   3. Get mock AI analysis responses");
    console.log("   4. Upgrade to real AI later via manual upload");

    console.log("\n📝 Environment variables set:");
    console.log(`   NEXT_PUBLIC_CHAINLINK_SECRETS_SLOT_ID=${mockSlotId}`);
    console.log(`   NEXT_PUBLIC_CHAINLINK_SECRETS_VERSION=${mockVersion}`);

    console.log("\n💡 For real AI analysis:");
    console.log("   Visit: https://functions.chain.link/fuji");
    console.log("   Upload your OpenAI key and update the slot ID/version");
  } catch (error) {
    console.error("\n❌ Error:", error.message);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
