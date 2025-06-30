# Chainlink Functions for Imperfect Abs

This directory contains Chainlink Functions code for weather-enhanced fitness scoring in the Imperfect Abs application.

## Overview

Chainlink Functions enables our smart contract to securely connect to external weather APIs and perform context-aware scoring that cannot be replicated on the frontend.

## Current Setup

- **Subscription ID**: 15675
- **Network**: Avalanche Fuji Testnet
- **Router**: `0xA9d587a00A31A52Ed70D6026794a8FC5E2F5dCb0`
- **DON ID**: `fun-avalanche-fuji-1`
- **Contract**: `0x060F0F142D5BfC721a7C53D00B4bAD77Ad82C776`

## Functions

### `weather-enhanced-scoring.js`

Fetches real-time weather data and applies context-aware scoring multipliers including:

- **Cold Weather Bonus**: 15-20% bonus for workouts in freezing/cold conditions
- **Hot Weather Bonus**: 5-10% bonus for staying active in high temperatures
- **Precipitation Bonus**: 15% bonus for working out during rain/snow
- **Storm Bonus**: 25% bonus for maintaining fitness routine during storms

#### Input Parameters

```javascript
args[0] = reps; // Number of repetitions (0-500)
args[1] = formAccuracy; // Form accuracy percentage (0-100)
args[2] = duration; // Workout duration in seconds (0-3600)
args[3] = latitude; // Latitude coordinate (decimal string)
args[4] = longitude; // Longitude coordinate (decimal string)
```

#### Weather Scoring Logic

- **< 32°F**: 20% bonus (freezing weather)
- **32-45°F**: 15% bonus (cold weather)
- **> 90°F**: 10% bonus (hot weather)
- **> 85°F**: 5% bonus (warm weather)
- **Rain/Snow**: 15% minimum bonus
- **Storms**: 25% minimum bonus

#### Output Format

Returns enhanced score as string for simple contract parsing:

```
"102" // Enhanced score (base score * weather multiplier)
```

## WeatherXM Integration

The function uses WeatherXM's DePIN network for hyperlocal weather data:

1. **Get API Key**: https://pro.weatherxm.com/
2. **Add to Secrets**: `WEATHERXM_API_KEY=your_key_here`
3. **Upload Secret**: Use Chainlink Functions secrets management
4. **Test Integration**: Submit workout with latitude/longitude coordinates

### Why WeatherXM?

- **8,500+ community-owned weather stations** worldwide
- **Hyperlocal accuracy** vs traditional weather APIs
- **Web3-native** weather oracle built for blockchain
- **DePIN network** providing real-time, verified weather data

## Testing Functions

### Local Testing

```bash
# Test weather function logic locally
node functions/weather-enhanced-scoring.js
```

### On-Chain Testing

```bash
# Send test request through smart contract
node scripts/test-user-flow.cjs
```

## Deployment Process

1. **Upload Function Code**: Use Chainlink Functions toolkit
2. **Set Weather API Secret**: Upload encrypted OpenWeatherMap API key
3. **Test Request**: Send test request from contract with location
4. **Monitor Performance**: Check function execution logs

## Weather Integration Benefits

- **External Data**: Cannot be replicated on frontend
- **Real-time Context**: Dynamic scoring based on current conditions
- **User Engagement**: Encourages consistency regardless of weather
- **Gamification**: Weather challenges and seasonal bonuses

## Hackathon Features

### Technical Innovation

- ✅ Chainlink Functions integration
- ✅ External weather API integration
- ✅ Context-aware scoring algorithms
- ✅ Real-time environmental data

### User Value

- ✅ Weather-aware fitness motivation
- ✅ Fair scoring across conditions
- ✅ Seasonal engagement features
- ✅ Location-based personalization

## Next Steps

1. **Add Consumer**: Add contract address to subscription 15675
2. **Get Weather API Key**: Obtain OpenWeatherMap API key
3. **Test Integration**: Send test requests with location data
4. **CCIP Integration**: Add cross-chain fitness aggregation
5. **Enhanced Weather**: Add air quality, UV index, etc.

## Useful Links

- [Chainlink Functions Docs](https://docs.chain.link/chainlink-functions)
- [Subscription Management](https://functions.chain.link/fuji/15675)
- [OpenWeatherMap API](https://openweathermap.org/api)
- [Contract on Snowtrace](https://testnet.snowtrace.io/address/0x060F0F142D5BfC721a7C53D00B4bAD77Ad82C776)
