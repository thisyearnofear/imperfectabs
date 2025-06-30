# Imperfect Abs - AI-Powered Fitness Platform with Weather-Enhanced Scoring 💪🌤️🤖

A **cutting-edge fitness platform** that combines real-time AI pose detection with blockchain scoring, weather-enhanced bonuses, and advanced AI coaching. Built with **MediaPipe**, **Avalanche blockchain**, **Chainlink Automation**, and **WeatherXM integration**.

## 🌟 Core Features

### 🤖 **Advanced AI Analysis**
- **Real-time Pose Detection**: MediaPipe-powered form analysis with live feedback
- **AI Coaching**: Intelligent rep counting and form corrections
- **Performance Analytics**: Detailed workout analysis and improvement suggestions
- **Exercise Recognition**: Automatic detection of ab exercises (crunches, sit-ups, planks)

### 🌤️ **Dynamic Weather Bonuses** ⭐ *NEW*
- **Real Weather Integration**: Live weather data from WeatherXM Pro API and WeatherAPI.com
- **Seasonal Bonuses**: 2-10% bonus based on current month (winter = higher rewards)
- **Location-Based Bonuses**: 3-12% bonus based on current weather conditions
- **Extreme Weather Rewards**: Up to 25% bonus for challenging conditions (storms, extreme temperatures)
- **Smart Caching**: 30-minute cache system to minimize API costs

### ⛓️ **Blockchain-Powered Scoring**
- **Transparent Leaderboard**: All scores verified on Avalanche blockchain
- **Smart Contracts**: Automated scoring and reward distribution
- **Chainlink Automation**: Weather bonuses updated every 6 hours
- **Chainlink VRF**: Cryptographically secure random daily challenges
- **Fair Competition**: Tamper-proof scoring system

### 🎯 **Gamified Experience**
- **Real-time Feedback**: Instant form corrections during workouts
- **Daily Challenges**: Chainlink VRF-powered random challenges with bonus rewards
- **Achievement System**: Unlock rewards based on performance
- **Global Leaderboard**: Compete with users worldwide

## 🏗️ Technical Architecture

```
Frontend (React + MediaPipe) → Smart Contract (Avalanche) → Chainlink Automation
         ↓                            ↓                           ↓
    Pose Detection               Blockchain Scoring          Weather Data Sync
         ↓                            ↓                           ↓
    Rep Counting                Enhanced Scoring            Dynamic Bonuses
         ↓                            ↓                           ↓
    Form Analysis               Leaderboard Update          Reward Distribution
```

### 🌐 **Weather Integration**
```
WeatherXM Pro API (Premium Stations) → WeatherAPI.com (Global) → Simulated Data
         ↓                                    ↓                        ↓
   Europe Coverage                    Worldwide Coverage         Emergency Fallback
         ↓                                    ↓                        ↓
   High Accuracy                     Reliable Data               Seasonal Patterns
```

## 🚀 Production Ready Features

### ✅ **Live on Avalanche Fuji**
- **Contract**: `0x060F0F142D5BfC721a7C53D00B4bAD77Ad82C776`
- **Network**: Avalanche Fuji C-Chain (ChainID: 43113)
- **Explorer**: [View on Snowtrace](https://testnet.snowtrace.io/address/0x060F0F142D5BfC721a7C53D00B4bAD77Ad82C776)

### 🔧 **Advanced Integrations**
- **Chainlink Automation**: Automated weather updates every 6 hours
- **Chainlink VRF**: Verifiable random daily challenges and rewards
- **WeatherXM Pro**: Premium weather station data (Europe focus)
- **WeatherAPI.com**: Global weather coverage with 99.9% uptime
- **Smart Caching**: Optimized API usage with 30-minute cache

## 🎮 How to Use

### 🏃‍♂️ **Start Working Out**
1. **Connect Wallet**: MetaMask + Avalanche Fuji testnet
2. **Allow Camera**: Enable webcam for pose detection
3. **Choose Exercise**: Select abs workout type
4. **Get Positioned**: Follow on-screen pose guide
5. **Start Exercising**: AI tracks your form and counts reps
6. **Submit Score**: Pay small fee to record on blockchain

### 🌤️ **Weather Bonuses & Daily Challenges**
- **Automatic**: Seasonal bonuses apply automatically
- **Real Weather**: Toggle for live weather bonuses
- **Daily Challenges**: Random VRF-generated challenges with bonus multipliers
- **API Status**: See which weather services are active
- **Cache Info**: Check when weather data was last updated

### 🏆 **Earning Rewards**
- **Base Score**: Calculated from reps, form, and duration
- **Weather Bonus**: 2-25% additional based on conditions
- **Leaderboard**: Top performers earn automatic AVAX rewards
- **60% Revenue Share**: Platform fees distributed to winners

## 🛠️ Quick Start

### Prerequisites
- Node.js 18+
- MetaMask wallet
- Webcam access
- Test AVAX from [Avalanche Faucet](https://faucet.avax.network/)

### Installation
```bash
git clone <repository-url>
cd imperfect-abs
npm install
npm run dev
```

### Environment Setup
```bash
# Create .env.local file with:

# Weather APIs (at least one required for weather bonuses)
NEXT_PUBLIC_WEATHERXM_API_KEY=your_weatherxm_pro_key
NEXT_PUBLIC_WEATHERAPI_KEY=your_weatherapi_key

# Blockchain (optional - defaults to public RPC)
NEXT_PUBLIC_AVALANCHE_RPC_URL=your_rpc_url
```

### Weather API Setup
1. **WeatherAPI.com** (Recommended):
   - Sign up at [weatherapi.com](https://www.weatherapi.com/)
   - Get free API key (1M calls/month)
   - Add to `NEXT_PUBLIC_WEATHERAPI_KEY`

2. **WeatherXM Pro** (Optional - Premium):
   - Sign up at [pro.weatherxm.com](https://pro.weatherxm.com)
   - Best for European users
   - Add to `NEXT_PUBLIC_WEATHERXM_API_KEY`

## 🌍 Weather Coverage

| Region | WeatherXM Coverage | WeatherAPI Coverage | Recommended Setup |
|--------|-------------------|-------------------|------------------|
| **Europe** | 🟢 Excellent | 🟢 Excellent | Both APIs for best experience |
| **North America** | 🟡 Limited | 🟢 Excellent | WeatherAPI.com sufficient |
| **Asia/Africa/Oceania** | 🔴 None | 🟢 Excellent | WeatherAPI.com required |

## 📊 Weather Bonus System

### 🗓️ **Seasonal Bonuses** (Always Active)
- **Winter** (Dec-Feb): +10% - Reward for cold weather workouts
- **Summer** (Jun-Aug): +8% - Hot weather challenge bonus  
- **Spring/Fall** (Mar-May, Sep-Nov): +2-5% - Moderate conditions
- **Current Month Highlighted**: Extra motivation display

### 🌤️ **Real Weather Bonuses** (API Required)
- **Temperature**: +1-12% based on extremes (-10°C to +40°C)
- **Humidity**: +1-8% for challenging conditions (>80% or <30%)
- **UV Index**: +1-7% for high UV exposure (8+ index)
- **Precipitation**: +3-10% for rain, snow, storms
- **Severe Weather**: +10-12% for hurricanes, tornadoes, blizzards

## 🔍 Weather Data Sources

### 🛰️ **WeatherXM Pro** (Premium)
- **Type**: Decentralized weather station network
- **Coverage**: Europe (Greece, Germany, Netherlands focus)
- **Quality**: High - Direct from weather stations
- **Cost**: Paid service with various tiers
- **Best for**: European users wanting premium accuracy

### 🌐 **WeatherAPI.com** (Global)
- **Type**: Professional weather service
- **Coverage**: 200+ countries worldwide
- **Quality**: High - Reliable global data
- **Cost**: Free tier (1M calls/month)
- **Best for**: Global coverage and reliability

### 📍 **Simulated Fallback**
- **Type**: Seasonal weather patterns
- **Coverage**: Worldwide
- **Quality**: Basic - Pattern-based estimates
- **Cost**: Free
- **Used when**: No API keys configured

## 🧪 Testing Your Setup

Run the built-in weather API test:
```bash
node test-weather-api.js
```

Or use the in-app testing:
1. Go to Weather Bonuses section
2. Click "🧪 Test APIs" button
3. Check API connection status
4. Toggle "🌐 Real Weather" to see live data

## 🏆 Leaderboard & Rewards

### 📈 **Scoring System**
- **Base Score**: Reps × Form Quality × Duration
- **Weather Multiplier**: 1.02x to 1.25x based on conditions
- **Final Score**: Base × Weather Multiplier

### 💰 **Reward Distribution**
- **Entry Fee**: 0.01 AVAX per submission
- **Platform Fee**: 40% for development
- **Rewards Pool**: 60% distributed to top performers
- **Payout**: Automatic via smart contract

### 🥇 **Leaderboard Tiers**
- **🥇 Gold (Top 10%)**: Highest reward share
- **🥈 Silver (Top 25%)**: Medium reward share  
- **🥉 Bronze (Top 50%)**: Small reward share
- **🏅 Participation**: Points for future seasons

## 🔒 Security & Decentralization

### ⛓️ **Blockchain Security**
- **Immutable Scores**: All results stored on Avalanche
- **Transparent Logic**: Open-source smart contracts
- **Automated Payouts**: No human intervention required
- **Chainlink Oracles**: Reliable weather data feeds

### 🔐 **Privacy Protection**
- **Local Processing**: Pose detection runs in your browser
- **No Video Storage**: Camera data never leaves your device
- **Minimal Data**: Only scores and timestamps stored
- **User Control**: Full control over data sharing

## 📱 Device Compatibility

### 💻 **Desktop**
- **Chrome/Edge**: ✅ Excellent performance
- **Firefox**: ✅ Good performance  
- **Safari**: ✅ Good performance

### 📱 **Mobile**
- **Android Chrome**: ✅ Good performance
- **iOS Safari**: ⚠️ Limited (WebGL constraints)
- **Recommended**: Desktop for best experience

### 📷 **Camera Requirements**
- **Resolution**: 640x480 minimum
- **Frame Rate**: 15+ FPS recommended
- **Lighting**: Good lighting for accurate detection
- **Position**: Full body visible in frame

## 🏗️ Chainlink Infrastructure

### 🤖 **Core Contract System**
- **Main Contract**: `ImperfectAbs.sol` - Core fitness scoring and leaderboard
- **Automation Service**: Weather data updates every 6 hours via Chainlink Keepers
- **VRF Service**: Daily challenges generated with verifiable randomness
- **Functions Service**: AI-enhanced scoring (configurable for future GPT integration)

### 🔗 **Chainlink Integrations**
- **Chainlink Automation**: 
  - Weather bonus updates every 6 hours
  - Automatic leaderboard maintenance
  - Reward distribution scheduling
- **Chainlink VRF v2**:
  - Cryptographically secure random daily challenges
  - Fair challenge type and difficulty selection
  - Bonus multiplier randomization
- **Chainlink Functions** (Ready):
  - Encrypted API key management for AI services
  - Secure off-chain computation integration
  - Prepared for GPT-4 coaching features

### 🎯 **Daily Challenge System**
- **Challenge Types**: Reps, Duration, Streak, Accuracy, Combo challenges
- **VRF Generation**: New challenge every 24 hours with verifiable randomness
- **Bonus Rewards**: 5-50% score multipliers for challenge completion
- **Fair Distribution**: No central authority can manipulate challenge generation

### 🌤️ **Weather Oracle Integration**
- **Multi-Source Data**: WeatherXM Pro + WeatherAPI.com redundancy
- **Automated Updates**: Chainlink Automation triggers weather data refresh
- **Global Coverage**: Fallback systems ensure worldwide functionality
- **Cost Optimization**: Smart caching reduces oracle call frequency

### 🚧 **Future Enhancements**
- [ ] OpenAI GPT-4 integration via Chainlink Functions
- [ ] Cross-chain expansion using Chainlink CCIP
- [ ] Additional oracle data sources (fitness metrics, health data)
- [ ] Enhanced VRF features (tournament brackets, seasonal events)

## 📊 Technical Specifications

### 🔧 **Frontend Stack**
- **Framework**: Next.js 15 with Turbopack
- **AI**: MediaPipe Pose Detection
- **Blockchain**: ethers.js + MetaMask
- **UI**: Tailwind CSS + React Components
- **State**: React Hooks + Local Storage

### ⛓️ **Blockchain Stack**
- **Network**: Avalanche Fuji Testnet
- **Language**: Solidity 0.8.19
- **Tools**: Hardhat + Chainlink Functions
- **Automation**: Chainlink Keepers for weather updates
- **Randomness**: Chainlink VRF v2 for daily challenges
- **Oracles**: Multi-source weather data integration

### 🌐 **Weather Integration**
- **Primary**: WeatherAPI.com REST API
- **Premium**: WeatherXM Pro API
- **Caching**: In-memory with 30-minute TTL
- **Fallback**: Seasonal simulation algorithms

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📄 License

MIT License - Built for educational and hackathon purposes.

## 🆘 Support

- **Documentation**: Check `/docs` folder for detailed guides
- **Issues**: Report bugs via GitHub Issues
- **Discord**: Join our development community
- **Email**: Contact team for urgent issues

---

**Built with ❤️ for the decentralized fitness revolution**

*Combining cutting-edge AI, real-time weather data, and blockchain technology to create the future of fitness.*