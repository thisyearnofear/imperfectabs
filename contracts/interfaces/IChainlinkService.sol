// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title IChainlinkService
 * @notice Interface for Chainlink service contracts that integrate with ImperfectAbsHub
 * @dev All Chainlink-specific contracts should implement this interface for standardized communication
 */
interface IChainlinkService {
    /**
     * @notice Called when a workout is submitted to the core contract
     * @param user Address of the user who submitted the workout
     * @param sessionIndex Index of the workout session
     * @dev This function should handle the service-specific logic (VRF request, CCIP message, etc.)
     */
    function onWorkoutSubmitted(address user, uint256 sessionIndex) external;

    /**
     * @notice Get the service type identifier
     * @return Service type as bytes32 (VRF_SERVICE, CCIP_SERVICE, etc.)
     */
    function getServiceType() external pure returns (bytes32);

    /**
     * @notice Check if the service is ready to handle requests
     * @return True if service is operational, false otherwise
     */
    function isServiceReady() external view returns (bool);

    /**
     * @notice Get service configuration details
     * @return config Service-specific configuration as bytes
     */
    function getServiceConfig() external view returns (bytes memory config);
}

/**
 * @title IVRFService
 * @notice Extended interface for VRF-specific functionality
 */
interface IVRFService is IChainlinkService {
    /**
     * @notice Get current daily challenge details
     * @return challengeType Type of challenge (0=reps, 1=duration, etc.)
     * @return target Target value to achieve
     * @return bonusMultiplier Bonus multiplier in basis points
     * @return expiresAt Challenge expiration timestamp
     * @return active Whether challenge is currently active
     */
    function getCurrentChallenge() external view returns (
        uint256 challengeType,
        uint256 target,
        uint256 bonusMultiplier,
        uint256 expiresAt,
        bool active
    );

    /**
     * @notice Check if user completed current challenge
     * @param user User address
     * @return True if user completed the challenge
     */
    function hasCompletedChallenge(address user) external view returns (bool);

    /**
     * @notice Manually request new challenge (owner only)
     */
    function requestNewChallenge() external;
}

/**
 * @title ICCIPService
 * @notice Extended interface for CCIP cross-chain functionality
 */
interface ICCIPService is IChainlinkService {
    /**
     * @notice Send score update to other chains
     * @param user User address
     * @param score Updated score
     * @param targetChains Array of chain selectors to send to
     */
    function sendScoreUpdate(
        address user,
        uint256 score,
        uint64[] calldata targetChains
    ) external;

    /**
     * @notice Get cross-chain score for a user
     * @param user User address
     * @param chainSelector Source chain selector
     * @return score Cross-chain score
     */
    function getCrossChainScore(address user, uint64 chainSelector) external view returns (uint256 score);

    /**
     * @notice Get list of supported chains
     * @return Array of supported chain selectors
     */
    function getSupportedChains() external view returns (uint64[] memory);
}

/**
 * @title IAutomationService
 * @notice Extended interface for Chainlink Automation functionality
 */
interface IAutomationService is IChainlinkService {
    /**
     * @notice Check if upkeep is needed
     * @return upkeepNeeded True if upkeep should be performed
     * @return performData Data to pass to performUpkeep
     */
    function checkUpkeep(bytes calldata checkData) external view returns (bool upkeepNeeded, bytes memory performData);

    /**
     * @notice Perform upkeep
     * @param performData Data from checkUpkeep
     */
    function performUpkeep(bytes calldata performData) external;

    /**
     * @notice Get current weather bonuses
     * @return seasonal Seasonal bonus mapping
     * @return regions Regional names array
     * @return regionalBonuses Regional bonus mapping
     */
    function getWeatherBonuses() external view returns (
        uint256[12] memory seasonal,
        string[] memory regions,
        uint256[] memory regionalBonuses
    );
}

/**
 * @title IFunctionsService
 * @notice Extended interface for Chainlink Functions functionality
 */
interface IFunctionsService is IChainlinkService {
    /**
     * @notice Request AI analysis for a workout session
     * @param user User address
     * @param sessionIndex Session index
     * @param sessionData Workout session data for analysis
     * @return requestId Chainlink Functions request ID
     */
    function requestAIAnalysis(
        address user,
        uint256 sessionIndex,
        bytes calldata sessionData
    ) external returns (bytes32 requestId);

    /**
     * @notice Get AI analysis result
     * @param requestId Chainlink Functions request ID
     * @return enhancedScore AI-calculated enhanced score
     * @return analysisComplete Whether analysis is complete
     * @return analysisData Additional analysis data
     */
    function getAnalysisResult(bytes32 requestId) external view returns (
        uint256 enhancedScore,
        bool analysisComplete,
        bytes memory analysisData
    );

    /**
     * @notice Get pending analysis requests for a user
     * @param user User address
     * @return Array of pending request IDs
     */
    function getPendingRequests(address user) external view returns (bytes32[] memory);
}

/**
 * @title IServiceRegistry
 * @notice Interface for managing service registry in the core contract
 */
interface IServiceRegistry {
    /**
     * @notice Register a new service
     * @param serviceId Service identifier
     * @param serviceAddress Service contract address
     */
    function registerService(bytes32 serviceId, address serviceAddress) external;

    /**
     * @notice Toggle service enabled/disabled
     * @param serviceId Service identifier
     * @param enabled Whether service should be enabled
     */
    function toggleService(bytes32 serviceId, bool enabled) external;

    /**
     * @notice Get service address
     * @param serviceId Service identifier
     * @return Service contract address
     */
    function getService(bytes32 serviceId) external view returns (address);

    /**
     * @notice Check if service is enabled
     * @param serviceId Service identifier
     * @return Whether service is enabled
     */
    function isServiceEnabled(bytes32 serviceId) external view returns (bool);

    /**
     * @notice Get all registered services
     * @return serviceIds Array of service identifiers
     * @return serviceAddresses Array of service addresses
     * @return enabledStates Array of enabled states
     */
    function getAllServices() external view returns (
        bytes32[] memory serviceIds,
        address[] memory serviceAddresses,
        bool[] memory enabledStates
    );
}

/**
 * @title ServiceEvents
 * @notice Events emitted by service contracts
 */
interface ServiceEvents {
    event ServiceInitialized(bytes32 indexed serviceType, address indexed serviceAddress);
    event ServiceRequest(bytes32 indexed serviceType, address indexed user, bytes32 indexed requestId);
    event ServiceResponse(bytes32 indexed serviceType, bytes32 indexed requestId, bool success);
    event ServiceError(bytes32 indexed serviceType, bytes32 indexed requestId, string error);
    event ServiceConfigUpdated(bytes32 indexed serviceType, bytes newConfig);
}
