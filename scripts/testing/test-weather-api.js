// WeatherXM API Test Script (ES Module)
// Run with: node test-weather-api.js

import { config } from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from .env.local
config({ path: join(__dirname, ".env.local") });

const WEATHERXM_API_KEY = process.env.NEXT_PUBLIC_WEATHERXM_API_KEY;
const WEATHERAPI_KEY = process.env.NEXT_PUBLIC_WEATHERAPI_KEY;

console.log("🧪 WeatherXM API Test Script");
console.log("============================\n");

// Test 1: Check environment variables
console.log("1️⃣ Checking Environment Variables:");
console.log(
  `WeatherXM API Key: ${WEATHERXM_API_KEY ? "✅ Present" : "❌ Missing"}`
);
console.log(`WeatherAPI Key: ${WEATHERAPI_KEY ? "✅ Present" : "❌ Missing"}`);

if (!WEATHERXM_API_KEY && !WEATHERAPI_KEY) {
  console.log("\n❌ No API keys found!");
  console.log("Add them to your .env.local file:");
  console.log("NEXT_PUBLIC_WEATHERXM_API_KEY=your_weatherxm_key");
  console.log("NEXT_PUBLIC_WEATHERAPI_KEY=your_weatherapi_key");
  process.exit(1);
}

console.log("\n");

// Test 2: WeatherXM Pro API
async function testWeatherXM() {
  if (!WEATHERXM_API_KEY) {
    console.log("2️⃣ WeatherXM Pro API: ⏭️ Skipped (no key)");
    return false;
  }

  console.log("2️⃣ Testing WeatherXM Pro API...");

  try {
    // Test stations endpoint for Athens (high coverage area)
    const response = await fetch(
      "https://pro.weatherxm.com/api/v1/stations/nearby?lat=37.9838&lon=23.7275&radius=50",
      {
        headers: {
          Authorization: `Bearer ${WEATHERXM_API_KEY}`,
          "Content-Type": "application/json",
          "User-Agent": "ImperfectAbs/1.0",
        },
      }
    );

    if (response.ok) {
      const data = await response.json();
      console.log(`✅ WeatherXM Pro API: Connected successfully`);
      console.log(
        `   Found ${data.data ? data.data.length : 0} stations near Athens`
      );
      return true;
    } else {
      console.log(
        `❌ WeatherXM Pro API: Error ${response.status} ${response.statusText}`
      );
      if (response.status === 401) {
        console.log("   Check your API key is valid and active");
      }
      return false;
    }
  } catch (error) {
    console.log(`❌ WeatherXM Pro API: Connection failed - ${error.message}`);
    return false;
  }
}

// Test 3: WeatherAPI.com
async function testWeatherAPI() {
  if (!WEATHERAPI_KEY) {
    console.log("3️⃣ WeatherAPI.com: ⏭️ Skipped (no key)");
    return false;
  }

  console.log("3️⃣ Testing WeatherAPI.com...");

  try {
    const response = await fetch(
      `https://api.weatherapi.com/v1/current.json?key=${WEATHERAPI_KEY}&q=London&aqi=no`
    );

    if (response.ok) {
      const data = await response.json();
      console.log(`✅ WeatherAPI.com: Connected successfully`);
      console.log(
        `   Location: ${data.location.name}, ${data.location.country}`
      );
      console.log(
        `   Temperature: ${data.current.temp_c}°C, ${data.current.condition.text}`
      );
      return true;
    } else {
      console.log(
        `❌ WeatherAPI.com: Error ${response.status} ${response.statusText}`
      );
      if (response.status === 401) {
        console.log("   Check your API key is valid");
      } else if (response.status === 429) {
        console.log("   Rate limit exceeded");
      }
      return false;
    }
  } catch (error) {
    console.log(`❌ WeatherAPI.com: Connection failed - ${error.message}`);
    return false;
  }
}

// Test 4: Coverage test for different locations
async function testCoverage() {
  console.log("4️⃣ Testing Coverage in Different Locations...");

  const testLocations = [
    { name: "Athens", lat: 37.9838, lon: 23.7275, expected: "high" },
    { name: "Berlin", lat: 52.52, lon: 13.405, expected: "high" },
    { name: "London", lat: 51.5074, lon: -0.1278, expected: "medium" },
    { name: "Tokyo", lat: 35.6762, lon: 139.6503, expected: "none" },
  ];

  for (const location of testLocations) {
    console.log(
      `\n   Testing ${location.name} (expected coverage: ${location.expected})`
    );

    // Test WeatherXM if key available
    if (WEATHERXM_API_KEY) {
      try {
        const response = await fetch(
          `https://pro.weatherxm.com/api/v1/stations/nearby?lat=${location.lat}&lon=${location.lon}&radius=50`,
          {
            headers: {
              Authorization: `Bearer ${WEATHERXM_API_KEY}`,
              "Content-Type": "application/json",
              "User-Agent": "ImperfectAbs/1.0",
            },
          }
        );

        if (response.ok) {
          const data = await response.json();
          const stationCount = data.data ? data.data.length : 0;
          console.log(`   WeatherXM: ${stationCount} stations found`);
        }
      } catch (e) {
        console.log(`   WeatherXM: Connection error`);
      }
    }

    // Test WeatherAPI if key available
    if (WEATHERAPI_KEY) {
      try {
        const response = await fetch(
          `https://api.weatherapi.com/v1/current.json?key=${WEATHERAPI_KEY}&q=${location.lat},${location.lon}&aqi=no`
        );

        if (response.ok) {
          const data = await response.json();
          console.log(
            `   WeatherAPI: ${data.current.temp_c}°C, ${data.current.condition.text}`
          );
        }
      } catch (e) {
        console.log(`   WeatherAPI: Connection error`);
      }
    }

    // Add delay to respect rate limits
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
}

// Run all tests
async function runTests() {
  const weatherxmResult = await testWeatherXM();
  console.log("");
  const weatherapiResult = await testWeatherAPI();
  console.log("");
  await testCoverage();

  console.log("\n🎯 Test Summary:");
  console.log("================");

  if (weatherxmResult && weatherapiResult) {
    console.log(
      "✅ Full Coverage: Premium WeatherXM stations + Global WeatherAPI fallback"
    );
    console.log("   Your app will provide the best weather experience!");
  } else if (weatherapiResult) {
    console.log("✅ Good Coverage: Global WeatherAPI coverage available");
    console.log("   Your app will work worldwide with reliable weather data.");
  } else if (weatherxmResult) {
    console.log(
      "⚠️ Limited Coverage: WeatherXM stations only (Europe focused)"
    );
    console.log("   Consider adding WeatherAPI key for global coverage.");
  } else {
    console.log("❌ No Coverage: Both APIs failed");
    console.log("   Your app will use simulated weather data only.");
  }

  console.log("\n📚 Next Steps:");
  if (!WEATHERXM_API_KEY) {
    console.log("• Get WeatherXM Pro API key: https://pro.weatherxm.com");
  }
  if (!WEATHERAPI_KEY) {
    console.log("• Get WeatherAPI.com key: https://www.weatherapi.com/");
  }
  if (WEATHERXM_API_KEY || WEATHERAPI_KEY) {
    console.log("• Test the Weather Bonuses component in your app");
    console.log("• Monitor API usage and costs");
  }

  console.log("\n💡 Quick Start Guide:");
  console.log("1. Create .env.local file in your project root");
  console.log("2. Add: NEXT_PUBLIC_WEATHERAPI_KEY=your_key_here");
  console.log("3. Get free key from: https://www.weatherapi.com/");
  console.log("4. Restart your development server");
  console.log("5. Test in the Weather Bonuses component");
}

runTests().catch(console.error);
