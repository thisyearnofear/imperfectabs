// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

// Chainlink Imports
import {CCIPReceiver} from "@chainlink/contracts-ccip/contracts/applications/CCIPReceiver.sol";
import {Client} from "@chainlink/contracts-ccip/contracts/libraries/Client.sol";
import {ConfirmedOwner} from "@chainlink/contracts/src/v0.8/shared/access/ConfirmedOwner.sol";
import {AutomationCompatibleInterface} from "@chainlink/contracts/src/v0.8/automation/AutomationCompatible.sol";
import {IVRFCoordinatorV2Plus} from "@chainlink/contracts/src/v0.8/vrf/dev/interfaces/IVRFCoordinatorV2Plus.sol";
import {VRFConsumerBaseV2Plus} from "@chainlink/contracts/src/v0.8/vrf/dev/VRFConsumerBaseV2Plus.sol";
import {VRFV2PlusClient} from "@chainlink/contracts/src/v0.8/vrf/dev/libraries/VRFV2PlusClient.sol";

// OpenZeppelin Imports
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title ImperfectAbsHub V4 - VRF v2.5 Edition
 * @author Imperfect Abs Team
 * @notice Simplified fitness tracking with Chainlink Automation for weather bonuses
 * and VRF v2.5 for daily challenges. Upgraded from v2.0 for better reliability.
 */
contract ImperfectAbsHubV4 is
    CCIPReceiver,
    VRFConsumerBaseV2Plus,
    AutomationCompatibleInterface,
    ReentrancyGuard
{
    // --- Custom Errors ---
    error InvalidReps(uint256 provided, uint256 max);
    error InvalidAccuracy(uint256 provided);
    error CooldownActive(uint256 timeRemaining);
    error UnauthorizedChain(uint64 chainSelector);

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
        uint256 enhancedScore;
        string region;
    }

    struct DailyChallenge {
        uint256 challengeType; // 0=reps, 1=duration, 2=streak, 3=accuracy, 4=combo
        uint256 target;
        uint256 bonusMultiplier; // in basis points (10000 = 100%)
        uint256 expiresAt;
        bool active;
    }

    // --- Constants ---
    uint256 public constant MAX_REPS_PER_SESSION = 500;
    uint256 public constant SUBMISSION_COOLDOWN = 60 seconds;
    uint256 public constant WEATHER_UPDATE_INTERVAL = 6 hours;

    // --- State Variables ---
    
    // Core fitness tracking
    LocalAbsScore[] public leaderboard;
    mapping(address => uint256) public userIndex;
    mapping(address => WorkoutSession[]) public userSessions;
    mapping(address => uint256) public lastSubmissionTime;

    // Cross-chain tracking
    mapping(uint64 => bool) public whitelistedSourceChains;
    mapping(uint64 => string) public sourceChainNames;
    mapping(address => mapping(uint64 => uint256)) public crossChainScores;

    // Weather bonuses (updated by Automation)
    mapping(uint256 => uint256) public seasonalBonus; // month (1-12) => bonus in basis points
    mapping(string => uint256) public regionBonus;    // region => bonus in basis points
    uint256 public lastWeatherUpdate;

    // Daily challenges (powered by VRF)
    DailyChallenge public currentChallenge;
    mapping(address => bool) public challengeCompleted;
    uint256 public lastChallengeUpdate;

    // VRF v2.5 Configuration
    IVRFCoordinatorV2Plus public immutable i_vrfCoordinator;
    uint256 public s_subscriptionId; // Changed to uint256 for v2.5 large subscription IDs
    bytes32 public s_keyHash;
    uint32 public constant CALLBACK_GAS_LIMIT = 200000; // Increased for VRF v2.5
    uint16 public constant REQUEST_CONFIRMATIONS = 3;
    uint32 public constant NUM_WORDS = 3;



    // --- Events ---
    event WorkoutSessionSubmitted(address indexed user, uint256 sessionIndex, uint256 reps, string region);
    event LeaderboardScoreUpdated(address indexed user, uint256 totalReps, uint256 averageAccuracy, uint256 bestStreak);
    event CrossChainScoreReceived(bytes32 indexed messageId, uint64 indexed sourceChain, address indexed user, uint256 score);
    event WeatherBonusesUpdated(uint256 timestamp);
    event DailyChallengeGenerated(uint256 challengeType, uint256 target, uint256 bonus, uint256 expiresAt);
    event ChallengeCompleted(address indexed user, uint256 bonusEarned);

    // --- Chain Selectors ---
    uint64 public constant POLYGON_SELECTOR = 4051577828743386545;
    uint64 public constant BASE_SELECTOR = 10344971235874465080;
    uint64 public constant CELO_SELECTOR = 7539524587158712152;

    constructor(
        address _ccipRouter,
        address _vrfCoordinator,
        uint256 _subscriptionId,
        bytes32 _keyHash
    )
        CCIPReceiver(_ccipRouter)
        VRFConsumerBaseV2Plus(_vrfCoordinator)
        ReentrancyGuard()
    {
        i_vrfCoordinator = IVRFCoordinatorV2Plus(_vrfCoordinator);
        s_subscriptionId = _subscriptionId;
        s_keyHash = _keyHash;

        // Initialize whitelisted chains
        setWhitelistedChain(POLYGON_SELECTOR, "Polygon", true);
        setWhitelistedChain(BASE_SELECTOR, "Base", true);
        setWhitelistedChain(CELO_SELECTOR, "Celo", true);

        // Initialize default weather bonuses
        _initializeWeatherBonuses();

        // Note: First daily challenge will be generated after VRF setup
    }

    /**
     * @notice Submit a workout session with automatic weather bonus calculation
     */
    function submitWorkoutSession(
        uint256 _reps,
        uint256 _formAccuracy,
        uint256 _streak,
        uint256 _duration,
        string memory _region
    ) external nonReentrant {
        // Validation
        if (_reps == 0 || _reps > MAX_REPS_PER_SESSION) revert InvalidReps(_reps, MAX_REPS_PER_SESSION);
        if (_formAccuracy > 100) revert InvalidAccuracy(_formAccuracy);
        
        uint256 nextSubmissionTime = lastSubmissionTime[msg.sender] + SUBMISSION_COOLDOWN;
        if (block.timestamp < nextSubmissionTime) {
            revert CooldownActive(nextSubmissionTime - block.timestamp);
        }

        lastSubmissionTime[msg.sender] = block.timestamp;

        // Calculate enhanced score with weather bonuses
        uint256 baseScore = _calculateBaseScore(_reps, _formAccuracy, _streak, _duration);
        uint256 enhancedScore = _applyWeatherBonus(baseScore, _region);
        
        // Check and apply daily challenge bonus
        enhancedScore = _checkDailyChallenge(enhancedScore, _reps, _formAccuracy, _streak, _duration);

        // Record session
        uint256 sessionIndex = userSessions[msg.sender].length;
        userSessions[msg.sender].push(WorkoutSession({
            reps: _reps,
            formAccuracy: _formAccuracy,
            streak: _streak,
            duration: _duration,
            timestamp: block.timestamp,
            enhancedScore: enhancedScore,
            region: _region
        }));

        // Update leaderboard
        _updateLocalLeaderboard(_reps, _formAccuracy, _streak);
        _emitLeaderboardUpdate(msg.sender);

        emit WorkoutSessionSubmitted(msg.sender, sessionIndex, _reps, _region);
    }

    /**
     * @inheritdoc CCIPReceiver
     */
    function _ccipReceive(Client.Any2EVMMessage memory message) internal override {
        if (!whitelistedSourceChains[message.sourceChainSelector]) {
            revert UnauthorizedChain(message.sourceChainSelector);
        }
        (address user, uint256 score) = abi.decode(message.data, (address, uint256));

        crossChainScores[user][message.sourceChainSelector] = score;
        _emitLeaderboardUpdate(user);

        emit CrossChainScoreReceived(message.messageId, message.sourceChainSelector, user, score);
    }

    /**
     * @inheritdoc AutomationCompatibleInterface
     */
    function checkUpkeep(bytes calldata) external view override returns (bool upkeepNeeded, bytes memory) {
        // Check if weather bonuses need updating (every 6 hours)
        bool weatherUpdateNeeded = (block.timestamp - lastWeatherUpdate) > WEATHER_UPDATE_INTERVAL;

        // Check if daily challenge needs updating (every 24 hours)
        bool challengeUpdateNeeded = (block.timestamp - lastChallengeUpdate) > 1 days ||
                                   (currentChallenge.active && block.timestamp > currentChallenge.expiresAt);

        upkeepNeeded = weatherUpdateNeeded || challengeUpdateNeeded;

        // Encode what type of upkeep is needed
        bytes memory performData = abi.encode(weatherUpdateNeeded, challengeUpdateNeeded);
        return (upkeepNeeded, performData);
    }

    /**
     * @inheritdoc AutomationCompatibleInterface
     */
    function performUpkeep(bytes calldata performData) external override {
        (bool weatherUpdateNeeded, bool challengeUpdateNeeded) = abi.decode(performData, (bool, bool));

        if (weatherUpdateNeeded) {
            _updateWeatherBonuses();
        }

        if (challengeUpdateNeeded) {
            _requestNewChallenge();
        }
    }

    /**
     * @inheritdoc VRFConsumerBaseV2Plus
     */
    function fulfillRandomWords(uint256, uint256[] calldata randomWords) internal override {
        // Generate new daily challenge based on random numbers
        uint256 challengeType = randomWords[0] % 5; // 5 different challenge types
        uint256 target;
        uint256 bonusMultiplier;

        if (challengeType == 0) { // Reps challenge
            target = 30 + (randomWords[1] % 70); // 30-100 reps
            bonusMultiplier = 11000 + (randomWords[2] % 4000); // 110-150% multiplier
        } else if (challengeType == 1) { // Duration challenge
            target = 90 + (randomWords[1] % 30); // 90-120 seconds (1.5-2 minutes)
            bonusMultiplier = 11000 + (randomWords[2] % 3000); // 110-140% multiplier
        } else if (challengeType == 2) { // Streak challenge
            target = 5 + (randomWords[1] % 15); // 5-20 streak
            bonusMultiplier = 12000 + (randomWords[2] % 5000); // 120-170% multiplier
        } else if (challengeType == 3) { // Accuracy challenge
            target = 85 + (randomWords[1] % 15); // 85-100% accuracy
            bonusMultiplier = 11500 + (randomWords[2] % 3500); // 115-150% multiplier
        } else { // Combo challenge (reps + accuracy)
            target = 50 + (randomWords[1] % 50); // 50-100 reps with 90%+ accuracy
            bonusMultiplier = 13000 + (randomWords[2] % 7000); // 130-200% multiplier
        }

        currentChallenge = DailyChallenge({
            challengeType: challengeType,
            target: target,
            bonusMultiplier: bonusMultiplier,
            expiresAt: block.timestamp + 1 days,
            active: true
        });

        lastChallengeUpdate = block.timestamp;

        // Reset completion tracking for new challenge
        // Note: In production, you'd want a more gas-efficient way to reset this

        emit DailyChallengeGenerated(challengeType, target, bonusMultiplier, currentChallenge.expiresAt);
    }

    // --- Internal Functions ---

    function _calculateBaseScore(uint256 reps, uint256 formAccuracy, uint256 streak, uint256 duration) internal pure returns (uint256) {
        // Base scoring algorithm
        uint256 baseScore = reps * 2; // 2 points per rep
        baseScore += (formAccuracy * reps) / 100; // Accuracy bonus
        baseScore += streak * 5; // Streak bonus
        baseScore += duration / 10; // Duration bonus (1 point per 10 seconds)
        return baseScore;
    }

    function _applyWeatherBonus(uint256 baseScore, string memory region) internal view returns (uint256) {
        uint256 currentMonth = ((block.timestamp / 86400 + 4) / 30) % 12 + 1; // Approximate month
        uint256 seasonal = seasonalBonus[currentMonth];
        uint256 regional = regionBonus[region];

        // Apply bonuses (basis points: 10000 = 100%)
        uint256 totalBonus = 10000 + seasonal + regional;
        return (baseScore * totalBonus) / 10000;
    }

    function _checkDailyChallenge(uint256 score, uint256 reps, uint256 formAccuracy, uint256 streak, uint256 duration) internal returns (uint256) {
        if (!currentChallenge.active || block.timestamp > currentChallenge.expiresAt || challengeCompleted[msg.sender]) {
            return score;
        }

        bool challengeMet = false;

        if (currentChallenge.challengeType == 0 && reps >= currentChallenge.target) {
            challengeMet = true;
        } else if (currentChallenge.challengeType == 1 && duration >= currentChallenge.target) {
            challengeMet = true;
        } else if (currentChallenge.challengeType == 2 && streak >= currentChallenge.target) {
            challengeMet = true;
        } else if (currentChallenge.challengeType == 3 && formAccuracy >= currentChallenge.target) {
            challengeMet = true;
        } else if (currentChallenge.challengeType == 4 && reps >= currentChallenge.target && formAccuracy >= 90) {
            challengeMet = true;
        }

        if (challengeMet) {
            challengeCompleted[msg.sender] = true;
            uint256 bonusScore = (score * currentChallenge.bonusMultiplier) / 10000;
            emit ChallengeCompleted(msg.sender, bonusScore - score);
            return bonusScore;
        }

        return score;
    }

    function _updateLocalLeaderboard(uint256 reps, uint256 formAccuracy, uint256 streak) internal {
        uint256 index = userIndex[msg.sender];
        if (index == 0) {
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
            LocalAbsScore storage userScore = leaderboard[index - 1];
            userScore.totalReps += reps;
            userScore.averageFormAccuracy = ((userScore.averageFormAccuracy * userScore.sessionsCompleted) + formAccuracy) / (userScore.sessionsCompleted + 1);
            if (streak > userScore.bestStreak) userScore.bestStreak = streak;
            userScore.sessionsCompleted++;
            userScore.timestamp = block.timestamp;
        }
    }

    function _emitLeaderboardUpdate(address user) internal {
        uint256 index = userIndex[user];
        if (index > 0) {
            LocalAbsScore memory userScore = leaderboard[index - 1];
            emit LeaderboardScoreUpdated(user, userScore.totalReps, userScore.averageFormAccuracy, userScore.bestStreak);
        }
    }

    function _initializeWeatherBonuses() internal {
        // Seasonal bonuses (basis points: 10000 = 100%, so 500 = 5% bonus)
        seasonalBonus[12] = 1000; // December - Winter bonus
        seasonalBonus[1] = 1000;  // January - Winter bonus
        seasonalBonus[2] = 1000;  // February - Winter bonus
        seasonalBonus[3] = 500;   // March - Spring bonus
        seasonalBonus[4] = 200;   // April - Mild bonus
        seasonalBonus[5] = 200;   // May - Mild bonus
        seasonalBonus[6] = 800;   // June - Summer heat bonus
        seasonalBonus[7] = 800;   // July - Summer heat bonus
        seasonalBonus[8] = 800;   // August - Summer heat bonus
        seasonalBonus[9] = 300;   // September - Fall bonus
        seasonalBonus[10] = 300;  // October - Fall bonus
        seasonalBonus[11] = 500;  // November - Pre-winter bonus

        // Regional bonuses
        regionBonus["north"] = 800;     // Northern regions (cold climate)
        regionBonus["south"] = 400;     // Southern regions (warm climate)
        regionBonus["tropical"] = 600;  // Tropical regions (hot/humid)
        regionBonus["temperate"] = 200; // Temperate regions (mild)
        regionBonus["desert"] = 1000;   // Desert regions (extreme heat)
        regionBonus["arctic"] = 1200;   // Arctic regions (extreme cold)

        lastWeatherUpdate = block.timestamp;
    }

    function _updateWeatherBonuses() internal {
        // This could be enhanced to use real weather data via Automation
        // For now, we'll simulate seasonal changes
        uint256 currentMonth = ((block.timestamp / 86400 + 4) / 30) % 12 + 1;

        // Slightly randomize bonuses based on block hash for variety
        uint256 randomFactor = uint256(keccak256(abi.encodePacked(block.timestamp, block.prevrandao))) % 200;

        // Update seasonal bonuses with some variation
        for (uint256 i = 1; i <= 12; i++) {
            if (i == currentMonth) {
                seasonalBonus[i] = seasonalBonus[i] + randomFactor;
            }
        }

        lastWeatherUpdate = block.timestamp;
        emit WeatherBonusesUpdated(block.timestamp);
    }

    function _requestNewChallenge() internal {
        // Request random words from VRF v2.5
        VRFV2PlusClient.RandomWordsRequest memory request = VRFV2PlusClient.RandomWordsRequest({
            keyHash: s_keyHash,
            subId: s_subscriptionId,
            requestConfirmations: REQUEST_CONFIRMATIONS,
            callbackGasLimit: CALLBACK_GAS_LIMIT,
            numWords: NUM_WORDS,
            extraArgs: VRFV2PlusClient._argsToBytes(
                VRFV2PlusClient.ExtraArgsV1({
                    nativePayment: false // Pay with LINK, not native token
                })
            )
        });

        i_vrfCoordinator.requestRandomWords(request);
    }

    // --- Admin Functions ---

    function setWhitelistedChain(uint64 chainSelector, string memory name, bool isWhitelisted) public onlyOwner {
        whitelistedSourceChains[chainSelector] = isWhitelisted;
        if (isWhitelisted) {
            sourceChainNames[chainSelector] = name;
        } else {
            delete sourceChainNames[chainSelector];
        }
    }

    function updateVRFConfig(uint256 subscriptionId, bytes32 keyHash) external onlyOwner {
        s_subscriptionId = subscriptionId;
        s_keyHash = keyHash;
    }

    function manualWeatherUpdate() external onlyOwner {
        _updateWeatherBonuses();
    }

    function manualChallengeUpdate() external onlyOwner {
        _requestNewChallenge();
    }

    // --- View Functions ---

    function getCurrentChallenge() external view returns (DailyChallenge memory) {
        return currentChallenge;
    }

    function getUserSessions(address user) external view returns (WorkoutSession[] memory) {
        return userSessions[user];
    }

    function getLeaderboardSize() external view returns (uint256) {
        return leaderboard.length;
    }

    function getSeasonalBonus(uint256 month) external view returns (uint256) {
        return seasonalBonus[month];
    }

    function getRegionBonus(string memory region) external view returns (uint256) {
        return regionBonus[region];
    }

    function getCrossChainScore(address user, uint64 chainSelector) external view returns (uint256) {
        return crossChainScores[user][chainSelector];
    }

    // --- Compatibility Functions for Frontend ---

    function getTimeUntilNextSubmission(address user) external view returns (uint256) {
        uint256 nextSubmissionTime = lastSubmissionTime[user] + SUBMISSION_COOLDOWN;
        if (block.timestamp >= nextSubmissionTime) {
            return 0;
        }
        return nextSubmissionTime - block.timestamp;
    }

    function getUserAbsScoreSafe(address user) external view returns (uint256 totalReps, uint256 averageAccuracy, uint256 bestStreak, uint256 sessionCount) {
        WorkoutSession[] memory sessions = userSessions[user];
        if (sessions.length == 0) {
            return (0, 0, 0, 0);
        }

        uint256 totalAccuracy = 0;
        uint256 maxStreak = 0;
        uint256 allReps = 0;

        for (uint256 i = 0; i < sessions.length; i++) {
            allReps += sessions[i].reps;
            totalAccuracy += sessions[i].formAccuracy;
            if (sessions[i].streak > maxStreak) {
                maxStreak = sessions[i].streak;
            }
        }

        return (allReps, totalAccuracy / sessions.length, maxStreak, sessions.length);
    }

    function calculateCompositeScore(uint256 reps, uint256 formAccuracy, uint256 streak) external pure returns (uint256) {
        return _calculateBaseScore(reps, formAccuracy, streak, 120); // Default 2 minutes
    }
}
