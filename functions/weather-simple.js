// Simplified WeatherXM-Enhanced Fitness Scoring for Chainlink Functions
const reps = parseInt(args[0] || "0");
const formAccuracy = parseInt(args[1] || "0");
const duration = parseInt(args[2] || "0");
const latitude = parseFloat(args[3] || "40.7128");
const longitude = parseFloat(args[4] || "-74.0060");

// Validate inputs
if (reps < 0 || reps > 500) throw Error("Invalid reps");
if (formAccuracy < 0 || formAccuracy > 100) throw Error("Invalid form accuracy");
if (duration < 0 || duration > 3600) throw Error("Invalid duration");

// Calculate base score
const baseScore = Math.min(100, Math.floor(reps * 2 + formAccuracy * 0.8));

// Default weather multiplier
let weatherMultiplier = 1.0;
let weatherCondition = "clear";
let temperature = 70;

try {
  // Try to fetch weather data if API key is available
  if (secrets.WEATHERXM_API_KEY) {
    console.log(`Fetching weather for: ${latitude}, ${longitude}`);
    
    // Simple weather API call (fallback to public endpoint)
    const weatherResponse = await Functions.makeHttpRequest({
      url: `https://api.weatherxm.com/api/v1/stations/search?lat=${latitude}&lon=${longitude}&limit=1`,
      method: "GET",
      timeout: 5000
    });
    
    if (!weatherResponse.error && weatherResponse.data && weatherResponse.data.length > 0) {
      const station = weatherResponse.data[0];
      if (station.current_weather) {
        temperature = Math.round((station.current_weather.temperature * 9/5) + 32);
        weatherCondition = station.current_weather.icon || "clear";
        
        console.log(`WeatherXM: ${temperature}°F, ${weatherCondition}`);
        
        // Apply weather bonuses
        if (temperature < 32) {
          weatherMultiplier = 1.25; // 25% bonus for freezing
        } else if (temperature < 45) {
          weatherMultiplier = 1.2; // 20% bonus for cold
        } else if (temperature > 95) {
          weatherMultiplier = 1.2; // 20% bonus for extreme heat
        } else if (temperature > 85) {
          weatherMultiplier = 1.15; // 15% bonus for hot
        }
        
        // Weather condition bonuses
        if (weatherCondition.includes("rain") || weatherCondition.includes("snow")) {
          weatherMultiplier = Math.max(weatherMultiplier, 1.2);
        }
      }
    }
  } else {
    console.log("No WeatherXM API key, using base score");
  }
} catch (error) {
  console.error("Weather fetch error:", error);
  // Continue with base score
}

// Calculate enhanced score
const enhancedScore = Math.round(baseScore * weatherMultiplier);

// Return JSON response for contract
const response = {
  conditions: weatherCondition,
  temperature: temperature,
  weatherBonus: Math.round((weatherMultiplier - 1) * 100),
  score: enhancedScore
};

console.log("Final response:", response);
return Functions.encodeString(JSON.stringify(response));
