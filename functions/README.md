# Chainlink Functions for Imperfect Abs

This directory contains Chainlink Functions code for AI-enhanced fitness analysis in the Imperfect Abs application.

## Overview

Chainlink Functions enables our smart contract to securely connect to external APIs and perform off-chain computations, bringing AI-powered workout analysis to the blockchain.

## Current Setup

- **Subscription ID**: 15675
- **Network**: Avalanche Fuji Testnet
- **Router**: `0xA9d587a00A31A52Ed70D6026794a8FC5E2F5dCb0`
- **DON ID**: `fun-avalanche-fuji-1`
- **Contract**: `0xFBE99DcD3b2d93b1c8FFabC26427383dAAbA05d1`

## Functions

### `fitness-analysis.js`

Analyzes workout data and provides intelligent feedback including:

- **Performance Scoring**: Calculates overall workout score (0-100)
- **Form Analysis**: Evaluates exercise form accuracy
- **Personalized Feedback**: Provides tailored recommendations
- **Performance Metrics**: Calculates efficiency and pace metrics
- **Skill Level Assessment**: Categorizes performance level

#### Input Parameters
```javascript
args[0] = reps          // Number of repetitions (0-500)
args[1] = formAccuracy  // Form accuracy percentage (0-100)
args[2] = duration      // Workout duration in seconds (0-3600)
args[3] = exerciseType  // Type of exercise (default: "abs")
```

#### Output Format
```json
{
  "score": 85,
  "performanceLevel": "Advanced",
  "metrics": {
    "reps": 25,
    "formAccuracy": 87,
    "duration": 120,
    "repsPerMinute": 12,
    "efficiency": 22
  },
  "feedback": "Excellent form! Your technique is spot on.",
  "recommendations": [
    "Great endurance! Try increasing difficulty"
  ],
  "timestamp": 1706380800,
  "exerciseType": "abs"
}
```

## Integration with OpenAI (Production)

For production deployment, uncomment the OpenAI API integration in `fitness-analysis.js`:

1. **Get OpenAI API Key**: https://platform.openai.com/api-keys
2. **Add to Environment**: `CHAINLINK_OPENAI_API_KEY=your_key_here`
3. **Upload Secret**: Use Chainlink Functions secrets management
4. **Enable AI Analysis**: Uncomment the OpenAI integration code

## Testing Functions

### Local Testing
```bash
# Test function logic locally
node functions/fitness-analysis.js
```

### On-Chain Testing
```bash
# Send test request through smart contract
npm run test:functions
```

## Deployment Process

1. **Upload Function Code**: Use Chainlink Functions toolkit
2. **Set Secrets**: Upload encrypted OpenAI API key
3. **Test Request**: Send test request from contract
4. **Monitor Performance**: Check function execution logs

## Gas Optimization

The functions are optimized for Avalanche's gas costs:
- Minimal external API calls
- Efficient data processing
- Compressed return data
- Error handling to prevent reverts

## Error Handling

Functions include comprehensive error handling for:
- Invalid input parameters
- API failures
- Network timeouts
- Data validation errors

## Hackathon Features

### Technical Complexity
- ✅ Chainlink Functions integration
- ✅ AI-powered analysis algorithms  
- ✅ Multi-parameter workout evaluation
- ✅ Real-time performance scoring

### Innovation
- ✅ Decentralized fitness coaching
- ✅ Blockchain-verified workout data
- ✅ AI recommendations on-chain
- ✅ Cross-platform compatibility

### Value Proposition
- ✅ Personalized fitness guidance
- ✅ Transparent performance tracking
- ✅ Community-driven improvements
- ✅ Verifiable achievements

## Next Steps

1. **Add Consumer**: Add contract address to subscription 15675
2. **Get API Key**: Obtain OpenAI API key for production
3. **Test Integration**: Send test requests from the dApp
4. **L1 Deployment**: Deploy to Avalanche L1 for bonus points
5. **Enhanced Analysis**: Add more sophisticated AI models

## Useful Links

- [Chainlink Functions Docs](https://docs.chain.link/chainlink-functions)
- [Subscription Management](https://functions.chain.link/fuji/15675)
- [OpenAI API Documentation](https://platform.openai.com/docs)
- [Contract on Snowtrace](https://testnet.snowtrace.io/address/0xFBE99DcD3b2d93b1c8FFabC26427383dAAbA05d1)

## Support

For questions or issues:
- Join [Chainlink Discord](https://discord.gg/aSK4zew)
- Check [Avalanche Docs](https://docs.avax.network/)
- Review function logs in the Chainlink Functions dashboard