# Deployment and Setup Guides - Imperfect Abs

This document consolidates information related to the deployment and setup of the Imperfect Abs project, including smart contract deployment on the Avalanche Fuji Testnet and environment variable configuration. It combines content from "Deployment Guide" and "Environment Variables Guide" to provide a comprehensive resource for developers and deployers.

## 🚀 Deployment Guide

This section provides detailed instructions, configuration steps, and best practices to ensure a successful deployment of the `ImperfectAbsLeaderboard` smart contract on the Avalanche Fuji Testnet and prepares for mainnet deployment.

### 🌐 Network Configuration

#### Avalanche Fuji Testnet Details

- **Network Name**: Avalanche Fuji C-Chain
- **RPC URL**: `https://api.avax-test.network/ext/bc/C/rpc`
- **Chain ID**: `43113`
- **Currency Symbol**: `AVAX`
- **Block Explorer**: `https://testnet.snowtrace.io/`
- **Faucet**: Get test AVAX from https://faucet.avax.network/

#### Avalanche Mainnet Details (For Future Production)

- **Network Name**: Avalanche C-Chain
- **RPC URL**: `https://api.avax.network/ext/bc/C/rpc`
- **Chain ID**: `43114`
- **Currency Symbol**: `AVAX`
- **Block Explorer**: `https://snowtrace.io/`

### 🛠️ Prerequisites

#### Development Environment Setup

1. **Install Foundry** (Recommended for Deployment):
   ```bash
   curl -L https://foundry.paradigm.xyz | bash
   foundryup
   ```
2. **Install Additional Tools** (For Hardhat or Remix Options):
   ```bash
   npm install -g @remix-project/remixd
   npm install --save-dev hardhat
   npm install --save-dev @nomiclabs/hardhat-ethers
   ```
3. **Wallet Setup**:
   - Install MetaMask or Core Wallet.
   - Add Avalanche Fuji Testnet to your wallet.
   - Fund wallet with test AVAX from the faucet.

#### Get Snowtrace API Key (For Contract Verification)

- Visit https://snowtrace.io/apis
- Create an account and generate an API key.

### 🚀 Deployment Options

#### Option 1: Foundry Deployment (Recommended)

This method uses Foundry for a streamlined deployment process with script support.

1. **Install Dependencies**:

   ```bash
   # Navigate to project directory
   cd imperfect-abs

   # Install forge standard library
   forge install foundry-rs/forge-std --no-git --no-commit

   # Install OpenZeppelin and Chainlink contracts
   npm install @openzeppelin/contracts @chainlink/contracts
   ```

2. **Configure Environment Variables** in `.env`:
   ```bash
   cp .env.example .env
   ```
   Edit `.env` with your values:
   ```bash
   RPC_URL=https://api.avax-test.network/ext/bc/C/rpc
   PRIVATE_KEY=your_actual_private_key_here
   ETHERSCAN_API_KEY=your_snowtrace_api_key_here
   CHAINLINK_ROUTER=0xA9d587a00A31A52Ed70D6026794a8FC5E2F5dCb0
   CHAINLINK_SUBSCRIPTION_ID=15675
   CHAINLINK_GAS_LIMIT=500000
   CHAINLINK_DON_ID=0x66756e2d6176616c616e6368652d66756a692d31000000000000000000000000
   ```
3. **Load Environment Variables**:
   ```bash
   source .env
   # or
   export $(cat .env | xargs)
   ```
4. **Deploy Using Script** (Clean Production Version):

   ```bash
   # Compile contracts
   forge build

   # Deploy to Fuji testnet with verification
   forge script script/ProductionDeploy.s.sol:ProductionDeploy \
     --rpc-url $RPC_URL \
     --private-key $PRIVATE_KEY \
     --broadcast \
     --verify \
     --etherscan-api-key $ETHERSCAN_API_KEY
   ```

   Alternative (without verification for faster deployment):

   ```bash
   forge script script/ProductionDeploy.s.sol:ProductionDeploy \
     --rpc-url $RPC_URL \
     --private-key $PRIVATE_KEY \
     --broadcast
   ```

5. **Direct Deployment with `forge create`** (Alternative to Script):

   ```bash
   # Get the JavaScript source code
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

#### Option 2: Remix IDE (Recommended for Hackathons)

This method is user-friendly for quick deployments during hackathons.

1. **Open Remix**: https://remix.ethereum.org/
2. **Create New File**: `ImperfectAbsLeaderboard.sol`
3. **Copy Contract Code** from `contracts/ImperfectAbsLeaderboard.sol`
4. **Compile Contract**:
   - Compiler Version: `0.8.24+`
   - Enable Optimization: `200 runs`
5. **Deploy**:
   - Environment: `Injected Provider - MetaMask`
   - Contract: `ImperfectAbsLeaderboard`
   - Click `Deploy`

#### Option 3: Hardhat Deployment

This method is suitable for developers familiar with Hardhat.

1. **Initialize Hardhat Project**:
   ```bash
   cd imperfect-abs
   npm install --save-dev hardhat
   npx hardhat init
   ```
2. **Configure Network** in `hardhat.config.js`:

   ```javascript
   require("@nomiclabs/hardhat-ethers");

   module.exports = {
     solidity: "0.8.24",
     networks: {
       fuji: {
         url: "https://api.avax-test.network/ext/bc/C/rpc",
         chainId: 43113,
         accounts: [process.env.PRIVATE_KEY], // Add your private key to .env
       },
     },
   };
   ```

3. **Create Deployment Script** in `scripts/deploy.js`:

   ```javascript
   async function main() {
     const ImperfectAbsLeaderboard = await ethers.getContractFactory(
       "ImperfectAbsLeaderboard"
     );
     const contract = await ImperfectAbsLeaderboard.deploy();

     await contract.deployed();

     console.log("ImperfectAbsLeaderboard deployed to:", contract.address);
     console.log("Transaction hash:", contract.deployTransaction.hash);
     console.log("Deployer address:", await contract.owner());
   }

   main().catch((error) => {
     console.error(error);
     process.exitCode = 1;
   });
   ```

4. **Deploy**:
   ```bash
   npx hardhat run scripts/deploy.js --network fuji
   ```

### 🔧 Post-Deployment Setup

#### 1. Add Contract as Chainlink Functions Consumer

After deployment, add your contract to the Chainlink Functions subscription:

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

#### 2. Verify Contract on Snowtrace (If Not Done During Deployment)

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

Alternatively, manually verify at https://testnet.snowtrace.io/ by finding your contract address and selecting "Contract" → "Verify and Publish".

#### 3. Configure Contract Parameters

- **Fee Structure**:
  ```solidity
  // Default: 0.01 AVAX submission fee, 70% owner, 30% leaderboard
  updateFeeConfig(
      10000000000000000, // 0.01 AVAX in wei
      7000,              // 70% to owner
      3000               // 30% to participants
  );
  ```
- **Exercise Parameters**:
  ```solidity
  setSubmissionCooldown(60);    // 1 minute between submissions
  setMaxRepsPerSession(200);    // Max 200 reps per session
  setMinFormAccuracy(50);       // Minimum 50% form accuracy
  ```

#### 4. Update Documentation

After successful deployment:

- Update `.env` with the new `CONTRACT_ADDRESS`.
- Update `README.md` and other documentation files with the new address.

### 🧪 Testing the Deployment

#### 1. Check Contract Status

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

#### 2. Submit a Test Workout Session

```bash
# Replace <CONTRACT_ADDRESS> with your deployed contract address
# For example: 0x4996089d644d023F02Bf891E98a00b143201f133
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

#### 3. Check Leaderboard

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

#### 4. Check Chainlink Functions Integration

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

#### Quick Test Sequence

```bash
# 1. Load environment
source .env

# 2. Check contract status
cast call --rpc-url $RPC_URL <CONTRACT_ADDRESS> "submissionsEnabled()(bool)"

# 3. Check cooldown status for your address
cast call --rpc-url $RPC_URL <CONTRACT_ADDRESS> "getTimeUntilNextSubmission(address)(uint256)" 0x55A5705453Ee82c742274154136Fce8149597058

# 4. Submit workout (adjust parameters if needed)
cast send --rpc-url $RPC_URL --private-key $PRIVATE_KEY --value 0.01ether <CONTRACT_ADDRESS> "submitWorkoutSession(uint256,uint256,uint256,uint256)" 25 80 5 300

# 5. Check if it worked
cast call --rpc-url $RPC_URL <CONTRACT_ADDRESS> "getUserSessionCount(address)(uint256)" 0x55A5705453Ee82c742274154136Fce8149597058
```

#### Frontend Testing

```bash
# Test with local blockchain
npm run dev:local

# Test with Fuji testnet
npm run dev:testnet
```

### 🔄 Why Redeploy for Production?

#### Issues with Initial Deployment (e.g., `0x060F0F142D5BfC721a7C53D00B4bAD77Ad82C776`)

- Contains test functions (`testThreeArguments()`, `testFourArgumentsOld()`).
- Larger bytecode increases deployment costs.
- Not production-clean, presenting a larger security surface.

#### Benefits of Clean Deployment

- Production-ready with no debug/test code.
- Smaller bytecode for lower gas costs.
- Professional and auditable contract.
- Better performance optimized for production.

### 📋 Verification Checklist for Clean Deployment

- [ ] Contract deploys successfully.
- [ ] Added to Chainlink subscription (ID: 15675).
- [ ] Workout submission works.
- [ ] AI analysis functions properly.
- [ ] No test functions present in deployed contract.
- [ ] Documentation updated with new address.

### 🔗 Frontend Integration

#### Contract ABI Integration

1. **Generate ABI**: Copy from Remix compilation artifacts or Foundry build output.
2. **Create Contract Instance**:

   ```typescript
   // src/lib/contract.ts
   import { ethers } from "ethers";

   const CONTRACT_ADDRESS = "YOUR_DEPLOYED_CONTRACT_ADDRESS";
   const CONTRACT_ABI = [
     /* ABI from compilation */
   ];

   export const getContract = (signer: ethers.Signer) => {
     return new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
   };

   export const submitWorkout = async (
     signer: ethers.Signer,
     reps: number,
     formAccuracy: number,
     streak: number,
     duration: number
   ) => {
     const contract = getContract(signer);
     const submissionFee = await contract.feeConfig.submissionFee();

     const tx = await contract.submitWorkoutSession(
       reps,
       formAccuracy,
       streak,
       duration,
       { value: submissionFee }
     );

     return await tx.wait();
   };
   ```

#### Wallet Connection

```typescript
// src/lib/wallet.ts
import { ethers } from "ethers";

export const connectWallet = async () => {
  if (typeof window.ethereum !== "undefined") {
    try {
      await window.ethereum.request({ method: "eth_requestAccounts" });
      const provider = new ethers.providers.Web3Provider(window.ethereum);

      // Switch to Avalanche Fuji
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: "0xA869" }], // 43113 in hex
      });

      return provider.getSigner();
    } catch (error) {
      console.error("Failed to connect wallet:", error);
    }
  }
};
```

### 📊 Ecosystem Integration

#### Sister App References

The contract includes ecosystem tracking events for cross-app analytics:

```solidity
event EcosystemIntegration(string indexed appName, address indexed user, uint256 score);
```

This supports integration across:

- **ImperfectCoach** (Base Sepolia): Pull-ups & Jumps
- **ImperfectForm** (Multi-chain): Comprehensive Form Analysis
- **ImperfectBreath** (Lens/Flow/Base): Breathing & Mindfulness
- **ImperfectAbs** (Avalanche): Abs & Core Exercises

#### Multi-Chain Leaderboard Aggregation

Future integration for ecosystem-wide leaderboards:

```typescript
// Aggregate scores across all apps
const getUserEcosystemScore = async (userAddress: string) => {
  const scores = await Promise.all([
    getImperfectCoachScore(userAddress), // Base Sepolia
    getImperfectFormScore(userAddress), // Multi-chain
    getImperfectBreathScore(userAddress), // Lens/Flow
    getImperfectAbsScore(userAddress), // Avalanche
  ]);

  return aggregateScores(scores);
};
```

### 📈 Monitoring & Analytics

#### Essential Metrics to Track

1. **User Engagement**: Daily active users, session frequency, average reps per session.
2. **Form Quality**: Average form accuracy trends, best streak distributions, improvement over time.
3. **Economic Metrics**: Fee collection rates, reward distribution efficiency, gas cost optimization.

#### Recommended Tools

- **Snowtrace**: Transaction monitoring.
- **Dune Analytics**: Custom dashboards.
- **The Graph**: Subgraph for efficient querying.

### 🚨 Troubleshooting Deployment Issues

#### Common Issues

1. **"InsufficientFee" Error**:
   - Ensure sending at least 0.01 AVAX with transactions.
   - Add `--value 0.01ether` to `cast send` commands.
2. **"CooldownNotExpired" Error (Error 0x1d70f87a)**:
   - Wait 60 seconds between submissions.
   - Check remaining cooldown:
     ```bash
     cast call --rpc-url $RPC_URL <CONTRACT_ADDRESS> "getTimeUntilNextSubmission(address)(uint256)" 0x55A5705453Ee82c742274154136Fce8149597058
     ```
3. **"FormAccuracyInvalid" Error**:
   - Ensure form accuracy is between 50-100.
   - Check minimum:
     ```bash
     cast call --rpc-url $RPC_URL <CONTRACT_ADDRESS> "MIN_FORM_ACCURACY()(uint256)"
     ```
4. **"ScoreExceedsMaximum" Error**:
   - Ensure reps don't exceed maximum allowed.
   - Check maximum:
     ```bash
     cast call --rpc-url $RPC_URL <CONTRACT_ADDRESS> "MAX_REPS_PER_SESSION()(uint256)"
     ```
5. **Verification Failed**:
   - Contract still works; verify manually at https://testnet.snowtrace.io/.
   - "Too many API attempts" means try again later.
6. **Gas Estimation Failed**:
   - Increase gas limit: `--gas-limit 3000000`
   - Check gas price: `--gas-price 30000000000`

#### Debugging Commands

```bash
# Check if submissions are enabled
cast call --rpc-url $RPC_URL <CONTRACT_ADDRESS> "submissionsEnabled()(bool)"

# Check contract
```
