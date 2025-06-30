// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {VRFConsumerBaseV2Plus} from "@chainlink/contracts/src/v0.8/vrf/dev/VRFConsumerBaseV2Plus.sol";
import {VRFV2PlusClient} from "@chainlink/contracts/src/v0.8/vrf/dev/libraries/VRFV2PlusClient.sol";
import {IVRFCoordinatorV2Plus} from "@chainlink/contracts/src/v0.8/vrf/dev/interfaces/IVRFCoordinatorV2Plus.sol";
import "../interfaces/IChainlinkService.sol";

/**
 * @title VRFChallengeService
 * @notice Handles daily challenges using Chainlink VRF v2.5
 * @dev This service generates random daily challenges for users to complete
 */
contract VRFChallengeService is VRFConsumerBaseV2Plus, IVRFService {
    // --- Structs ---
    struct DailyChallenge {
        uint256 challengeType; // 0=reps, 1=duration, 2=streak, 3=accuracy, 4=combo
        uint256 target;
        uint256 bonusMultiplier; // in basis points (10000 = 100%)
        uint256 expiresAt;
        bool active;
    }

    // --- Constants ---
    bytes32 public constant SERVICE_TYPE = keccak256("VRF_SERVICE");
    uint32 public constant CALLBACK_GAS_LIMIT = 200000;
    uint16 public constant REQUEST_CONFIRMATIONS = 3;
    uint32 public constant NUM_WORDS = 3;

    // --- State Variables ---
    IVRFCoordinatorV2Plus public immutable i_vrfCoordinator;
    uint256 public immutable i_subscriptionId;
    bytes32 public immutable i_keyHash;
    address public immutable i_coreContract;
    address public contractOwner;

    DailyChallenge public currentChallenge;
    mapping(address => bool) public challengeCompleted;
    uint256 public lastChallengeUpdate;

    // VRF request tracking
    mapping(uint256 => bool) public pendingRequests;
    uint256 public currentRequestId;

    // --- Events ---
    event ChallengeGenerated(
        uint256 indexed challengeType,
        uint256 target,
        uint256 bonusMultiplier,
        uint256 expiresAt
    );
    event ChallengeCompleted(address indexed user, uint256 bonusEarned);
    event VRFRequestSent(uint256 indexed requestId);
    event VRFRequestFulfilled(uint256 indexed requestId);

    // --- Errors ---
    error OnlyOwner();
    error OnlyCoreContract();
    error VRFRequestFailed();
    error ChallengeNotActive();

    // --- Constructor ---
    constructor(
        address _vrfCoordinator,
        uint256 _subscriptionId,
        bytes32 _keyHash,
        address _coreContract
    ) VRFConsumerBaseV2Plus(_vrfCoordinator) {
        i_vrfCoordinator = IVRFCoordinatorV2Plus(_vrfCoordinator);
        i_subscriptionId = _subscriptionId;
        i_keyHash = _keyHash;
        i_coreContract = _coreContract;
        contractOwner = msg.sender;

        // Initialize first challenge manually
        currentChallenge = DailyChallenge({
            challengeType: 0, // Reps challenge
            target: 50,
            bonusMultiplier: 11000, // 110%
            expiresAt: block.timestamp + 1 days,
            active: true
        });
        lastChallengeUpdate = block.timestamp;
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

    // --- IChainlinkService Implementation ---

    function onWorkoutSubmitted(address user, uint256 sessionIndex) external override onlyCoreContract {
        // Check if challenge needs updating
        if (block.timestamp > currentChallenge.expiresAt ||
            (block.timestamp - lastChallengeUpdate) > 1 days) {
            requestNewChallenge();
        }

        // Check if user completed the current challenge
        _checkChallengeCompletion(user, sessionIndex);
    }

    function getServiceType() external pure override returns (bytes32) {
        return SERVICE_TYPE;
    }

    function isServiceReady() external view override returns (bool) {
        return currentChallenge.active &&
               block.timestamp <= currentChallenge.expiresAt &&
               address(i_vrfCoordinator) != address(0);
    }

    function getServiceConfig() external view override returns (bytes memory) {
        return abi.encode(
            i_subscriptionId,
            i_keyHash,
            CALLBACK_GAS_LIMIT,
            REQUEST_CONFIRMATIONS,
            NUM_WORDS
        );
    }

    // --- IVRFService Implementation ---

    function getCurrentChallenge() external view override returns (
        uint256 challengeType,
        uint256 target,
        uint256 bonusMultiplier,
        uint256 expiresAt,
        bool active
    ) {
        return (
            currentChallenge.challengeType,
            currentChallenge.target,
            currentChallenge.bonusMultiplier,
            currentChallenge.expiresAt,
            currentChallenge.active && block.timestamp <= currentChallenge.expiresAt
        );
    }

    function hasCompletedChallenge(address user) external view override returns (bool) {
        return challengeCompleted[user];
    }

    function requestNewChallenge() public override onlyContractOwner {
        if (currentRequestId != 0 && pendingRequests[currentRequestId]) {
            return; // Request already pending
        }

        try i_vrfCoordinator.requestRandomWords(
            VRFV2PlusClient.RandomWordsRequest({
                keyHash: i_keyHash,
                subId: i_subscriptionId,
                requestConfirmations: REQUEST_CONFIRMATIONS,
                callbackGasLimit: CALLBACK_GAS_LIMIT,
                numWords: NUM_WORDS,
                extraArgs: VRFV2PlusClient._argsToBytes(
                    VRFV2PlusClient.ExtraArgsV1({
                        nativePayment: false
                    })
                )
            })
        ) returns (uint256 requestId) {
            currentRequestId = requestId;
            pendingRequests[requestId] = true;
            emit VRFRequestSent(requestId);
        } catch {
            revert VRFRequestFailed();
        }
    }

    // --- VRF Callback ---

    function fulfillRandomWords(uint256 requestId, uint256[] calldata randomWords) internal override {
        if (!pendingRequests[requestId]) return;

        pendingRequests[requestId] = false;

        // Generate new challenge based on random numbers
        uint256 challengeType = randomWords[0] % 5; // 0-4
        uint256 target;
        uint256 bonusMultiplier;

        if (challengeType == 0) { // Reps challenge
            target = 30 + (randomWords[1] % 70); // 30-100 reps
            bonusMultiplier = 11000 + (randomWords[2] % 4000); // 110-150%
        } else if (challengeType == 1) { // Duration challenge
            target = 90 + (randomWords[1] % 30); // 90-120 seconds
            bonusMultiplier = 11000 + (randomWords[2] % 3000); // 110-140%
        } else if (challengeType == 2) { // Streak challenge
            target = 5 + (randomWords[1] % 15); // 5-20 streak
            bonusMultiplier = 12000 + (randomWords[2] % 5000); // 120-170%
        } else if (challengeType == 3) { // Accuracy challenge
            target = 85 + (randomWords[1] % 15); // 85-100% accuracy
            bonusMultiplier = 11500 + (randomWords[2] % 3500); // 115-150%
        } else { // Combo challenge
            target = 50 + (randomWords[1] % 50); // 50-100 reps with 90%+ accuracy
            bonusMultiplier = 13000 + (randomWords[2] % 7000); // 130-200%
        }

        // Update challenge
        currentChallenge = DailyChallenge({
            challengeType: challengeType,
            target: target,
            bonusMultiplier: bonusMultiplier,
            expiresAt: block.timestamp + 1 days,
            active: true
        });

        lastChallengeUpdate = block.timestamp;

        // Reset completion tracking
        // Note: This is gas-intensive. In production, use a different approach
        // like challenge generation counter or merkle trees

        emit ChallengeGenerated(challengeType, target, bonusMultiplier, currentChallenge.expiresAt);
        emit VRFRequestFulfilled(requestId);
    }

    // --- Internal Functions ---

    function _checkChallengeCompletion(address user, uint256 sessionIndex) internal {
        if (!currentChallenge.active ||
            block.timestamp > currentChallenge.expiresAt ||
            challengeCompleted[user]) {
            return;
        }

        // Get session data from core contract
        // This would need to be implemented based on your core contract interface
        // For now, we'll simulate the check

        bool challengeMet = _simulateChallenge(user, sessionIndex);

        if (challengeMet) {
            challengeCompleted[user] = true;

            // Calculate bonus (this would be communicated back to core contract)
            uint256 bonusEarned = (100 * currentChallenge.bonusMultiplier) / 10000;

            emit ChallengeCompleted(user, bonusEarned);
        }
    }

    function _simulateChallenge(address /*user*/, uint256 /*sessionIndex*/) internal view returns (bool) {
        // Placeholder: In reality, this would check actual session data
        // against the challenge requirements
        return (block.timestamp % 3 == 0); // Random success for demo
    }

    // --- Owner Functions ---

    function updateOwner(address newOwner) external onlyContractOwner {
        require(newOwner != address(0), "Invalid address");
        contractOwner = newOwner;
    }

    function emergencyPause() external onlyContractOwner {
        currentChallenge.active = false;
    }

    function emergencyResume() external onlyContractOwner {
        if (block.timestamp < currentChallenge.expiresAt) {
            currentChallenge.active = true;
        }
    }

    // --- View Functions ---

    function getChallengeProgress(address user) external view returns (
        bool eligible,
        bool completed,
        uint256 timeRemaining
    ) {
        eligible = currentChallenge.active && block.timestamp <= currentChallenge.expiresAt;
        completed = challengeCompleted[user];
        timeRemaining = currentChallenge.expiresAt > block.timestamp
            ? currentChallenge.expiresAt - block.timestamp
            : 0;
    }

    function getServiceStats() external view returns (
        uint256 totalChallengesGenerated,
        uint256 currentChallengeId,
        bool hasActiveChallengeRequest
    ) {
        return (
            lastChallengeUpdate > 0 ? (block.timestamp - lastChallengeUpdate) / 1 days + 1 : 0,
            currentRequestId,
            currentRequestId != 0 && pendingRequests[currentRequestId]
        );
    }
}
