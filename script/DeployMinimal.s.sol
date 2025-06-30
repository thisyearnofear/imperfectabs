// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../contracts/ImperfectAbsHubMinimal.sol";

contract DeployMinimal is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);

        console.log("Deploying ImperfectAbsHubMinimal...");
        console.log("Deployer:", vm.addr(deployerPrivateKey));
        console.log("Chain ID:", block.chainid);

        ImperfectAbsHubMinimal hub = new ImperfectAbsHubMinimal();

        console.log("ImperfectAbsHubMinimal deployed at:", address(hub));
        console.log("");
        console.log("Contract Details:");
        console.log("- Max reps per session:", hub.MAX_REPS_PER_SESSION());
        console.log("- Submission cooldown:", hub.SUBMISSION_COOLDOWN(), "seconds");
        console.log("- Submission fee:", hub.SUBMISSION_FEE(), "wei");
        console.log("- Owner:", hub.owner());
        console.log("");
        console.log("Next steps:");
        console.log("1. Update frontend CONTRACT_ADDRESS to:", address(hub));
        console.log("2. Test workout submission");
        console.log("3. Check leaderboard functionality");
        console.log("4. Add Chainlink services later when ready");
        console.log("");
        console.log("Ready for testing!");

        vm.stopBroadcast();
    }
}
