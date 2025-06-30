// Compact WeatherXM-Enhanced Fitness Scoring for Chainlink Functions
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

// Default values
let weatherMultiplier = 1.0;
let weatherCondition = "clear";
let temperature = 70;
let weatherBonus = 0;

// Try to fetch WeatherXM data if API key available
if (secrets && secrets.WEATHERXM_API_KEY) {
  try {
    console.log(`Fetching WeatherXM data for: ${latitude}, ${longitude}`);
    
    // Try public WeatherXM API first
    const response = await Functions.makeHttpRequest({
      url: `https://api.weatherxm.com/api/v1/stations/search?lat=${latitude}&lon=${longitude}&limit=1`,
      method: "GET",
      timeout: 5000,
    });

    if (!response.error && response.data && response.data.length > 0) {
      const station = response.data[0];
      if (station.current_weather) {
        temperature = Math.round((station.current_weather.temperature * 9) / 5 + 32);
        const humidity = station.current_weather.humidity;
        const windSpeed = station.current_weather.wind_speed;
        weatherCondition = station.current_weather.icon || "clear";

        // Calculate weather multiplier based on conditions
        if (temperature < 32) weatherMultiplier = 1.25; // Cold bonus
        else if (temperature < 45) weatherMultiplier = 1.2;
        else if (temperature < 55) weatherMultiplier = 1.1;
        else if (temperature > 95) weatherMultiplier = 1.2; // Hot bonus
        else if (temperature > 85) weatherMultiplier = 1.15;
        else if (temperature > 75) weatherMultiplier = 1.05;

        // Humidity and wind bonuses
        if (humidity > 80 && temperature > 70) weatherMultiplier = Math.max(weatherMultiplier, 1.15);
        if (windSpeed > 10) weatherMultiplier = Math.max(weatherMultiplier, 1.1);

        // Weather condition bonuses
        if (weatherCondition.includes("rain") || weatherCondition.includes("snow") || weatherCondition.includes("storm")) {
          weatherMultiplier = Math.max(weatherMultiplier, 1.2);
        }

        weatherBonus = Math.round((weatherMultiplier - 1) * 100);
        console.log(`WeatherXM: ${temperature}°F, ${humidity}% humidity, ${windSpeed}m/s wind, ${weatherCondition}`);
      }
    }
  } catch (error) {
    console.error("WeatherXM fetch error:", error);
  }
} else {
  console.log("No WeatherXM API key, using base score");
}

// Calculate enhanced score
const enhancedScore = Math.round(baseScore * weatherMultiplier);

// Create response matching contract expectations
const contractResponse = {
  conditions: weatherCondition,
  temperature: temperature,
  weatherBonus: weatherBonus,
  score: enhancedScore
};

console.log("WeatherXM Response:", contractResponse);
return Functions.encodeString(JSON.stringify(contractResponse));
