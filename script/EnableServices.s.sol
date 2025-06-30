// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../contracts/ImperfectAbsHubMinimal.sol";

contract EnableServices is Script {
    // Contract addresses
    address constant CORE_CONTRACT = 0x060F0F142D5BfC721a7C53D00B4bAD77Ad82C776;
    address constant VRF_SERVICE = 0x11640405F7552124dB36195158e59Ff791Df47C2;
    address constant CCIP_SERVICE = 0xB6084cff5e0345432De6CE0d4a6EBdfDc7C4E82A;
    address constant AUTOMATION_SERVICE = 0xa946cF9253Fe3734F3ea794DaEB7D5Dd7fB81E03;

    // Service identifiers
    bytes32 constant VRF_SERVICE_ID = keccak256("VRF_SERVICE");
    bytes32 constant CCIP_SERVICE_ID = keccak256("CCIP_SERVICE");
    bytes32 constant AUTOMATION_SERVICE_ID = keccak256("AUTOMATION_SERVICE");

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);

        address deployer = vm.addr(deployerPrivateKey);
        console.log("Enabling Chainlink Services...");
        console.log("Deployer:", deployer);
        console.log("Core Contract:", CORE_CONTRACT);
        console.log("");

        ImperfectAbsHubMinimal coreContract = ImperfectAbsHubMinimal(payable(CORE_CONTRACT));

        // Check current service status
        console.log("Current Service Status:");
        console.log("- VRF Service:", coreContract.isServiceEnabled(VRF_SERVICE_ID) ? "ENABLED" : "DISABLED");
        console.log("- CCIP Service:", coreContract.isServiceEnabled(CCIP_SERVICE_ID) ? "ENABLED" : "DISABLED");
        console.log("- Automation Service:", coreContract.isServiceEnabled(AUTOMATION_SERVICE_ID) ? "ENABLED" : "DISABLED");
        console.log("");

        // Enable Automation Service (upkeep is registered)
        console.log("1. Enabling Automation Service...");
        coreContract.toggleService(AUTOMATION_SERVICE_ID, true);
        console.log("   Automation Service ENABLED");

        // Enable VRF Service (consumer added to subscription)
        console.log("2. Enabling VRF Service...");
        coreContract.toggleService(VRF_SERVICE_ID, true);
        console.log("   VRF Service ENABLED");

        // Skip CCIP for now (needs LINK funding)
        console.log("3. Skipping CCIP Service (needs LINK funding first)");
        console.log("   To enable CCIP: Send ~10 LINK to", CCIP_SERVICE);

        console.log("");
        console.log("Updated Service Status:");
        console.log("- VRF Service:", coreContract.isServiceEnabled(VRF_SERVICE_ID) ? "ENABLED" : "DISABLED");
        console.log("- CCIP Service:", coreContract.isServiceEnabled(CCIP_SERVICE_ID) ? "ENABLED" : "DISABLED");
        console.log("- Automation Service:", coreContract.isServiceEnabled(AUTOMATION_SERVICE_ID) ? "ENABLED" : "DISABLED");

        console.log("");
        console.log("Service Registry Contents:");
        console.log("- VRF Service Address:", coreContract.getService(VRF_SERVICE_ID));
        console.log("- CCIP Service Address:", coreContract.getService(CCIP_SERVICE_ID));
        console.log("- Automation Service Address:", coreContract.getService(AUTOMATION_SERVICE_ID));

        console.log("");
        console.log("Next Steps:");
        console.log("1. Submit a workout to test service integration");
        console.log("2. Check VRF challenges are being generated");
        console.log("3. Verify weather bonuses are updating via Automation");
        console.log("4. Fund CCIP service with LINK when ready for cross-chain");

        console.log("");
        console.log("Test Commands:");
        console.log("- Submit workout via frontend");
        console.log("- Check service logs for activity");
        console.log("- Monitor Automation upkeep executions");

        vm.stopBroadcast();
    }

    // Helper function to check individual service status
    function checkServiceStatus() external view {
        ImperfectAbsHubMinimal coreContract = ImperfectAbsHubMinimal(payable(CORE_CONTRACT));

        console.log("=== Service Status Check ===");
        console.log("VRF Service:");
        console.log("  Address:", coreContract.getService(VRF_SERVICE_ID));
        console.log("  Enabled:", coreContract.isServiceEnabled(VRF_SERVICE_ID));

        console.log("CCIP Service:");
        console.log("  Address:", coreContract.getService(CCIP_SERVICE_ID));
        console.log("  Enabled:", coreContract.isServiceEnabled(CCIP_SERVICE_ID));

        console.log("Automation Service:");
        console.log("  Address:", coreContract.getService(AUTOMATION_SERVICE_ID));
        console.log("  Enabled:", coreContract.isServiceEnabled(AUTOMATION_SERVICE_ID));
    }
}
