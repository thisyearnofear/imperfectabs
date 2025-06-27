# Perfect Abs - AI-Powered Fitness Tracker 💪

A lightweight, browser-based fitness tracking application that uses AI pose detection to count and analyze abs exercises with real-time form feedback. Built with Next.js, TypeScript, and MediaPipe for accurate pose estimation.

## 🌟 Features

### Current Features
- **Real-time Pose Detection**: Uses MediaPipe to detect body posture through webcam
- **Abs Exercise Tracking**: Specifically optimized for sit-ups and crunches
- **Form Analysis**: Real-time feedback on exercise form accuracy (0-100%)
- **Rep Counting**: Automatic counting of repetitions with angle-based detection
- **Streak Tracking**: Monitors consecutive good-form exercises
- **Session Statistics**: Tracks total reps, average form, best streak, and duration
- **Interactive Leaderboard**: Mock leaderboard showing competitive fitness data

### Planned Features (Blockchain Integration)
- 🔗 **Avalanche C-Chain Integration**: On-chain leaderboard using Fuji Testnet
- 🤖 **Chainlink Functions**: Off-chain AI computation for advanced form analysis  
- 🎯 **AI Agent Integration**: Autonomous feedback and NFT achievement minting
- 🏆 **Decentralized Leaderboard**: Tamper-proof fitness metrics on blockchain
- 🎨 **NFT Achievements**: Mint achievement tokens for milestones

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Webcam access for pose detection

### Installation

1. **Clone and install dependencies:**
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

## 🎯 How to Use

### Workout Mode
1. Click "Start Workout" to initialize camera and pose detection
2. Position yourself so your full torso is visible in the frame
3. Lie down for sit-ups or position for crunches
4. The app will automatically:
   - Count your repetitions
   - Analyze your form (green = excellent, yellow = good, red = needs improvement)
   - Track your streak of good-form exercises
   - Display real-time angle measurements

### Form Guidelines
- **Sit-ups**: Full range from lying down (>105°) to sitting up (<55°)
- **Crunches**: Partial range focusing on abdominal contraction
- **Form Score**: Based on consistent angle ranges and smooth movement
- **Streak Bonus**: Requires 80%+ form accuracy to maintain streak

### Leaderboard
- View competitive rankings (currently mock data)
- See comprehensive stats: total reps, form accuracy, streaks, sessions
- Compare your performance with other users
- Understand scoring system (form and consistency weighted higher than raw reps)

## 🏗️ Technical Architecture

### Core Technologies
- **Next.js 15**: React framework with App Router
- **TypeScript**: Type-safe development
- **Tailwind CSS**: Utility-first styling
- **MediaPipe**: Google's ML solution for pose detection
- **Canvas API**: Real-time pose visualization

### Key Components

#### `AbsExerciseTracker.tsx`
- Main workout interface with webcam integration
- Real-time pose detection and exercise analysis
- Session statistics and streak management

#### `pose-detection.ts`
- MediaPipe integration and pose analysis logic
- Angle calculations for abs exercises
- Form accuracy algorithms

#### `Leaderboard.tsx`
- Competitive rankings display
- Statistics visualization
- Future blockchain integration point

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

### Avalanche C-Chain (Fuji Testnet)
- **Network**: Fuji Testnet (ChainID: 43113)
- **RPC**: `https://api.avax-test.network/ext/bc/C/rpc`
- **Smart Contract**: Leaderboard storage with user metrics
- **Cost**: ~1 testnet AVAX for operations

### Chainlink Functions Workflow
```
1. User completes exercise session
2. Session data sent to Chainlink Functions
3. Off-chain AI analysis for advanced form scoring
4. Results returned to Avalanche smart contract
5. On-chain leaderboard updated with verified data
```

### AI Agent Features (Planned)
- Trend analysis across user base
- Personalized improvement recommendations  
- Automatic NFT minting for achievements
- Dynamic difficulty adjustments

## 🎨 Design Philosophy

### Lightweight Approach
- **Browser-only**: No heavy Python/OpenCV installations required
- **Client-side Processing**: Real-time analysis without server dependency
- **Progressive Enhancement**: Works offline, enhanced with blockchain features

### User Experience
- **Immediate Feedback**: Real-time form analysis and rep counting
- **Gamification**: Streaks, achievements, and competitive elements
- **Accessibility**: Clear visual indicators and intuitive controls

## 🔒 Privacy & Security

- **Local Processing**: All pose detection happens in your browser
- **No Data Storage**: Session data not permanently stored (until blockchain integration)
- **Camera Privacy**: Webcam access only during active workout sessions
- **Future Blockchain**: Optional wallet connection for leaderboard participation

## 🚧 Known Limitations

- **Lighting Dependency**: Requires good lighting for accurate pose detection
- **Camera Angle**: Best results with camera positioned to show full torso
- **Exercise Types**: Currently optimized for abs exercises only
- **Browser Support**: Modern browsers with WebRTC support required

## 🤝 Contributing

This project is designed for hackathons and educational purposes. Key areas for contribution:

1. **Exercise Types**: Add push-ups, squats, etc.
2. **Blockchain Integration**: Implement smart contracts
3. **AI Enhancements**: Improve form analysis algorithms
4. **UI/UX**: Enhanced visualizations and feedback

## 📜 License

MIT License - Built for educational and hackathon purposes.

## 🙏 Acknowledgments

- **MediaPipe Team**: For the amazing pose detection technology
- **Sport-With-AI**: Inspiration from [Furkan-Gulsen/Sport-With-AI](https://github.com/Furkan-Gulsen/Sport-With-AI)
- **Next.js Team**: For the excellent React framework
- **Avalanche**: For the fast, low-cost blockchain infrastructure

---

**Built for the Web3 fitness revolution** 🚀

*Camera permissions required for pose detection functionality.*