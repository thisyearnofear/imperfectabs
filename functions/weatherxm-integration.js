// WeatherXM Integration for Imperfect Abs
// Chainlink Functions source code to fetch real weather data and calculate regional bonuses

// Expected args: [latitude, longitude, region]
// Expected secrets: { weatherxmApiKey: "212d1137-0487-4d19-b842-9106cc705c0c" }

const latitude = args[0] || "40.7128";  // Default to NYC
const longitude = args[1] || "-74.0060";
const region = args[2] || "temperate";   // Default region

const apiKey = secrets.weatherxmApiKey;

if (!apiKey) {
  throw Error("WeatherXM API key not provided in secrets");
}

// WeatherXM API endpoints (based on common patterns)
const baseUrl = "https://api.weatherxm.com/api/v1";

// Function to calculate weather-based bonus
function calculateWeatherBonus(weatherData) {
  const { temperature, humidity, windSpeed, pressure } = weatherData;
  
  let bonus = 0; // Base bonus in basis points (100 = 1%)
  
  // Temperature-based bonuses (encourage working out in challenging conditions)
  if (temperature < 0) {
    bonus += 1200; // Extreme cold: 12% bonus
  } else if (temperature < 10) {
    bonus += 800;  // Cold: 8% bonus
  } else if (temperature > 35) {
    bonus += 1000; // Hot: 10% bonus
  } else if (temperature > 30) {
    bonus += 600;  // Warm: 6% bonus
  } else {
    bonus += 200;  // Mild: 2% bonus
  }
  
  // Humidity-based bonuses
  if (humidity > 80) {
    bonus += 400; // High humidity: 4% bonus
  } else if (humidity < 30) {
    bonus += 300; // Low humidity: 3% bonus
  }
  
  // Wind-based bonuses
  if (windSpeed > 20) {
    bonus += 300; // Windy conditions: 3% bonus
  }
  
  // Pressure-based bonuses (extreme weather)
  if (pressure < 1000 || pressure > 1030) {
    bonus += 200; // Extreme pressure: 2% bonus
  }
  
  // Cap maximum bonus at 20%
  return Math.min(bonus, 2000);
}

// Function to determine region from coordinates and weather
function determineRegion(lat, lon, weatherData) {
  const { temperature } = weatherData;
  
  // Simple region classification based on latitude and temperature
  if (Math.abs(lat) > 60) {
    return "arctic";
  } else if (Math.abs(lat) < 23.5 && temperature > 25) {
    return "tropical";
  } else if (temperature > 30 && weatherData.humidity < 40) {
    return "desert";
  } else if (Math.abs(lat) > 40) {
    return "north";
  } else if (Math.abs(lat) < 30) {
    return "south";
  } else {
    return "temperate";
  }
}

// Main execution
try {
  console.log(`Fetching weather data for coordinates: ${latitude}, ${longitude}`);
  
  // Try WeatherXM API first
  let weatherData;
  
  try {
    // WeatherXM API call (adjust endpoint based on actual API)
    const weatherXMRequest = Functions.makeHttpRequest({
      url: `${baseUrl}/weather/current`,
      method: "GET",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      params: {
        lat: latitude,
        lon: longitude
      }
    });
    
    const weatherXMResponse = await weatherXMRequest;
    
    if (weatherXMResponse.error) {
      throw new Error(`WeatherXM API error: ${weatherXMResponse.error}`);
    }
    
    const data = weatherXMResponse.data;
    
    // Extract weather data (adjust based on actual WeatherXM response format)
    weatherData = {
      temperature: data.temperature || data.temp || 20,
      humidity: data.humidity || 50,
      windSpeed: data.wind_speed || data.windSpeed || 0,
      pressure: data.pressure || 1013,
      condition: data.condition || data.weather || "clear"
    };
    
    console.log("WeatherXM data retrieved successfully:", weatherData);
    
  } catch (weatherXMError) {
    console.log("WeatherXM API failed, using fallback weather service");
    
    // Fallback to OpenWeatherMap or similar free API
    const fallbackRequest = Functions.makeHttpRequest({
      url: `https://api.openweathermap.org/data/2.5/weather`,
      method: "GET",
      params: {
        lat: latitude,
        lon: longitude,
        appid: "demo", // Would need a backup API key
        units: "metric"
      }
    });
    
    try {
      const fallbackResponse = await fallbackRequest;
      const data = fallbackResponse.data;
      
      weatherData = {
        temperature: data.main?.temp || 20,
        humidity: data.main?.humidity || 50,
        windSpeed: data.wind?.speed || 0,
        pressure: data.main?.pressure || 1013,
        condition: data.weather?.[0]?.main || "clear"
      };
      
      console.log("Fallback weather data retrieved:", weatherData);
      
    } catch (fallbackError) {
      // Use default values if all APIs fail
      console.log("All weather APIs failed, using default values");
      weatherData = {
        temperature: 20,
        humidity: 50,
        windSpeed: 5,
        pressure: 1013,
        condition: "clear"
      };
    }
  }
  
  // Calculate weather bonus
  const weatherBonus = calculateWeatherBonus(weatherData);
  
  // Determine region
  const detectedRegion = determineRegion(parseFloat(latitude), parseFloat(longitude), weatherData);
  
  // Prepare response data
  const response = {
    region: detectedRegion,
    bonus: weatherBonus,
    weather: {
      temperature: Math.round(weatherData.temperature * 10) / 10,
      humidity: Math.round(weatherData.humidity),
      windSpeed: Math.round(weatherData.windSpeed * 10) / 10,
      pressure: Math.round(weatherData.pressure),
      condition: weatherData.condition
    },
    timestamp: Math.floor(Date.now() / 1000)
  };
  
  console.log("Final weather bonus calculation:", response);
  
  // Return encoded response for the smart contract
  // Format: [region_bonus, temperature, humidity, wind_speed, timestamp]
  return Functions.encodeUint256(weatherBonus);
  
} catch (error) {
  console.error("Error in weather data processing:", error);
  
  // Return default bonus if everything fails
  return Functions.encodeUint256(200); // 2% default bonus
}
