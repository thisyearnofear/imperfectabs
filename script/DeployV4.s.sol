// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../contracts/ImperfectAbsHubV4.sol";

contract DeployV4 is Script {
    // Avalanche Fuji Testnet Configuration for VRF v2.5
    address constant CCIP_ROUTER = 0xF694E193200268f9a4868e4Aa017A0118C9a8177;
    address constant VRF_COORDINATOR_V25 = 0x5C210eF41CD1a72de73bF76eC39637bB0d3d7BEE; // VRF v2.5 coordinator
    bytes32 constant KEY_HASH = 0xc799bd1e3bd4d1a41cd4968997a4e03dfd2a3c7c04b695881138580163f42887; // VRF v2.5 key hash
    // Large VRF v2.5 subscription ID
    uint256 constant VRF_SUBSCRIPTION_ID = 36696123203907487346372099809332344923918001683502737413897043327797370994639;

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);

        console.log("Deploying ImperfectAbsHubV4 with VRF v2.5...");
        console.log("CCIP Router:", CCIP_ROUTER);
        console.log("VRF Coordinator v2.5:", VRF_COORDINATOR_V25);
        console.log("Key Hash:", vm.toString(KEY_HASH));
        console.log("VRF Subscription ID:", VRF_SUBSCRIPTION_ID);

        ImperfectAbsHubV4 hub = new ImperfectAbsHubV4(
            CCIP_ROUTER,
            VRF_COORDINATOR_V25,
            VRF_SUBSCRIPTION_ID,
            KEY_HASH
        );

        console.log("ImperfectAbsHubV4 deployed at:", address(hub));
        console.log("");
        console.log("Next steps:");
        console.log("1. Add contract as consumer to VRF v2.5 subscription");
        console.log("2. Register contract for Chainlink Automation");
        console.log("3. Test daily challenge generation");
        console.log("4. Update frontend with new contract address");
        console.log("");
        console.log("VRF v2.5 Benefits:");
        console.log("- Native token payment support");
        console.log("- Better gas efficiency");
        console.log("- Enhanced subscription management");
        console.log("- Improved error handling");

        vm.stopBroadcast();
    }
}
