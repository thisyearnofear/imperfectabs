# Hackathon Demo Guide - Imperfect Abs

## 🏆 **Avalanche + Chainlink Hackathon Submission**

**Project**: Imperfect Abs - AI-Powered Fitness Tracker with Blockchain Integration
**Team**: Imperfect Fitness Ecosystem
**Networks**: Avalanche Fuji Testnet + Chainlink Functions
**Contract**: `0xFBE99DcD3b2d93b1c8FFabC26427383dAAbA05d1`

---

## 🎯 **How to Use**

### Workout Mode

1.  **Connect Wallet** to Avalanche Fuji Testnet.
2.  Click "Start Workout" to initialize the camera and pose detection.
3.  Position yourself so your full torso is visible in the frame.
4.  The app will automatically count your reps, analyze your form, and track your streak.
5.  After your workout, you can submit your score to the blockchain and request an AI-enhanced analysis via Chainlink Functions.

### Blockchain Integration

- **On-Chain Submission**: Submit workout sessions to the smart contract (requires a small amount of test AVAX).
- **Leaderboard**: View the live, on-chain leaderboard with verified scores.
- **Rewards (Roadmap)**: The smart contract is set up to collect fees for a future reward distribution system.

### Chainlink Functions (AI Enhancement)

- **Enhanced Analysis**: Request AI-powered form analysis using Chainlink Functions.
- **OpenAI Integration**: GPT-4 analyzes your pose data for an advanced form score.
- **Verified Results**: AI scores are returned and stored on-chain via Chainlink oracles, ensuring a tamper-proof result.

---

## 🏗️ **Technical Architecture**

### Core Technologies

- **Next.js 15**: React framework with App Router.
- **TypeScript**: For type-safe development.
- **Tailwind CSS**: Utility-first styling with a custom Bauhaus-Brutalist design system.
- **MediaPipe**: Google's ML solution for real-time pose detection.
- **Ethers.js**: For all blockchain interactions.
- **Avalanche C-Chain**: The fast, low-cost blockchain for our leaderboard.
- **Chainlink Functions**: For decentralized, off-chain computation of AI analysis.

### Key Components

- **`ImprovedWorkoutTracker.tsx`**: The main workout interface, handling camera integration, pose detection, and session management.
- **`pose-detection.ts`**: The core logic for MediaPipe integration, angle calculations, and form accuracy algorithms.
- **`contract.ts`**: Handles all Avalanche blockchain interactions, including wallet connections and smart contract calls.
- **`ChainlinkEnhancement.tsx`**: Manages the Chainlink Functions integration for AI analysis.
- **`Leaderboard.tsx`**: Displays the live, on-chain leaderboard.

### Exercise Detection Algorithm

The app uses trigonometric calculations on MediaPipe pose landmarks to determine the angle of the user's torso. This angle is then used to detect sit-ups and crunches and to calculate a real-time form accuracy score.

```typescript
// Key body points for abs exercises
const shoulders = average(leftShoulder, rightShoulder);
const hips = average(leftHip, rightHip);
const knees = average(leftKnee, rightKnee);

// Calculate torso angle
const angle = calculateAngle(shoulders, hips, knees);

// Exercise state logic
if (angle < 55°) → "up" position (crunch/sit-up top)
if (angle > 105°) → "down" position (lying flat)
```

---

## 🌐 **Blockchain Integration Details**

### Avalanche C-Chain (Fuji Testnet)

- **Contract**: `0xFBE99DcD3b2d93b1c8FFabC26427383dAAbA05d1`
- **Network**: Fuji Testnet (ChainID: 43113)
- **RPC**: `https://api.avax-test.network/ext/bc/C/rpc`
- **Explorer**: [Snowtrace](https://testnet.snowtrace.io/address/0xFBE99DcD3b2d93b1c8FFabC26427383dAAbA05d1)

### Chainlink Functions Integration

- **Router**: `0xA9d587a00A31A52Ed70D6026794a8FC5E2F5dCb0` (Fuji)
- **DON ID**: `fun-avalanche-fuji-1`
- **AI Provider**: OpenAI GPT-4 for enhanced form analysis.

---

## 🎨 **Design Philosophy**

- **Lightweight**: All processing is done in the browser, with no heavy dependencies.
- **User-Focused**: The app provides immediate feedback and a gamified experience with streaks and a competitive leaderboard.
- **Privacy-Centric**: Pose detection is local, and only aggregated workout metrics are stored on-chain.

---

## 🔮 **Future Roadmap**

- **Implement Reward Distribution**: Complete the fee distribution system to reward top performers on the leaderboard.
- **Add More Exercises**: Expand the app to track other exercises like push-ups and squats.
- **NFT Achievements**: Mint NFTs to reward users for reaching milestones.
- **Cross-Chain Integration**: Bridge the app to other networks in the Imperfect Fitness Ecosystem.
