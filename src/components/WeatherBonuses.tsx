"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { ethers } from "ethers";
import {
  CONTRACT_ABI,
  CONTRACT_ADDRESS,
  type WeatherBonuses as WeatherBonusesType,
} from "../lib/contract";
import { weatherXM, type WeatherData } from "../lib/weatherXM";

interface WeatherBonusesProps {
  isConnected: boolean;
}

interface RegionalWeatherData {
  [location: string]: WeatherData;
}

interface ApiKeyStatus {
  weatherxm: { present: boolean; status: string };
  weatherapi: { present: boolean; status: string };
  overall: string;
}

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const WEATHER_LOCATIONS = [
  "Athens",
  "Berlin",
  "London",
  "Paris",
  "Tokyo",
  "New York",
];

const SEASON_EMOJIS: { [key: string]: string } = {
  January: "❄️",
  February: "❄️",
  March: "🌸",
  April: "🌸",
  May: "🌸",
  June: "☀️",
  July: "☀️",
  August: "☀️",
  September: "🍂",
  October: "🍂",
  November: "🍂",
  December: "❄️",
};

const LOCATION_EMOJIS: { [key: string]: string } = {
  Athens: "🏛️",
  Berlin: "🍺",
  London: "☂️",
  Paris: "🗼",
  Tokyo: "🏯",
  "New York": "🗽",
};

export default function WeatherBonuses({ isConnected }: WeatherBonusesProps) {
  const [bonuses, setBonuses] = useState<WeatherBonusesType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [useRealWeather, setUseRealWeather] = useState(false);
  const [weatherData, setWeatherData] = useState<RegionalWeatherData>({});
  const [currentMonth] = useState(new Date().getMonth() + 1);
  const [apiKeyStatus, setApiKeyStatus] = useState<ApiKeyStatus | null>(null);
  const [testingConnection, setTestingConnection] = useState(false);
  const [lastFetchTime, setLastFetchTime] = useState<number>(0);
  const [isFetching, setIsFetching] = useState(false);
  const lastFetchTimeRef = useRef<number>(0);
  const weatherDataRef = useRef<RegionalWeatherData>({});

  const testApiConnection = async () => {
    setTestingConnection(true);
    try {
      console.log("Testing API connections...");

      // Test API key validation
      const keyStatus = weatherXM.validateApiKeys();
      console.log("API Key Status:", keyStatus);
      setApiKeyStatus(keyStatus);

      // Test actual connections
      const connectionTest = await weatherXM.testConnection();
      console.log("Connection Test Results:", connectionTest);

      // Try to fetch a sample location
      if (keyStatus.weatherxm.present || keyStatus.weatherapi.present) {
        console.log("Testing weather data fetch...");
        const sampleWeather = await weatherXM.getWeatherData("London");
        console.log("Sample Weather Data:", sampleWeather);

        if (sampleWeather) {
          alert(
            `✅ Weather API Test Successful!\n\nLocation: ${
              sampleWeather.location
            }\nTemperature: ${Math.round(
              sampleWeather.temperature
            )}°C\nCondition: ${sampleWeather.condition}\nSource: ${
              sampleWeather.source
            }\nData Quality: ${
              sampleWeather.dataQuality
            }\n\nYou can now enable Real Weather mode!`
          );
        } else {
          alert("❌ Weather API test failed - no data returned");
        }
      } else {
        alert(
          "⚠️ No API keys configured.\n\nAdd to your .env.local file:\nNEXT_PUBLIC_WEATHERXM_API_KEY=your_key\nNEXT_PUBLIC_WEATHERAPI_KEY=your_key"
        );
      }
    } catch (error) {
      console.error("API test error:", error);
      alert(
        `❌ API Test Error: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    } finally {
      setTestingConnection(false);
    }
  };

  const getSeasonalBonus = (month: number): number => {
    // Winter months get higher bonuses
    if (month === 12 || month <= 2) return 1000; // 10%
    if (month >= 6 && month <= 8) return 800; // Summer 8%
    if (month === 3 || month === 11) return 500; // Transition 5%
    return 200; // Spring/Fall 2%
  };

  const getDefaultSeasonalBonuses = useCallback(() => {
    const seasonal: { [month: number]: number } = {};
    for (let month = 1; month <= 12; month++) {
      seasonal[month] = getSeasonalBonus(month);
    }
    return seasonal;
  }, []);

  const getDefaultRegionalBonuses = useCallback(
    () => ({
      temperate: 200,
      tropical: 600,
      desert: 1000,
      arctic: 1200,
      mountain: 800,
      coastal: 300,
    }),
    []
  );

  const fetchContractWeatherData = useCallback(async () => {
    try {
      const provider = new ethers.providers.JsonRpcProvider(
        "https://api.avax-test.network/ext/bc/C/rpc"
      );
      const coreContract = new ethers.Contract(
        CONTRACT_ADDRESS,
        CONTRACT_ABI,
        provider
      );

      // Get Automation service address from core contract
      const automationServiceId = ethers.utils.keccak256(
        ethers.utils.toUtf8Bytes("AUTOMATION_SERVICE")
      );
      const automationServiceAddress = await coreContract.getService(
        automationServiceId
      );
      const isAutomationEnabled = await coreContract.isServiceEnabled(
        automationServiceId
      );

      if (
        !isAutomationEnabled ||
        automationServiceAddress === ethers.constants.AddressZero
      ) {
        // Show fallback data
        setBonuses({
          seasonal: getDefaultSeasonalBonuses(),
          regional: getDefaultRegionalBonuses(),
          lastUpdate: Date.now(),
        });
        return;
      }

      // Call Automation service contract directly
      const automationServiceABI = [
        "function getWeatherBonuses() external view returns (uint256[12] memory seasonal, string[] memory regions, uint256[] memory regionalBonuses)",
        "function getServiceStats() external view returns (uint256 totalUpkeeps, uint256 timeSinceLastWeatherUpdate, uint256 timeSinceLastSeasonalUpdate, uint256 currentMonth, bool isAutomationEnabled)",
      ];

      const automationContract = new ethers.Contract(
        automationServiceAddress,
        automationServiceABI,
        provider
      );

      const [seasonalArray, regions, regionalArray] =
        await automationContract.getWeatherBonuses();
      const [, timeSinceLastUpdate] =
        await automationContract.getServiceStats();

      // Build bonuses object
      const seasonal: { [month: number]: number } = {};
      seasonalArray.forEach((bonus: ethers.BigNumber, index: number) => {
        seasonal[index + 1] = bonus.toNumber();
      });

      const regional: { [region: string]: number } = {};
      regions.forEach((region: string, index: number) => {
        regional[region] = regionalArray[index].toNumber();
      });

      setBonuses({
        seasonal,
        regional,
        lastUpdate: Date.now() - timeSinceLastUpdate.toNumber() * 1000,
      });
    } catch (err) {
      console.error("Error fetching contract weather data:", err);
      setBonuses({
        seasonal: getDefaultSeasonalBonuses(),
        regional: getDefaultRegionalBonuses(),
        lastUpdate: Date.now(),
      });
    }
  }, [getDefaultSeasonalBonuses, getDefaultRegionalBonuses]);

  const fetchWeatherBonuses = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setIsFetching(true);

      // Check API key status first
      const keyStatus = weatherXM.validateApiKeys();
      setApiKeyStatus(keyStatus);

      // Check if we recently fetched data (avoid unnecessary API calls)
      const now = Date.now();
      const timeSinceLastFetch = now - lastFetchTimeRef.current;
      const cacheTimeout = 30 * 60 * 1000; // 30 minutes

      if (
        useRealWeather &&
        timeSinceLastFetch < cacheTimeout &&
        Object.keys(weatherDataRef.current).length > 0
      ) {
        console.log("Using cached weather data, skipping API calls");
        setLoading(false);
        setIsFetching(false);
        return;
      }

      if (
        useRealWeather &&
        (keyStatus.weatherxm.present || keyStatus.weatherapi.present)
      ) {
        // Fetch real weather data from WeatherXM
        try {
          console.log("Fetching real weather data...");
          lastFetchTimeRef.current = now;
          setLastFetchTime(now);
          const locations = await weatherXM.getMultiLocationWeather();
          const weatherMap: RegionalWeatherData = {};

          // Convert to location-based data
          locations.forEach((location) => {
            weatherMap[location.location] = location;
            console.log(`Weather for ${location.location}:`, location);
          });

          weatherDataRef.current = weatherMap;
          setWeatherData(weatherMap);

          // Build seasonal bonuses (simulated based on current month)
          const seasonal: { [month: number]: number } = {};
          for (let month = 1; month <= 12; month++) {
            seasonal[month] = getSeasonalBonus(month);
          }

          // Build location-based bonuses from real weather data
          const regional: { [region: string]: number } = {};
          Object.keys(weatherMap).forEach((location) => {
            const bonus = Math.round(weatherMap[location].bonus.total * 100);
            regional[location] = bonus;
            console.log(`${location} bonus: ${bonus} basis points`);
          });

          console.log("Setting bonuses:", { seasonal, regional });

          setBonuses({
            seasonal,
            regional,
            lastUpdate: now,
          });
        } catch (weatherError) {
          console.error("WeatherXM error, falling back:", weatherError);
          setError(
            "Weather API error - check your API keys or try again later"
          );
          // Don't automatically fall back to contract data, let user choose
          setUseRealWeather(false);
          await fetchContractWeatherData();
        }
      } else {
        // Auto-enable real weather if API keys are available
        if (
          !useRealWeather &&
          (keyStatus.weatherxm.present || keyStatus.weatherapi.present)
        ) {
          console.log("API keys detected, enabling real weather mode");
          setUseRealWeather(true);
          return; // This will trigger a re-run with useRealWeather = true
        }

        // Fallback to contract data
        await fetchContractWeatherData();
      }
    } catch (err) {
      console.error("Error fetching weather bonuses:", err);
      setError("Weather data temporarily unavailable");
      await fetchContractWeatherData();
    } finally {
      setLoading(false);
      setIsFetching(false);
    }
  }, [useRealWeather, fetchContractWeatherData]);

  useEffect(() => {
    if (isConnected) {
      fetchWeatherBonuses();
      // Increase interval to 5 minutes to reduce API calls
      const interval = setInterval(fetchWeatherBonuses, 5 * 60 * 1000);
      return () => clearInterval(interval);
    }
  }, [isConnected, fetchWeatherBonuses, useRealWeather]);

  const formatBonus = (basisPoints: number): string => {
    return (basisPoints / 100).toFixed(1) + "%";
  };

  const getBonusColor = (basisPoints: number): string => {
    if (basisPoints >= 1000) return "text-green-400"; // 10%+
    if (basisPoints >= 500) return "text-yellow-400"; // 5%+
    if (basisPoints >= 200) return "text-blue-400"; // 2%+
    return "text-gray-400"; // Less than 2%
  };

  const getLastUpdateText = (timestamp: number): string => {
    if (timestamp === 0) return "Never updated";

    const now = Math.floor(Date.now() / 1000);
    const diff = now - timestamp;

    if (diff < 60) return "Just updated";
    if (diff < 3600) return `${Math.floor(diff / 60)} minutes ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`;
    return `${Math.floor(diff / 86400)} days ago`;
  };

  if (!isConnected) {
    return (
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <h3 className="text-xl font-bold text-white mb-4">
          🌤️ Weather Bonuses
        </h3>
        <p className="text-gray-400">
          Connect your wallet to see current weather bonuses
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <h3 className="text-xl font-bold text-white mb-4">
          🌤️ Weather Bonuses
        </h3>
        <div className="animate-pulse space-y-2">
          <div className="h-4 bg-gray-700 rounded"></div>
          <div className="h-4 bg-gray-700 rounded w-3/4"></div>
          <div className="h-4 bg-gray-700 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <h3 className="text-xl font-bold text-white mb-4">
          🌤️ Weather Bonuses
        </h3>
        <p className="text-red-400">{error}</p>
        <button
          onClick={fetchWeatherBonuses}
          className="mt-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!bonuses) {
    return (
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <h3 className="text-xl font-bold text-white mb-4">
          🌤️ Weather Bonuses
        </h3>
        <p className="text-gray-400">No weather bonus data available</p>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-blue-900 to-cyan-900 rounded-lg p-6 border border-blue-500">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-bold text-white">🌤️ Weather Bonuses</h3>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => {
              const newMode = !useRealWeather;
              setUseRealWeather(newMode);
              if (newMode) {
                // Only fetch if enabling real weather
                setTimeout(fetchWeatherBonuses, 100);
              }
            }}
            className={`px-3 py-1 rounded text-xs font-bold transition-colors ${
              useRealWeather
                ? "bg-green-600 text-white"
                : "bg-gray-600 text-gray-300"
            }`}
          >
            {useRealWeather ? "🌐 Real Weather" : "🔗 Contract Data"}
          </button>
          <button
            onClick={testApiConnection}
            disabled={testingConnection}
            className={`px-3 py-1 rounded text-xs font-bold transition-colors ${
              testingConnection
                ? "bg-gray-500 text-gray-300 cursor-not-allowed"
                : "bg-blue-600 text-white hover:bg-blue-700"
            }`}
          >
            {testingConnection ? "🔄 Testing..." : "🧪 Test APIs"}
          </button>
          <span className="text-sm text-blue-300">
            Updated: {getLastUpdateText(bonuses.lastUpdate)}
          </span>
        </div>
      </div>

      <div className="space-y-6">
        {/* Current Month Highlight */}
        <div className="bg-blue-500/20 border border-blue-500/50 rounded-lg p-4">
          <div className="flex items-center space-x-3">
            <span className="text-3xl">
              {SEASON_EMOJIS[MONTH_NAMES[currentMonth - 1]]}
            </span>
            <div>
              <h4 className="text-lg font-semibold text-white">
                {MONTH_NAMES[currentMonth - 1]} Bonus
              </h4>
              <p
                className={`text-2xl font-bold ${getBonusColor(
                  bonuses.seasonal[currentMonth]
                )}`}
              >
                +{formatBonus(bonuses.seasonal[currentMonth])}
              </p>
            </div>
          </div>
        </div>

        {/* Seasonal Bonuses Grid */}
        <div>
          <h4 className="text-lg font-semibold text-white mb-3">
            📅 Seasonal Bonuses
          </h4>
          <div className="grid grid-cols-3 gap-2">
            {MONTH_NAMES.map((month, index) => {
              const monthNum = index + 1;
              const bonus = bonuses.seasonal[monthNum] || 0;
              const isCurrent = monthNum === currentMonth;

              return (
                <div
                  key={month}
                  className={`p-2 rounded text-center ${
                    isCurrent
                      ? "bg-blue-500/30 border border-blue-400"
                      : "bg-gray-700/50"
                  }`}
                >
                  <div className="text-lg">{SEASON_EMOJIS[month]}</div>
                  <div className="text-xs text-gray-300">
                    {month.slice(0, 3)}
                  </div>
                  <div className={`text-sm font-bold ${getBonusColor(bonus)}`}>
                    +{formatBonus(bonus)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Location-Based Weather Bonuses */}
        <div>
          <h4 className="text-lg font-semibold text-white mb-3">
            🌍 Location Weather Bonuses
          </h4>

          {/* API Status Indicator */}
          {apiKeyStatus && (
            <div className="mb-3 p-2 rounded-lg bg-gray-700/50">
              <div className="flex justify-between items-center mb-1">
                <div className="text-xs text-gray-300">API Status:</div>
                {isFetching && (
                  <div className="text-xs text-blue-400">🔄 Fetching...</div>
                )}
                {lastFetchTime > 0 && !isFetching && (
                  <div className="text-xs text-gray-400">
                    Cached: {Math.round((Date.now() - lastFetchTime) / 60000)}m
                    ago
                  </div>
                )}
              </div>
              <div className="text-xs">
                <span
                  className={
                    apiKeyStatus.weatherxm.present
                      ? "text-green-400"
                      : "text-red-400"
                  }
                >
                  WeatherXM: {apiKeyStatus.weatherxm.present ? "✅" : "❌"}
                </span>
                {" | "}
                <span
                  className={
                    apiKeyStatus.weatherapi.present
                      ? "text-green-400"
                      : "text-red-400"
                  }
                >
                  WeatherAPI: {apiKeyStatus.weatherapi.present ? "✅" : "❌"}
                </span>
              </div>
              <div className="text-xs text-gray-400 mt-1">
                {apiKeyStatus.overall}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            {WEATHER_LOCATIONS.map((location) => {
              const bonus = bonuses.regional[location] || 0;
              const weatherInfo = weatherData[location];

              return (
                <div key={location} className="bg-gray-700/50 rounded-lg p-3">
                  <div className="flex items-center space-x-2">
                    <span className="text-xl">
                      {LOCATION_EMOJIS[location] || "🌍"}
                    </span>
                    <div className="flex-1">
                      <div className="text-white font-medium">{location}</div>
                      <div
                        className={`text-sm font-bold ${getBonusColor(bonus)}`}
                      >
                        +{formatBonus(bonus)}
                      </div>
                      {weatherInfo && useRealWeather && (
                        <div className="text-xs text-gray-400 mt-1">
                          {Math.round(weatherInfo.temperature)}°C,{" "}
                          {weatherInfo.condition}
                          <br />
                          <span
                            className={`text-xs ${
                              weatherInfo.source === "weatherxm"
                                ? "text-green-400"
                                : weatherInfo.source === "weatherapi"
                                ? "text-blue-400"
                                : "text-gray-400"
                            }`}
                          >
                            {weatherInfo.source === "weatherxm"
                              ? "🛰️ WeatherXM"
                              : weatherInfo.source === "weatherapi"
                              ? "🌐 WeatherAPI"
                              : "📍 Simulated"}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Info */}
        <div className="bg-cyan-500/20 border border-cyan-500/50 rounded-lg p-3">
          <div className="mt-4 p-3 bg-blue-900/30 rounded border border-blue-700">
            <p className="text-blue-300 text-sm">
              💡{" "}
              {useRealWeather
                ? apiKeyStatus?.weatherxm.present ||
                  apiKeyStatus?.weatherapi.present
                  ? "Real weather data provides dynamic bonuses. Data is cached for 30 minutes to minimize API usage."
                  : "Real weather mode enabled but no API keys configured. Add NEXT_PUBLIC_WEATHERXM_API_KEY or NEXT_PUBLIC_WEATHERAPI_KEY to your environment variables."
                : "Weather bonuses are automatically updated every 6 hours via Chainlink Automation. Click 'Real Weather' to use live weather data."}
            </p>
            {useRealWeather &&
              apiKeyStatus &&
              !apiKeyStatus.weatherxm.present &&
              !apiKeyStatus.weatherapi.present && (
                <div className="mt-2 p-2 bg-yellow-900/50 border border-yellow-700 rounded">
                  <p className="text-yellow-300 text-xs">
                    ⚠️ No API keys found. Add them to your .env.local file:
                    <br />
                    <code className="text-yellow-200">
                      NEXT_PUBLIC_WEATHERXM_API_KEY=your_key
                    </code>
                    <br />
                    <code className="text-yellow-200">
                      NEXT_PUBLIC_WEATHERAPI_KEY=your_key
                    </code>
                  </p>
                </div>
              )}
          </div>
        </div>
      </div>
    </div>
  );
}
