// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

// OpenZeppelin Imports
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title ImperfectAbsHubMinimal
 * @author Imperfect Abs Team
 * @notice A minimal, working version of the fitness tracker without Chainlink dependencies
 * @dev This version focuses on core functionality: submissions, leaderboard, and basic scoring
 */
contract ImperfectAbsHubMinimal is ReentrancyGuard {
    // --- Custom Errors ---
    error InvalidReps(uint256 provided, uint256 max);
    error InvalidAccuracy(uint256 provided);
    error CooldownActive(uint256 timeRemaining);
    error InsufficientFee(uint256 provided, uint256 required);

    // --- Structs ---
    struct LocalAbsScore {
        address user;
        uint256 totalReps;
        uint256 averageFormAccuracy;
        uint256 bestStreak;
        uint256 sessionsCompleted;
        uint256 timestamp;
    }

    struct WorkoutSession {
        uint256 reps;
        uint256 formAccuracy;
        uint256 streak;
        uint256 duration;
        uint256 timestamp;
        string region;
    }

    // --- Constants ---
    uint256 public constant MAX_REPS_PER_SESSION = 500;
    uint256 public constant SUBMISSION_COOLDOWN = 60 seconds;
    uint256 public constant SUBMISSION_FEE = 0.01 ether; // 0.01 AVAX

    // --- State Variables ---

    // Core fitness tracking
    LocalAbsScore[] public leaderboard;
    mapping(address => uint256) public userIndex; // 1-based index (0 means not on leaderboard)
    mapping(address => WorkoutSession[]) public userSessions;
    mapping(address => uint256) public lastSubmissionTime;

    // Contract owner for fee collection
    address public owner;

    // Service registry for modular Chainlink integration
    mapping(bytes32 => address) public services;
    mapping(bytes32 => bool) public serviceEnabled;

    // Service identifiers
    bytes32 public constant VRF_SERVICE = keccak256("VRF_SERVICE");
    bytes32 public constant CCIP_SERVICE = keccak256("CCIP_SERVICE");
    bytes32 public constant AUTOMATION_SERVICE = keccak256("AUTOMATION_SERVICE");
    bytes32 public constant FUNCTIONS_SERVICE = keccak256("FUNCTIONS_SERVICE");

    // --- Events ---
    event WorkoutSessionSubmitted(address indexed user, uint256 sessionIndex, uint256 reps, string region);
    event LeaderboardScoreUpdated(address indexed user, uint256 totalReps, uint256 averageAccuracy, uint256 bestStreak);
    event ServiceRegistered(bytes32 indexed serviceId, address indexed serviceAddress);
    event ServiceToggled(bytes32 indexed serviceId, bool enabled);

    // --- Constructor ---
    constructor() {
        owner = msg.sender;
    }

    // --- Modifiers ---
    modifier onlyOwner() {
        require(msg.sender == owner, "Not the owner");
        _;
    }

    // --- Main Functions ---

    /**
     * @notice Submit a workout session
     * @param _reps Number of repetitions performed
     * @param _formAccuracy Form accuracy percentage (0-100)
     * @param _streak Current streak count
     * @param _duration Duration of workout in seconds
     * @param _region Region where workout was performed
     */
    function submitWorkoutSession(
        uint256 _reps,
        uint256 _formAccuracy,
        uint256 _streak,
        uint256 _duration,
        string memory _region
    ) external payable nonReentrant {
        // Validation
        if (_reps == 0 || _reps > MAX_REPS_PER_SESSION) {
            revert InvalidReps(_reps, MAX_REPS_PER_SESSION);
        }
        if (_formAccuracy > 100) {
            revert InvalidAccuracy(_formAccuracy);
        }
        if (msg.value < SUBMISSION_FEE) {
            revert InsufficientFee(msg.value, SUBMISSION_FEE);
        }

        // Check cooldown
        uint256 nextSubmissionTime = lastSubmissionTime[msg.sender] + SUBMISSION_COOLDOWN;
        if (block.timestamp < nextSubmissionTime) {
            revert CooldownActive(nextSubmissionTime - block.timestamp);
        }

        lastSubmissionTime[msg.sender] = block.timestamp;

        // Record session
        uint256 sessionIndex = userSessions[msg.sender].length;
        userSessions[msg.sender].push(WorkoutSession({
            reps: _reps,
            formAccuracy: _formAccuracy,
            streak: _streak,
            duration: _duration,
            timestamp: block.timestamp,
            region: _region
        }));

        // Update leaderboard
        _updateLocalLeaderboard(_reps, _formAccuracy, _streak);
        _emitLeaderboardUpdate(msg.sender);

        emit WorkoutSessionSubmitted(msg.sender, sessionIndex, _reps, _region);

        // Notify Chainlink services if enabled
        _notifyServices(msg.sender, sessionIndex);
    }

    // --- View Functions ---

    /**
     * @notice Get the full leaderboard
     * @return Array of all leaderboard entries
     */
    function getLeaderboard() external view returns (LocalAbsScore[] memory) {
        return leaderboard;
    }

    /**
     * @notice Get top performers (limited count)
     * @param _count Maximum number of entries to return
     * @return Array of top performers
     */
    function getTopPerformers(uint256 _count) external view returns (LocalAbsScore[] memory) {
        uint256 length = leaderboard.length;
        if (_count > length) _count = length;

        LocalAbsScore[] memory topPerformers = new LocalAbsScore[](_count);
        for (uint256 i = 0; i < _count; i++) {
            topPerformers[i] = leaderboard[i];
        }
        return topPerformers;
    }

    /**
     * @notice Get user's abs score safely (returns zeros if user doesn't exist)
     * @param _user User address
     * @return totalReps Total reps completed
     * @return averageAccuracy Average form accuracy
     * @return bestStreak Best streak achieved
     * @return sessionCount Number of sessions completed
     */
    function getUserAbsScoreSafe(address _user) external view returns (
        uint256 totalReps,
        uint256 averageAccuracy,
        uint256 bestStreak,
        uint256 sessionCount
    ) {
        uint256 index = userIndex[_user];
        if (index == 0) {
            return (0, 0, 0, 0);
        }

        LocalAbsScore memory userScore = leaderboard[index - 1];
        return (
            userScore.totalReps,
            userScore.averageFormAccuracy,
            userScore.bestStreak,
            userScore.sessionsCompleted
        );
    }

    /**
     * @notice Get user's workout sessions
     * @param _user User address
     * @return Array of user's workout sessions
     */
    function getUserSessions(address _user) external view returns (WorkoutSession[] memory) {
        return userSessions[_user];
    }

    /**
     * @notice Get time until next submission is allowed
     * @param _user User address
     * @return Time remaining in seconds (0 if can submit now)
     */
    function getTimeUntilNextSubmission(address _user) external view returns (uint256) {
        uint256 nextSubmissionTime = lastSubmissionTime[_user] + SUBMISSION_COOLDOWN;
        if (block.timestamp >= nextSubmissionTime) {
            return 0;
        }
        return nextSubmissionTime - block.timestamp;
    }

    /**
     * @notice Calculate composite score based on workout metrics
     * @param _reps Number of reps
     * @param _formAccuracy Form accuracy percentage
     * @param _streak Streak count
     * @return Calculated composite score
     */
    function calculateCompositeScore(
        uint256 _reps,
        uint256 _formAccuracy,
        uint256 _streak
    ) external pure returns (uint256) {
        return _calculateBaseScore(_reps, _formAccuracy, _streak, 120); // Default 2 minutes
    }

    // --- Owner Functions ---

    /**
     * @notice Withdraw collected fees (owner only)
     */
    function withdrawFees() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No fees to withdraw");

        (bool success, ) = owner.call{value: balance}("");
        require(success, "Withdrawal failed");
    }

    /**
     * @notice Transfer ownership
     * @param newOwner New owner address
     */
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid address");
        owner = newOwner;
    }

    /**
     * @notice Register a Chainlink service contract
     * @param serviceId Service identifier (VRF_SERVICE, CCIP_SERVICE, etc.)
     * @param serviceAddress Address of the service contract
     */
    function registerService(bytes32 serviceId, address serviceAddress) external onlyOwner {
        require(serviceAddress != address(0), "Invalid service address");
        services[serviceId] = serviceAddress;
        serviceEnabled[serviceId] = true;
        emit ServiceRegistered(serviceId, serviceAddress);
    }

    /**
     * @notice Toggle a service on/off
     * @param serviceId Service identifier
     * @param enabled Whether the service should be enabled
     */
    function toggleService(bytes32 serviceId, bool enabled) external onlyOwner {
        require(services[serviceId] != address(0), "Service not registered");
        serviceEnabled[serviceId] = enabled;
        emit ServiceToggled(serviceId, enabled);
    }

    /**
     * @notice Get service address
     * @param serviceId Service identifier
     * @return Service contract address
     */
    function getService(bytes32 serviceId) external view returns (address) {
        return services[serviceId];
    }

    /**
     * @notice Check if service is enabled
     * @param serviceId Service identifier
     * @return Whether the service is enabled
     */
    function isServiceEnabled(bytes32 serviceId) external view returns (bool) {
        return serviceEnabled[serviceId] && services[serviceId] != address(0);
    }

    // --- Internal Functions ---

    function _updateLocalLeaderboard(uint256 reps, uint256 formAccuracy, uint256 streak) internal {
        uint256 index = userIndex[msg.sender];
        if (index == 0) {
            // New user
            leaderboard.push(LocalAbsScore({
                user: msg.sender,
                totalReps: reps,
                averageFormAccuracy: formAccuracy,
                bestStreak: streak,
                sessionsCompleted: 1,
                timestamp: block.timestamp
            }));
            userIndex[msg.sender] = leaderboard.length;
        } else {
            // Existing user
            LocalAbsScore storage userScore = leaderboard[index - 1];
            userScore.totalReps += reps;

            // Calculate new average form accuracy
            uint256 totalAccuracy = (userScore.averageFormAccuracy * userScore.sessionsCompleted) + formAccuracy;
            userScore.sessionsCompleted++;
            userScore.averageFormAccuracy = totalAccuracy / userScore.sessionsCompleted;

            // Update best streak if necessary
            if (streak > userScore.bestStreak) {
                userScore.bestStreak = streak;
            }

            userScore.timestamp = block.timestamp;
        }
    }

    function _emitLeaderboardUpdate(address user) internal {
        uint256 index = userIndex[user];
        if (index > 0) {
            LocalAbsScore memory userScore = leaderboard[index - 1];
            emit LeaderboardScoreUpdated(
                user,
                userScore.totalReps,
                userScore.averageFormAccuracy,
                userScore.bestStreak
            );
        }
    }

    function _calculateBaseScore(
        uint256 reps,
        uint256 formAccuracy,
        uint256 streak,
        uint256 duration
    ) internal pure returns (uint256) {
        // Base scoring algorithm
        uint256 baseScore = reps * 2; // 2 points per rep
        baseScore += (formAccuracy * reps) / 100; // Accuracy bonus
        baseScore += streak * 5; // Streak bonus
        baseScore += duration / 10; // Duration bonus (1 point per 10 seconds)
        return baseScore;
    }

    function _notifyServices(address user, uint256 sessionIndex) internal {
        // Notify VRF service for daily challenges
        if (serviceEnabled[VRF_SERVICE] && services[VRF_SERVICE] != address(0)) {
            (bool success,) = services[VRF_SERVICE].call(
                abi.encodeWithSignature("onWorkoutSubmitted(address,uint256)", user, sessionIndex)
            );
            // Don't revert if service call fails - just continue
            if (!success) {
                // Could emit an event here for debugging
            }
        }

        // Notify CCIP service for cross-chain updates
        if (serviceEnabled[CCIP_SERVICE] && services[CCIP_SERVICE] != address(0)) {
            (bool success,) = services[CCIP_SERVICE].call(
                abi.encodeWithSignature("onWorkoutSubmitted(address,uint256)", user, sessionIndex)
            );
            if (!success) {
                // Could emit an event here for debugging
            }
        }

        // Add more service notifications as needed
    }

    // --- Fallback Functions ---

    receive() external payable {
        // Accept AVAX payments
    }

    fallback() external payable {
        // Accept AVAX payments
    }
}
