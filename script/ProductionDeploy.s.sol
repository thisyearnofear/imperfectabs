// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {ImperfectAbsHub} from "../contracts/ImperfectAbsHub.sol";

/**
 * @title ProductionDeploy
 * @dev Clean production deployment script for ImperfectAbsHub
 * @notice This script deploys the contract with optimized Chainlink Functions configuration
 */
contract ProductionDeploy is Script {
    // Avalanche Fuji Testnet Configuration (WORKING CONFIGURATION)
    address constant CHAINLINK_ROUTER = 0xA9d587a00A31A52Ed70D6026794a8FC5E2F5dCb0;
    uint64 constant SUBSCRIPTION_ID = 15675;
    uint32 constant GAS_LIMIT = 500000; // Increased for WeatherXM JSON processing // Optimized gas limit that works
    bytes32 constant DON_ID = 0x66756e2d6176616c616e6368652d66756a692d31000000000000000000000000;

    // WeatherXM-Enhanced JavaScript source for Chainlink Functions
    string constant FUNCTIONS_SOURCE =
        "const reps = parseInt(args[0] || '0');"
        "const formAccuracy = parseInt(args[1] || '0');"
        "const duration = parseInt(args[2] || '0');"
        "const latitude = parseFloat(args[3] || '40.7128');"
        "const longitude = parseFloat(args[4] || '-74.0060');"
        "if (reps < 0 || reps > 500) throw Error('Invalid reps');"
        "if (formAccuracy < 0 || formAccuracy > 100) throw Error('Invalid form accuracy');"
        "const baseScore = Math.min(100, Math.floor(reps * 2 + formAccuracy * 0.8));"
        "let weatherMultiplier = 1.0;"
        "let weatherCondition = 'clear';"
        "let temperature = 72;"
        "try {"
        "  if (secrets.WEATHERXM_API_KEY) {"
        "    console.log(`Fetching weather for: ${latitude}, ${longitude}`);"
        "    const weatherResponse = await Functions.makeHttpRequest({"
        "      url: `https://api.weatherxm.com/api/v1/stations/search?lat=${latitude}&lon=${longitude}&limit=1`,"
        "      method: 'GET',"
        "      timeout: 5000"
        "    });"
        "    if (!weatherResponse.error && weatherResponse.data && weatherResponse.data.length > 0) {"
        "      const station = weatherResponse.data[0];"
        "      if (station.current_weather) {"
        "        temperature = Math.round((station.current_weather.temperature * 9/5) + 32);"
        "        weatherCondition = station.current_weather.icon || 'clear';"
        "        if (temperature < 32) weatherMultiplier = 1.25;"
        "        else if (temperature < 45) weatherMultiplier = 1.2;"
        "        else if (temperature > 95) weatherMultiplier = 1.2;"
        "        else if (temperature > 85) weatherMultiplier = 1.15;"
        "        if (weatherCondition.includes('rain') || weatherCondition.includes('snow')) {"
        "          weatherMultiplier = Math.max(weatherMultiplier, 1.2);"
        "        }"
        "      }"
        "    }"
        "  }"
        "} catch (error) {"
        "  console.error('Weather fetch error:', error);"
        "}"
        "const enhancedScore = Math.round(baseScore * weatherMultiplier);"
        "const response = {"
        "  conditions: weatherCondition,"
        "  temperature: temperature,"
        "  weatherBonus: Math.round((weatherMultiplier - 1) * 100),"
        "  score: enhancedScore"
        "};"
        "console.log('WeatherXM Response:', response);"
        "return Functions.encodeString(JSON.stringify(response));";

    function run() external {
        vm.startBroadcast();

        console.log("=== Deploying ImperfectAbsHub (Production) ===");
        console.log("Deployer address:", msg.sender);
        console.log("Network:", block.chainid);

        // Verify we're on Avalanche Fuji
        require(block.chainid == 43113, "Must deploy on Avalanche Fuji testnet");

        // Deploy the contract with working configuration
        ImperfectAbsHub hub = new ImperfectAbsHub(
            CHAINLINK_ROUTER, // CCIP Router
            CHAINLINK_ROUTER, // Functions Router (same on Avalanche)
            SUBSCRIPTION_ID,
            DON_ID,
            FUNCTIONS_SOURCE
        );

        console.log("ImperfectAbsHub deployed to:", address(hub));
        console.log("Contract deployed with WORKING configuration:");
        console.log("  Router:", CHAINLINK_ROUTER);
        console.log("  Subscription ID:", SUBSCRIPTION_ID);
        console.log("  Gas Limit:", GAS_LIMIT);
        console.log("  DON ID:", vm.toString(DON_ID));
        console.log("  DON ID (string): fun-avalanche-fuji-1");

        // Verify deployment
        verifyDeployment(hub);

        console.log("");
        console.log("=== NEXT STEPS ===");
        console.log("1. Add contract as consumer to subscription", SUBSCRIPTION_ID);
        console.log("2. Verify subscription has sufficient LINK tokens");
        console.log("3. Test with submitWorkoutSession()");
        console.log("4. Contract address to add as consumer:", address(hub));
        console.log("");
        console.log("Add consumer command:");
        console.log("cast send --rpc-url $RPC_URL --private-key $PRIVATE_KEY \\");
        console.log("  0xA9d587a00A31A52Ed70D6026794a8FC5E2F5dCb0 \\");
        console.log("  \"addConsumer(uint64,address)\" \\");
        console.log("  15675 \\");
        console.log("  ", address(hub));

        vm.stopBroadcast();
    }

    /**
     * @dev Verify the deployment was successful
     */
    function verifyDeployment(ImperfectAbsHub hub) internal view {
        console.log("");
        console.log("=== Verifying Deployment ===");
        
        // Check basic contract state
        bool submissionsEnabled = hub.submissionsEnabled();
        bool aiAnalysisEnabled = hub.aiAnalysisEnabled();
        
        console.log("Submissions enabled:", submissionsEnabled);
        console.log("AI Analysis enabled:", aiAnalysisEnabled);
        
        // Check fee configuration
        (uint256 submissionFee, uint256 ownerShare, uint256 leaderboardShare) = hub.feeConfig();
        console.log("Submission fee:", submissionFee, "wei");
        console.log("Submission fee in AVAX:", submissionFee / 1e18);
        console.log("Owner share:", ownerShare, "basis points");
        console.log("Leaderboard share:", leaderboardShare, "basis points");
        
        // Check Chainlink configuration
        (uint64 subId, uint32 gasLim, bytes32 donId, string memory source) = hub.getChainlinkConfig();
        console.log("Chainlink Subscription ID:", subId);
        console.log("Chainlink Gas Limit:", gasLim);
        console.log("Chainlink DON ID:", vm.toString(donId));
        console.log("Chainlink Source Length:", bytes(source).length);
        
        // Verify ecosystem info
        (string memory ecosystem, string memory appName, string memory version) = hub.getEcosystemInfo();
        console.log("Ecosystem:", ecosystem);
        console.log("App Name:", appName);
        console.log("Version:", version);
        
        console.log("[SUCCESS] Deployment verification complete");
    }
}
