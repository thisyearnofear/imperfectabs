// WeatherXM Pro API Integration for Imperfect Abs
// Enhanced implementation with realistic coverage mapping and proper Pro API usage

interface WeatherXMProResponse {
  success: boolean;
  data?: {
    current?: {
      temperature: number;
      humidity: number;
      wind_speed: number;
      wind_direction: number;
      precipitation: number;
      uv_index: number;
      pressure: number;
      icon: string;
      timestamp: string;
    };
    location: {
      lat: number;
      lon: number;
      name: string;
      country: string;
      address?: string;
    };
    station?: {
      id: string;
      name: string;
      distance: number;
      quality: string;
    };
  };
  error?: string;
  message?: string;
}

interface WeatherBonus {
  temperature: number;
  humidity: number;
  uvIndex: number;
  condition: number;
  precipitation: number;
  total: number;
  description: string;
}

interface WeatherData {
  location: string;
  temperature: number;
  humidity: number;
  uvIndex: number;
  condition: string;
  precipitation: number;
  windSpeed: number;
  pressure?: number;
  bonus: WeatherBonus;
  timestamp: number;
  source: "weatherxm" | "fallback" | "weatherapi";
  hasStationNearby: boolean;
  stationDistance?: number;
  dataQuality: "high" | "medium" | "low";
}

interface WeatherAPIResponse {
  location: {
    name: string;
    region: string;
    country: string;
    lat: number;
    lon: number;
    tz_id: string;
    localtime_epoch: number;
    localtime: string;
  };
  current: {
    last_updated_epoch: number;
    last_updated: string;
    temp_c: number;
    temp_f: number;
    is_day: number;
    condition: {
      text: string;
      icon: string;
      code: number;
    };
    wind_mph: number;
    wind_kph: number;
    wind_degree: number;
    wind_dir: string;
    pressure_mb: number;
    pressure_in: number;
    precip_mm: number;
    precip_in: number;
    humidity: number;
    cloud: number;
    feelslike_c: number;
    feelslike_f: number;
    vis_km: number;
    vis_miles: number;
    uv: number;
    gust_mph: number;
    gust_kph: number;
  };
}

interface CachedWeatherData {
  data: WeatherData;
  expires: number;
  quality: "high" | "medium" | "low";
}

interface WeatherXMStation {
  id: string;
  name: string;
  distance: number;
  quality: string;
  status: string;
  online: boolean;
  last_update?: string;
  timestamp?: string;
  location?: {
    name?: string;
    address?: string;
    lat: number;
    lon: number;
  };
}

interface WeatherXMStationWeather {
  success: boolean;
  data?: {
    current?: {
      temperature: number;
      humidity: number;
      wind_speed: number;
      wind_direction: number;
      precipitation: number;
      uv_index: number;
      pressure: number;
      icon: string;
      timestamp: string;
    };
    station?: WeatherXMStation;
  };
  current?: {
    temperature: number;
    humidity: number;
    wind_speed: number;
    wind_direction: number;
    precipitation: number;
    uv_index: number;
    pressure: number;
    icon: string;
    timestamp: string;
  };
  station?: WeatherXMStation;
}

interface WeatherXMStationsResponse {
  success: boolean;
  data?: WeatherXMStation[];
}

class WeatherXMService {
  private apiKey = process.env.NEXT_PUBLIC_WEATHERXM_API_KEY || "";
  private fallbackApiKey = process.env.NEXT_PUBLIC_WEATHERAPI_KEY || "";
  private proApiUrl = "https://pro.weatherxm.com/api/v1";
  private fallbackUrl = "https://api.weatherapi.com/v1";
  private cache: Map<string, CachedWeatherData> = new Map();
  private cacheTimeout = 30 * 60 * 1000; // 30 minutes
  private rateLimitDelay = 1000; // 1 second between requests
  private lastRequestTime = 0;

  // Realistic WeatherXM coverage areas based on research
  private coverageRegions = {
    // Strong coverage (Europe, especially Greece)
    high: [
      "greece",
      "athens",
      "thessaloniki",
      "patras",
      "heraklion",
      "germany",
      "berlin",
      "munich",
      "hamburg",
      "cologne",
      "netherlands",
      "amsterdam",
      "rotterdam",
      "utrecht",
      "switzerland",
      "zurich",
      "geneva",
      "basel",
      "austria",
      "vienna",
      "salzburg",
      "cyprus",
      "nicosia",
      "limassol",
    ],
    // Medium coverage (Other European regions)
    medium: [
      "uk",
      "london",
      "manchester",
      "birmingham",
      "france",
      "paris",
      "lyon",
      "marseille",
      "italy",
      "rome",
      "milan",
      "naples",
      "spain",
      "madrid",
      "barcelona",
      "valencia",
      "portugal",
      "lisbon",
      "porto",
      "belgium",
      "brussels",
      "antwerp",
      "denmark",
      "copenhagen",
      "sweden",
      "stockholm",
      "gothenburg",
      "norway",
      "oslo",
      "bergen",
    ],
    // Limited coverage (select US locations)
    low: [
      "california",
      "los angeles",
      "san francisco",
      "san diego",
      "texas",
      "houston",
      "dallas",
      "austin",
      "new york",
      "brooklyn",
      "manhattan",
      "florida",
      "miami",
      "tampa",
      "orlando",
    ],
  };

  // Expanded location database with coverage indicators
  private locations = [
    // High coverage - Europe/Greece
    {
      name: "Athens",
      country: "GR",
      region: "europe",
      lat: 37.9838,
      lon: 23.7275,
      coverage: "high",
    },
    {
      name: "Thessaloniki",
      country: "GR",
      region: "europe",
      lat: 40.6401,
      lon: 22.9444,
      coverage: "high",
    },
    {
      name: "Berlin",
      country: "DE",
      region: "europe",
      lat: 52.52,
      lon: 13.405,
      coverage: "high",
    },
    {
      name: "Amsterdam",
      country: "NL",
      region: "europe",
      lat: 52.3676,
      lon: 4.9041,
      coverage: "high",
    },
    {
      name: "Zurich",
      country: "CH",
      region: "europe",
      lat: 47.3769,
      lon: 8.5417,
      coverage: "high",
    },

    // Medium coverage - Other Europe
    {
      name: "London",
      country: "UK",
      region: "europe",
      lat: 51.5074,
      lon: -0.1278,
      coverage: "medium",
    },
    {
      name: "Paris",
      country: "FR",
      region: "europe",
      lat: 48.8566,
      lon: 2.3522,
      coverage: "medium",
    },
    {
      name: "Madrid",
      country: "ES",
      region: "europe",
      lat: 40.4168,
      lon: -3.7038,
      coverage: "medium",
    },
    {
      name: "Rome",
      country: "IT",
      region: "europe",
      lat: 41.9028,
      lon: 12.4964,
      coverage: "medium",
    },
    {
      name: "Stockholm",
      country: "SE",
      region: "europe",
      lat: 59.3293,
      lon: 18.0686,
      coverage: "medium",
    },

    // Low coverage - Select US
    {
      name: "Los Angeles",
      country: "US",
      region: "north_america",
      lat: 34.0522,
      lon: -118.2437,
      coverage: "low",
    },
    {
      name: "San Francisco",
      country: "US",
      region: "north_america",
      lat: 37.7749,
      lon: -122.4194,
      coverage: "low",
    },
    {
      name: "New York",
      country: "US",
      region: "north_america",
      lat: 40.7128,
      lon: -74.006,
      coverage: "low",
    },
    {
      name: "Miami",
      country: "US",
      region: "north_america",
      lat: 25.7617,
      lon: -80.1918,
      coverage: "low",
    },

    // No coverage - Major cities (fallback only)
    {
      name: "Tokyo",
      country: "JP",
      region: "asia",
      lat: 35.6762,
      lon: 139.6503,
      coverage: "none",
    },
    {
      name: "Sydney",
      country: "AU",
      region: "oceania",
      lat: -33.8688,
      lon: 151.2093,
      coverage: "none",
    },
    {
      name: "Toronto",
      country: "CA",
      region: "north_america",
      lat: 43.6532,
      lon: -79.3832,
      coverage: "none",
    },
    {
      name: "Mumbai",
      country: "IN",
      region: "asia",
      lat: 19.076,
      lon: 72.8777,
      coverage: "none",
    },
    {
      name: "São Paulo",
      country: "BR",
      region: "south_america",
      lat: -23.5505,
      lon: -46.6333,
      coverage: "none",
    },
    {
      name: "Cairo",
      country: "EG",
      region: "africa",
      lat: 30.0444,
      lon: 31.2357,
      coverage: "none",
    },
  ];

  async getWeatherData(location?: string): Promise<WeatherData | null> {
    try {
      const targetLocation = location || this.getUserLocation() || "London";

      // Check cache first
      const cacheKey = targetLocation.toLowerCase();
      const cached = this.cache.get(cacheKey);
      if (cached && cached.expires > Date.now()) {
        return cached.data;
      }

      await this.respectRateLimit();

      let weatherData: WeatherData | null = null;
      const coverage = this.getCoverageLevel(targetLocation);

      // Try WeatherXM Pro API first if we have coverage and API key
      if (this.apiKey && coverage !== "none") {
        console.info(
          `Attempting WeatherXM Pro API for ${targetLocation} (${coverage} coverage)`
        );
        try {
          weatherData = await this.fetchFromWeatherXMPro(targetLocation);
        } catch (error) {
          console.warn(
            `WeatherXM Pro API failed for ${targetLocation}:`,
            error
          );
        }
      }

      // Always try WeatherAPI fallback if WeatherXM fails or no coverage
      if (!weatherData && this.fallbackApiKey) {
        console.info(`Using WeatherAPI.com fallback for ${targetLocation}`);
        weatherData = await this.fetchFromFallback(targetLocation);
      }

      // Final fallback to simulated data if both APIs fail
      if (!weatherData) {
        console.info(`Creating simulated weather data for ${targetLocation}`);
        weatherData = this.createFallbackWeatherData(targetLocation);
      }

      if (weatherData) {
        // Cache the result with quality indicator
        this.cache.set(cacheKey, {
          data: weatherData,
          expires: Date.now() + this.cacheTimeout,
          quality: weatherData.dataQuality,
        });
      }

      return weatherData;
    } catch (error) {
      console.error("Error fetching weather data:", error);
      return this.createFallbackWeatherData(location || "Global");
    }
  }

  private getCoverageLevel(
    location: string
  ): "high" | "medium" | "low" | "none" {
    const locationLower = location.toLowerCase();

    // Check location database first
    const locationInfo = this.getLocationInfo(location);
    if (locationInfo?.coverage) {
      return locationInfo.coverage as "high" | "medium" | "low" | "none";
    }

    // Check against coverage regions
    for (const [level, regions] of Object.entries(this.coverageRegions)) {
      if (
        regions.some(
          (region) =>
            locationLower.includes(region) || region.includes(locationLower)
        )
      ) {
        return level as "high" | "medium" | "low";
      }
    }

    return "none";
  }

  private async respectRateLimit(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;

    if (timeSinceLastRequest < this.rateLimitDelay) {
      await new Promise((resolve) =>
        setTimeout(resolve, this.rateLimitDelay - timeSinceLastRequest)
      );
    }

    this.lastRequestTime = Date.now();
  }

  private async fetchFromWeatherXMPro(
    location: string
  ): Promise<WeatherData | null> {
    try {
      if (!this.apiKey) {
        console.warn("WeatherXM Pro API key not found");
        return null;
      }

      // Step 1: Find nearby stations using Pro API
      const stations = await this.findProStations(location);

      if (!stations || stations.length === 0) {
        console.info(`No WeatherXM Pro stations found near ${location}`);
        return null;
      }

      // Step 2: Get weather from the best station
      const bestStation = this.selectBestStation(stations);
      const stationWeather = await this.getProStationWeather(bestStation.id);

      if (!stationWeather) {
        console.warn(`Failed to get weather from station ${bestStation.id}`);
        throw new Error(`No weather data from station ${bestStation.id}`);
      }

      // Step 3: Process the Pro API response
      return this.processWeatherXMProData(
        stationWeather,
        location,
        true,
        bestStation.distance
      );
    } catch (error) {
      console.error("WeatherXM Pro API error:", error);
      throw error; // Re-throw to trigger fallback
    }
  }

  private async findProStations(location: string): Promise<WeatherXMStation[]> {
    try {
      const locationInfo = this.getLocationInfo(location);
      if (!locationInfo) {
        console.warn(`Location ${location} not found in database`);
        return [];
      }

      // Use Pro API endpoint for nearby stations
      const radius = 50; // 50km radius
      const url = `${this.proApiUrl}/stations/nearby?lat=${locationInfo.lat}&lon=${locationInfo.lon}&radius=${radius}`;

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
          "User-Agent": "ImperfectAbs/1.0",
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          console.error("WeatherXM Pro API: Invalid API key");
        } else if (response.status === 429) {
          console.warn("WeatherXM Pro API: Rate limit exceeded");
        } else {
          console.error(
            `WeatherXM Pro API error: ${response.status} ${response.statusText}`
          );
        }
        return [];
      }

      const data: WeatherXMStationsResponse = await response.json();

      if (data.success && data.data && Array.isArray(data.data)) {
        return data.data
          .filter((station: WeatherXMStation) => this.isStationActive(station))
          .sort(
            (a: WeatherXMStation, b: WeatherXMStation) =>
              (a.distance || 0) - (b.distance || 0)
          )
          .slice(0, 5); // Top 5 closest stations
      }

      return [];
    } catch (error) {
      console.error("Error finding Pro API stations:", error);
      return [];
    }
  }

  private isStationActive(station: WeatherXMStation): boolean {
    // Check if station is active and has recent data
    const lastUpdate = new Date(station.last_update || station.timestamp || 0);
    const hoursSinceUpdate =
      (Date.now() - lastUpdate.getTime()) / (1000 * 60 * 60);

    return (
      station.status === "active" &&
      station.online === true &&
      hoursSinceUpdate < 24 && // Data within last 24 hours
      (station.distance || 0) < 100 // Within 100km
    );
  }

  private selectBestStation(stations: WeatherXMStation[]): WeatherXMStation {
    // Select station based on distance, data quality, and recency
    return stations.reduce((best, current) => {
      const bestScore = this.calculateStationScore(best);
      const currentScore = this.calculateStationScore(current);
      return currentScore > bestScore ? current : best;
    });
  }

  private calculateStationScore(station: WeatherXMStation): number {
    let score = 100;

    // Distance penalty (closer is better)
    const distance = station.distance || 50;
    score -= distance * 0.5;

    // Data recency bonus
    const lastUpdate = new Date(station.last_update || station.timestamp || 0);
    const hoursOld = (Date.now() - lastUpdate.getTime()) / (1000 * 60 * 60);
    score -= hoursOld * 2;

    // Quality bonus
    if (station.quality === "high") score += 20;
    else if (station.quality === "medium") score += 10;

    return Math.max(0, score);
  }

  private async getProStationWeather(
    stationId: string
  ): Promise<WeatherXMStationWeather | null> {
    try {
      const url = `${this.proApiUrl}/stations/${stationId}/current`;

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
          "User-Agent": "ImperfectAbs/1.0",
        },
      });

      if (!response.ok) {
        console.error(`Pro API station weather error: ${response.status}`);
        return null;
      }

      const data: WeatherXMStationWeather = await response.json();
      return data.success ? data : null;
    } catch (error) {
      console.error("Error fetching Pro API station weather:", error);
      return null;
    }
  }

  private async fetchFromFallback(
    location: string
  ): Promise<WeatherData | null> {
    try {
      // Check if WeatherAPI key is available
      if (!this.fallbackApiKey) {
        console.warn("WeatherAPI.com API key not found, using simulated data");
        return this.createFallbackWeatherData(location);
      }

      const locationInfo = this.getLocationInfo(location);
      let query = location;

      if (locationInfo) {
        query = `${locationInfo.lat},${locationInfo.lon}`;
      }

      const url = `${this.fallbackUrl}/current.json?key=${
        this.fallbackApiKey
      }&q=${encodeURIComponent(query)}&aqi=no`;

      const response = await fetch(url);

      if (!response.ok) {
        if (response.status === 401) {
          console.error("WeatherAPI.com: Invalid API key");
        } else if (response.status === 429) {
          console.warn("WeatherAPI.com: Rate limit exceeded");
        } else {
          console.error(
            `WeatherAPI.com error: ${response.status} ${response.statusText}`
          );
        }
        throw new Error(`WeatherAPI error: ${response.status}`);
      }

      const data: WeatherAPIResponse = await response.json();
      return this.processFallbackData(data, location);
    } catch (error) {
      console.error("Fallback weather API error:", error);
      return this.createFallbackWeatherData(location);
    }
  }

  private getLocationInfo(location: string) {
    const locationLower = location.toLowerCase();
    return this.locations.find(
      (loc) =>
        loc.name.toLowerCase() === locationLower ||
        loc.name.toLowerCase().includes(locationLower) ||
        locationLower.includes(loc.name.toLowerCase())
    );
  }

  private processWeatherXMProData(
    weather: WeatherXMStationWeather,
    location: string,
    hasStationNearby: boolean,
    stationDistance?: number
  ): WeatherData {
    const current = weather.data?.current ||
      weather.current || {
        temperature: 20,
        humidity: 50,
        wind_speed: 10,
        wind_direction: 0,
        precipitation: 0,
        uv_index: 3,
        pressure: 1013,
        icon: "partly-cloudy",
        timestamp: new Date().toISOString(),
      };
    const station = weather.data?.station || weather.station;

    const bonus = this.calculateWeatherBonus({
      temperature: current.temperature || 20,
      humidity: current.humidity || 50,
      uv_index: current.uv_index || 3,
      icon: current.icon || "partly-cloudy",
      precipitation: current.precipitation || 0,
    });

    // Determine data quality based on station distance and quality
    let dataQuality: "high" | "medium" | "low" = "medium";
    if (
      stationDistance &&
      stationDistance < 10 &&
      station?.quality === "high"
    ) {
      dataQuality = "high";
    } else if (stationDistance && stationDistance > 50) {
      dataQuality = "low";
    }

    return {
      location: location,
      temperature: current.temperature || 20,
      humidity: current.humidity || 50,
      uvIndex: current.uv_index || 3,
      condition: this.getConditionFromIcon(current.icon || "partly-cloudy"),
      precipitation: current.precipitation || 0,
      windSpeed: current.wind_speed || 10,
      pressure: current.pressure,
      bonus: bonus,
      timestamp: Date.now(),
      source: "weatherxm",
      hasStationNearby,
      stationDistance,
      dataQuality,
    };
  }

  private processFallbackData(
    data: WeatherAPIResponse,
    location: string
  ): WeatherData {
    const bonus = this.calculateWeatherBonus({
      temperature: data.current.temp_c,
      humidity: data.current.humidity,
      uv_index: data.current.uv,
      icon: data.current.condition.text.toLowerCase(),
      precipitation: data.current.precip_mm,
    });

    return {
      location: data.location.name || location,
      temperature: data.current.temp_c,
      humidity: data.current.humidity,
      uvIndex: data.current.uv,
      condition: data.current.condition.text,
      precipitation: data.current.precip_mm,
      windSpeed: data.current.wind_kph / 3.6, // Convert km/h to m/s
      pressure: data.current.pressure_mb,
      bonus: bonus,
      timestamp: Date.now(),
      source: "weatherapi" as const,
      hasStationNearby: false,
      dataQuality: "medium",
    };
  }

  private calculateWeatherBonus(weather: {
    temperature: number;
    humidity: number;
    uv_index: number;
    icon: string;
    precipitation: number;
  }): WeatherBonus {
    const tempBonus = this.calculateTemperatureBonus(weather.temperature);
    const humidityBonus = this.calculateHumidityBonus(weather.humidity);
    const uvBonus = this.calculateUVBonus(weather.uv_index);
    const conditionBonus = this.calculateConditionBonus(weather.icon);
    const precipitationBonus = this.calculatePrecipitationBonus(
      weather.precipitation
    );

    const total = Math.min(
      tempBonus + humidityBonus + uvBonus + conditionBonus + precipitationBonus,
      25 // Increased max to 25%
    );

    return {
      temperature: tempBonus,
      humidity: humidityBonus,
      uvIndex: uvBonus,
      condition: conditionBonus,
      precipitation: precipitationBonus,
      total: total,
      description: this.getBonusDescription(total, weather),
    };
  }

  private calculateTemperatureBonus(temp: number): number {
    if (temp <= -10) return 12; // Extreme cold: +12%
    if (temp <= 0) return 10; // Freezing: +10%
    if (temp >= 40) return 12; // Extreme heat: +12%
    if (temp >= 35) return 8; // Very hot: +8%
    if (temp >= 30) return 6; // Hot: +6%
    if (temp <= 5) return 6; // Very cold: +6%
    if (temp <= 10) return 3; // Cold: +3%
    if (temp >= 25) return 2; // Warm: +2%
    return 1; // Comfortable: +1%
  }

  private calculateHumidityBonus(humidity: number): number {
    if (humidity >= 90) return 8; // Extreme humidity: +8%
    if (humidity >= 80) return 6; // Very humid: +6%
    if (humidity >= 70) return 4; // Humid: +4%
    if (humidity <= 20) return 4; // Very dry: +4%
    if (humidity <= 30) return 2; // Dry: +2%
    return 1; // Normal: +1%
  }

  private calculateUVBonus(uvIndex: number): number {
    if (uvIndex >= 10) return 7; // Extreme UV: +7%
    if (uvIndex >= 8) return 5; // Very high UV: +5%
    if (uvIndex >= 6) return 3; // High UV: +3%
    if (uvIndex >= 3) return 1; // Moderate UV: +1%
    return 0; // Low UV: no bonus
  }

  private calculateConditionBonus(icon: string): number {
    const condition = icon.toLowerCase();

    if (condition.includes("thunder") || condition.includes("storm")) return 10;
    if (condition.includes("tornado") || condition.includes("hurricane"))
      return 12;
    if (condition.includes("blizzard") || condition.includes("heavy-snow"))
      return 10;
    if (condition.includes("snow")) return 8;
    if (condition.includes("heavy-rain") || condition.includes("downpour"))
      return 9;
    if (condition.includes("rain")) return 6;
    if (condition.includes("hail")) return 8;
    if (condition.includes("fog") || condition.includes("mist")) return 4;
    if (condition.includes("wind") || condition.includes("gale")) return 5;
    if (condition.includes("cloud")) return 2;
    if (condition.includes("sun") || condition.includes("clear")) return 1;

    return 2; // Default for other conditions
  }

  private calculatePrecipitationBonus(precipitation: number): number {
    if (precipitation >= 20) return 10; // Heavy precipitation: +10%
    if (precipitation >= 10) return 8; // Moderate-heavy precipitation: +8%
    if (precipitation >= 5) return 5; // Moderate precipitation: +5%
    if (precipitation >= 1) return 3; // Light precipitation: +3%
    return 0; // No precipitation: no bonus
  }

  private getBonusDescription(
    totalBonus: number,
    weather: {
      temperature?: number;
      icon?: string;
    }
  ): string {
    const temp = Math.round(weather.temperature || 20);
    const condition = this.getConditionFromIcon(weather.icon || "clear");

    if (totalBonus >= 20)
      return `Extreme conditions! ${temp}°C with ${condition}`;
    if (totalBonus >= 15) return `Harsh weather! ${temp}°C, ${condition}`;
    if (totalBonus >= 10) return `Challenging weather! ${temp}°C, ${condition}`;
    if (totalBonus >= 5) return `Moderate conditions. ${temp}°C, ${condition}`;
    return `Pleasant weather. ${temp}°C, ${condition}`;
  }

  private getConditionFromIcon(icon: string): string {
    const iconMap: { [key: string]: string } = {
      "clear-day": "Sunny",
      "clear-night": "Clear",
      clear: "Clear",
      sunny: "Sunny",
      rain: "Rainy",
      "heavy-rain": "Heavy Rain",
      snow: "Snowy",
      "heavy-snow": "Heavy Snow",
      blizzard: "Blizzard",
      sleet: "Sleet",
      hail: "Hail",
      wind: "Windy",
      gale: "Gale",
      fog: "Foggy",
      mist: "Misty",
      cloudy: "Cloudy",
      clouds: "Cloudy",
      "partly-cloudy-day": "Partly Cloudy",
      "partly-cloudy-night": "Partly Cloudy",
      thunderstorm: "Stormy",
      storm: "Stormy",
      tornado: "Tornado",
      hurricane: "Hurricane",
    };

    const key = icon.toLowerCase();
    return (
      iconMap[key] ||
      iconMap[Object.keys(iconMap).find((k) => key.includes(k)) || ""] ||
      "Mixed"
    );
  }

  private getUserLocation(): string | null {
    // Placeholder for IP-based location detection
    return "London";
  }

  private createFallbackWeatherData(location: string): WeatherData {
    // Generate realistic weather data based on season and location
    const month = new Date().getMonth() + 1;
    const locationInfo = this.getLocationInfo(location);

    let baseTemp = 20;
    let baseHumidity = 50;

    if (locationInfo) {
      // Adjust weather based on region and season
      switch (locationInfo.region) {
        case "europe":
          baseTemp =
            month <= 2 || month === 12 ? 5 : month >= 6 && month <= 8 ? 25 : 15;
          baseHumidity = 60;
          break;
        case "north_america":
          baseTemp =
            month <= 2 || month === 12 ? 0 : month >= 6 && month <= 8 ? 30 : 15;
          baseHumidity = 55;
          break;
        case "asia":
          baseTemp =
            month <= 2 || month === 12
              ? 10
              : month >= 6 && month <= 8
              ? 35
              : 25;
          baseHumidity = 70;
          break;
        case "oceania":
          // Southern hemisphere - opposite seasons
          baseTemp =
            month >= 6 && month <= 8
              ? 15
              : month <= 2 || month === 12
              ? 25
              : 20;
          baseHumidity = 65;
          break;
      }
    }

    const temperature = baseTemp + (Math.random() - 0.5) * 15;
    const humidity = Math.max(
      20,
      Math.min(95, baseHumidity + (Math.random() - 0.5) * 40)
    );
    const uvIndex = Math.max(0, Math.min(12, Math.random() * 10));

    const bonus = this.calculateWeatherBonus({
      temperature,
      humidity,
      uv_index: uvIndex,
      icon: "partly-cloudy",
      precipitation: 0,
    });

    return {
      location: location,
      temperature,
      humidity,
      uvIndex,
      condition: "Partly Cloudy",
      precipitation: 0,
      windSpeed: 5 + Math.random() * 15,
      pressure: 1013 + (Math.random() - 0.5) * 40,
      bonus,
      timestamp: Date.now(),
      source: "fallback",
      hasStationNearby: false,
      dataQuality: "low",
    };
  }

  // Public methods
  getAvailableLocations(): Array<{ name: string; coverage: string }> {
    return this.locations.map((loc) => ({
      name: loc.name,
      coverage: loc.coverage || "none",
    }));
  }

  getLocationsByRegion(): {
    [region: string]: Array<{ name: string; coverage: string }>;
  } {
    const regions: {
      [region: string]: Array<{ name: string; coverage: string }>;
    } = {};

    this.locations.forEach((loc) => {
      if (!regions[loc.region]) {
        regions[loc.region] = [];
      }
      regions[loc.region].push({
        name: loc.name,
        coverage: loc.coverage || "none",
      });
    });

    return regions;
  }

  async getMultiLocationWeather(): Promise<WeatherData[]> {
    // Use the predefined locations from WeatherBonuses component
    const targetLocations = [
      "Athens",
      "Berlin",
      "London",
      "Paris",
      "Tokyo",
      "New York",
    ];

    console.log("Fetching weather for locations:", targetLocations);

    const results = await Promise.allSettled(
      targetLocations.map(async (locationName) => {
        try {
          const weather = await this.getWeatherData(locationName);
          console.log(`Weather fetched for ${locationName}:`, weather);
          return weather;
        } catch (error) {
          console.error(`Failed to fetch weather for ${locationName}:`, error);
          return this.createFallbackWeatherData(locationName);
        }
      })
    );

    return results
      .map((result, index) => {
        if (result.status === "fulfilled" && result.value) {
          return result.value;
        }
        return this.createFallbackWeatherData(targetLocations[index]);
      })
      .filter(Boolean);
  }

  getCoverageInfo(location: string): {
    level: string;
    description: string;
    expectedQuality: string;
  } {
    const coverage = this.getCoverageLevel(location);

    const info = {
      high: {
        description:
          "Excellent WeatherXM station coverage. Premium accuracy expected.",
        expectedQuality: "high",
      },
      medium: {
        description: "Good WeatherXM station coverage. Reliable data expected.",
        expectedQuality: "medium",
      },
      low: {
        description:
          "Limited WeatherXM station coverage. May fall back to global data.",
        expectedQuality: "medium",
      },
      none: {
        description:
          "No WeatherXM station coverage. Using global weather services.",
        expectedQuality: "medium",
      },
    };

    return {
      level: coverage,
      description: info[coverage].description,
      expectedQuality: info[coverage].expectedQuality,
    };
  }

  formatBonus(bonus: number): string {
    return `+${bonus.toFixed(1)}%`;
  }

  getWeatherEmoji(condition: string): string {
    const emojiMap: { [key: string]: string } = {
      Sunny: "☀️",
      Clear: "🌙",
      Rainy: "🌧️",
      "Heavy Rain": "⛈️",
      Snowy: "❄️",
      "Heavy Snow": "🌨️",
      Blizzard: "❄️🌪️",
      Stormy: "⛈️",
      Cloudy: "☁️",
      "Partly Cloudy": "⛅",
      Foggy: "🌫️",
      Misty: "🌫️",
      Windy: "💨",
      Gale: "🌪️",
      Hail: "🧊",
      Sleet: "🌨️",
      Tornado: "🌪️",
      Hurricane: "🌀",
    };

    return emojiMap[condition] || "🌤️";
  }

  getSourceIcon(source: "weatherxm" | "fallback" | "weatherapi"): string {
    switch (source) {
      case "weatherxm":
        return "🛰️";
      case "weatherapi":
        return "🌐";
      case "fallback":
        return "📍";
      default:
        return "🌤️";
    }
  }

  getSourceDescription(
    source: "weatherxm" | "fallback" | "weatherapi",
    hasStation: boolean,
    stationDistance?: number
  ): string {
    switch (source) {
      case "weatherxm":
        if (hasStation && stationDistance !== undefined) {
          if (stationDistance < 10) {
            return `WeatherXM station ${stationDistance.toFixed(
              1
            )}km away - Excellent accuracy`;
          } else if (stationDistance < 25) {
            return `WeatherXM station ${stationDistance.toFixed(
              1
            )}km away - Good accuracy`;
          } else {
            return `WeatherXM station ${stationDistance.toFixed(
              1
            )}km away - Moderate accuracy`;
          }
        }
        return "WeatherXM Pro network data";
      case "weatherapi":
        return "WeatherAPI.com - Global weather data";
      case "fallback":
        return "Simulated weather conditions";
      default:
        return "Weather data";
    }
  }

  // Diagnostic methods for debugging
  validateApiKeys(): {
    weatherxm: { present: boolean; status: string };
    weatherapi: { present: boolean; status: string };
    overall: string;
  } {
    const weatherxmPresent = !!this.apiKey;
    const weatherapiPresent = !!this.fallbackApiKey;

    const result = {
      weatherxm: {
        present: weatherxmPresent,
        status: weatherxmPresent
          ? "API key configured - Premium weather station data available"
          : "API key missing - Will skip WeatherXM Pro API",
      },
      weatherapi: {
        present: weatherapiPresent,
        status: weatherapiPresent
          ? "API key configured - Global weather coverage available"
          : "API key missing - Will fallback to simulated data",
      },
      overall: "",
    };

    if (weatherxmPresent && weatherapiPresent) {
      result.overall = "Full coverage: Premium stations + Global fallback";
    } else if (weatherapiPresent) {
      result.overall = "Good coverage: Global weather data available";
    } else if (weatherxmPresent) {
      result.overall =
        "Limited coverage: Premium stations only, simulated fallback";
    } else {
      result.overall = "No API keys configured - Using simulated data only";
    }

    return result;
  }

  async testConnection(): Promise<{
    weatherxm: boolean;
    fallback: boolean;
    apiKey: boolean;
  }> {
    const result = {
      weatherxm: false,
      fallback: false,
      apiKey: !!this.apiKey,
    };

    console.info("Testing API connections...");
    const validation = this.validateApiKeys();
    console.info("API Key Status:", validation);

    // Test WeatherXM Pro API
    if (this.apiKey) {
      try {
        const response = await fetch(`${this.proApiUrl}/status`, {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            "Content-Type": "application/json",
          },
        });
        result.weatherxm = response.ok;
        if (response.ok) {
          console.info("✅ WeatherXM Pro API: Connection successful");
        } else {
          console.warn(
            `❌ WeatherXM Pro API: Connection failed (${response.status})`
          );
        }
      } catch (e) {
        console.warn("❌ WeatherXM Pro API: Connection failed", e);
      }
    } else {
      console.info("⚠️ WeatherXM Pro API: No API key configured");
    }

    // Test fallback API
    if (this.fallbackApiKey) {
      try {
        const response = await fetch(
          `${this.fallbackUrl}/current.json?key=${this.fallbackApiKey}&q=London&aqi=no`
        );
        result.fallback = response.ok;
        if (response.ok) {
          console.info("✅ WeatherAPI.com: Connection successful");
        } else {
          console.warn(
            `❌ WeatherAPI.com: Connection failed (${response.status})`
          );
        }
      } catch (e) {
        console.warn("❌ WeatherAPI.com: Connection failed", e);
      }
    } else {
      console.warn(
        "⚠️ WeatherAPI.com: No API key configured - Will use simulated data"
      );
      result.fallback = false;
    }

    return result;
  }

  clearCache(): void {
    this.cache.clear();
    console.info("WeatherXM cache cleared");
  }

  getCacheStats(): {
    size: number;
    entries: Array<{ location: string; quality: string; age: number }>;
  } {
    const entries = Array.from(this.cache.entries()).map(
      ([location, data]) => ({
        location,
        quality: data.quality,
        age: Math.round(
          (Date.now() - data.expires + this.cacheTimeout) / 1000 / 60
        ), // minutes
      })
    );

    return {
      size: this.cache.size,
      entries,
    };
  }
}

// Export singleton instance
export const weatherXM = new WeatherXMService();
export type { WeatherData, WeatherBonus, WeatherXMProResponse };
