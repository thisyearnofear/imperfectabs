// Simple Environment Variable Test
// Run with: node test-env.js

import { config } from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from .env.local
config({ path: join(__dirname, ".env.local") });

console.log("🔍 Environment Variable Test");
console.log("============================");

console.log("\n📁 Checking .env.local file:");
console.log(`File path: ${join(__dirname, ".env.local")}`);

console.log("\n🔑 Environment Variables:");
console.log(`NEXT_PUBLIC_WEATHERXM_API_KEY: ${process.env.NEXT_PUBLIC_WEATHERXM_API_KEY ? "✅ Present" : "❌ Missing"}`);
console.log(`NEXT_PUBLIC_WEATHERAPI_KEY: ${process.env.NEXT_PUBLIC_WEATHERAPI_KEY ? "✅ Present" : "❌ Missing"}`);

if (process.env.NEXT_PUBLIC_WEATHERAPI_KEY) {
  console.log(`WeatherAPI Key (first 10 chars): ${process.env.NEXT_PUBLIC_WEATHERAPI_KEY.substring(0, 10)}...`);
}

if (process.env.NEXT_PUBLIC_WEATHERXM_API_KEY) {
  console.log(`WeatherXM Key (first 10 chars): ${process.env.NEXT_PUBLIC_WEATHERXM_API_KEY.substring(0, 10)}...`);
}

console.log("\n💡 If keys are missing:");
console.log("1. Check your .env.local file exists");
console.log("2. Ensure format: NEXT_PUBLIC_WEATHERAPI_KEY=your_key_here");
console.log("3. No spaces around = sign");
console.log("4. No quotes around the value");
console.log("5. Restart your terminal after editing");

// Test a simple API call if WeatherAPI key is present
if (process.env.NEXT_PUBLIC_WEATHERAPI_KEY) {
  console.log("\n🧪 Testing WeatherAPI connection...");

  const testWeatherAPI = async () => {
    try {
      const response = await fetch(
        `https://api.weatherapi.com/v1/current.json?key=${process.env.NEXT_PUBLIC_WEATHERAPI_KEY}&q=London&aqi=no`
      );

      if (response.ok) {
        const data = await response.json();
        console.log("✅ WeatherAPI test successful!");
        console.log(`   Location: ${data.location.name}, ${data.location.country}`);
        console.log(`   Weather: ${data.current.temp_c}°C, ${data.current.condition.text}`);
        console.log("🎉 Your API key is working! Weather bonuses should now show real data.");
      } else {
        console.log(`❌ WeatherAPI test failed: ${response.status} ${response.statusText}`);
        if (response.status === 401) {
          console.log("   Your API key might be invalid");
        }
      }
    } catch (error) {
      console.log(`❌ Connection error: ${error.message}`);
    }
  };

  testWeatherAPI();
} else {
  console.log("\n⚠️ No WeatherAPI key found - add it to .env.local to test");
}
