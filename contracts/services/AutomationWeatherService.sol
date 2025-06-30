// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {AutomationCompatibleInterface} from "@chainlink/contracts/src/v0.8/automation/AutomationCompatible.sol";
import "../interfaces/IChainlinkService.sol";

/**
 * @title AutomationWeatherService
 * @notice Handles weather-based bonuses using Chainlink Automation
 * @dev This service automatically updates seasonal and regional bonuses based on time and conditions
 */
contract AutomationWeatherService is AutomationCompatibleInterface, IAutomationService {
    // --- Structs ---
    struct WeatherBonus {
        uint256 seasonalBonus; // basis points (10000 = 100%)
        uint256 regionalBonus; // basis points
        uint256 lastUpdated;
        bool active;
    }

    struct RegionalData {
        string regionName;
        uint256 baseBonus;
        uint256 currentBonus;
        bool enabled;
    }

    // --- Constants ---
    bytes32 public constant SERVICE_TYPE = keccak256("AUTOMATION_SERVICE");
    uint256 public constant WEATHER_UPDATE_INTERVAL = 6 hours;
    uint256 public constant SEASONAL_UPDATE_INTERVAL = 1 days;

    // --- State Variables ---
    address public immutable i_coreContract;
    address public contractOwner;

    // Weather bonuses
    mapping(uint256 => uint256) public seasonalBonus; // month (1-12) => bonus in basis points
    mapping(string => RegionalData) public regionalData;
    string[] public regionList;

    uint256 public lastWeatherUpdate;
    uint256 public lastSeasonalUpdate;

    // Automation tracking
    uint256 public upkeepCounter;
    bool public automationEnabled;

    // --- Events ---
    event WeatherBonusesUpdated(uint256 timestamp);
    event SeasonalBonusUpdated(uint256 indexed month, uint256 bonus);
    event RegionalBonusUpdated(string indexed region, uint256 bonus);
    event UpkeepPerformed(uint256 indexed counter, string updateType);
    event RegionAdded(string indexed region, uint256 baseBonus);
    event RegionUpdated(string indexed region, uint256 newBonus, bool enabled);

    // --- Errors ---
    error OnlyOwner();
    error OnlyCoreContract();
    error InvalidMonth(uint256 month);
    error RegionNotFound(string region);
    error InvalidBonus(uint256 bonus);
    error AutomationDisabled();

    // --- Constructor ---
    constructor(address _coreContract) {
        i_coreContract = _coreContract;
        contractOwner = msg.sender;
        automationEnabled = true;

        // Initialize default bonuses
        _initializeSeasonalBonuses();
        _initializeRegionalBonuses();

        lastWeatherUpdate = block.timestamp;
        lastSeasonalUpdate = block.timestamp;
    }

    // --- Modifiers ---
    modifier onlyContractOwner() {
        if (msg.sender != contractOwner) revert OnlyOwner();
        _;
    }

    modifier onlyCoreContract() {
        if (msg.sender != i_coreContract) revert OnlyCoreContract();
        _;
    }

    modifier validMonth(uint256 month) {
        if (month == 0 || month > 12) revert InvalidMonth(month);
        _;
    }

    modifier automationActive() {
        if (!automationEnabled) revert AutomationDisabled();
        _;
    }

    // --- IChainlinkService Implementation ---

    function onWorkoutSubmitted(address user, uint256 sessionIndex) external override onlyCoreContract {
        // This service doesn't need to act on individual workout submissions
        // Weather bonuses are applied automatically through automation
    }

    function getServiceType() external pure override returns (bytes32) {
        return SERVICE_TYPE;
    }

    function isServiceReady() external view override returns (bool) {
        return automationEnabled &&
               regionList.length > 0 &&
               (block.timestamp - lastWeatherUpdate) < WEATHER_UPDATE_INTERVAL * 2; // Allow some buffer
    }

    function getServiceConfig() external view override returns (bytes memory) {
        return abi.encode(
            WEATHER_UPDATE_INTERVAL,
            SEASONAL_UPDATE_INTERVAL,
            automationEnabled,
            regionList.length,
            upkeepCounter
        );
    }

    // --- IAutomationService Implementation ---

    function checkUpkeep(bytes calldata) external view override(AutomationCompatibleInterface, IAutomationService) returns (bool upkeepNeeded, bytes memory performData) {
        bool weatherUpdateNeeded = (block.timestamp - lastWeatherUpdate) >= WEATHER_UPDATE_INTERVAL;
        bool seasonalUpdateNeeded = (block.timestamp - lastSeasonalUpdate) >= SEASONAL_UPDATE_INTERVAL;

        upkeepNeeded = automationEnabled && (weatherUpdateNeeded || seasonalUpdateNeeded);

        if (upkeepNeeded) {
            performData = abi.encode(weatherUpdateNeeded, seasonalUpdateNeeded);
        }
    }

    function performUpkeep(bytes calldata performData) external override(AutomationCompatibleInterface, IAutomationService) automationActive {
        (bool weatherUpdateNeeded, bool seasonalUpdateNeeded) = abi.decode(performData, (bool, bool));

        upkeepCounter++;

        if (weatherUpdateNeeded) {
            _updateWeatherBonuses();
            emit UpkeepPerformed(upkeepCounter, "weather");
        }

        if (seasonalUpdateNeeded) {
            _updateSeasonalBonuses();
            emit UpkeepPerformed(upkeepCounter, "seasonal");
        }
    }

    function getWeatherBonuses() external view override returns (
        uint256[12] memory seasonal,
        string[] memory regions,
        uint256[] memory regionalBonuses
    ) {
        // Fill seasonal array
        for (uint256 i = 1; i <= 12; i++) {
            seasonal[i-1] = seasonalBonus[i];
        }

        // Fill regional arrays
        regions = new string[](regionList.length);
        regionalBonuses = new uint256[](regionList.length);

        for (uint256 i = 0; i < regionList.length; i++) {
            regions[i] = regionList[i];
            regionalBonuses[i] = regionalData[regionList[i]].currentBonus;
        }
    }

    // --- Weather Bonus Functions ---

    function getSeasonalBonus(uint256 month) external view validMonth(month) returns (uint256) {
        return seasonalBonus[month];
    }

    function getRegionalBonus(string memory region) external view returns (uint256) {
        RegionalData memory data = regionalData[region];
        if (bytes(data.regionName).length == 0) revert RegionNotFound(region);
        return data.enabled ? data.currentBonus : 0;
    }

    function getCurrentSeasonalBonus() external view returns (uint256) {
        uint256 currentMonth = _getCurrentMonth();
        return seasonalBonus[currentMonth];
    }

    function calculateTotalBonus(string memory region) external view returns (uint256) {
        uint256 seasonal = seasonalBonus[_getCurrentMonth()];
        uint256 regional = regionalData[region].enabled ? regionalData[region].currentBonus : 0;

        // Combine bonuses (both are in basis points)
        return 10000 + seasonal + regional; // 10000 = 100% base
    }

    // --- Internal Functions ---

    function _initializeSeasonalBonuses() internal {
        // Winter months get higher bonuses (cold weather makes exercise harder)
        seasonalBonus[12] = 1000; // December - 10% bonus
        seasonalBonus[1] = 1000;  // January - 10% bonus
        seasonalBonus[2] = 1000;  // February - 10% bonus

        // Spring months
        seasonalBonus[3] = 500;   // March - 5% bonus
        seasonalBonus[4] = 200;   // April - 2% bonus
        seasonalBonus[5] = 200;   // May - 2% bonus

        // Summer months (heat makes exercise challenging)
        seasonalBonus[6] = 800;   // June - 8% bonus
        seasonalBonus[7] = 800;   // July - 8% bonus
        seasonalBonus[8] = 800;   // August - 8% bonus

        // Fall months
        seasonalBonus[9] = 300;   // September - 3% bonus
        seasonalBonus[10] = 300;  // October - 3% bonus
        seasonalBonus[11] = 500;  // November - 5% bonus
    }

    function _initializeRegionalBonuses() internal {
        // Initialize default regions
        _addRegion("temperate", 200);  // 2% bonus for temperate climates
        _addRegion("tropical", 600);   // 6% bonus for hot/humid climates
        _addRegion("desert", 1000);    // 10% bonus for extreme heat
        _addRegion("arctic", 1200);    // 12% bonus for extreme cold
        _addRegion("mountain", 800);   // 8% bonus for high altitude
        _addRegion("coastal", 300);    // 3% bonus for coastal areas
    }

    function _addRegion(string memory regionName, uint256 baseBonus) internal {
        regionalData[regionName] = RegionalData({
            regionName: regionName,
            baseBonus: baseBonus,
            currentBonus: baseBonus,
            enabled: true
        });
        regionList.push(regionName);
    }

    function _updateWeatherBonuses() internal {
        // Simulate weather variations based on blockchain data
        uint256 randomFactor = uint256(keccak256(abi.encodePacked(
            block.timestamp,
            block.prevrandao,
            upkeepCounter
        ))) % 300; // 0-299 basis points variation (0-2.99%)

        // Update regional bonuses with some variation
        for (uint256 i = 0; i < regionList.length; i++) {
            string memory region = regionList[i];
            RegionalData storage data = regionalData[region];

            if (data.enabled) {
                // Add some randomness while keeping within reasonable bounds
                uint256 variation = (randomFactor + i * 50) % 200; // Different variation per region

                if (block.timestamp % 2 == 0) {
                    data.currentBonus = data.baseBonus + variation;
                } else {
                    data.currentBonus = data.baseBonus > variation ? data.baseBonus - variation : data.baseBonus;
                }

                emit RegionalBonusUpdated(region, data.currentBonus);
            }
        }

        lastWeatherUpdate = block.timestamp;
        emit WeatherBonusesUpdated(block.timestamp);
    }

    function _updateSeasonalBonuses() internal {
        uint256 currentMonth = _getCurrentMonth();

        // Slight seasonal adjustments based on time progression
        uint256 dayOfMonth = ((block.timestamp / 86400) % 30) + 1;
        uint256 adjustment = (dayOfMonth * 10) / 30; // 0-10 basis points based on day of month

        // Update current month bonus
        uint256 baseBonus = _getBaseSeasonalBonus(currentMonth);
        seasonalBonus[currentMonth] = baseBonus + adjustment;

        lastSeasonalUpdate = block.timestamp;
        emit SeasonalBonusUpdated(currentMonth, seasonalBonus[currentMonth]);
    }

    function _getCurrentMonth() internal view returns (uint256) {
        // Approximate month calculation (not perfect but good enough for bonuses)
        return ((block.timestamp / 86400 + 4) / 30) % 12 + 1;
    }

    function _getBaseSeasonalBonus(uint256 month) internal pure returns (uint256) {
        if (month == 12 || month <= 2) return 1000; // Winter
        if (month >= 6 && month <= 8) return 800;   // Summer
        if (month == 3 || month == 11) return 500;  // Transition months
        return 200; // Spring/Fall
    }

    // --- Owner Functions ---

    function toggleAutomation(bool enabled) external onlyContractOwner {
        automationEnabled = enabled;
    }

    function addRegion(string memory regionName, uint256 baseBonus) external onlyContractOwner {
        if (baseBonus > 2000) revert InvalidBonus(baseBonus); // Max 20% bonus

        // Check if region already exists
        if (bytes(regionalData[regionName].regionName).length > 0) {
            revert("Region already exists");
        }

        _addRegion(regionName, baseBonus);
        emit RegionAdded(regionName, baseBonus);
    }

    function updateRegion(string memory regionName, uint256 newBonus, bool enabled) external onlyContractOwner {
        if (bytes(regionalData[regionName].regionName).length == 0) {
            revert RegionNotFound(regionName);
        }
        if (newBonus > 2000) revert InvalidBonus(newBonus);

        regionalData[regionName].baseBonus = newBonus;
        regionalData[regionName].currentBonus = newBonus;
        regionalData[regionName].enabled = enabled;

        emit RegionUpdated(regionName, newBonus, enabled);
    }

    function updateSeasonalBonus(uint256 month, uint256 bonus) external onlyContractOwner validMonth(month) {
        if (bonus > 1500) revert InvalidBonus(bonus); // Max 15% seasonal bonus

        seasonalBonus[month] = bonus;
        emit SeasonalBonusUpdated(month, bonus);
    }

    function forceWeatherUpdate() external onlyContractOwner {
        _updateWeatherBonuses();
    }

    function forceSeasonalUpdate() external onlyContractOwner {
        _updateSeasonalBonuses();
    }

    function updateWeatherFromAPI(
        string memory region,
        int256 temperature,
        uint256 humidity,
        uint256 uvIndex,
        string memory condition
    ) external onlyContractOwner {
        if (bytes(regionalData[region].regionName).length == 0) {
            revert RegionNotFound(region);
        }

        // Calculate bonus based on real weather data
        uint256 tempBonus = _calculateTemperatureBonus(temperature);
        uint256 humidityBonus = _calculateHumidityBonus(humidity);
        uint256 uvBonus = _calculateUVBonus(uvIndex);
        uint256 conditionBonus = _calculateConditionBonus(condition);

        uint256 totalBonus = tempBonus + humidityBonus + uvBonus + conditionBonus;
        if (totalBonus > 2000) totalBonus = 2000; // Max 20% bonus

        regionalData[region].currentBonus = totalBonus;
        lastWeatherUpdate = block.timestamp;

        emit RegionalBonusUpdated(region, totalBonus);
        emit WeatherBonusesUpdated(block.timestamp);
    }

    function _calculateTemperatureBonus(int256 temperature) internal pure returns (uint256) {
        // Temperature in Celsius, bonus in basis points
        if (temperature <= 0) return 1000; // Freezing: +10%
        if (temperature >= 35) return 800;  // Very hot: +8%
        if (temperature >= 30) return 600;  // Hot: +6%
        if (temperature <= 5) return 600;   // Very cold: +6%
        if (temperature <= 10) return 300;  // Cold: +3%
        if (temperature >= 25) return 200;  // Warm: +2%
        return 100; // Comfortable: +1%
    }

    function _calculateHumidityBonus(uint256 humidity) internal pure returns (uint256) {
        // Humidity percentage, bonus in basis points
        if (humidity >= 80) return 600; // Very humid: +6%
        if (humidity >= 70) return 400; // Humid: +4%
        if (humidity <= 30) return 200; // Very dry: +2%
        return 100; // Normal: +1%
    }

    function _calculateUVBonus(uint256 uvIndex) internal pure returns (uint256) {
        // UV index, bonus in basis points
        if (uvIndex >= 8) return 500; // Very high UV: +5%
        if (uvIndex >= 6) return 300; // High UV: +3%
        if (uvIndex >= 3) return 100; // Moderate UV: +1%
        return 0; // Low UV: no bonus
    }

    function _calculateConditionBonus(string memory condition) internal pure returns (uint256) {
        bytes32 conditionHash = keccak256(abi.encodePacked(condition));

        if (conditionHash == keccak256("rainy") || conditionHash == keccak256("stormy")) {
            return 800; // Rain/Storm: +8%
        }
        if (conditionHash == keccak256("snowy") || conditionHash == keccak256("blizzard")) {
            return 1000; // Snow/Blizzard: +10%
        }
        if (conditionHash == keccak256("foggy")) {
            return 400; // Fog: +4%
        }
        if (conditionHash == keccak256("windy")) {
            return 300; // Wind: +3%
        }
        if (conditionHash == keccak256("cloudy")) {
            return 200; // Cloudy: +2%
        }
        if (conditionHash == keccak256("sunny") || conditionHash == keccak256("clear")) {
            return 100; // Perfect weather: +1%
        }
        return 200; // Other conditions: +2%
    }

    function initializeRegionalBonuses() external onlyContractOwner {
        // Force initial bonus calculation for all regions
        for (uint256 i = 0; i < regionList.length; i++) {
            string memory region = regionList[i];
            RegionalData storage data = regionalData[region];
            if (data.enabled) {
                // Set current bonus to base bonus with some variation
                uint256 variation = (block.timestamp % 100) + 50; // 50-149 basis points
                data.currentBonus = data.baseBonus + variation;
                emit RegionalBonusUpdated(region, data.currentBonus);
            }
        }
        lastWeatherUpdate = block.timestamp;
        emit WeatherBonusesUpdated(block.timestamp);
    }

    function updateOwner(address newOwner) external onlyContractOwner {
        require(newOwner != address(0), "Invalid address");
        contractOwner = newOwner;
    }

    // --- View Functions ---

    function getServiceStats() external view returns (
        uint256 totalUpkeeps,
        uint256 timeSinceLastWeatherUpdate,
        uint256 timeSinceLastSeasonalUpdate,
        uint256 currentMonth,
        bool isAutomationEnabled
    ) {
        return (
            upkeepCounter,
            block.timestamp - lastWeatherUpdate,
            block.timestamp - lastSeasonalUpdate,
            _getCurrentMonth(),
            automationEnabled
        );
    }

    function getAllRegions() external view returns (string[] memory) {
        return regionList;
    }

    function getRegionData(string memory regionName) external view returns (RegionalData memory) {
        return regionalData[regionName];
    }

    function getNextUpkeepTime() external view returns (uint256 weatherUpkeep, uint256 seasonalUpkeep) {
        weatherUpkeep = lastWeatherUpdate + WEATHER_UPDATE_INTERVAL;
        seasonalUpkeep = lastSeasonalUpdate + SEASONAL_UPDATE_INTERVAL;
    }
}
