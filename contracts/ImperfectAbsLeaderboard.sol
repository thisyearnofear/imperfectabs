// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {FunctionsClient} from "@chainlink/contracts/src/v0.8/functions/dev/v1_0_0/FunctionsClient.sol";
import {ConfirmedOwner} from "@chainlink/contracts/src/v0.8/shared/access/ConfirmedOwner.sol";
import {FunctionsRequest} from "@chainlink/contracts/src/v0.8/functions/dev/v1_0_0/libraries/FunctionsRequest.sol";

/**
 * @title ImperfectAbsLeaderboard
 * @dev A leaderboard contract for tracking abs exercise scores with Chainlink Functions AI analysis
 * Part of the Imperfect Fitness Ecosystem
 * Integrates with Chainlink Functions for enhanced workout analysis
 */
contract ImperfectAbsLeaderboard is FunctionsClient, ConfirmedOwner {
    using FunctionsRequest for FunctionsRequest.Request;
    // Custom errors for gas efficiency and better error reporting
    error CooldownNotExpired(uint256 remainingTime);
    error ScoreExceedsMaximum(uint256 score, uint256 maxAllowed);
    error FormAccuracyInvalid(uint256 accuracy);
    error UserNotFound();
    error Unauthorized();
    error InvalidInput();
    error OperationFailed();
    error InsufficientFee();
    error RewardDistributionFailed();
    error UnexpectedRequestID(bytes32 requestId);

    // Standardized struct layout - adapted for abs exercises
    struct AbsScore {
        address user;
        uint256 totalReps;           // Total repetitions across all sessions
        uint256 averageFormAccuracy; // Average form accuracy percentage (0-100)
        uint256 bestStreak;          // Best consecutive good-form reps
        uint256 sessionsCompleted;   // Number of workout sessions
        uint256 timestamp;           // Last update timestamp
    }

    // Session tracking for detailed analytics
    struct WorkoutSession {
        uint256 reps;
        uint256 formAccuracy;
        uint256 streak;
        uint256 duration;
        uint256 timestamp;
        uint256 enhancedScore; // AI-enhanced score from Chainlink Functions
        bool aiAnalysisComplete;
    }

    // Chainlink Functions request tracking
    struct FunctionsRequest {
        address user;
        uint256 sessionIndex;
        uint256 originalScore;
        uint256 timestamp;
        bool fulfilled;
    }

    // Fee and reward configuration
    struct FeeConfig {
        uint256 submissionFee;     // Fee required to submit a score (in AVAX)
        uint256 ownerShare;        // Percentage of fees that go to the owner (in basis points)
        uint256 leaderboardShare;  // Percentage of fees distributed to top performers
    }

    // Reward distribution configuration
    struct RewardConfig {
        uint256 distributionPeriod;    // How often rewards are distributed (in seconds)
        uint256 topPerformersCount;    // Number of top performers to reward
        uint256 lastDistribution;      // Timestamp of last reward distribution
        uint256 totalRewardPool;       // Total accumulated rewards for distribution
        bool autoDistribution;         // Whether to auto-distribute or manual
    }

    // Individual reward tracking
    struct UserReward {
        uint256 totalEarned;          // Total rewards earned by user
        uint256 lastClaimed;          // Timestamp of last claim
        uint256 currentPeriodEarned;  // Rewards earned in current period
        uint256 rank;                 // Current leaderboard rank
    }

    // State variables
    AbsScore[] public leaderboard;
    mapping(address => uint256) public userIndex;
    mapping(address => WorkoutSession[]) public userSessions;

    // Chainlink Functions state
    mapping(bytes32 => FunctionsRequest) public functionsRequests;
    uint64 public subscriptionId;
    uint32 public gasLimit;
    bytes32 public donID;
    string public source;

    // Gas optimization: Store submission timestamp as an offset from baseline
    uint256 public submissionTimeBaseline;
    mapping(address => uint256) public submissionTimeOffset;

    // Constants optimized for Avalanche's fast finality
    uint256 public SUBMISSION_COOLDOWN = 60 seconds; // 1 minute cooldown
    uint256 public MAX_REPS_PER_SESSION = 200;       // Maximum reps per session
    uint256 public MIN_FORM_ACCURACY = 50;           // Minimum form accuracy to count (50%)
    address public owner;

    // Fee configuration
    FeeConfig public feeConfig;
    mapping(address => uint256) public pendingRewards;

    // Reward system state
    RewardConfig public rewardConfig;
    mapping(address => UserReward) public userRewards;
    address[] public rewardEligibleUsers;
    mapping(address => bool) public isEligibleUser;

    // Network identification
    uint256 public immutable deployedChainId;

    // Avalanche Fuji testnet chain ID
    uint256 public constant AVALANCHE_FUJI_CHAINID = 43113;

    // Ecosystem information
    string public constant ECOSYSTEM_NAME = "Imperfect Fitness";
    string public constant APP_NAME = "Imperfect Abs";
    string public constant VERSION = "1.0.0";

    // Emergency controls
    bool public submissionsEnabled = true;

    // Events
    event AbsScoreAdded(
        address indexed user,
        uint256 reps,
        uint256 formAccuracy,
        uint256 streak,
        uint256 timestamp
    );
    event WorkoutSessionRecorded(
        address indexed user,
        uint256 sessionIndex,
        uint256 reps,
        uint256 formAccuracy,
        uint256 duration
    );
    event AIAnalysisRequested(
        address indexed user,
        bytes32 indexed requestId,
        uint256 sessionIndex
    );
    event AIAnalysisCompleted(
        address indexed user,
        bytes32 indexed requestId,
        uint256 enhancedScore,
        uint256 sessionIndex
    );
    event SubmissionCooldownChanged(uint256 newCooldown);
    event MaxRepsPerSessionChanged(uint256 newMaxReps);
    event MinFormAccuracyChanged(uint256 newMinAccuracy);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    event SubmissionStatusChanged(bool enabled);
    event EmergencyWithdrawal(address indexed to, uint256 amount);
    event FeeConfigUpdated(uint256 submissionFee, uint256 ownerShare, uint256 leaderboardShare);
    event RewardDistributed(address indexed user, uint256 amount);
    event RewardClaimed(address indexed user, uint256 amount);
    event EcosystemIntegration(string indexed appName, address indexed user, uint256 score);
    event RewardPoolUpdated(uint256 newTotal);
    event RewardDistributionExecuted(uint256 totalDistributed, uint256 topPerformersCount);
    event RewardConfigUpdated(uint256 distributionPeriod, uint256 topPerformersCount, bool autoDistribution);

    // Modifiers
    modifier onlyOwner() {
        if (msg.sender != owner) revert Unauthorized();
        _;
    }

    modifier whenSubmissionsEnabled() {
        if (!submissionsEnabled) revert OperationFailed();
        _;
    }

    modifier onlyAvalancheFuji() {
        uint256 id;
        assembly {
            id := chainid()
        }
        if (id != AVALANCHE_FUJI_CHAINID) revert OperationFailed();
        _;
    }

    constructor(
        address router,
        uint64 _subscriptionId,
        uint32 _gasLimit,
        bytes32 _donID,
        string memory _source
    ) FunctionsClient(router) ConfirmedOwner(msg.sender) {
        owner = msg.sender;
        submissionTimeBaseline = block.timestamp;

        // Initialize Chainlink Functions
        subscriptionId = _subscriptionId;
        gasLimit = _gasLimit;
        donID = _donID;
        source = _source;

        // Initialize fee configuration (optimized for Avalanche fees)
        feeConfig = FeeConfig({
            submissionFee: 0.01 ether,  // 0.01 AVAX submission fee
            ownerShare: 4000,           // 40% to owner (reduced to fund rewards)
            leaderboardShare: 6000      // 60% to top performers (increased)
        });

        // Initialize reward configuration
        rewardConfig = RewardConfig({
            distributionPeriod: 7 days,     // Weekly reward distribution
            topPerformersCount: 10,         // Top 10 performers get rewards
            lastDistribution: block.timestamp,
            totalRewardPool: 0,
            autoDistribution: false         // Manual distribution initially
        });

        // Store chain ID for network verification
        uint256 id;
        assembly {
            id := chainid()
        }
        deployedChainId = id;

        emit OwnershipTransferred(address(0), msg.sender);
        emit FeeConfigUpdated(feeConfig.submissionFee, feeConfig.ownerShare, feeConfig.leaderboardShare);
    }

    /**
     * @dev Submit a workout session with abs exercise data
     * @param _reps Number of reps completed in this session
     * @param _formAccuracy Form accuracy percentage (0-100)
     * @param _streak Best streak achieved in this session
     * @param _duration Session duration in seconds
     */
    function submitWorkoutSession(
        uint256 _reps,
        uint256 _formAccuracy,
        uint256 _streak,
        uint256 _duration
    ) external payable whenSubmissionsEnabled {
        // Validate the session data
        validateSessionSubmission(_reps, _formAccuracy, _streak);

        // Check submission fee
        if (msg.value < feeConfig.submissionFee) revert InsufficientFee();

        // Record the session
        recordWorkoutSession(_reps, _formAccuracy, _streak, _duration);

        // Update or create user's leaderboard entry
        updateUserLeaderboardScore(_reps, _formAccuracy, _streak);

        // Update submission time tracking
        uint256 timeOffset = block.timestamp - submissionTimeBaseline;
        submissionTimeOffset[msg.sender] = timeOffset;

        // Distribute submission fee
        distributeFee();

        // Request AI analysis via Chainlink Functions
        uint256 sessionIndex = userSessions[msg.sender].length - 1;
        requestAIAnalysis(msg.sender, sessionIndex, _reps, _formAccuracy, _duration);

        // Emit events
        emit AbsScoreAdded(msg.sender, _reps, _formAccuracy, _streak, block.timestamp);
        emit EcosystemIntegration(APP_NAME, msg.sender, calculateCompositeScore(_reps, _formAccuracy, _streak));
    }

    /**
     * @dev Validate session submission parameters
     */
    function validateSessionSubmission(
        uint256 _reps,
        uint256 _formAccuracy,
        uint256 _streak
    ) internal view {
        // Check cooldown period first
        uint256 lastOffset = submissionTimeOffset[msg.sender];
        if (lastOffset != 0) {
            uint256 lastSubmissionTime = submissionTimeBaseline + lastOffset;
            uint256 timeSinceLastSubmission = block.timestamp - lastSubmissionTime;
            if (timeSinceLastSubmission < SUBMISSION_COOLDOWN) {
                revert CooldownNotExpired(SUBMISSION_COOLDOWN - timeSinceLastSubmission);
            }
        }

        // Validate input parameters
        if (_reps == 0) revert InvalidInput();
        if (_reps > MAX_REPS_PER_SESSION) revert ScoreExceedsMaximum(_reps, MAX_REPS_PER_SESSION);
        if (_formAccuracy > 100) revert FormAccuracyInvalid(_formAccuracy);
        if (_formAccuracy < MIN_FORM_ACCURACY) revert FormAccuracyInvalid(_formAccuracy);
        if (_streak > _reps) revert InvalidInput();
    }

    /**
     * @dev Record a workout session for analytics
     */
    function recordWorkoutSession(
        uint256 _reps,
        uint256 _formAccuracy,
        uint256 _streak,
        uint256 _duration
    ) internal {
        userSessions[msg.sender].push(WorkoutSession({
            reps: _reps,
            formAccuracy: _formAccuracy,
            streak: _streak,
            duration: _duration,
            timestamp: block.timestamp,
            enhancedScore: 0, // Will be updated by AI analysis
            aiAnalysisComplete: false
        }));

        uint256 sessionIndex = userSessions[msg.sender].length - 1;
        emit WorkoutSessionRecorded(msg.sender, sessionIndex, _reps, _formAccuracy, _duration);
    }

    /**
     * @dev Update user's position on the leaderboard
     */
    function updateUserLeaderboardScore(
        uint256 _sessionReps,
        uint256 _sessionFormAccuracy,
        uint256 _sessionStreak
    ) internal {
        uint256 index = userIndex[msg.sender];

        if (index == 0) {
            // New user - add to leaderboard
            leaderboard.push(AbsScore({
                user: msg.sender,
                totalReps: _sessionReps,
                averageFormAccuracy: _sessionFormAccuracy,
                bestStreak: _sessionStreak,
                sessionsCompleted: 1,
                timestamp: block.timestamp
            }));
            userIndex[msg.sender] = leaderboard.length;
        } else {
            // Existing user - update aggregated stats
            AbsScore storage userScore = leaderboard[index - 1];

            // Update total reps
            userScore.totalReps += _sessionReps;

            // Update average form accuracy (weighted by session count)
            uint256 totalSessions = userScore.sessionsCompleted;
            userScore.averageFormAccuracy =
                (userScore.averageFormAccuracy * totalSessions + _sessionFormAccuracy) / (totalSessions + 1);

            // Update best streak if this session was better
            if (_sessionStreak > userScore.bestStreak) {
                userScore.bestStreak = _sessionStreak;
            }

            // Increment session count and update timestamp
            userScore.sessionsCompleted += 1;
            userScore.timestamp = block.timestamp;
        }
    }

    /**
     * @dev Calculate composite score for ranking
     */
    function calculateCompositeScore(
        uint256 _reps,
        uint256 _formAccuracy,
        uint256 _streak
    ) public pure returns (uint256) {
        // Weighted scoring system that emphasizes form quality
        uint256 repScore = _reps * 10;                    // Base score from reps
        uint256 formScore = _formAccuracy * _reps / 10;   // Form bonus scaled by reps
        uint256 streakScore = _streak * 25;               // High value for streaks

        return repScore + formScore + streakScore;
    }

    /**
     * @dev Request AI analysis via Chainlink Functions
     */
    function requestAIAnalysis(
        address user,
        uint256 sessionIndex,
        uint256 reps,
        uint256 formAccuracy,
        uint256 duration
    ) internal {
        FunctionsRequest.Request memory req;
        req.initializeRequestForInlineJavaScript(source);

        // Prepare arguments for the function
        string[] memory args = new string[](4);
        args[0] = toString(reps);
        args[1] = toString(formAccuracy);
        args[2] = toString(duration);
        args[3] = "abs";
        req.setArgs(args);

        // Send the request
        bytes32 requestId = _sendRequest(
            req.encodeCBOR(),
            subscriptionId,
            gasLimit,
            donID
        );

        // Store request details
        functionsRequests[requestId] = FunctionsRequest({
            user: user,
            sessionIndex: sessionIndex,
            originalScore: formAccuracy,
            timestamp: block.timestamp,
            fulfilled: false
        });

        emit AIAnalysisRequested(user, requestId, sessionIndex);
    }

    /**
     * @dev Chainlink Functions callback
     */
    function fulfillRequest(
        bytes32 requestId,
        bytes memory response,
        bytes memory err
    ) internal override {
        FunctionsRequest storage request = functionsRequests[requestId];

        if (request.user == address(0)) {
            revert UnexpectedRequestID(requestId);
        }

        if (err.length > 0) {
            // Handle error case - use original score
            request.fulfilled = true;
            return;
        }

        // Decode the enhanced score from response
        uint256 enhancedScore = abi.decode(response, (uint256));

        // Update the session with enhanced score
        WorkoutSession storage session = userSessions[request.user][request.sessionIndex];
        session.enhancedScore = enhancedScore;
        session.aiAnalysisComplete = true;

        // Mark request as fulfilled
        request.fulfilled = true;

        emit AIAnalysisCompleted(request.user, requestId, enhancedScore, request.sessionIndex);
    }

    /**
     * @dev Convert uint256 to string
     */
    function toString(uint256 value) internal pure returns (string memory) {
        if (value == 0) {
            return "0";
        }
        uint256 temp = value;
        uint256 digits;
        while (temp != 0) {
            digits++;
            temp /= 10;
        }
        bytes memory buffer = new bytes(digits);
        while (value != 0) {
            digits -= 1;
            buffer[digits] = bytes1(uint8(48 + uint256(value % 10)));
            value /= 10;
        }
        return string(buffer);
    }

    /**
     * @dev Get user's complete workout history
     */
    function getUserSessions(address _user) external view returns (WorkoutSession[] memory) {
        return userSessions[_user];
    }

    /**
     * @dev Get user's session count
     */
    function getUserSessionCount(address _user) external view returns (uint256) {
        return userSessions[_user].length;
    }

    /**
     * @dev Get paginated user sessions
     */
    function getUserSessionsPaginated(
        address _user,
        uint256 _offset,
        uint256 _limit
    ) external view returns (WorkoutSession[] memory) {
        WorkoutSession[] storage sessions = userSessions[_user];
        uint256 totalSessions = sessions.length;

        if (_offset >= totalSessions) {
            return new WorkoutSession[](0);
        }

        uint256 end = (_offset + _limit > totalSessions) ? totalSessions : _offset + _limit;
        uint256 resultSize = end - _offset;

        WorkoutSession[] memory result = new WorkoutSession[](resultSize);
        for (uint256 i = 0; i < resultSize; i++) {
            result[i] = sessions[_offset + i];
        }

        return result;
    }

    /**
     * @dev Distribute submission fee
     */
    function distributeFee() internal {
        uint256 ownerAmount = (msg.value * feeConfig.ownerShare) / 10000;
        uint256 rewardAmount = (msg.value * feeConfig.leaderboardShare) / 10000;

        // Send owner's share
        (bool success, ) = owner.call{value: ownerAmount}("");
        if (!success) {
            pendingRewards[owner] += ownerAmount;
        }

        // Add to reward pool for leaderboard distribution
        rewardConfig.totalRewardPool += rewardAmount;
        emit RewardPoolUpdated(rewardConfig.totalRewardPool);

        // Add user to eligible users if not already added
        if (!isEligibleUser[msg.sender]) {
            rewardEligibleUsers.push(msg.sender);
            isEligibleUser[msg.sender] = true;
        }

        // Check if auto-distribution is enabled and period has passed
        if (rewardConfig.autoDistribution &&
            block.timestamp >= rewardConfig.lastDistribution + rewardConfig.distributionPeriod) {
            distributeRewards();
        }
    }

    /**
     * @dev Get the complete leaderboard
     */
    function getLeaderboard() external view returns (AbsScore[] memory) {
        return leaderboard;
    }

    /**
     * @dev Get paginated leaderboard
     */
    function getLeaderboardPaginated(
        uint256 _offset,
        uint256 _limit
    ) external view returns (AbsScore[] memory) {
        uint256 totalEntries = leaderboard.length;

        if (_offset >= totalEntries) {
            return new AbsScore[](0);
        }

        uint256 end = (_offset + _limit > totalEntries) ? totalEntries : _offset + _limit;
        uint256 resultSize = end - _offset;

        AbsScore[] memory result = new AbsScore[](resultSize);
        for (uint256 i = 0; i < resultSize; i++) {
            result[i] = leaderboard[_offset + i];
        }

        return result;
    }

    /**
     * @dev Get top performers by composite score
     */
    function getTopPerformers(uint256 _count) external view returns (AbsScore[] memory) {
        uint256 totalEntries = leaderboard.length;
        if (totalEntries == 0) return new AbsScore[](0);

        uint256 resultSize = _count < totalEntries ? _count : totalEntries;

        // Create array with composite scores for sorting
        uint256[] memory scores = new uint256[](totalEntries);
        uint256[] memory indices = new uint256[](totalEntries);

        for (uint256 i = 0; i < totalEntries; i++) {
            AbsScore memory entry = leaderboard[i];
            scores[i] = calculateCompositeScore(
                entry.totalReps,
                entry.averageFormAccuracy,
                entry.bestStreak
            );
            indices[i] = i;
        }

        // Simple bubble sort for top performers (sufficient for small datasets)
        for (uint256 i = 0; i < totalEntries - 1; i++) {
            for (uint256 j = 0; j < totalEntries - i - 1; j++) {
                if (scores[j] < scores[j + 1]) {
                    // Swap scores
                    uint256 tempScore = scores[j];
                    scores[j] = scores[j + 1];
                    scores[j + 1] = tempScore;

                    // Swap indices
                    uint256 tempIndex = indices[j];
                    indices[j] = indices[j + 1];
                    indices[j + 1] = tempIndex;
                }
            }
        }

        // Return top performers in sorted order
        AbsScore[] memory result = new AbsScore[](resultSize);
        for (uint256 i = 0; i < resultSize; i++) {
            result[i] = leaderboard[indices[i]];
        }

        return result;
    }

    /**
     * @dev Get top performers addresses for reward distribution
     */
    function getTopPerformersAddresses(uint256 _count) public view returns (address[] memory) {
        uint256 totalEntries = leaderboard.length;
        if (totalEntries == 0) return new address[](0);

        uint256 resultSize = _count < totalEntries ? _count : totalEntries;

        // Create array with composite scores for sorting
        uint256[] memory scores = new uint256[](totalEntries);
        address[] memory addresses = new address[](totalEntries);

        for (uint256 i = 0; i < totalEntries; i++) {
            AbsScore memory entry = leaderboard[i];
            scores[i] = calculateCompositeScore(
                entry.totalReps,
                entry.averageFormAccuracy,
                entry.bestStreak
            );
            addresses[i] = entry.user;
        }

        // Simple bubble sort for top performers
        for (uint256 i = 0; i < totalEntries - 1; i++) {
            for (uint256 j = 0; j < totalEntries - i - 1; j++) {
                if (scores[j] < scores[j + 1]) {
                    // Swap scores
                    uint256 tempScore = scores[j];
                    scores[j] = scores[j + 1];
                    scores[j + 1] = tempScore;

                    // Swap addresses
                    address tempAddress = addresses[j];
                    addresses[j] = addresses[j + 1];
                    addresses[j + 1] = tempAddress;
                }
            }
        }

        // Return top performer addresses
        address[] memory result = new address[](resultSize);
        for (uint256 i = 0; i < resultSize; i++) {
            result[i] = addresses[i];
        }

        return result;
    }

    /**
     * @dev Get user's abs score
     */
    function getUserAbsScore(address _user) external view returns (AbsScore memory) {
        uint256 index = userIndex[_user];
        if (index == 0) revert UserNotFound();
        return leaderboard[index - 1];
    }

    /**
     * @dev Safe version that doesn't revert
     */
    function getUserAbsScoreSafe(address _user) external view returns (AbsScore memory, bool) {
        uint256 index = userIndex[_user];
        if (index == 0) {
            return (AbsScore({
                user: _user,
                totalReps: 0,
                averageFormAccuracy: 0,
                bestStreak: 0,
                sessionsCompleted: 0,
                timestamp: 0
            }), false);
        }
        return (leaderboard[index - 1], true);
    }

    /**
     * @dev Get time until next submission allowed
     */
    function getTimeUntilNextSubmission(address _user) external view returns (uint256) {
        uint256 offset = submissionTimeOffset[_user];

        if (offset == 0) return 0;

        uint256 lastSubmissionTime = submissionTimeBaseline + offset;

        if (block.timestamp >= lastSubmissionTime + SUBMISSION_COOLDOWN) {
            return 0;
        }

        return lastSubmissionTime + SUBMISSION_COOLDOWN - block.timestamp;
    }

    /**
     * @dev Claim pending rewards
     */
    function claimRewards() external {
        uint256 amount = pendingRewards[msg.sender];
        if (amount == 0) revert InvalidInput();

        pendingRewards[msg.sender] = 0;
        userRewards[msg.sender].lastClaimed = block.timestamp;

        (bool success, ) = msg.sender.call{value: amount}("");
        if (!success) revert RewardDistributionFailed();

        emit RewardClaimed(msg.sender, amount);
    }

    /**
     * @dev Distribute rewards to top performers
     */
    function distributeRewards() public {
        // Only owner can manually trigger, or auto-distribution if enabled
        if (!rewardConfig.autoDistribution && msg.sender != owner) {
            revert Unauthorized();
        }

        // Check if enough time has passed
        if (block.timestamp < rewardConfig.lastDistribution + rewardConfig.distributionPeriod) {
            revert OperationFailed();
        }

        // Check if there are rewards to distribute
        if (rewardConfig.totalRewardPool == 0) {
            revert InvalidInput();
        }

        // Get top performers
        address[] memory topPerformers = getTopPerformersAddresses(rewardConfig.topPerformersCount);

        if (topPerformers.length == 0) {
            return; // No users to reward
        }

        uint256 totalToDistribute = rewardConfig.totalRewardPool;
        uint256 distributedAmount = 0;

        // Distribute rewards based on ranking (higher rank gets more)
        for (uint256 i = 0; i < topPerformers.length; i++) {
            address user = topPerformers[i];

            // Calculate reward based on position (1st place gets most, decreasing for lower ranks)
            uint256 rewardMultiplier = (topPerformers.length - i) * 100; // 1000, 900, 800, etc.
            uint256 totalMultipliers = 0;

            // Calculate total multipliers for fair distribution
            for (uint256 j = 0; j < topPerformers.length; j++) {
                totalMultipliers += (topPerformers.length - j) * 100;
            }

            uint256 userReward = (totalToDistribute * rewardMultiplier) / totalMultipliers;

            // Add to pending rewards
            pendingRewards[user] += userReward;
            userRewards[user].totalEarned += userReward;
            userRewards[user].currentPeriodEarned = userReward;
            userRewards[user].rank = i + 1;

            distributedAmount += userReward;

            emit RewardDistributed(user, userReward);
        }

        // Reset reward pool and update last distribution
        rewardConfig.totalRewardPool = 0;
        rewardConfig.lastDistribution = block.timestamp;

        emit RewardDistributionExecuted(distributedAmount, topPerformers.length);
    }

    /**
     * @dev Get ecosystem information
     */
    function getEcosystemInfo() external pure returns (string memory, string memory, string memory) {
        return (ECOSYSTEM_NAME, APP_NAME, VERSION);
    }

    /**
     * @dev Check if running on Avalanche Fuji
     */
    function isAvalancheFuji() external view returns (bool) {
        uint256 id;
        assembly {
            id := chainid()
        }
        return id == AVALANCHE_FUJI_CHAINID;
    }

    // Admin functions
    function setSubmissionCooldown(uint256 _cooldown) external onlyOwner {
        SUBMISSION_COOLDOWN = _cooldown;
        emit SubmissionCooldownChanged(_cooldown);
    }

    function setMaxRepsPerSession(uint256 _maxReps) external onlyOwner {
        MAX_REPS_PER_SESSION = _maxReps;
        emit MaxRepsPerSessionChanged(_maxReps);
    }

    function setMinFormAccuracy(uint256 _minAccuracy) external onlyOwner {
        MIN_FORM_ACCURACY = _minAccuracy;
        emit MinFormAccuracyChanged(_minAccuracy);
    }

    function updateFeeConfig(
        uint256 _submissionFee,
        uint256 _ownerShare,
        uint256 _leaderboardShare
    ) external onlyOwner {
        if (_ownerShare + _leaderboardShare != 10000) revert InvalidInput();

        feeConfig.submissionFee = _submissionFee;
        feeConfig.ownerShare = _ownerShare;
        feeConfig.leaderboardShare = _leaderboardShare;

        emit FeeConfigUpdated(_submissionFee, _ownerShare, _leaderboardShare);
    }

    function updateRewardConfig(
        uint256 _distributionPeriod,
        uint256 _topPerformersCount,
        bool _autoDistribution
    ) external onlyOwner {
        if (_distributionPeriod < 1 days) revert InvalidInput(); // Minimum 1 day
        if (_topPerformersCount == 0 || _topPerformersCount > 50) revert InvalidInput(); // Max 50 performers

        rewardConfig.distributionPeriod = _distributionPeriod;
        rewardConfig.topPerformersCount = _topPerformersCount;
        rewardConfig.autoDistribution = _autoDistribution;

        emit RewardConfigUpdated(_distributionPeriod, _topPerformersCount, _autoDistribution);
    }

    function getRewardConfig() external view returns (
        uint256 distributionPeriod,
        uint256 topPerformersCount,
        uint256 lastDistribution,
        uint256 totalRewardPool,
        bool autoDistribution,
        uint256 timeUntilNextDistribution
    ) {
        uint256 nextDistribution = rewardConfig.lastDistribution + rewardConfig.distributionPeriod;
        uint256 timeUntil = block.timestamp >= nextDistribution ? 0 : nextDistribution - block.timestamp;

        return (
            rewardConfig.distributionPeriod,
            rewardConfig.topPerformersCount,
            rewardConfig.lastDistribution,
            rewardConfig.totalRewardPool,
            rewardConfig.autoDistribution,
            timeUntil
        );
    }

    function getUserRewardInfo(address user) external view returns (
        uint256 totalEarned,
        uint256 lastClaimed,
        uint256 currentPeriodEarned,
        uint256 rank,
        uint256 pendingAmount
    ) {
        UserReward memory reward = userRewards[user];
        return (
            reward.totalEarned,
            reward.lastClaimed,
            reward.currentPeriodEarned,
            reward.rank,
            pendingRewards[user]
        );
    }

    function getRewardEligibleUsersCount() external view returns (uint256) {
        return rewardEligibleUsers.length;
    }

    function isRewardDistributionDue() external view returns (bool) {
        return block.timestamp >= rewardConfig.lastDistribution + rewardConfig.distributionPeriod;
    }

    function transferOwnership(address _newOwner) external onlyOwner {
        if (_newOwner == address(0)) revert InvalidInput();
        address oldOwner = owner;
        owner = _newOwner;
        emit OwnershipTransferred(oldOwner, _newOwner);
    }

    function toggleSubmissions(bool _enabled) external onlyOwner {
        submissionsEnabled = _enabled;
        emit SubmissionStatusChanged(_enabled);
    }

    function emergencyWithdraw(address payable _to, uint256 _amount) external onlyOwner {
        uint256 withdrawAmount = _amount == 0 ? address(this).balance : _amount;
        if (withdrawAmount > address(this).balance) {
            withdrawAmount = address(this).balance;
        }

        (bool success, ) = _to.call{value: withdrawAmount}("");
        if (!success) revert OperationFailed();
        emit EmergencyWithdrawal(_to, withdrawAmount);
    }

    function emergencyDistributeRewards() external onlyOwner {
        // Emergency function to distribute rewards regardless of time constraints
        if (rewardConfig.totalRewardPool == 0) {
            revert InvalidInput();
        }

        // Temporarily store original settings
        uint256 originalLastDistribution = rewardConfig.lastDistribution;

        // Override time constraint for emergency distribution
        rewardConfig.lastDistribution = 0;

        // Distribute rewards
        distributeRewards();

        // Restore original timestamp (distribution function updates it)
        // This ensures normal schedule continues after emergency distribution
    }

    function addRewardFunding() external payable onlyOwner {
        // Allow owner to add additional funding to reward pool
        rewardConfig.totalRewardPool += msg.value;
        emit RewardPoolUpdated(rewardConfig.totalRewardPool);
    }

    // Chainlink Functions admin functions
    function updateChainlinkConfig(
        uint64 _subscriptionId,
        uint32 _gasLimit,
        bytes32 _donID,
        string memory _source
    ) external onlyOwner {
        subscriptionId = _subscriptionId;
        gasLimit = _gasLimit;
        donID = _donID;
        source = _source;
    }

    function getChainlinkConfig() external view returns (
        uint64,
        uint32,
        bytes32,
        string memory
    ) {
        return (subscriptionId, gasLimit, donID, source);
    }

    function getRequestStatus(bytes32 requestId) external view returns (
        address user,
        uint256 sessionIndex,
        uint256 originalScore,
        uint256 timestamp,
        bool fulfilled
    ) {
        FunctionsRequest storage request = functionsRequests[requestId];
        return (
            request.user,
            request.sessionIndex,
            request.originalScore,
            request.timestamp,
            request.fulfilled
        );
    }

    receive() external payable {}
}
