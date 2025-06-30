// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../contracts/services/VRFChallengeService.sol";
import "../contracts/services/CCIPCrossChainService.sol";
import "../contracts/services/AutomationWeatherService.sol";
import "../contracts/ImperfectAbsHubMinimal.sol";

contract DeployServices is Script {
    // Avalanche Fuji Testnet Configuration
    address constant CCIP_ROUTER = 0xF694E193200268f9a4868e4Aa017A0118C9a8177;
    address constant VRF_COORDINATOR_V25 = 0x5C210eF41CD1a72de73bF76eC39637bB0d3d7BEE;
    address constant LINK_TOKEN = 0x0b9d5D9136855f6FEc3c0993feE6E9CE8a297846;
    bytes32 constant KEY_HASH = 0xc799bd1e3bd4d1a41cd4968997a4e03dfd2a3c7c04b695881138580163f42887;
    uint256 constant VRF_SUBSCRIPTION_ID = 36696123203907487346372099809332344923918001683502737413897043327797370994639;

    // Core contract address (update this to your deployed minimal contract)
    address constant CORE_CONTRACT = 0x060F0F142D5BfC721a7C53D00B4bAD77Ad82C776;

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);

        address deployer = vm.addr(deployerPrivateKey);
        console.log("Deploying Chainlink Services...");
        console.log("Deployer:", deployer);
        console.log("Core Contract:", CORE_CONTRACT);
        console.log("Chain ID:", block.chainid);
        console.log("");

        // Deploy VRF Challenge Service
        console.log("1. Deploying VRF Challenge Service...");
        VRFChallengeService vrfService = new VRFChallengeService(
            VRF_COORDINATOR_V25,
            VRF_SUBSCRIPTION_ID,
            KEY_HASH,
            CORE_CONTRACT
        );
        console.log("   VRF Service deployed at:", address(vrfService));

        // Deploy CCIP Cross-Chain Service
        console.log("2. Deploying CCIP Cross-Chain Service...");
        CCIPCrossChainService ccipService = new CCIPCrossChainService(
            CCIP_ROUTER,
            LINK_TOKEN,
            CORE_CONTRACT
        );
        console.log("   CCIP Service deployed at:", address(ccipService));

        // Deploy Automation Weather Service
        console.log("3. Deploying Automation Weather Service...");
        AutomationWeatherService automationService = new AutomationWeatherService(
            CORE_CONTRACT
        );
        console.log("   Automation Service deployed at:", address(automationService));

        console.log("");
        console.log("Service Configuration:");
        console.log("- VRF Subscription ID:", VRF_SUBSCRIPTION_ID);
        console.log("- VRF Key Hash:", vm.toString(KEY_HASH));
        console.log("- CCIP Router:", CCIP_ROUTER);
        console.log("- LINK Token:", LINK_TOKEN);

        console.log("");
        console.log("Next Steps:");
        console.log("1. Register services with core contract:");
        console.log("   - VRF_SERVICE:", address(vrfService));
        console.log("   - CCIP_SERVICE:", address(ccipService));
        console.log("   - AUTOMATION_SERVICE:", address(automationService));
        console.log("");
        console.log("2. Set up Chainlink subscriptions:");
        console.log("   - Add VRF service as consumer to subscription", VRF_SUBSCRIPTION_ID);
        console.log("   - Fund CCIP service with LINK tokens");
        console.log("   - Register Automation service for upkeep");
        console.log("");
        console.log("3. Enable services in core contract:");
        console.log("   - Call toggleService() for each service");
        console.log("");
        console.log("4. Test individual services before full integration");

        // Register services with core contract
        ImperfectAbsHubMinimal coreContract = ImperfectAbsHubMinimal(payable(CORE_CONTRACT));

        console.log("");
        console.log("Registering services with core contract...");

        // Register VRF Service
        bytes32 vrfServiceId = keccak256("VRF_SERVICE");
        coreContract.registerService(vrfServiceId, address(vrfService));
        console.log("VRF Service registered");

        // Register CCIP Service
        bytes32 ccipServiceId = keccak256("CCIP_SERVICE");
        coreContract.registerService(ccipServiceId, address(ccipService));
        console.log("CCIP Service registered");

        // Register Automation Service
        bytes32 automationServiceId = keccak256("AUTOMATION_SERVICE");
        coreContract.registerService(automationServiceId, address(automationService));
        console.log("Automation Service registered");

        console.log("");
        console.log("All services registered successfully!");
        console.log("Services are registered but DISABLED by default.");
        console.log("Enable them individually as they're configured.");

        console.log("");
        console.log("Deployment Summary:");
        console.log("==================");
        console.log("Core Contract:      ", CORE_CONTRACT);
        console.log("VRF Service:        ", address(vrfService));
        console.log("CCIP Service:       ", address(ccipService));
        console.log("Automation Service: ", address(automationService));
        console.log("");
        console.log("Ready for Chainlink integration!");

        vm.stopBroadcast();
    }
}
