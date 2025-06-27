# Blockchain Deployment Guide - Imperfect Abs

## 🏔️ Avalanche Fuji Testnet Deployment

This guide covers deploying the `ImperfectAbsLeaderboard` contract to Avalanche Fuji Testnet as part of the Imperfect Fitness Ecosystem.

## 🌐 Network Configuration

### Avalanche Fuji Testnet Details
- **Network Name**: Avalanche Fuji C-Chain
- **RPC URL**: `https://api.avax-test.network/ext/bc/C/rpc`
- **Chain ID**: `43113`
- **Currency Symbol**: `AVAX`
- **Block Explorer**: `https://testnet.snowtrace.io/`

### Faucet
Get test AVAX from: `https://faucet.avax.network/`

## 🛠️ Prerequisites

### 1. Development Environment
```bash
npm install -g @remix-project/remixd
npm install --save-dev hardhat
npm install --save-dev @nomiclabs/hardhat-ethers
```

### 2. Wallet Setup
- Install MetaMask or Core Wallet
- Add Avalanche Fuji Testnet to your wallet
- Fund wallet with test AVAX from faucet

## 🚀 Deployment Options

### Option 1: Remix IDE (Recommended for Hackathons)

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

### Option 2: Hardhat Deployment

1. **Initialize Hardhat Project**:
```bash
cd imperfect-abs
npm install --save-dev hardhat
npx hardhat init
```

2. **Configure Network** (`hardhat.config.js`):
```javascript
require("@nomiclabs/hardhat-ethers");

module.exports = {
  solidity: "0.8.24",
  networks: {
    fuji: {
      url: "https://api.avax-test.network/ext/bc/C/rpc",
      chainId: 43113,
      accounts: [process.env.PRIVATE_KEY] // Add your private key to .env
    }
  }
};
```

3. **Create Deployment Script** (`scripts/deploy.js`):
```javascript
async function main() {
  const ImperfectAbsLeaderboard = await ethers.getContractFactory("ImperfectAbsLeaderboard");
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

## 🔧 Contract Configuration

### Initial Setup After Deployment

1. **Verify Contract** on Snowtrace:
   - Go to https://testnet.snowtrace.io/
   - Find your contract address
   - Click "Contract" → "Verify and Publish"

2. **Configure Fee Structure**:
```solidity
// Default: 0.01 AVAX submission fee, 70% owner, 30% leaderboard
updateFeeConfig(
    10000000000000000, // 0.01 AVAX in wei
    7000,              // 70% to owner
    3000               // 30% to participants
);
```

3. **Set Exercise Parameters**:
```solidity
setSubmissionCooldown(60);    // 1 minute between submissions
setMaxRepsPerSession(200);    // Max 200 reps per session
setMinFormAccuracy(50);       // Minimum 50% form accuracy
```

## 🔗 Frontend Integration

### Contract ABI Integration

1. **Generate ABI**: Copy from Remix compilation artifacts
2. **Create Contract Instance**:

```typescript
// src/lib/contract.ts
import { ethers } from 'ethers';

const CONTRACT_ADDRESS = "YOUR_DEPLOYED_CONTRACT_ADDRESS";
const CONTRACT_ABI = [/* ABI from compilation */];

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

### Wallet Connection

```typescript
// src/lib/wallet.ts
import { ethers } from 'ethers';

export const connectWallet = async () => {
  if (typeof window.ethereum !== 'undefined') {
    try {
      await window.ethereum.request({ method: 'eth_requestAccounts' });
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      
      // Switch to Avalanche Fuji
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: '0xA869' }], // 43113 in hex
      });
      
      return provider.getSigner();
    } catch (error) {
      console.error('Failed to connect wallet:', error);
    }
  }
};
```

## 📊 Ecosystem Integration

### Sister App References

The contract includes ecosystem tracking events:

```solidity
event EcosystemIntegration(string indexed appName, address indexed user, uint256 score);
```

This allows cross-app analytics across:
- **ImperfectCoach** (Base Sepolia): Pull-ups & Jumps
- **ImperfectForm** (Multi-chain): Comprehensive Form Analysis  
- **ImperfectBreath** (Lens/Flow/Base): Breathing & Mindfulness
- **ImperfectAbs** (Avalanche): Abs & Core Exercises

### Multi-Chain Leaderboard Aggregation

Future integration points for ecosystem-wide leaderboards:

```typescript
// Aggregate scores across all apps
const getUserEcosystemScore = async (userAddress: string) => {
  const scores = await Promise.all([
    getImperfectCoachScore(userAddress),    // Base Sepolia
    getImperfectFormScore(userAddress),     // Multi-chain
    getImperfectBreathScore(userAddress),   // Lens/Flow
    getImperfectAbsScore(userAddress)       // Avalanche
  ]);
  
  return aggregateScores(scores);
};
```

## 🧪 Testing

### Contract Testing Commands

```bash
# Test basic functionality
npx hardhat test

# Test on Fuji testnet
npx hardhat test --network fuji

# Gas estimation
npx hardhat run scripts/gas-estimate.js --network fuji
```

### Frontend Testing

```bash
# Test with local blockchain
npm run dev:local

# Test with Fuji testnet
npm run dev:testnet
```

## 📈 Monitoring & Analytics

### Essential Metrics to Track

1. **User Engagement**:
   - Daily active users
   - Session frequency
   - Average reps per session

2. **Form Quality**:
   - Average form accuracy trends
   - Best streak distributions
   - Improvement over time

3. **Economic Metrics**:
   - Fee collection rates
   - Reward distribution efficiency
   - Gas cost optimization

### Recommended Tools

- **Snowtrace**: Transaction monitoring
- **Dune Analytics**: Custom dashboards
- **The Graph**: Subgraph for efficient querying

## 🔒 Security Considerations

### Smart Contract Security

1. **Access Controls**: Only owner can modify critical parameters
2. **Reentrancy Protection**: State changes before external calls
3. **Input Validation**: Comprehensive parameter checking
4. **Emergency Controls**: Pausable submissions and emergency withdrawal

### Frontend Security

1. **Private Key Management**: Never expose private keys
2. **Contract Address Verification**: Verify contract addresses
3. **Transaction Validation**: Confirm transaction details before signing

## 🚀 Production Deployment

### Mainnet Deployment (Future)

For production deployment to Avalanche Mainnet:

1. **Update Network Config**:
   - RPC: `https://api.avax.network/ext/bc/C/rpc`
   - Chain ID: `43114`
   - Use real AVAX for fees

2. **Security Audit**: Consider professional audit before mainnet
3. **Gradual Rollout**: Start with limited features and expand

## 📞 Support

### Resources

- **Avalanche Docs**: https://docs.avax.network/
- **Remix IDE**: https://remix.ethereum.org/
- **Snowtrace**: https://testnet.snowtrace.io/
- **Core Wallet**: https://core.app/

### Ecosystem Contacts

For integration with other Imperfect Fitness apps, maintain consistency in:
- Contract structure and events
- User scoring methodologies  
- Cross-chain communication patterns
- Branding and user experience

---

**Built for the Imperfect Fitness Ecosystem** 💪⛓️

*Part of a multi-chain fitness tracking revolution*