# Imperfect Abs - AI-Powered Fitness Tracker 💪⛓️

Part of the **Imperfect Fitness Ecosystem** - A lightweight, browser-based fitness tracking application that uses AI pose detection to count and analyze abs exercises with real-time form feedback. Built with Next.js, TypeScript, MediaPipe for pose estimation, and integrated with Avalanche blockchain and Chainlink Functions for enhanced analysis.

## 🌐 **Live Deployment**
- **Contract Address**: `0xFBE99DcD3b2d93b1c8FFabC26427383dAAbA05d1`
- **Network**: Avalanche Fuji C-Chain (ChainID: 43113)
- **Snowtrace**: [View Contract](https://testnet.snowtrace.io/address/0xFBE99DcD3b2d93b1c8FFabC26427383dAAbA05d1)

## 🌟 Features

### ✅ **Live Features**
- **Real-time Pose Detection**: Uses MediaPipe to detect body posture through webcam
- **Abs Exercise Tracking**: Specifically optimized for sit-ups and crunches
- **Form Analysis**: Real-time feedback on exercise form accuracy (0-100%)
- **Rep Counting**: Automatic counting of repetitions with angle-based detection
- **Streak Tracking**: Monitors consecutive good-form exercises
- **Session Statistics**: Tracks total reps, average form, best streak, and duration
- **Blockchain Integration**: Live smart contract on Avalanche Fuji Testnet
- **Wallet Connection**: MetaMask/Core Wallet integration for Avalanche
- **On-Chain Leaderboard**: Decentralized leaderboard with tamper-proof metrics
- **Ecosystem Navigation**: Connect to sister apps (ImperfectCoach, ImperfectForm, ImperfectBreath)

### 🚀 **Advanced Features**
- 🔗 **Avalanche C-Chain**: Live deployment on Fuji Testnet with sub-second finality
- 🤖 **Chainlink Functions**: AI-enhanced form analysis using off-chain computation
- 🎯 **Multi-Chain Ecosystem**: Part of 4-app fitness ecosystem across multiple networks
- 🏆 **Smart Contract Rewards**: Fee distribution and reward system
- 🎨 **Bauhaus-Brutalist Design**: Unique design system for memorable UX

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Webcam access for pose detection

### Installation

1. **Get test AVAX**: Visit [Avalanche Faucet](https://faucet.avax.network/) to get test tokens

2. **Clone and install dependencies:**
```bash
git clone <repository-url>
cd imperfect-abs
npm install
```

2. **Start development server:**
```bash
npm run dev
```

3. **Open in browser:**
```
http://localhost:3000
```

4. **Grant camera permissions** when prompted for pose detection to work.

5. **Connect wallet** to Avalanche Fuji Testnet to submit scores to blockchain

## 🎯 How to Use

### Workout Mode
1. **Connect Wallet** to Avalanche Fuji Testnet
2. Click "Start Workout" to initialize camera and pose detection
3. Position yourself so your full torso is visible in the frame
4. Lie down for sit-ups or position for crunches
5. The app will automatically:
   - Count your repetitions
   - Analyze your form (green = excellent, yellow = good, red = needs improvement)
   - Track your streak of good-form exercises
   - Display real-time angle measurements
   - Store pose data for Chainlink AI analysis
6. **Submit to Blockchain** after completing your workout

### Blockchain Integration
- **Wallet Connection**: Connect MetaMask or Core Wallet to Avalanche Fuji
- **On-Chain Submission**: Submit workout sessions to smart contract (0.01 AVAX fee)
- **Leaderboard**: View live blockchain leaderboard with verified scores
- **Cooldown System**: 60-second cooldown between submissions to prevent spam
- **Rewards**: Fee distribution system rewards top performers

### Chainlink Functions (AI Enhancement)
- **Enhanced Analysis**: Request AI-powered form analysis using Chainlink Functions
- **OpenAI Integration**: GPT-4 analyzes pose data for advanced form scoring
- **Off-Chain Computation**: Complex AI analysis without high gas costs
- **Verified Results**: AI scores returned and stored on-chain via Chainlink oracles

### Form Guidelines
- **Sit-ups**: Full range from lying down (>105°) to sitting up (<55°)
- **Crunches**: Partial range focusing on abdominal contraction
- **Form Score**: Based on consistent angle ranges and smooth movement
- **AI Enhancement**: Chainlink Functions provide advanced biomechanical analysis
- **Streak Bonus**: Requires 80%+ form accuracy to maintain streak

### Ecosystem Navigation
- **ImperfectCoach** (Base Sepolia): Pull-ups & Jumps tracking
- **ImperfectForm** (Multi-chain): Comprehensive form analysis 
- **ImperfectBreath** (Lens/Flow/Base): Breathing & mindfulness
- **ImperfectAbs** (Avalanche): Abs & core exercises ← Current app

## 🏗️ Technical Architecture

### Core Technologies
- **Next.js 15**: React framework with App Router
- **TypeScript**: Type-safe development
- **Tailwind CSS**: Utility-first styling with custom Bauhaus-Brutalist design system
- **MediaPipe**: Google's ML solution for pose detection
- **Canvas API**: Real-time pose visualization
- **Ethers.js**: Ethereum/Avalanche blockchain interaction
- **Avalanche C-Chain**: Fast, low-cost blockchain for leaderboard storage
- **Chainlink Functions**: Decentralized off-chain computation for AI analysis

### Key Components

#### `AbsExerciseTracker.tsx`
- Main workout interface with webcam integration
- Real-time pose detection and exercise analysis
- Session statistics and streak management
- Blockchain wallet connection and transaction handling
- Pose data collection for Chainlink analysis

#### `pose-detection.ts`
- MediaPipe integration and pose analysis logic
- Angle calculations for abs exercises
- Form accuracy algorithms

#### `contract.ts`
- Avalanche blockchain integration
- Smart contract interaction functions
- Wallet connection and network switching
- Event subscription and transaction handling

#### `ChainlinkEnhancement.tsx`
- Chainlink Functions integration for AI analysis
- Enhanced form scoring using off-chain computation
- Request tracking and status management

#### `Leaderboard.tsx`
- Live blockchain leaderboard display
- On-chain statistics visualization
- Multi-chain ecosystem integration

#### `EcosystemNav.tsx`
- Navigation between sister apps
- Cross-app discovery and branding
- Network and status indicators

### Exercise Detection Algorithm

The app uses trigonometric calculations on MediaPipe pose landmarks:

```typescript
// Key body points for abs exercises
const shoulders = average(leftShoulder, rightShoulder)
const hips = average(leftHip, rightHip) 
const knees = average(leftKnee, rightKnee)

// Calculate torso angle
const angle = calculateAngle(shoulders, hips, knees)

// Exercise state logic
if (angle < 55°) → "up" position (crunch/sit-up top)
if (angle > 105°) → "down" position (lying flat)
```

Form accuracy is calculated based on:
- Angle consistency within target ranges
- Smooth movement transitions
- Proper body alignment visibility

## 🔧 Development

### Available Scripts

```bash
npm run dev          # Start development server with Turbopack
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run type-check   # TypeScript type checking
npm run preview      # Build and start production preview
```

### Project Structure

```
src/
├── app/
│   ├── globals.css          # Global styles
│   ├── layout.tsx           # Root layout
│   └── page.tsx             # Main page with navigation
├── components/
│   ├── AbsExerciseTracker.tsx  # Main workout component
│   └── Leaderboard.tsx      # Leaderboard component
├── lib/
│   └── pose-detection.ts    # MediaPipe integration
└── types/
    └── mediapipe.d.ts       # TypeScript declarations
```

### MediaPipe Integration

The app dynamically imports MediaPipe modules to avoid SSR issues:

```typescript
// Dynamic imports for browser compatibility
const { Pose } = await import("@mediapipe/pose");
const { Camera } = await import("@mediapipe/camera_utils");
```

## 🌐 Future Blockchain Integration

### 🔗 **Live Blockchain Integration**

#### Avalanche C-Chain (Fuji Testnet)
- **Contract**: `0xFBE99DcD3b2d93b1c8FFabC26427383dAAbA05d1`
- **Network**: Fuji Testnet (ChainID: 43113)
- **RPC**: `https://api.avax-test.network/ext/bc/C/rpc`
- **Explorer**: [Snowtrace](https://testnet.snowtrace.io/address/0xFBE99DcD3b2d93b1c8FFabC26427383dAAbA05d1)
- **Submission Fee**: 0.01 AVAX per workout session
- **Cooldown**: 60 seconds between submissions

#### Chainlink Functions Integration
- **Router**: `0xA9d587a00A31A52Ed70D6026794a8FC5E2F5dCb0` (Fuji)
- **DON ID**: `fun-avalanche-fuji-1`
- **AI Provider**: OpenAI GPT-4 for enhanced form analysis
- **Analysis**: Advanced biomechanical assessment of pose data

### Deployed Features
```
✅ Smart contract deployed and verified
✅ Wallet connection (MetaMask/Core)
✅ On-chain workout submission
✅ Live leaderboard with rankings
✅ Fee distribution system
✅ Cooldown management
✅ Chainlink Functions ready for AI enhancement
✅ Event subscription for real-time updates
```

### Ecosystem Integration
- **Multi-Chain Strategy**: Each app optimized for specific blockchain
- **Shared Branding**: Consistent "Imperfect" identity across apps
- **Cross-App Discovery**: Ecosystem navigation for user acquisition
- **Unified Scoring**: Potential for ecosystem-wide fitness rankings

## 🎨 Design Philosophy

### Lightweight Approach
- **Browser-only**: No heavy Python/OpenCV installations required
- **Client-side Processing**: Real-time analysis without server dependency
- **Progressive Enhancement**: Works offline, enhanced with blockchain features

### User Experience
- **Immediate Feedback**: Real-time form analysis and rep counting
- **Gamification**: Streaks, achievements, and competitive blockchain leaderboard
- **Accessibility**: Clear visual indicators and intuitive controls
- **Web3 Integration**: Seamless wallet connection and blockchain interaction
- **Cross-App Discovery**: Easy navigation to sister apps in ecosystem

## 🔒 Privacy & Security

- **Local Processing**: All pose detection happens in your browser
- **Blockchain Storage**: Only aggregated workout metrics stored on-chain
- **Camera Privacy**: Webcam access only during active workout sessions
- **Wallet Security**: Connect-only design, no private key exposure
- **Smart Contract**: Auditable code with emergency controls and access management
- **Chainlink Security**: Decentralized oracle network for AI computation integrity

## 🚧 Known Limitations

- **Lighting Dependency**: Requires good lighting for accurate pose detection
- **Camera Angle**: Best results with camera positioned to show full torso
- **Exercise Types**: Currently optimized for abs exercises only
- **Browser Support**: Modern browsers with WebRTC support required
- **Network Dependency**: Requires Avalanche Fuji testnet connection for blockchain features
- **Wallet Required**: MetaMask or Core Wallet needed for on-chain submission
- **AVAX Needed**: Small amount of test AVAX required for transaction fees

## 🤝 Contributing

This project is designed for hackathons and educational purposes. Key areas for contribution:

1. **Exercise Types**: Add push-ups, squats, etc.
2. **Chainlink Functions**: Complete AI enhancement integration with LINK tokens
3. **NFT Achievements**: Mint achievement tokens for milestones
4. **Cross-Chain**: Bridge to other networks in ecosystem
5. **AI Agent**: Autonomous analysis and recommendations
6. **Mobile App**: React Native version for better camera integration

## 📜 License

MIT License - Built for educational and hackathon purposes.

## 🙏 Acknowledgments

- **Avalanche**: For sponsoring the hackathon and providing fast, low-cost blockchain infrastructure
- **Chainlink**: For enabling decentralized AI computation through Chainlink Functions
- **MediaPipe Team**: For the amazing pose detection technology
- **Sport-With-AI**: Inspiration from [Furkan-Gulsen/Sport-With-AI](https://github.com/Furkan-Gulsen/Sport-With-AI)
- **Next.js Team**: For the excellent React framework
- **OpenAI**: For GPT-4 integration in Chainlink Functions

## 🌐 **Ecosystem Links**

- **ImperfectCoach**: [imperfectcoach.netlify.app](https://imperfectcoach.netlify.app) (Base Sepolia)
- **ImperfectForm**: [imperfectform.fun](https://imperfectform.fun) (Multi-chain)
- **ImperfectBreath**: [imperfectbreath.netlify.app](https://imperfectbreath.netlify.app) (Lens/Flow/Base)

---

**Part of the Imperfect Fitness Ecosystem** 💪⛓️🤖

*Building the future of decentralized fitness with Avalanche + Chainlink*

**Contract**: `0xFBE99DcD3b2d93b1c8FFabC26427383dAAbA05d1` | **Network**: Avalanche Fuji | **Hackathon**: Avalanche + Chainlink