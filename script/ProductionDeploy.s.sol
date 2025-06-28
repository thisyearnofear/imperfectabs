// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {ImperfectAbsLeaderboard} from "../contracts/ImperfectAbsLeaderboard.sol";

/**
 * @title ProductionDeploy
 * @dev Clean production deployment script for ImperfectAbsLeaderboard
 * @notice This script deploys the contract with optimized Chainlink Functions configuration
 */
contract ProductionDeploy is Script {
    // Avalanche Fuji Testnet Configuration (WORKING CONFIGURATION)
    address constant CHAINLINK_ROUTER = 0xA9d587a00A31A52Ed70D6026794a8FC5E2F5dCb0;
    uint64 constant SUBSCRIPTION_ID = 15675;
    uint32 constant GAS_LIMIT = 300000; // Optimized gas limit that works
    bytes32 constant DON_ID = 0x66756e2d6176616c616e6368652d66756a692d31000000000000000000000000;

    // JavaScript source for Chainlink Functions (WORKING VERSION)
    string constant FUNCTIONS_SOURCE =
        "const reps = parseInt(args[0]);"
        "const formAccuracy = parseInt(args[1]);"
        "const duration = parseInt(args[2]);"
        "const score = Math.min(100, (reps * 2) + (formAccuracy * 0.8));"
        "return Functions.encodeString(score.toString());";

    function run() external {
        vm.startBroadcast();

        console.log("=== Deploying ImperfectAbsLeaderboard (Production) ===");
        console.log("Deployer address:", msg.sender);
        console.log("Network:", block.chainid);

        // Verify we're on Avalanche Fuji
        require(block.chainid == 43113, "Must deploy on Avalanche Fuji testnet");

        // Deploy the contract with working configuration
        ImperfectAbsLeaderboard leaderboard = new ImperfectAbsLeaderboard(
            CHAINLINK_ROUTER,
            SUBSCRIPTION_ID,
            GAS_LIMIT,
            DON_ID,
            FUNCTIONS_SOURCE
        );

        console.log("ImperfectAbsLeaderboard deployed to:", address(leaderboard));
        console.log("Contract deployed with WORKING configuration:");
        console.log("  Router:", CHAINLINK_ROUTER);
        console.log("  Subscription ID:", SUBSCRIPTION_ID);
        console.log("  Gas Limit:", GAS_LIMIT);
        console.log("  DON ID:", vm.toString(DON_ID));
        console.log("  DON ID (string): fun-avalanche-fuji-1");

        // Verify deployment
        verifyDeployment(leaderboard);

        console.log("");
        console.log("=== NEXT STEPS ===");
        console.log("1. Add contract as consumer to subscription", SUBSCRIPTION_ID);
        console.log("2. Verify subscription has sufficient LINK tokens");
        console.log("3. Test with submitWorkoutSession()");
        console.log("4. Contract address to add as consumer:", address(leaderboard));
        console.log("");
        console.log("Add consumer command:");
        console.log("cast send --rpc-url $RPC_URL --private-key $PRIVATE_KEY \\");
        console.log("  0xA9d587a00A31A52Ed70D6026794a8FC5E2F5dCb0 \\");
        console.log("  \"addConsumer(uint64,address)\" \\");
        console.log("  15675 \\");
        console.log("  ", address(leaderboard));

        vm.stopBroadcast();
    }

    /**
     * @dev Verify the deployment was successful
     */
    function verifyDeployment(ImperfectAbsLeaderboard leaderboard) internal view {
        console.log("");
        console.log("=== Verifying Deployment ===");
        
        // Check basic contract state
        bool submissionsEnabled = leaderboard.submissionsEnabled();
        bool aiAnalysisEnabled = leaderboard.aiAnalysisEnabled();
        
        console.log("Submissions enabled:", submissionsEnabled);
        console.log("AI Analysis enabled:", aiAnalysisEnabled);
        
        // Check fee configuration
        (uint256 submissionFee, uint256 ownerShare, uint256 leaderboardShare) = leaderboard.feeConfig();
        console.log("Submission fee:", submissionFee, "wei");
        console.log("Submission fee in AVAX:", submissionFee / 1e18);
        console.log("Owner share:", ownerShare, "basis points");
        console.log("Leaderboard share:", leaderboardShare, "basis points");
        
        // Check Chainlink configuration
        (uint64 subId, uint32 gasLim, bytes32 donId, string memory source) = leaderboard.getChainlinkConfig();
        console.log("Chainlink Subscription ID:", subId);
        console.log("Chainlink Gas Limit:", gasLim);
        console.log("Chainlink DON ID:", vm.toString(donId));
        
        // Verify ecosystem info
        (string memory ecosystem, string memory appName, string memory version) = leaderboard.getEcosystemInfo();
        console.log("Ecosystem:", ecosystem);
        console.log("App Name:", appName);
        console.log("Version:", version);
        
        console.log("[SUCCESS] Deployment verification complete");
    }
}
