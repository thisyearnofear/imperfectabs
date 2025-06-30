// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../contracts/services/AutomationWeatherService.sol";
import "../contracts/ImperfectAbsHubMinimal.sol";

contract InitializeWeatherBonuses is Script {
    // Contract addresses
    address constant CORE_CONTRACT = 0x060F0F142D5BfC721a7C53D00B4bAD77Ad82C776;
    address constant AUTOMATION_SERVICE = 0xa946cF9253Fe3734F3ea794DaEB7D5Dd7fB81E03;

    // Service identifier
    bytes32 constant AUTOMATION_SERVICE_ID = keccak256("AUTOMATION_SERVICE");

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);

        address deployer = vm.addr(deployerPrivateKey);
        console.log("Initializing Weather Bonuses...");
        console.log("Deployer:", deployer);
        console.log("Core Contract:", CORE_CONTRACT);
        console.log("Automation Service:", AUTOMATION_SERVICE);
        console.log("");

        // Connect to core contract
        ImperfectAbsHubMinimal coreContract = ImperfectAbsHubMinimal(payable(CORE_CONTRACT));

        // Check if automation service is enabled
        bool isEnabled = coreContract.isServiceEnabled(AUTOMATION_SERVICE_ID);
        address serviceAddress = coreContract.getService(AUTOMATION_SERVICE_ID);

        console.log("Automation Service Status:");
        console.log("- Address:", serviceAddress);
        console.log("- Enabled:", isEnabled ? "YES" : "NO");
        console.log("");

        if (!isEnabled || serviceAddress == address(0)) {
            console.log("ERROR: Automation service is not enabled or registered!");
            console.log("Please enable the service first.");
            return;
        }

        // Connect to automation service
        AutomationWeatherService automationService = AutomationWeatherService(AUTOMATION_SERVICE);

        console.log("Current Service Stats:");
        (
            uint256 totalUpkeeps,
            uint256 timeSinceLastWeatherUpdate,
            uint256 timeSinceLastSeasonalUpdate,
            uint256 currentMonth,
            bool isAutomationEnabled
        ) = automationService.getServiceStats();

        console.log("- Total Upkeeps:", totalUpkeeps);
        console.log("- Hours Since Weather Update:", timeSinceLastWeatherUpdate / 3600);
        console.log("- Hours Since Seasonal Update:", timeSinceLastSeasonalUpdate / 3600);
        console.log("- Current Month:", currentMonth);
        console.log("- Automation Enabled:", isAutomationEnabled ? "YES" : "NO");
        console.log("");

        // Initialize regional bonuses
        console.log("Initializing regional bonuses...");
        automationService.initializeRegionalBonuses();
        console.log("Regional bonuses initialized!");

        // Force weather update
        console.log("Forcing weather update...");
        automationService.forceWeatherUpdate();
        console.log("Weather update completed!");

        // Force seasonal update
        console.log("Forcing seasonal update...");
        automationService.forceSeasonalUpdate();
        console.log("Seasonal update completed!");

        console.log("");
        console.log("Getting updated weather bonuses...");

        // Get all regions
        string[] memory regions = automationService.getAllRegions();
        console.log("Available regions:", regions.length);

        for (uint256 i = 0; i < regions.length && i < 6; i++) {
            string memory region = regions[i];
            uint256 bonus = automationService.getRegionalBonus(region);
            console.log("- Region:", region);
            console.log("  Bonus (basis points):", bonus);
        }

        console.log("");
        console.log("Getting seasonal bonuses...");
        for (uint256 month = 1; month <= 12; month++) {
            uint256 bonus = automationService.getSeasonalBonus(month);
            console.log("- Month", month, "bonus (basis points):", bonus);
        }

        console.log("");
        console.log("Weather Bonus System Status:");
        console.log("=============================");

        // Check upkeep times
        (uint256 nextWeatherUpkeep, uint256 nextSeasonalUpkeep) = automationService.getNextUpkeepTime();
        console.log("Next weather upkeep in hours:", (nextWeatherUpkeep - block.timestamp) / 3600);
        console.log("Next seasonal upkeep in hours:", (nextSeasonalUpkeep - block.timestamp) / 3600);

        // Test current month bonus
        uint256 currentSeasonalBonus = automationService.getCurrentSeasonalBonus();
        console.log("Current month seasonal bonus (basis points):", currentSeasonalBonus);

        // Test a region bonus
        string memory testRegion = "temperate";
        uint256 temperateBonus = automationService.getRegionalBonus(testRegion);
        console.log("Temperate region bonus (basis points):", temperateBonus);

        // Calculate total bonus for temperate region
        uint256 totalBonus = automationService.calculateTotalBonus(testRegion);
        console.log("Total bonus for temperate (basis points):", totalBonus);

        console.log("");
        console.log("SUCCESS: Weather bonuses are now initialized and active!");
        console.log("");
        console.log("Next Steps:");
        console.log("1. Submit a workout to test bonus application");
        console.log("2. Check frontend weather bonus display");
        console.log("3. Monitor automation upkeep execution");
        console.log("4. Weather bonuses will auto-update every 6 hours");

        vm.stopBroadcast();
    }

    // Helper function to manually trigger upkeep
    function manualUpkeep() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);

        AutomationWeatherService automationService = AutomationWeatherService(AUTOMATION_SERVICE);

        console.log("Checking if upkeep is needed...");
        (bool upkeepNeeded, bytes memory performData) = automationService.checkUpkeep("");

        if (upkeepNeeded) {
            console.log("Upkeep needed! Performing upkeep...");
            automationService.performUpkeep(performData);
            console.log("Upkeep completed!");
        } else {
            console.log("No upkeep needed at this time.");
        }

        vm.stopBroadcast();
    }

    // Function to test weather bonus calculation
    function testBonusCalculation() external view {
        AutomationWeatherService automationService = AutomationWeatherService(AUTOMATION_SERVICE);

        console.log("=== Weather Bonus Test ===");

        string[] memory testRegions = new string[](6);
        testRegions[0] = "temperate";
        testRegions[1] = "tropical";
        testRegions[2] = "desert";
        testRegions[3] = "arctic";
        testRegions[4] = "mountain";
        testRegions[5] = "coastal";

        for (uint256 i = 0; i < testRegions.length; i++) {
            string memory region = testRegions[i];
            uint256 totalBonus = automationService.calculateTotalBonus(region);
            console.log("Region:", region);
            console.log("Total Bonus (basis points):", totalBonus);
            console.log("");
        }

        // Test seasonal bonuses
        console.log("=== Seasonal Bonus Test ===");
        string[12] memory monthNames = [
            "January", "February", "March", "April", "May", "June",
            "July", "August", "September", "October", "November", "December"
        ];

        for (uint256 month = 1; month <= 12; month++) {
            uint256 bonus = automationService.getSeasonalBonus(month);
            console.log(monthNames[month-1], "bonus (basis points):", bonus);
        }
    }
}
