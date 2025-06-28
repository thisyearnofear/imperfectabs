# Deployment Parameters for ImperfectAbsLeaderboard

## Constructor Parameters

When deploying the contract with Remix, you'll need to provide these parameters:

### Required Parameters:

1. **router** (address): `0xA9d587a00A31A52Ed70D6026794a8FC5E2F5dCb0`
   - Chainlink Functions Router on Avalanche Fuji

2. **_subscriptionId** (uint64): `15675`
   - Your existing Chainlink Functions subscription ID

3. **_gasLimit** (uint32): `500000`
   - Gas limit for Chainlink Functions requests

4. **_donID** (bytes32): `0x66756e2d6176616c616e6368652d66756a692d31000000000000000000000000`
   - DON ID for Avalanche Fuji (`fun-avalanche-fuji-1` in bytes32)

5. **_source** (string): Copy the entire content from `functions/fitness-analysis.js`

## Deployment Steps:

1. Open Remix IDE
2. Upload the contract file
3. Install required dependencies:
   - `@chainlink/contracts`
4. Compile the contract
5. Deploy with the parameters above
6. After deployment, add the contract address as a consumer to subscription 15675

## Post-Deployment Setup:

1. **Add Consumer**: Call `addConsumer(15675, <your_contract_address>)` on the Functions Router
2. **Fund Subscription**: Ensure subscription has enough LINK tokens
3. **Test Functions**: Submit a workout session to test the integration
4. **Configure Rewards**: Optionally update reward distribution settings

## Key Features Added:

### Reward Distribution System:
- **Automatic Distribution**: Weekly rewards to top 10 performers
- **Fair Distribution**: Rewards based on leaderboard ranking
- **Configurable**: Admin can adjust distribution period and participant count
- **Emergency Functions**: Manual distribution and additional funding options

### Enhanced Fee Structure:
- **Submission Fee**: 0.01 AVAX per workout submission
- **Owner Share**: 40% (reduced from 70% to fund rewards)
- **Reward Pool**: 60% goes to top performers
- **Transparent**: All distributions are tracked and emitted as events

### AI Analysis Integration:
- **Chainlink Functions**: Automatic AI analysis requests
- **Enhanced Scoring**: AI-powered form analysis stored on-chain
- **Fallback**: System continues working even if AI analysis fails

## Testing the Reward System:

1. Submit multiple workout sessions from different addresses
2. Wait for distribution period (7 days) or call `emergencyDistributeRewards()`
3. Check `getUserRewardInfo()` for reward details
4. Call `claimRewards()` to withdraw earned rewards

## Admin Functions:

- `updateRewardConfig()`: Modify distribution settings
- `distributeRewards()`: Manual reward distribution
- `emergencyDistributeRewards()`: Emergency distribution
- `addRewardFunding()`: Add additional funds to reward pool
- `updateChainlinkConfig()`: Update Chainlink Functions settings
