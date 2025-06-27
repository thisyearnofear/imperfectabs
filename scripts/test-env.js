import { fileURLToPath } from "url";
import path from "path";
import dotenv from "dotenv";

// Load environment variables from root .env file
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, "..");
dotenv.config({ path: path.join(rootDir, ".env") });

console.log("🧪 Testing Environment Variable Loading");
console.log("=====================================");
console.log();

// Check current working directory
console.log("📁 Current working directory:", process.cwd());
console.log("📁 Script directory:", __dirname);
console.log("📁 Root directory:", rootDir);
console.log("📁 .env file path:", path.join(rootDir, ".env"));
console.log();

// Check if .env file exists
import fs from "fs";
const envPath = path.join(rootDir, ".env");
const envExists = fs.existsSync(envPath);
console.log("📄 .env file exists:", envExists);

if (envExists) {
  console.log("✅ .env file found");
} else {
  console.log("❌ .env file not found");
  console.log("💡 Create .env file by copying .env.example:");
  console.log("   cp .env.example .env");
  process.exit(1);
}

console.log();

// Test environment variables
console.log("🔑 Environment Variables:");
console.log("-------------------------");

const requiredVars = [
  "PRIVATE_KEY",
  "CONTRACT_ADDRESS",
  "CHAINLINK_OPENAI_API_KEY"
];

const optionalVars = [
  "NEXT_PUBLIC_CHAINLINK_SUBSCRIPTION_ID",
  "NEXT_PUBLIC_RPC_URL",
  "NEXT_PUBLIC_CHAIN_ID"
];

let allGood = true;

// Check required variables
console.log("\n📋 Required Variables:");
requiredVars.forEach(varName => {
  const value = process.env[varName];
  if (value) {
    // Mask sensitive values
    const maskedValue = varName.includes("KEY") || varName.includes("PRIVATE")
      ? value.substring(0, 6) + "..." + value.substring(value.length - 4)
      : value;
    console.log(`✅ ${varName}: ${maskedValue}`);
  } else {
    console.log(`❌ ${varName}: Not set`);
    allGood = false;
  }
});

// Check optional variables
console.log("\n📋 Optional Variables:");
optionalVars.forEach(varName => {
  const value = process.env[varName];
  console.log(`${value ? '✅' : '⚪'} ${varName}: ${value || 'Not set'}`);
});

console.log();

if (allGood) {
  console.log("🎉 All required environment variables are set!");
  console.log("🚀 Ready to run: npm run setup:chainlink");
} else {
  console.log("⚠️  Some required environment variables are missing.");
  console.log("📝 Please update your .env file with the missing values.");
  console.log();
  console.log("🔗 Required setup:");
  console.log("1. Add your MetaMask private key (without 0x prefix)");
  console.log("2. Get OpenAI API key from: https://platform.openai.com/api-keys");
  console.log("3. The CONTRACT_ADDRESS should already be set to the deployed contract");
  process.exit(1);
}

console.log();
console.log("🔍 Next steps:");
console.log("1. Get test AVAX: https://faucet.avax.network/");
console.log("2. Get test LINK: https://faucets.chain.link/fuji");
console.log("3. Run setup: npm run setup:chainlink");
