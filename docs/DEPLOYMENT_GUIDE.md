# ImperfectAbsLeaderboard Deployment Guide

This guide will walk you through deploying the ImperfectAbsLeaderboard smart contract using Foundry on Avalanche Fuji testnet.

## Prerequisites

1. **Install Foundry**
   ```bash
   curl -L https://foundry.paradigm.xyz | bash
   foundryup
   ```

2. **Get Testnet AVAX**
   - Visit [Avalanche Faucet](https://faucet.avax.network/)
   - Request testnet AVAX for your deployment address

3. **Get Snowtrace API Key**
   - Visit [Snowtrace](https://snowtrace.io/apis)
   - Create an account and generate an API key for contract verification

## Setup Instructions

### 1. Install Dependencies

```bash
# Navigate to project directory
cd imperfect-abs

# Install forge standard library
forge install foundry-rs/forge-std --no-git --no-commit

# Install OpenZeppelin contracts (if not already installed)
npm install @openzeppelin/contracts

# Install Chainlink contracts (if not already installed)
npm install @chainlink/contracts
```

### 2. Configure Environment Variables

Create a `.env` file in the project root:

```bash
cp .env.example .env
```

Edit `.env` with your actual values:

```bash
# Required for deployment
RPC_URL=https://api.avax-test.network/ext/bc/C/rpc
PRIVATE_KEY=your_actual_private_key_here
ETHERSCAN_API_KEY=your_snowtrace_api_key_here

# Chainlink Functions Configuration (pre-configured)
CHAINLINK_ROUTER=0xA9d587a00A31A52Ed70D6026794a8FC5E2F5dCb0
CHAINLINK_SUBSCRIPTION_ID=15675
CHAINLINK_GAS_LIMIT=500000
CHAINLINK_DON_ID=0x66756e2d6176616c616e6368652d66756a692d31000000000000000000000000
```

### 3. Load Environment Variables

```bash
source .env
# or
export $(cat .env | xargs)
```

## Deployment Process

### Option 1: Using the Deployment Script (Recommended)

```bash
# Compile contracts
forge build

# Deploy to Fuji testnet with verification
forge script script/DeployImperfectAbs.s.sol:DeployImperfectAbs \
  --rpc-url $RPC_URL \
  --private-key $PRIVATE_KEY \
  --broadcast \
  --verify \
  --etherscan-api-key $ETHERSCAN_API_KEY

# Alternative: Deploy without verification (faster)
forge script script/DeployImperfectAbs.s.sol:DeployImperfectAbs \
  --rpc-url $RPC_URL \
  --private-key $PRIVATE_KEY \
  --broadcast
```

### Option 2: Direct Deployment with forge create

```bash
# First, get the JavaScript source code
SOURCE_CODE=$(cat functions/fitness-analysis.js | tr '\n' ' ')

# Deploy the contract
forge create contracts/ImperfectAbsLeaderboard.sol:ImperfectAbsLeaderboard \
  --rpc-url $RPC_URL \
  --private-key $PRIVATE_KEY \
  --verify \
  --etherscan-api-key $ETHERSCAN_API_KEY \
  --constructor-args \
    "0xA9d587a00A31A52Ed70D6026794a8FC5E2F5dCb0" \
    "15675" \
    "500000" \
    "0x66756e2d6176616c616e6368652d66756a692d31000000000000000000000000" \
    "$SOURCE_CODE"
```

## Post-Deployment Setup

### 1. Add Contract as Chainlink Functions Consumer

After deployment, you need to add your contract as a consumer to the Chainlink Functions subscription:

```bash
# Replace <CONTRACT_ADDRESS> with your deployed contract address
cast send \
  --rpc-url $RPC_URL \
  --private-key $PRIVATE_KEY \
  0xA9d587a00A31A52Ed70D6026794a8FC5E2F5dCb0 \
  "addConsumer(uint64,address)" \
  15675 \
  <CONTRACT_ADDRESS>
```

### 2. Verify Contract (if not done during deployment)

```bash
# Replace <CONTRACT_ADDRESS> with your deployed contract address
forge verify-contract \
  --chain-id 43113 \
  --watch \
  --etherscan-api-key $ETHERSCAN_API_KEY \
  --constructor-args $(cast abi-encode "constructor(address,uint64,uint32,bytes32,string)" \
    "0xA9d587a00A31A52Ed70D6026794a8FC5E2F5dCb0" \
    "15675" \
    "500000" \
    "0x66756e2d6176616c616e6368652d66756a692d31000000000000000000000000" \
    "$(cat functions/fitness-analysis.js)") \
  <CONTRACT_ADDRESS> \
  contracts/ImperfectAbsLeaderboard.sol:ImperfectAbsLeaderboard
```

## Testing the Deployment

### 1. Check Contract Status First

```bash
# Check if contract is properly configured
cast call \
  --rpc-url $RPC_URL \
  <CONTRACT_ADDRESS> \
  "isAvalancheFuji()(bool)"

# Check ecosystem info
cast call \
  --rpc-url $RPC_URL \
  <CONTRACT_ADDRESS> \
  "getEcosystemInfo()(string,string,string)"

# Check submission settings
cast call \
  --rpc-url $RPC_URL \
  <CONTRACT_ADDRESS> \
  "SUBMISSION_COOLDOWN()(uint256)"
```

### 2. Submit a Test Workout Session

```bash
# Replace <CONTRACT_ADDRESS> with your deployed contract address
# For your contract: 0x4996089d644d023F02Bf891E98a00b143201f133
# Submit workout: 25 reps, 80% form accuracy, 5 minute streak, 300 seconds duration
cast send \
  --rpc-url $RPC_URL \
  --private-key $PRIVATE_KEY \
  --value 0.01ether \
  0x4996089d644d023F02Bf891E98a00b143201f133 \
  "submitWorkoutSession(uint256,uint256,uint256,uint256)" \
  25 \
  80 \
  5 \
  300
```

### 3. Check Leaderboard

```bash
# Get total leaderboard entries
cast call \
  --rpc-url $RPC_URL \
  0x4996089d644d023F02Bf891E98a00b143201f133 \
  "getLeaderboard()(tuple(address,uint256,uint256,uint256,uint256,uint256)[])"

# Get user's score (replace with your address)
cast call \
  --rpc-url $RPC_URL \
  0x4996089d644d023F02Bf891E98a00b143201f133 \
  "getUserAbsScore(address)(tuple(address,uint256,uint256,uint256,uint256,uint256))" \
  0x55A5705453Ee82c742274154136Fce8149597058
```

### 4. Check Chainlink Functions Integration

```bash
# Get user's session count
cast call \
  --rpc-url $RPC_URL \
  0x4996089d644d023F02Bf891E98a00b143201f133 \
  "getUserSessionCount(address)(uint256)" \
  0x55A5705453Ee82c742274154136Fce8149597058

# Get user's sessions
cast call \
  --rpc-url $RPC_URL \
  0x4996089d644d023F02Bf891E98a00b143201f133 \
  "getUserSessions(address)(tuple(uint256,uint256,uint256,uint256,uint256,uint256,bool)[])" \
  0x55A5705453Ee82c742274154136Fce8149597058
```

## Troubleshooting

### Common Issues

1. **"InsufficientFee" Error**
   - Ensure you're sending at least 0.01 AVAX with your transaction
   - Add `--value 0.01ether` to your cast send command

2. **"CooldownNotExpired" Error (Error 0x1d70f87a)**
   - Wait 60 seconds between submissions from the same address
   - Check remaining cooldown time:
   ```bash
   cast call --rpc-url $RPC_URL 0x4996089d644d023F02Bf891E98a00b143201f133 "getTimeUntilNextSubmission(address)(uint256)" 0x55A5705453Ee82c742274154136Fce8149597058
   ```
   - The error data shows remaining seconds (e.g., 0x493e0 = 300,000 seconds)

3. **"FormAccuracyInvalid" Error**
   - Ensure form accuracy is between 50-100 (minimum 50% required)
   - Check current minimum: 
   ```bash
   cast call --rpc-url $RPC_URL 0x4996089d644d023F02Bf891E98a00b143201f133 "MIN_FORM_ACCURACY()(uint256)"
   ```

4. **"ScoreExceedsMaximum" Error**
   - Ensure reps don't exceed maximum allowed per session
   - Check current maximum:
   ```bash
   cast call --rpc-url $RPC_URL 0x4996089d644d023F02Bf891E98a00b143201f133 "MAX_REPS_PER_SESSION()(uint256)"
   ```

5. **Verification Failed**
   - Contract still works even if verification fails
   - Verify manually at: https://testnet.snowtrace.io/address/0x4996089d644d023F02Bf891E98a00b143201f133
   - Error "Too many API attempts" means try again later

6. **Gas Estimation Failed**
   - Increase gas limit: `--gas-limit 3000000`
   - Check gas price: `--gas-price 30000000000`

### Debugging Commands

```bash
# Check if submissions are enabled
cast call --rpc-url $RPC_URL 0x4996089d644d023F02Bf891E98a00b143201f133 "submissionsEnabled()(bool)"

# Check contract owner
cast call --rpc-url $RPC_URL 0x4996089d644d023F02Bf891E98a00b143201f133 "owner()(address)"

# Check fee configuration
cast call --rpc-url $RPC_URL 0x4996089d644d023F02Bf891E98a00b143201f133 "feeConfig()(uint256,uint256,uint256)"

# Check reward pool status
cast call --rpc-url $RPC_URL 0x4996089d644d023F02Bf891E98a00b143201f133 "getRewardConfig()(uint256,uint256,uint256,uint256,bool,uint256)"
```

### Useful Commands

```bash
# Check contract balance
cast balance 0x4996089d644d023F02Bf891E98a00b143201f133 --rpc-url $RPC_URL

# Check your balance  
cast balance 0x55A5705453Ee82c742274154136Fce8149597058 --rpc-url $RPC_URL

# Get contract info
cast call --rpc-url $RPC_URL 0x4996089d644d023F02Bf891E98a00b143201f133 "getEcosystemInfo()(string,string,string)"

# Get reward configuration
cast call --rpc-url $RPC_URL 0x4996089d644d023F02Bf891E98a00b143201f133 "getRewardConfig()(uint256,uint256,uint256,uint256,bool,uint256)"

# Decode error data
cast 4byte-decode <ERROR_DATA>
cast to-dec <HEX_VALUE>  # Convert hex to decimal
```

## Quick Test Sequence

After successful deployment, run these commands in order:

```bash
# 1. Load environment
source .env

# 2. Add as consumer (DONE ✅)
# Already completed successfully

# 3. Check contract status
cast call --rpc-url $RPC_URL 0x4996089d644d023F02Bf891E98a00b143201f133 "submissionsEnabled()(bool)"

# 4. Check cooldown status for your address
cast call --rpc-url $RPC_URL 0x4996089d644d023F02Bf891E98a00b143201f133 "getTimeUntilNextSubmission(address)(uint256)" 0x55A5705453Ee82c742274154136Fce8149597058

# 5. Submit workout (adjust parameters if needed)
cast send --rpc-url $RPC_URL --private-key $PRIVATE_KEY --value 0.01ether 0x4996089d644d023F02Bf891E98a00b143201f133 "submitWorkoutSession(uint256,uint256,uint256,uint256)" 25 80 5 300

# 6. Check if it worked
cast call --rpc-url $RPC_URL 0x4996089d644d023F02Bf891E98a00b143201f133 "getUserSessionCount(address)(uint256)" 0x55A5705453Ee82c742274154136Fce8149597058
```

## Mainnet Deployment

To deploy to Avalanche Mainnet, update your environment variables:

```bash
# Mainnet configuration
export RPC_URL=https://api.avax.network/ext/bc/C/rpc
export PRIVATE_KEY=your_mainnet_private_key
export ETHERSCAN_API_KEY=your_snowtrace_api_key

# Update Chainlink configuration for mainnet
export CHAINLINK_ROUTER=0x9f82a6A0758517FD0bA7Bb53BF6B3D5e5A5F8F4A  # Mainnet router
export CHAINLINK_SUBSCRIPTION_ID=your_mainnet_subscription_id
```

Then follow the same deployment process.

## Security Considerations

1. **Never commit private keys to version control**
2. **Use hardware wallets for mainnet deployments**
3. **Verify contract source code on Snowtrace**
4. **Test thoroughly on testnet before mainnet**
5. **Consider using a multisig wallet for contract ownership**

## Support

- [Avalanche Documentation](https://docs.avax.network/)
- [Foundry Documentation](https://book.getfoundry.sh/)
- [Chainlink Functions Documentation](https://docs.chain.link/chainlink-functions)
- [Snowtrace](https://snowtrace.io/) for contract verification and monitoring