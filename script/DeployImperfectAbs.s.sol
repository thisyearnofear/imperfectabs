// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../contracts/ImperfectAbsLeaderboard.sol";

contract DeployImperfectAbs is Script {
    // Avalanche Fuji configuration
    address constant ROUTER = 0xA9d587a00A31A52Ed70D6026794a8FC5E2F5dCb0;
    uint64 constant SUBSCRIPTION_ID = 15675;
    uint32 constant GAS_LIMIT = 500000;
    bytes32 constant DON_ID = 0x66756e2d6176616c616e6368652d66756a692d31000000000000000000000000;

    // Functions source code
    string constant SOURCE =
        "// Chainlink Functions JavaScript code for Imperfect Abs\n"
        "// This function analyzes workout data and provides AI-enhanced feedback\n"
        "\n"
        "// Input arguments from the smart contract:\n"
        "// args[0] = reps (number of repetitions)\n"
        "// args[1] = formAccuracy (percentage 0-100)\n"
        "// args[2] = duration (workout duration in seconds)\n"
        "// args[3] = exerciseType (type of exercise, default: \"abs\")\n"
        "\n"
        "const reps = parseInt(args[0] || \"0\");\n"
        "const formAccuracy = parseInt(args[1] || \"0\");\n"
        "const duration = parseInt(args[2] || \"0\");\n"
        "const exerciseType = args[3] || \"abs\";\n"
        "\n"
        "// Validate inputs\n"
        "if (reps < 0 || reps > 500) {\n"
        "  throw Error(\"Invalid reps count\");\n"
        "}\n"
        "\n"
        "if (formAccuracy < 0 || formAccuracy > 100) {\n"
        "  throw Error(\"Invalid form accuracy\");\n"
        "}\n"
        "\n"
        "if (duration < 0 || duration > 3600) {\n"
        "  throw Error(\"Invalid duration\");\n"
        "}\n"
        "\n"
        "// Calculate performance metrics\n"
        "const repsPerMinute = duration > 0 ? Math.round((reps / duration) * 60) : 0;\n"
        "const efficiency = formAccuracy > 0 ? Math.round((reps * formAccuracy) / 100) : 0;\n"
        "\n"
        "// Performance scoring algorithm\n"
        "let baseScore = Math.min(100, Math.floor((reps * 2) + (formAccuracy * 0.8)));\n"
        "let performanceLevel = \"Beginner\";\n"
        "\n"
        "if (baseScore >= 80 && formAccuracy >= 75) {\n"
        "  performanceLevel = \"Advanced\";\n"
        "} else if (baseScore >= 60 && formAccuracy >= 60) {\n"
        "  performanceLevel = \"Intermediate\";\n"
        "}\n"
        "\n"
        "// Generate feedback based on performance\n"
        "let feedback = \"\";\n"
        "let recommendations = [];\n"
        "\n"
        "if (formAccuracy >= 85) {\n"
        "  feedback = \"Excellent form! Your technique is spot on.\";\n"
        "} else if (formAccuracy >= 70) {\n"
        "  feedback = \"Good form overall, keep working on consistency.\";\n"
        "  recommendations.push(\"Focus on maintaining proper posture throughout\");\n"
        "} else if (formAccuracy >= 50) {\n"
        "  feedback = \"Form needs improvement. Quality over quantity!\";\n"
        "  recommendations.push(\"Slow down and focus on proper technique\");\n"
        "  recommendations.push(\"Consider working with a trainer\");\n"
        "} else {\n"
        "  feedback = \"Form significantly needs work. Start with basics.\";\n"
        "  recommendations.push(\"Review proper form tutorials\");\n"
        "  recommendations.push(\"Start with fewer reps at higher quality\");\n"
        "}\n"
        "\n"
        "// Rep-specific feedback\n"
        "if (reps >= 50) {\n"
        "  recommendations.push(\"Great endurance! Try increasing difficulty\");\n"
        "} else if (reps >= 20) {\n"
        "  recommendations.push(\"Good rep count, focus on form improvement\");\n"
        "} else if (reps > 0) {\n"
        "  recommendations.push(\"Building up gradually - keep it consistent\");\n"
        "}\n"
        "\n"
        "// Duration feedback\n"
        "if (duration > 0) {\n"
        "  if (repsPerMinute > 30) {\n"
        "    recommendations.push(\"Slow down for better form control\");\n"
        "  } else if (repsPerMinute < 10) {\n"
        "    recommendations.push(\"Try to maintain a steady pace\");\n"
        "  }\n"
        "}\n"
        "\n"
        "// Create analysis result\n"
        "const analysis = {\n"
        "  score: baseScore,\n"
        "  performanceLevel: performanceLevel,\n"
        "  metrics: {\n"
        "    reps: reps,\n"
        "    formAccuracy: formAccuracy,\n"
        "    duration: duration,\n"
        "    repsPerMinute: repsPerMinute,\n"
        "    efficiency: efficiency\n"
        "  },\n"
        "  feedback: feedback,\n"
        "  recommendations: recommendations.slice(0, 3), // Limit to 3 recommendations\n"
        "  timestamp: Math.floor(Date.now() / 1000),\n"
        "  exerciseType: exerciseType\n"
        "};\n"
        "\n"
        "// Return the analysis as encoded string\n"
        "return Functions.encodeString(JSON.stringify(analysis));";

    function run() external {
        string memory privateKeyStr = vm.envString("PRIVATE_KEY");
        uint256 deployerPrivateKey;

        // Handle private key with or without 0x prefix
        if (bytes(privateKeyStr).length > 2 &&
            bytes(privateKeyStr)[0] == 0x30 &&
            bytes(privateKeyStr)[1] == 0x78) {
            // Has 0x prefix
            deployerPrivateKey = vm.parseUint(privateKeyStr);
        } else {
            // No 0x prefix, add it
            deployerPrivateKey = vm.parseUint(string(abi.encodePacked("0x", privateKeyStr)));
        }

        vm.startBroadcast(deployerPrivateKey);

        // Deploy the ImperfectAbsLeaderboard contract
        ImperfectAbsLeaderboard leaderboard = new ImperfectAbsLeaderboard(
            ROUTER,
            SUBSCRIPTION_ID,
            GAS_LIMIT,
            DON_ID,
            SOURCE
        );

        console.log("ImperfectAbsLeaderboard deployed to:", address(leaderboard));
        console.log("Deployer address:", vm.addr(deployerPrivateKey));
        console.log("Contract deployed with:");
        console.log("  Router:", ROUTER);
        console.log("  Subscription ID:", SUBSCRIPTION_ID);
        console.log("  Gas Limit:", GAS_LIMIT);
        console.log("  DON ID:", vm.toString(DON_ID));
        console.log("  DON ID (string): fun-avalanche-fuji-1");

        // Log next steps
        console.log("\n=== NEXT STEPS ===");
        console.log("1. Add contract as consumer to subscription 15675");
        console.log("2. Fund subscription with LINK tokens");
        console.log("3. Test with submitWorkoutSession()");
        console.log("4. Contract address to add as consumer:", address(leaderboard));

        vm.stopBroadcast();
    }

    // Helper function to deploy with custom parameters
    function deployWithCustomParams(
        address router,
        uint64 subscriptionId,
        uint32 gasLimit,
        bytes32 donId,
        string memory source
    ) external {
        string memory privateKeyStr = vm.envString("PRIVATE_KEY");
        uint256 deployerPrivateKey;

        // Handle private key with or without 0x prefix
        if (bytes(privateKeyStr).length > 2 &&
            bytes(privateKeyStr)[0] == 0x30 &&
            bytes(privateKeyStr)[1] == 0x78) {
            // Has 0x prefix
            deployerPrivateKey = vm.parseUint(privateKeyStr);
        } else {
            // No 0x prefix, add it
            deployerPrivateKey = vm.parseUint(string(abi.encodePacked("0x", privateKeyStr)));
        }

        vm.startBroadcast(deployerPrivateKey);

        ImperfectAbsLeaderboard leaderboard = new ImperfectAbsLeaderboard(
            router,
            subscriptionId,
            gasLimit,
            donId,
            source
        );

        console.log("ImperfectAbsLeaderboard deployed to:", address(leaderboard));
        console.log("Deployer address:", vm.addr(deployerPrivateKey));

        vm.stopBroadcast();
    }

    // Utility function to verify deployment parameters
    function verifyDeploymentParams() external view {
        console.log("=== DEPLOYMENT PARAMETERS ===");
        console.log("Router:", ROUTER);
        console.log("Subscription ID:", SUBSCRIPTION_ID);
        console.log("Gas Limit:", GAS_LIMIT);
        console.log("DON ID (hex):", vm.toString(DON_ID));
        console.log("DON ID (string): fun-avalanche-fuji-1");
        console.log("Source code length:", bytes(SOURCE).length);
    }
}
