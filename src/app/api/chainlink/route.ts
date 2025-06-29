import { NextRequest, NextResponse } from 'next/server';
import { ethers } from 'ethers';

// Chainlink Functions Configuration
const CHAINLINK_CONFIG = {
  router: "0xA9d587a00A31A52Ed70D6026794a8FC5E2F5dCb0",
  donId: "fun-avalanche-fuji-1",
  rpcUrl: "https://api.avax-test.network/ext/bc/C/rpc",
  gatewayUrls: [
    "https://01.functions-gateway.testnet.chain.link/",
    "https://02.functions-gateway.testnet.chain.link/",
  ],
  gasLimit: 300000,
};

// Router ABI (minimal)
const FUNCTIONS_ROUTER_ABI = [
  "function sendRequest(uint64 subscriptionId, bytes calldata data, uint16 dataVersion, uint32 callbackGasLimit, bytes32 donId) external returns (bytes32)",
];

// AI Analysis JavaScript source for Chainlink Functions
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const AI_ANALYSIS_SOURCE = `
// Chainlink Functions JavaScript code for enhanced form analysis
const sessionDataString = args[0];
const sessionData = JSON.parse(sessionDataString);

// OpenAI API integration
const openAIApiKey = secrets.openaiApiKey;

if (!openAIApiKey) {
  throw Error("OpenAI API key not provided");
}

// Prepare data for analysis
const { reps, formAccuracy, streak, duration, poses, angles } = sessionData;

// Create prompt for biomechanical analysis
const analysisPrompt = \`Analyze this abs exercise session data:

Exercise Type: Abs/Core exercises (sit-ups, crunches)
Total Reps: \${reps}
Current Form Score: \${formAccuracy}%
Best Streak: \${streak}
Session Duration: \${duration} seconds
Pose Angles: \${angles ? angles.slice(0, 10).join(', ') : 'N/A'}

Provide enhanced form analysis considering:
1. Movement consistency and rhythm
2. Proper angle ranges for abs exercises (45-65° up, 95-115° down)
3. Exercise tempo and control
4. Safety and injury prevention
5. Biomechanical efficiency

Return ONLY a numeric score from 0-100 representing enhanced form quality.
Consider the original score of \${formAccuracy}% but provide more accurate assessment based on the full movement data.

Score:\`;

// Make OpenAI API request
const openAIRequest = Functions.makeHttpRequest({
  url: "https://api.openai.com/v1/chat/completions",
  method: "POST",
  headers: {
    "Authorization": \`Bearer \${openAIApiKey}\`,
    "Content-Type": "application/json"
  },
  data: {
    model: "gpt-4",
    messages: [
      {
        role: "system",
        content: "You are a professional fitness trainer and biomechanics expert. Analyze exercise form data and provide accurate scoring."
      },
      {
        role: "user",
        content: analysisPrompt
      }
    ],
    max_tokens: 100,
    temperature: 0.1
  }
});

const openAIResponse = await openAIRequest;

if (openAIResponse.error) {
  console.error("OpenAI API error:", openAIResponse.error);
  throw Error(\`OpenAI API error: \${openAIResponse.error}\`);
}

// Extract score from response
const responseText = openAIResponse.data.choices[0].message.content;
const scoreMatch = responseText.match(/\\d+/);
const enhancedScore = scoreMatch ? parseInt(scoreMatch[0]) : formAccuracy;

// Validate score range
const finalScore = Math.max(0, Math.min(100, enhancedScore));

// Return encoded result
return Functions.encodeUint256(finalScore);
`;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, ...params } = body;

    switch (action) {
      case 'requestAnalysis':
        return await handleAnalysisRequest(params);
      case 'uploadSecrets':
        return await handleSecretsUpload(params);
      case 'checkBalance':
        return await handleBalanceCheck(params);
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Chainlink API error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

async function handleAnalysisRequest(params: {
  sessionData: unknown;
  subscriptionId: number;
  privateKey: string;
  secretsConfig?: { slotId: number; version: number };
}) {
  const { sessionData, subscriptionId, privateKey, secretsConfig } = params;

  if (!privateKey) {
    return NextResponse.json({ error: 'Private key required' }, { status: 400 });
  }

  try {
    // Setup provider and signer
    const provider = new ethers.providers.JsonRpcProvider(CHAINLINK_CONFIG.rpcUrl);
    const signer = new ethers.Wallet(privateKey, provider);
    
    // Create router contract
    const routerContract = new ethers.Contract(
      CHAINLINK_CONFIG.router,
      FUNCTIONS_ROUTER_ABI,
      signer
    );

    // Prepare request data
    const args = [JSON.stringify(sessionData)];
    
    let secretsBytes = "0x";
    if (secretsConfig && secretsConfig.slotId !== undefined) {
      // Encode DON-hosted encrypted secrets reference
      secretsBytes = ethers.utils.defaultAbiCoder.encode(
        ["uint8", "uint8", "uint8"],
        [1, secretsConfig.slotId, secretsConfig.version] // 1 = DONHosted location
      );
    }

    // Encode request data
    const requestData = ethers.utils.defaultAbiCoder.encode(
      ["string[]", "bytes"],
      [args, secretsBytes]
    );

    // Send request
    const tx = await routerContract.sendRequest(
      subscriptionId,
      requestData,
      1, // dataVersion
      CHAINLINK_CONFIG.gasLimit,
      ethers.utils.formatBytes32String(CHAINLINK_CONFIG.donId)
    );

    const receipt = await tx.wait();

    // Extract request ID from events
    const event = receipt.events?.find(
      (e: { event: string }) => e.event === "RequestSent"
    );
    const requestId = event?.args?.requestId;

    if (!requestId) {
      throw new Error("Failed to extract request ID");
    }

    return NextResponse.json({
      success: true,
      requestId: requestId,
      transactionHash: receipt.transactionHash,
      gasUsed: receipt.gasUsed.toString(),
    });

  } catch (error) {
    console.error('Analysis request failed:', error);
    return NextResponse.json(
      {
        error: 'Failed to submit analysis request',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

async function handleSecretsUpload(params: {
  secrets: Record<string, string>;
  privateKey: string;
  slotId?: number;
  expirationMinutes?: number;
}) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { secrets, privateKey, slotId = 0, expirationMinutes = 4320 } = params;

  try {
    // For now, return a mock response since SecretsManager causes build issues
    // In production, you would run the secrets setup script separately
    console.log('Secrets upload requested - use npm run setup:secrets script instead');

    return NextResponse.json({
      error: 'Secrets upload should be done via npm run setup:secrets script',
      details: 'Use the setup script to avoid build issues with the toolkit',
      suggestion: 'Run: npm run setup:secrets',
    }, { status: 400 });

  } catch (error) {
    console.error('Secrets upload failed:', error);
    return NextResponse.json(
      {
        error: 'Failed to upload secrets',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

async function handleBalanceCheck(params: { address: string }) {
  const { address } = params;

  try {
    const provider = new ethers.providers.JsonRpcProvider(CHAINLINK_CONFIG.rpcUrl);
    
    // LINK Token ABI (minimal)
    const LINK_TOKEN_ABI = [
      "function balanceOf(address account) external view returns (uint256)",
    ];
    
    const linkContract = new ethers.Contract(
      "0x0b9d5D9136855f6FEc3c0993feE6E9CE8a297846", // LINK on Fuji
      LINK_TOKEN_ABI,
      provider
    );

    const balance = await linkContract.balanceOf(address);
    const formattedBalance = ethers.utils.formatEther(balance);

    return NextResponse.json({
      success: true,
      balance: formattedBalance,
    });

  } catch (error) {
    console.error('Balance check failed:', error);
    return NextResponse.json(
      {
        error: 'Failed to check balance',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
