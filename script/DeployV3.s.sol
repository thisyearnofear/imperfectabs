// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../contracts/ImperfectAbsHubV3.sol";

contract DeployV3 is Script {
    // Avalanche Fuji Testnet Configuration
    address constant CCIP_ROUTER = 0xF694E193200268f9a4868e4Aa017A0118C9a8177;
    address constant VRF_COORDINATOR = 0x2eD832Ba664535e5886b75D64C46EB9a228C2610;
    bytes32 constant KEY_HASH = 0x354d2f95da55398f44b7cff77da56283d9c6c829a4bdf1bbcaf2ad6a4d081f61;
    uint64 constant VRF_SUBSCRIPTION_ID = 0; // Will need to be updated after creating subscription

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);

        console.log("Deploying ImperfectAbsHubV3...");
        console.log("CCIP Router:", CCIP_ROUTER);
        console.log("VRF Coordinator:", VRF_COORDINATOR);
        console.log("Key Hash:", vm.toString(KEY_HASH));

        ImperfectAbsHubV3 hub = new ImperfectAbsHubV3(
            CCIP_ROUTER,
            VRF_COORDINATOR,
            VRF_SUBSCRIPTION_ID, // Will need to update this
            KEY_HASH
        );

        console.log("ImperfectAbsHubV3 deployed at:", address(hub));
        console.log("");
        console.log("Next steps:");
        console.log("1. Create VRF subscription and fund with LINK");
        console.log("2. Add contract as VRF consumer");
        console.log("3. Register contract for Chainlink Automation");
        console.log("4. Update VRF subscription ID in contract");
        console.log("");
        console.log("Contract features:");
        console.log("- Cross-chain fitness tracking (CCIP)");
        console.log("- Automated weather bonuses (Automation)");
        console.log("- Random daily challenges (VRF)");
        console.log("- Simplified, reliable architecture");

        vm.stopBroadcast();
    }
}
