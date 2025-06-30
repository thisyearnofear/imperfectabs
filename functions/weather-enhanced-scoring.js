// Chainlink Functions: WeatherXM-Enhanced Fitness Scoring
// Fetches hyperlocal weather data from WeatherXM DePIN network

// Main function for Chainlink Functions execution
(async () => {
  // Parse workout data from arguments
  const reps = parseInt(args[0] || "0");
  const formAccuracy = parseInt(args[1] || "0");
  const duration = parseInt(args[2] || "0");
  const latitude = parseFloat(args[3] || "40.7128"); // Default to NYC
  const longitude = parseFloat(args[4] || "-74.0060"); // Default to NYC

  // Validate inputs
  if (reps < 0 || reps > 500) throw Error("Invalid reps");
  if (formAccuracy < 0 || formAccuracy > 100)
    throw Error("Invalid form accuracy");
  if (duration < 0 || duration > 3600) throw Error("Invalid duration");
  if (latitude < -90 || latitude > 90) throw Error("Invalid latitude");
  if (longitude < -180 || longitude > 180) throw Error("Invalid longitude");

  // Calculate base score (same as frontend calculation)
  const baseScore = Math.min(100, Math.floor(reps * 2 + formAccuracy * 0.8));

  // Default response for when weather API fails
  let weatherMultiplier = 1.0;
  let weatherCondition = "unknown";
  let temperature = null;
  let humidity = null;
  let windSpeed = null;

  try {
    // Fetch weather data from WeatherXM if API key is available
    if (secrets.WEATHERXM_API_KEY) {
      console.log(
        `Fetching WeatherXM data for coordinates: ${latitude}, ${longitude}`
      );

      // WeatherXM API endpoint for nearest station data
      const weatherResponse = await Functions.makeHttpRequest({
        url: `https://api.weatherxm.com/api/v1/me/devices`,
        method: "GET",
        headers: {
          Authorization: `Bearer ${secrets.WEATHERXM_API_KEY}`,
          "Content-Type": "application/json",
        },
        timeout: 8000,
      });

      if (weatherResponse.error) {
        console.error("WeatherXM API error:", weatherResponse.error);
        // Fallback to public endpoint if authenticated fails
        const publicResponse = await Functions.makeHttpRequest({
          url: `https://api.weatherxm.com/api/v1/stations/search?lat=${latitude}&lon=${longitude}&limit=1`,
          method: "GET",
          timeout: 5000,
        });

        if (
          !publicResponse.error &&
          publicResponse.data &&
          publicResponse.data.length > 0
        ) {
          const station = publicResponse.data[0];
          if (station.current_weather) {
            temperature = Math.round(
              (station.current_weather.temperature * 9) / 5 + 32
            ); // Convert C to F
            humidity = station.current_weather.humidity;
            windSpeed = station.current_weather.wind_speed;
            weatherCondition = station.current_weather.icon || "clear";
          }
        }
      } else if (weatherResponse.data && weatherResponse.data.length > 0) {
        // Use authenticated user's nearest device data
        const device = weatherResponse.data[0];
        if (device.current_weather) {
          temperature = Math.round(
            (device.current_weather.temperature * 9) / 5 + 32
          ); // Convert C to F
          humidity = device.current_weather.humidity;
          windSpeed = device.current_weather.wind_speed;
          weatherCondition = device.current_weather.icon || "clear";
        }
      }

      if (temperature !== null) {
        console.log(
          `WeatherXM Data: ${temperature}°F, ${humidity}% humidity, ${windSpeed}m/s wind, ${weatherCondition}`
        );

        // Enhanced weather-based multipliers using WeatherXM's hyperlocal data
        // Cold weather bonus (encourages indoor workouts)
        if (temperature < 32) {
          weatherMultiplier = 1.25; // 25% bonus for freezing weather
        } else if (temperature < 45) {
          weatherMultiplier = 1.2; // 20% bonus for cold weather
        } else if (temperature < 55) {
          weatherMultiplier = 1.1; // 10% bonus for cool weather
        }

        // Hot weather bonus (encourages staying active in heat)
        else if (temperature > 95) {
          weatherMultiplier = 1.2; // 20% bonus for extreme heat
        } else if (temperature > 85) {
          weatherMultiplier = 1.15; // 15% bonus for hot weather
        } else if (temperature > 75) {
          weatherMultiplier = 1.05; // 5% bonus for warm weather
        }

        // High humidity penalty/bonus (makes exercise harder)
        if (humidity > 80 && temperature > 70) {
          weatherMultiplier = Math.max(weatherMultiplier, 1.15); // Bonus for exercising in humid conditions
        }

        // Wind conditions (outdoor exercise consideration)
        if (windSpeed > 10) {
          // Strong wind
          weatherMultiplier = Math.max(weatherMultiplier, 1.1); // Bonus for challenging conditions
        }

        // Weather condition bonuses
        if (
          weatherCondition.includes("rain") ||
          weatherCondition.includes("snow") ||
          weatherCondition.includes("storm")
        ) {
          weatherMultiplier = Math.max(weatherMultiplier, 1.2); // 20% bonus for adverse weather
        }
      }
    } else {
      console.log("No WeatherXM API key provided, using base score");
    }
  } catch (error) {
    console.error("WeatherXM fetch error:", error);
    // Continue with base score if weather fails
  }

  // Calculate enhanced score
  const enhancedScore = Math.round(baseScore * weatherMultiplier);

  // Create response object with WeatherXM data
  const response = {
    score: enhancedScore,
    baseScore: baseScore,
    weatherMultiplier: weatherMultiplier,
    weatherCondition: weatherCondition,
    temperature: temperature,
    humidity: humidity,
    windSpeed: windSpeed,
    bonusPercentage: Math.round((weatherMultiplier - 1) * 100),
    dataSource: "WeatherXM",
  };

  console.log("Final WeatherXM response:", response);

  // Return JSON response to match contract expectations
  // Contract expects: conditions, temperature, weatherBonus, score
  const contractResponse = {
    conditions: weatherCondition,
    temperature: temperature || 70, // Default temperature if null
    weatherBonus: Math.round((weatherMultiplier - 1) * 100),
    score: enhancedScore,
  };

  return Functions.encodeString(JSON.stringify(contractResponse));
})();
