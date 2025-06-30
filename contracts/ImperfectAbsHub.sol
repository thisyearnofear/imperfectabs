// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

// Chainlink Imports
import {FunctionsClient} from "@chainlink/contracts/src/v0.8/functions/v1_0_0/FunctionsClient.sol";
import {ConfirmedOwner} from "@chainlink/contracts/src/v0.8/shared/access/ConfirmedOwner.sol";
import {FunctionsRequest} from "@chainlink/contracts/src/v0.8/functions/v1_0_0/libraries/FunctionsRequest.sol";
import {CCIPReceiver} from "@chainlink/contracts-ccip/contracts/applications/CCIPReceiver.sol";
import {Client} from "@chainlink/contracts-ccip/contracts/libraries/Client.sol";

// OpenZeppelin Imports
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title ImperfectAbsHub (v2 - Hardened & Scalable)
 * @author Imperfect Abs Team
 * @notice The central aggregator contract for the Imperfect Fitness Ecosystem.
 * This version incorporates critical security and scalability improvements:
 * - Uses an event-based system for leaderboards, enabling scalable off-chain sorting.
 * - Implements a security-hardened JSON parser to safely handle API responses.
 * - Utilizes custom errors and struct packing for significant gas optimization.
 * - Correctly integrates Chainlink Functions for weather-based scoring and CCIP for cross-chain aggregation.
 */
contract ImperfectAbsHub is CCIPReceiver, FunctionsClient, ConfirmedOwner, ReentrancyGuard {
    using FunctionsRequest for FunctionsRequest.Request;

    // --- Custom Errors --- //
    error InvalidReps(uint256 provided, uint256 max);
    error InvalidAccuracy(uint256 provided);
    error CooldownActive(uint256 timeRemaining);
    error UnauthorizedChain(uint64 chainSelector);
    error InvalidJson();

    // --- Structs --- //

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
        bool analysisComplete;
        string conditions;
        int256 temperature;
        uint256 weatherBonusBps;
    }

    // --- Gas Optimized Struct using uint128 and uint64 for packing ---
    struct CrossChainFitnessData {
        uint128 polygonScore;
        uint128 baseScore;
        uint128 celoScore;
        uint128 monadScore;
        uint64 lastUpdateTimestamp; // uint64 is sufficient for timestamps until year 2554
    }

    struct WeatherRequest {
        address user;
        uint256 sessionIndex;
    }

    // --- Events --- //

    event WorkoutSessionSubmitted(address indexed user, uint256 sessionIndex, uint256 reps, string location);
    event WeatherAnalysisRequested(bytes32 indexed requestId, address indexed user, uint256 sessionIndex);
    event WeatherAnalysisCompleted(
        bytes32 indexed requestId,
        address indexed user,
        uint256 enhancedScore,
        string conditions,
        int256 temperature
    );
    event AnalysisFailed(bytes32 indexed requestId, address indexed user, bytes error);
    event CrossChainScoreReceived(
        bytes32 indexed messageId,
        uint64 indexed sourceChainSelector,
        address indexed user,
        uint256 score
    );
    event WhitelistedSourceChainUpdated(uint64 indexed chainSelector, bool isWhitelisted);
    // --- New event for scalable leaderboard ---
    event LeaderboardScoreUpdated(address indexed user, uint256 totalScore, uint256 timestamp);

    // --- State Variables --- //

    // Local Leaderboard Data
    LocalAbsScore[] public leaderboard;
    mapping(address => uint256) public userIndex; // 1-based index
    mapping(address => WorkoutSession[]) public userSessions;
    mapping(address => uint256) public lastSubmissionTime;

    // Cross-Chain (CCIP) Data
    mapping(address => CrossChainFitnessData) public crossChainData;
    mapping(uint64 => bool) public whitelistedSourceChains;
    mapping(uint64 => string) public sourceChainNames;

    // Chainlink Functions Data
    uint64 public s_functions_subscriptionId;
    uint32 public s_functions_gasLimit = 300000;
    bytes32 public s_donId;
    string public s_jsSource;
    uint8 public s_functions_secretsSlotId;
    mapping(bytes32 => WeatherRequest) public s_weatherRequests;

    // Configuration
    uint256 public constant MULTI_CHAIN_BONUS_BPS = 1000; // 10%
    uint256 public SUBMISSION_COOLDOWN = 60 seconds; // Testing: 60 seconds instead of 1 hour
    uint256 public MAX_REPS_PER_SESSION = 200;

    // Chain Selectors (Mainnet examples)
    uint64 public constant POLYGON_SELECTOR = 12532609583862916517;
    uint64 public constant BASE_SELECTOR = 10344971235874465080;
    uint64 public constant CELO_SELECTOR = 7539524587158712152;
    uint64 public constant MONAD_SELECTOR = 2183018362218727504; // Monad Testnet for Monad testnet selector

    constructor(
        address _ccipRouter,
        address _functionsRouter,
        uint64 _functionsSubscriptionId,
        bytes32 _donId,
        string memory _jsSource
    ) CCIPReceiver(_ccipRouter) FunctionsClient(_functionsRouter) ConfirmedOwner(msg.sender) ReentrancyGuard() {
        s_functions_subscriptionId = _functionsSubscriptionId;
        s_donId = _donId;
        s_jsSource = _jsSource;
        s_functions_secretsSlotId = 0; // Will be set via updateFunctionsConfig

        setWhitelistedChain(POLYGON_SELECTOR, "Polygon", true);
        setWhitelistedChain(BASE_SELECTOR, "Base", true);
        setWhitelistedChain(CELO_SELECTOR, "Celo", true);
    }

    /**
     * @notice Submits a workout session, triggering weather analysis and updating scores.
     * @dev Emits a `LeaderboardScoreUpdated` event for off-chain services to index.
     */
    function submitWorkoutSession(
        uint256 _reps,
        uint256 _formAccuracy,
        uint256 _streak,
        uint256 _duration,
        int256 _latitude,  // Latitude in fixed-point (multiply by 1e6)
        int256 _longitude  // Longitude in fixed-point (multiply by 1e6)
    ) external {
        // --- Validation with Custom Errors ---
        if (_reps == 0 || _reps > MAX_REPS_PER_SESSION) revert InvalidReps(_reps, MAX_REPS_PER_SESSION);
        if (_formAccuracy > 100) revert InvalidAccuracy(_formAccuracy);
        uint256 nextSubmissionTime = lastSubmissionTime[msg.sender] + SUBMISSION_COOLDOWN;
        if (block.timestamp < nextSubmissionTime) {
            revert CooldownActive(nextSubmissionTime - block.timestamp);
        }

        lastSubmissionTime[msg.sender] = block.timestamp;

        // Record session and update local score data
        uint256 sessionIndex = _recordLocalSession(_reps, _formAccuracy, _streak, _duration);
        _updateLocalLeaderboard(_reps, _formAccuracy, _streak);
        
        // Emit update for off-chain leaderboard indexing
        _emitLeaderboardUpdate(msg.sender);

        // Request weather analysis via Chainlink Functions
        bytes32 requestId = _requestWeatherAnalysis(msg.sender, sessionIndex, _latitude, _longitude, _reps, _formAccuracy, _duration);
        emit WorkoutSessionSubmitted(msg.sender, sessionIndex, _reps, string(abi.encodePacked(_latitude, ",", _longitude)));
        emit WeatherAnalysisRequested(requestId, msg.sender, sessionIndex);
    }

    /**
     * @inheritdoc CCIPReceiver
     * @dev Handles incoming cross-chain fitness scores.
     */
    function _ccipReceive(Client.Any2EVMMessage memory message) internal override {
        if (!whitelistedSourceChains[message.sourceChainSelector]) {
            revert UnauthorizedChain(message.sourceChainSelector);
        }
        (address user, uint256 score) = abi.decode(message.data, (address, uint256));

        _updateCrossChainScore(user, score, message.sourceChainSelector);

        // Emit update for off-chain leaderboard indexing
        _emitLeaderboardUpdate(user);

        emit CrossChainScoreReceived(message.messageId, message.sourceChainSelector, user, score);
    }

    /**
     * @inheritdoc FunctionsClient
     * @dev Callback for Chainlink Functions, handles weather API response.
     */
    function fulfillRequest(bytes32 requestId, bytes memory response, bytes memory err) internal override {
        if (s_weatherRequests[requestId].user == address(0)) return;

        WeatherRequest memory reqInfo = s_weatherRequests[requestId];
        WorkoutSession storage session = userSessions[reqInfo.user][reqInfo.sessionIndex];
        session.analysisComplete = true;

        if (err.length > 0) {
            session.enhancedScore = calculateBaseScore(session.reps, session.formAccuracy, session.streak);
            emit AnalysisFailed(requestId, reqInfo.user, err);
        } else {
            (string memory conditions, int256 temperature, uint256 weatherBonus, uint256 score) = _parseWeatherResponse(response);
            session.enhancedScore = score;
            session.conditions = conditions;
            session.temperature = temperature;
            session.weatherBonusBps = weatherBonus;
            emit WeatherAnalysisCompleted(requestId, reqInfo.user, score, conditions, temperature);
        }
        
        _emitLeaderboardUpdate(reqInfo.user);
        delete s_weatherRequests[requestId];
    }
    
    /**
     * @notice DEPRECATED: On-chain sorting is not scalable and has been removed.
     * @dev To get a sorted leaderboard, dApp frontends should subscribe to the
     * `LeaderboardScoreUpdated` event and build the list off-chain.
     */
    function getTopPerformers() external pure {
        revert("getTopPerformers is deprecated. Use an off-chain indexer with LeaderboardScoreUpdated events.");
    }

    // --- Core Logic Functions ---

    function calculateTotalScore(address user) public view returns (uint256) {
        uint256 localScore = 0;
        if (userIndex[user] > 0 && userIndex[user] <= leaderboard.length) {
            LocalAbsScore memory localData = leaderboard[userIndex[user] - 1];
            localScore = calculateBaseScore(localData.totalReps, localData.averageFormAccuracy, localData.bestStreak);
        }
        CrossChainFitnessData memory crossChain = crossChainData[user];
        uint256 totalCrossChainScore = uint256(crossChain.polygonScore) + uint256(crossChain.baseScore) + uint256(crossChain.celoScore) + uint256(crossChain.monadScore);
        uint256 activeChains = _countActiveChains(crossChain) + (localScore > 0 ? 1 : 0);
        uint256 bonusBps = activeChains > 1 ? (activeChains - 1) * MULTI_CHAIN_BONUS_BPS : 0;
        uint256 totalBaseScore = localScore + totalCrossChainScore;
        uint256 bonusAmount = (totalBaseScore * bonusBps) / 10000;
        return totalBaseScore + bonusAmount;
    }

    function calculateBaseScore(uint256 reps, uint256 accuracy, uint256 streak) public pure returns (uint256) {
        return (reps * 10) + ((accuracy * reps) / 10) + (streak * 25);
    }

    // --- Internal & Helper Functions ---

    function _emitLeaderboardUpdate(address user) internal {
        uint256 totalScore = calculateTotalScore(user);
        emit LeaderboardScoreUpdated(user, totalScore, block.timestamp);
    }
    
    function _updateCrossChainScore(address user, uint256 score, uint64 sourceChainSelector) internal {
        CrossChainFitnessData storage userData = crossChainData[user];
        // This design overwrites the score from a given chain with the latest value.
        // To accumulate scores instead of overwriting, change '=' to '+='.
        if (sourceChainSelector == POLYGON_SELECTOR)      userData.polygonScore = uint128(score);
        else if (sourceChainSelector == BASE_SELECTOR)    userData.baseScore = uint128(score);
        else if (sourceChainSelector == CELO_SELECTOR)    userData.celoScore = uint128(score);
        else if (sourceChainSelector == MONAD_SELECTOR)   userData.monadScore = uint128(score);
        else revert UnauthorizedChain(sourceChainSelector);
        
        userData.lastUpdateTimestamp = uint64(block.timestamp);
    }

    function _parseWeatherResponse(bytes memory response)
        internal
        pure
        returns (string memory, int256, uint256, uint256)
    {
        string memory json = string(response);
        string memory conditions = _getValueFromJson(json, "conditions");
        string memory tempStr = _getValueFromJson(json, "temperature");
        string memory bonusStr = _getValueFromJson(json, "weatherBonus");
        string memory scoreStr = _getValueFromJson(json, "score");
        
        if (bytes(conditions).length == 0 || bytes(tempStr).length == 0 || bytes(scoreStr).length == 0) revert InvalidJson();
        // Additional validation for scoreStr to ensure it contains only digits
        bytes memory scoreBytes = bytes(scoreStr);
        for (uint i = 0; i < scoreBytes.length; i++) {
            if (scoreBytes[i] < '0' || scoreBytes[i] > '9') revert InvalidJson();
        }

        return (conditions, stringToInt(tempStr), stringToUint(bonusStr), stringToUint(scoreStr));
    }
    
    // --- SECURITY HARDENED JSON PARSER with bounds checking ---
    function _getValueFromJson(string memory json, string memory key) internal pure returns (string memory) {
        bytes memory b = bytes(json);
        bytes memory k = bytes(string.concat('"', key, '":'));
        if (b.length < k.length) return "";
        for (uint i = 0; i <= b.length - k.length; i++) {
            bool found = true;
            for (uint j = 0; j < k.length; j++) {
                if (b[i + j] != k[j]) {
                    found = false;
                    break;
                }
            }
            if (found) {
                uint start = i + k.length;
                if (start >= b.length) return "";
                uint end;
                if (b[start] == '"') {
                    start++; end = start;
                    while (end < b.length && b[end] != '"') end++;
                } else {
                    end = start;
                    while (end < b.length && b[end] != ',' && b[end] != '}') end++;
                }
                if (end > start && end <= b.length) {
                    bytes memory value = new bytes(end - start);
                    for (uint j = 0; j < value.length; j++) value[j] = b[start + j];
                    return string(value);
                }
            }
        }
        return "";
    }

    // --- Other internal functions ---
    function _requestWeatherAnalysis(address user, uint256 sessionIndex, int256 latitude, int256 longitude, uint256 reps, uint256 formAccuracy, uint256 duration) internal returns (bytes32) {
        FunctionsRequest.Request memory req;
        req.initializeRequestForInlineJavaScript(s_jsSource);
        string[] memory args = new string[](5);
        args[0] = toString(reps);
        args[1] = toString(formAccuracy);
        args[2] = toString(duration);
        args[3] = _formatCoordinate(latitude);  // Convert to decimal string
        args[4] = _formatCoordinate(longitude); // Convert to decimal string
        req.setArgs(args);
        if (s_functions_secretsSlotId > 0) {
            req.addSecretsReference(abi.encodePacked(s_functions_secretsSlotId));
        }
        bytes32 requestId = _sendRequest(req.encodeCBOR(), s_functions_subscriptionId, s_functions_gasLimit, s_donId);
        s_weatherRequests[requestId] = WeatherRequest({user: user, sessionIndex: sessionIndex});
        return requestId;
    }
    function _recordLocalSession(uint256 r, uint256 fa, uint256 s, uint256 d) internal returns (uint256) {
        uint256 sessionIndex = userSessions[msg.sender].length;
        userSessions[msg.sender].push(WorkoutSession({ reps: r, formAccuracy: fa, streak: s, duration: d, timestamp: block.timestamp, enhancedScore: 0, analysisComplete: false, conditions: "Analyzing...", temperature: 0, weatherBonusBps: 10000 }));
        return sessionIndex;
    }
    function _updateLocalLeaderboard(uint256 r, uint256 fa, uint256 s) internal {
        uint256 index = userIndex[msg.sender];
        if (index == 0) {
            leaderboard.push(LocalAbsScore({ user: msg.sender, totalReps: r, averageFormAccuracy: fa, bestStreak: s, sessionsCompleted: 1, timestamp: block.timestamp }));
            userIndex[msg.sender] = leaderboard.length;
        } else {
            LocalAbsScore storage userScore = leaderboard[index - 1];
            userScore.totalReps += r;
            userScore.averageFormAccuracy = ((userScore.averageFormAccuracy * userScore.sessionsCompleted) + fa) / (userScore.sessionsCompleted + 1);
            if (s > userScore.bestStreak) userScore.bestStreak = s;
            userScore.sessionsCompleted++;
            userScore.timestamp = block.timestamp;
        }
    }
    function _countActiveChains(CrossChainFitnessData memory data) internal pure returns (uint256) {
        uint256 count = 0;
        if (data.polygonScore > 0) count++; if (data.baseScore > 0) count++; if (data.celoScore > 0) count++; if (data.monadScore > 0) count++;
        return count;
    }

    // --- Admin & View Functions ---

    function setWhitelistedChain(uint64 chainSelector, string memory name, bool isWhitelisted) public onlyOwner {
        whitelistedSourceChains[chainSelector] = isWhitelisted;
        if (isWhitelisted) sourceChainNames[chainSelector] = name;
        else delete sourceChainNames[chainSelector];
        emit WhitelistedSourceChainUpdated(chainSelector, isWhitelisted);
    }
    function updateFunctionsConfig(uint64 _subscriptionId, uint32 _gasLimit, bytes32 _donId, string memory _source) external onlyOwner {
        s_functions_subscriptionId = _subscriptionId; s_functions_gasLimit = _gasLimit; s_donId = _donId; s_jsSource = _source;
    }

    function updateSecretsSlotId(uint8 _secretsSlotId) external onlyOwner {
        s_functions_secretsSlotId = _secretsSlotId;
    }
    function getChainConfig() external view returns (address ccipRouter, address functionsRouter) {
        return (i_ccipRouter, address(i_router));
    }

    // Additional view functions for deployment verification
    function submissionsEnabled() external pure returns (bool) {
        return true; // Always enabled in this version
    }

    function aiAnalysisEnabled() external pure returns (bool) {
        return true; // Always enabled in this version
    }

    function feeConfig() external pure returns (uint256 submissionFee, uint256 ownerShare, uint256 leaderboardShare) {
        return (0, 0, 0); // No fees in this version
    }

    function getChainlinkConfig() external view returns (uint64 subId, uint32 gasLim, bytes32 donId, string memory source) {
        return (s_functions_subscriptionId, s_functions_gasLimit, s_donId, s_jsSource);
    }

    function getEcosystemInfo() external pure returns (string memory ecosystem, string memory appName, string memory version) {
        return ("Avalanche", "ImperfectAbsHub", "2.0.0");
    }
    function getUserSessions(address user) external view returns (WorkoutSession[] memory) {
        return userSessions[user];
    }
    
    // --- Utility Functions ---
    function toString(uint256 value) internal pure returns (string memory) { if (value == 0) return "0"; uint256 temp = value; uint256 digits; while (temp != 0) { digits++; temp /= 10; } bytes memory buffer = new bytes(digits); while (value != 0) { digits--; buffer[digits] = bytes1(uint8(48 + uint256(value % 10))); value /= 10; } return string(buffer); }

    /**
     * @dev Converts fixed-point coordinate to decimal string
     * @param coordinate Fixed-point coordinate (multiplied by 1e6)
     * @return Decimal string representation
     */
    function _formatCoordinate(int256 coordinate) internal pure returns (string memory) {
        bool negative = coordinate < 0;
        uint256 abs = uint256(negative ? -coordinate : coordinate);

        uint256 integerPart = abs / 1e6;
        uint256 fractionalPart = abs % 1e6;

        string memory intStr = toString(integerPart);
        string memory fracStr = toString(fractionalPart);

        // Pad fractional part to 6 digits
        bytes memory fracBytes = bytes(fracStr);
        bytes memory paddedFrac = new bytes(6);
        for (uint256 i = 0; i < 6; i++) {
            if (i < 6 - fracBytes.length) {
                paddedFrac[i] = bytes1(uint8(48)); // ASCII '0'
            } else {
                paddedFrac[i] = fracBytes[i - (6 - fracBytes.length)];
            }
        }

        return string(abi.encodePacked(
            negative ? "-" : "",
            intStr,
            ".",
            string(paddedFrac)
        ));
    }
    function stringToUint(string memory s) internal pure returns (uint256) { 
        bytes memory b = bytes(s); 
        if (b.length == 0) revert InvalidJson();
        uint256 result = 0; 
        for (uint i = 0; i < b.length; i++) { 
            uint8 c = uint8(b[i]); 
            if (c < 48 || c > 57) revert InvalidJson(); // Ensure only digits
            result = result * 10 + (c - 48); 
        } 
        return result; 
    }
    function stringToInt(string memory s) internal pure returns (int256) { 
        bytes memory b = bytes(s); 
        if (b.length == 0) return 0; 
        bool isNegative = b[0] == '-'; 
        uint i = isNegative ? 1 : 0; 
        if (isNegative && b.length == 1) revert InvalidJson(); // Only minus sign is invalid
        int256 result = 0; 
        for (; i < b.length; i++) { 
            uint8 c = uint8(b[i]); 
            if (c < 48 || c > 57) revert InvalidJson(); // Ensure only digits after optional minus
            int256 digit = int256(uint256(c)) - 48;
            // Overflow check considering the sign
            if (isNegative) {
                if (result < type(int256).min / 10 || (result * 10 < result || result * 10 - digit < type(int256).min)) revert InvalidJson();
            } else {
                if (result > type(int256).max / 10 || (result * 10 > result || result * 10 + digit > type(int256).max)) revert InvalidJson();
            }
            result = result * 10 + (isNegative ? -digit : digit); 
        } 
        return result; 
    }
}
