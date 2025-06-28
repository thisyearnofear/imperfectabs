# Imperfect Abs - Decentralized AI Fitness Platform 💪⛓️🤖

A **hybrid on-chain/off-chain AI fitness platform** that combines real-time pose detection with blockchain-verified scoring and Chainlink-powered AI enhancement. Part of the **Imperfect Fitness Ecosystem**.

## 🧠 Revolutionary AI Architecture

**Frontend AI** → **Chainlink Functions** → **Smart Contract** → **Enhanced Scoring**

1. **MediaPipe Pose Detection**: Real-time form analysis and rep counting in your browser
2. **Chainlink Functions**: Secure off-chain AI computation with OpenAI integration
3. **Avalanche Blockchain**: Transparent leaderboard and automated rewards
4. **Decentralized Enhancement**: AI analysis runs on Chainlink's oracle network, not centralized servers

## 🎉 Production Ready - Chainlink Functions Integration Working ✅

- **Contract Address**: `0xdf07bD5a057aBf76147231886C94FEb985151ebc`
- **Network**: Avalanche Fuji C-Chain (ChainID: 43113)
- **Status**: ✅ All Chainlink Functions issues resolved and working perfectly
- **Snowtrace**: [View Contract](https://testnet.snowtrace.io/address/0xdf07bD5a057aBf76147231886C94FEb985151ebc)

## 🌟 Core Features

### 🎯 **Dual-Layer AI Analysis**

- **Layer 1 - Frontend**: MediaPipe pose detection for instant feedback
- **Layer 2 - Chainlink**: Advanced AI analysis via secure oracle network
- **OpenAI Integration**: GPT-4 powered form analysis and coaching (⚠️ requires encrypted secrets setup)

### ⛓️ **Blockchain Infrastructure**

- **Smart Contract**: Transparent scoring and leaderboard on Avalanche
- **Chainlink Functions**: Decentralized AI computation with encrypted API key management
- **Automated Rewards**: 60% of fees distributed to top performers

### 🔒 **Security & Decentralization**

- **No Single Point of Failure**: AI runs on distributed Chainlink network
- **Encrypted Secrets**: API keys secured within Chainlink DON
- **Verifiable Results**: All AI enhancements cryptographically verified

## 📚 Documentation

- **[Hackathon Guide](./docs/HACKATHON_GUIDE.md)** - Complete feature breakdown and architecture
- **[Encrypted Secrets Setup](./docs/ENCRYPTED_SECRETS_SETUP.md)** - ⚠️ **Required for OpenAI integration**
- **[Chainlink Integration Fixes](./docs/CHAINLINK_FIXES.md)** - How we resolved all integration issues
- **[Original Issue Analysis](./docs/CHAINLINK_ISSUE.md)** - Problem identification and resolution

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- npm or yarn
- Webcam access
- MetaMask or compatible Web3 wallet

### Installation

1.  **Get test AVAX**: Visit the [Avalanche Faucet](https://faucet.avax.network/).
2.  **Clone and install:**
    ```bash
    git clone <repository-url>
    cd imperfect-abs
    npm install
    ```
3.  **Run the development server:**
    ```bash
    npm run dev
    ```
4.  **Setup environment variables**:
    ```bash
    cp .env.example .env.local
    # Edit .env.local with your values
    ```
5.  **Setup encrypted secrets** (for OpenAI integration): `npm run setup:secrets`
6.  **Connect wallet** and switch to Avalanche Fuji testnet
7.  **Start working out** - AI analysis happens automatically!

## 🔧 How It Works

1. **Workout**: MediaPipe detects your abs exercises in real-time
2. **Submit**: Pay 0.01 AVAX to submit your session to the blockchain
3. **AI Enhancement**: Chainlink Functions triggers advanced AI analysis
4. **Results**: Get enhanced scoring and personalized feedback
5. **Rewards**: Top performers automatically receive AVAX rewards

## 🏗️ Technical Architecture

```
Browser (MediaPipe) → Smart Contract (Avalanche) → Chainlink Functions → OpenAI API
     ↓                        ↓                           ↓              ↓
Pose Detection → Basic Scoring → AI Enhancement Request → Advanced Analysis
     ↓                        ↓                           ↓              ↓
Rep Counting → Leaderboard Update ← Enhanced Score ← GPT-4 Feedback
```

## 📜 License

MIT License - Built for educational and hackathon purposes.
