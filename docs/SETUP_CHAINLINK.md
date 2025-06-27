# Chainlink Functions Setup Guide - Imperfect Abs

## 🚀 Quick Setup (5 Minutes)

### Prerequisites
- MetaMask or Core Wallet installed
- Node.js 18+ installed
- Access to Avalanche Fuji Testnet

## Step 1: Environment Setup

1. **Copy environment template:**
```bash
cp .env.example .env
```

2. **Get your private key from MetaMask:**
   - Open MetaMask
   - Click account menu → Account Details → Export Private Key
   - Copy the private key (without 0x prefix)

3. **Add private key to .env:**
```bash
PRIVATE_KEY=your_private_key_here_without_0x
```

## Step 2: Get Test Tokens

### Get Test AVAX
1. Visit: https://faucet.avax.network/
2. Connect your wallet
3. Request test AVAX (need ~0.1 AVAX for transactions)

### Get Test LINK
1. Visit: https://faucets.chain.link/fuji
2. Connect your wallet to Avalanche Fuji
3. Request test LINK tokens (need ~2 LINK for setup)

## Step 3: Run Chainlink Setup

```bash
# Install dependencies
npm install

# Run the automated setup
npm run setup:chainlink
```

**Expected Output:**
```
🚀 Chainlink Functions Setup for Imperfect Abs
===============================================

🔗 Initializing Chainlink Functions Setup...
📍 Using address: 0x1234...5678
✅ Connected to Avalanche Fuji Testnet

💰 Checking balances...
AVAX: 1.0 AVAX
LINK: 5.0 LINK

🔨 Creating Chainlink Functions subscription...
Transaction sent: 0xabc123...
✅ Transaction confirmed
🎉 Subscription created with ID: 42

💸 Funding subscription 42 with 2.0 LINK...
Transaction sent: 0xdef456...
✅ Subscription funded successfully

👥 Adding consumer 0xFBE99DcD3b2d93b1c8FFabC26427383dAAbA05d1 to subscription 42...
Transaction sent: 0x789abc...
✅ Consumer added successfully

📊 Getting subscription 42 details...
Balance: 2.0 LINK
Owner: 0x1234...5678
Consumers: 1

💾 Saving configuration...
✅ Configuration saved to: ./chainlink-config.json

📝 Add these to your environment variables:
NEXT_PUBLIC_CHAINLINK_SUBSCRIPTION_ID=42

🎉 Chainlink Functions setup complete!
```

## Step 4: Add OpenAI API Key

1. **Get OpenAI API Key:**
   - Visit: https://platform.openai.com/api-keys
   - Create new secret key
   - Copy the key

2. **Add to .env:**
```bash
CHAINLINK_OPENAI_API_KEY=sk-proj-your_openai_api_key_here
```

3. **Update subscription ID in .env:**
```bash
NEXT_PUBLIC_CHAINLINK_SUBSCRIPTION_ID=42
```

## Step 5: Test the Application

```bash
# Start development server
npm run dev

# Open browser
open http://localhost:3000
```

### Testing Flow:
1. **Connect Wallet** → Should auto-switch to Avalanche Fuji
2. **Start Workout** → Camera should initialize
3. **Complete Exercise** → Reps should count automatically
4. **Submit to Blockchain** → Transaction should succeed
5. **Request AI Enhancement** → Should show Chainlink setup status
6. **AI Analysis** → Enhanced form score via OpenAI

## 🔍 Troubleshooting

### "Insufficient LINK balance"
- Visit https://faucets.chain.link/fuji for more test LINK
- Need at least 2 LINK to create subscription

### "Wrong network" error
- Ensure MetaMask is connected to Avalanche Fuji
- Chain ID should be 43113

### "Failed to create subscription"
- Check AVAX balance (need for gas fees)
- Verify private key is correct in .env

### "OpenAI API error"
- Verify API key is valid
- Check you have credits in OpenAI account
- Ensure key has access to GPT-4

## 📊 Monitoring

### Check Subscription Status:
```bash
npm run chainlink:status
```

### View Transactions:
- Snowtrace: https://testnet.snowtrace.io/
- Search your wallet address

### Monitor LINK Usage:
- Each AI request costs ~0.1 LINK
- Refund subscription when balance is low

## 🔗 Important Addresses

| Component | Address | Network |
|-----------|---------|---------|
| Smart Contract | `0xFBE99DcD3b2d93b1c8FFabC26427383dAAbA05d1` | Avalanche Fuji |
| Functions Router | `0xA9d587a00A31A52Ed70D6026794a8FC5E2F5dCb0` | Avalanche Fuji |
| LINK Token | `0x0b9d5D9136855f6FEc3c0993feE6E9CE8a297846` | Avalanche Fuji |

## 🎯 What's Working

✅ **Real Chainlink Functions** - Makes actual API calls to OpenAI
✅ **Live LINK Integration** - Uses real LINK tokens for requests  
✅ **Subscription Management** - Automated setup and funding
✅ **AI Enhancement** - GPT-4 analyzes your workout form
✅ **Blockchain Storage** - Results stored on Avalanche
✅ **Event Monitoring** - Real-time transaction updates

## 🚀 Ready for Hackathon!

Your app now has:
- ✅ Working Avalanche integration
- ✅ Live Chainlink Functions
- ✅ Real AI analysis via OpenAI
- ✅ Production-ready architecture

**Demo this to judges:**
1. Show wallet connection to Avalanche
2. Demonstrate live pose detection
3. Submit workout to blockchain
4. Request AI enhancement via Chainlink
5. Show enhanced form score from GPT-4

The complete pipeline is now working end-to-end! 🏆