// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {CCIPReceiver} from "@chainlink/contracts-ccip/contracts/applications/CCIPReceiver.sol";
import {Client} from "@chainlink/contracts-ccip/contracts/libraries/Client.sol";
import {IRouterClient} from "@chainlink/contracts-ccip/contracts/interfaces/IRouterClient.sol";
import {LinkTokenInterface} from "@chainlink/contracts/src/v0.8/shared/interfaces/LinkTokenInterface.sol";
import "../interfaces/IChainlinkService.sol";

/**
 * @title CCIPCrossChainService
 * @notice Handles cross-chain score synchronization using Chainlink CCIP
 * @dev This service sends and receives fitness scores across different blockchains
 */
contract CCIPCrossChainService is CCIPReceiver, ICCIPService {
    // --- Structs ---
    struct CrossChainScore {
        uint256 totalReps;
        uint256 averageFormAccuracy;
        uint256 bestStreak;
        uint256 sessionsCompleted;
        uint256 lastUpdated;
    }

    struct ChainConfig {
        uint64 chainSelector;
        string chainName;
        bool enabled;
        uint256 gasLimit;
    }

    // --- Constants ---
    bytes32 public constant SERVICE_TYPE = keccak256("CCIP_SERVICE");
    uint256 public constant DEFAULT_GAS_LIMIT = 200000;

    // --- State Variables ---
    IRouterClient public immutable i_router;
    LinkTokenInterface public immutable i_linkToken;
    address public immutable i_coreContract;
    address public contractOwner;

    // Cross-chain score tracking
    mapping(address => mapping(uint64 => CrossChainScore)) public crossChainScores;
    mapping(uint64 => ChainConfig) public supportedChains;
    uint64[] public chainList;

    // Message tracking
    mapping(bytes32 => bool) public processedMessages;
    mapping(bytes32 => address) public messageToUser;

    // --- Events ---
    event CrossChainScoreSent(
        bytes32 indexed messageId,
        uint64 indexed destinationChain,
        address indexed user,
        uint256 totalReps,
        uint256 averageAccuracy,
        uint256 bestStreak
    );

    event CrossChainScoreReceived(
        bytes32 indexed messageId,
        uint64 indexed sourceChain,
        address indexed user,
        uint256 totalReps,
        uint256 averageAccuracy,
        uint256 bestStreak
    );

    event ChainConfigUpdated(
        uint64 indexed chainSelector,
        string chainName,
        bool enabled
    );

    // --- Errors ---
    error OnlyOwner();
    error OnlyCoreContract();
    error ChainNotSupported(uint64 chainSelector);
    error MessageAlreadyProcessed(bytes32 messageId);
    error InsufficientLinkBalance(uint256 required, uint256 available);
    error InvalidChainConfig();

    // --- Constructor ---
    constructor(
        address _router,
        address _linkToken,
        address _coreContract
    ) CCIPReceiver(_router) {
        i_router = IRouterClient(_router);
        i_linkToken = LinkTokenInterface(_linkToken);
        i_coreContract = _coreContract;
        contractOwner = msg.sender;

        // Initialize default supported chains
        _initializeSupportedChains();
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

    modifier onlySupportedChain(uint64 chainSelector) {
        if (!supportedChains[chainSelector].enabled) {
            revert ChainNotSupported(chainSelector);
        }
        _;
    }

    // --- IChainlinkService Implementation ---

    function onWorkoutSubmitted(address user, uint256 sessionIndex) external override onlyCoreContract {
        // Get user's updated score from core contract and broadcast to other chains
        _broadcastScoreUpdate(user);
    }

    function getServiceType() external pure override returns (bytes32) {
        return SERVICE_TYPE;
    }

    function isServiceReady() external view override returns (bool) {
        return address(i_router) != address(0) &&
               address(i_linkToken) != address(0) &&
               chainList.length > 0;
    }

    function getServiceConfig() external view override returns (bytes memory) {
        return abi.encode(
            address(i_router),
            address(i_linkToken),
            chainList.length,
            DEFAULT_GAS_LIMIT
        );
    }

    // --- ICCIPService Implementation ---

    function sendScoreUpdate(
        address user,
        uint256 score,
        uint64[] calldata targetChains
    ) external override onlyCoreContract {
        for (uint256 i = 0; i < targetChains.length; i++) {
            _sendScoreToChain(user, score, targetChains[i]);
        }
    }

    function getCrossChainScore(address user, uint64 chainSelector) external view override returns (uint256) {
        CrossChainScore memory userScore = crossChainScores[user][chainSelector];
        // Calculate composite score
        return _calculateCompositeScore(
            userScore.totalReps,
            userScore.averageFormAccuracy,
            userScore.bestStreak,
            userScore.sessionsCompleted
        );
    }

    function getSupportedChains() external view override returns (uint64[] memory) {
        return chainList;
    }

    // --- CCIP Message Handling ---

    function _ccipReceive(Client.Any2EVMMessage memory message) internal override {
        bytes32 messageId = message.messageId;

        if (processedMessages[messageId]) {
            revert MessageAlreadyProcessed(messageId);
        }

        if (!supportedChains[message.sourceChainSelector].enabled) {
            revert ChainNotSupported(message.sourceChainSelector);
        }

        processedMessages[messageId] = true;

        // Decode the message data
        (address user, uint256 totalReps, uint256 averageAccuracy, uint256 bestStreak, uint256 sessionsCompleted) =
            abi.decode(message.data, (address, uint256, uint256, uint256, uint256));

        // Update cross-chain score
        crossChainScores[user][message.sourceChainSelector] = CrossChainScore({
            totalReps: totalReps,
            averageFormAccuracy: averageAccuracy,
            bestStreak: bestStreak,
            sessionsCompleted: sessionsCompleted,
            lastUpdated: block.timestamp
        });

        messageToUser[messageId] = user;

        emit CrossChainScoreReceived(
            messageId,
            message.sourceChainSelector,
            user,
            totalReps,
            averageAccuracy,
            bestStreak
        );
    }

    // --- Internal Functions ---

    function _broadcastScoreUpdate(address user) internal {
        // Get user score from core contract (this would need an interface call)
        // For now, we'll simulate getting the score
        (uint256 totalReps, uint256 averageAccuracy, uint256 bestStreak, uint256 sessionsCompleted) =
            _getUserScoreFromCore(user);

        // Send to all supported chains
        for (uint256 i = 0; i < chainList.length; i++) {
            uint64 chainSelector = chainList[i];
            if (supportedChains[chainSelector].enabled) {
                _sendScoreToChain(user, totalReps, averageAccuracy, bestStreak, sessionsCompleted, chainSelector);
            }
        }
    }

    function _sendScoreToChain(
        address user,
        uint256 totalReps,
        uint256 averageAccuracy,
        uint256 bestStreak,
        uint256 sessionsCompleted,
        uint64 destinationChain
    ) internal onlySupportedChain(destinationChain) {
        // Encode the message data
        bytes memory data = abi.encode(user, totalReps, averageAccuracy, bestStreak, sessionsCompleted);

        // Build the CCIP message
        Client.EVM2AnyMessage memory message = Client.EVM2AnyMessage({
            receiver: abi.encode(address(this)), // Send to same contract on other chain
            data: data,
            tokenAmounts: new Client.EVMTokenAmount[](0),
            extraArgs: Client._argsToBytes(
                Client.EVMExtraArgsV1({
                    gasLimit: supportedChains[destinationChain].gasLimit
                })
            ),
            feeToken: address(i_linkToken)
        });

        // Calculate fee
        uint256 fee = i_router.getFee(destinationChain, message);

        // Check LINK balance
        uint256 linkBalance = i_linkToken.balanceOf(address(this));
        if (linkBalance < fee) {
            revert InsufficientLinkBalance(fee, linkBalance);
        }

        // Approve and send
        i_linkToken.approve(address(i_router), fee);
        bytes32 messageId = i_router.ccipSend(destinationChain, message);

        emit CrossChainScoreSent(
            messageId,
            destinationChain,
            user,
            totalReps,
            averageAccuracy,
            bestStreak
        );
    }

    function _sendScoreToChain(address user, uint256 score, uint64 destinationChain) internal {
        // Simplified version for backward compatibility
        // In practice, you'd get full score details
        _sendScoreToChain(user, score, 0, 0, 1, destinationChain);
    }

    function _getUserScoreFromCore(address user) internal view returns (
        uint256 totalReps,
        uint256 averageAccuracy,
        uint256 bestStreak,
        uint256 sessionsCompleted
    ) {
        // This would make a call to the core contract
        // For now, return placeholder values
        return (100, 85, 10, 5);
    }

    function _calculateCompositeScore(
        uint256 totalReps,
        uint256 averageAccuracy,
        uint256 bestStreak,
        uint256 sessionsCompleted
    ) internal pure returns (uint256) {
        if (sessionsCompleted == 0) return 0;

        uint256 baseScore = totalReps * 2;
        baseScore += (averageAccuracy * totalReps) / 100;
        baseScore += bestStreak * 5;
        baseScore += sessionsCompleted * 10;

        return baseScore;
    }

    function _initializeSupportedChains() internal {
        // Polygon Mumbai
        uint64 polygonSelector = 12532609583862916517;
        supportedChains[polygonSelector] = ChainConfig({
            chainSelector: polygonSelector,
            chainName: "Polygon Mumbai",
            enabled: true,
            gasLimit: DEFAULT_GAS_LIMIT
        });
        chainList.push(polygonSelector);

        // Base Sepolia
        uint64 baseSelector = 10344971235874465080;
        supportedChains[baseSelector] = ChainConfig({
            chainSelector: baseSelector,
            chainName: "Base Sepolia",
            enabled: true,
            gasLimit: DEFAULT_GAS_LIMIT
        });
        chainList.push(baseSelector);

        // Ethereum Sepolia
        uint64 ethSelector = 16015286601757825753;
        supportedChains[ethSelector] = ChainConfig({
            chainSelector: ethSelector,
            chainName: "Ethereum Sepolia",
            enabled: true,
            gasLimit: DEFAULT_GAS_LIMIT
        });
        chainList.push(ethSelector);
    }

    // --- Owner Functions ---

    function updateChainConfig(
        uint64 chainSelector,
        string memory chainName,
        bool enabled,
        uint256 gasLimit
    ) external onlyContractOwner {
        if (gasLimit == 0) revert InvalidChainConfig();

        bool isNewChain = supportedChains[chainSelector].chainSelector == 0;

        supportedChains[chainSelector] = ChainConfig({
            chainSelector: chainSelector,
            chainName: chainName,
            enabled: enabled,
            gasLimit: gasLimit
        });

        if (isNewChain) {
            chainList.push(chainSelector);
        }

        emit ChainConfigUpdated(chainSelector, chainName, enabled);
    }

    function fundContract() external payable onlyContractOwner {
        // Allow owner to fund contract with ETH for gas
    }

    function withdrawLink(uint256 amount) external onlyContractOwner {
        require(i_linkToken.transfer(contractOwner, amount), "LINK transfer failed");
    }

    function withdrawEth(uint256 amount) external onlyContractOwner {
        require(address(this).balance >= amount, "Insufficient ETH balance");
        (bool success, ) = contractOwner.call{value: amount}("");
        require(success, "ETH transfer failed");
    }

    function updateOwner(address newOwner) external onlyContractOwner {
        require(newOwner != address(0), "Invalid address");
        contractOwner = newOwner;
    }

    // --- View Functions ---

    function getUserCrossChainScores(address user) external view returns (
        uint64[] memory chains,
        CrossChainScore[] memory scores
    ) {
        chains = new uint64[](chainList.length);
        scores = new CrossChainScore[](chainList.length);

        for (uint256 i = 0; i < chainList.length; i++) {
            chains[i] = chainList[i];
            scores[i] = crossChainScores[user][chainList[i]];
        }
    }

    function getChainConfig(uint64 chainSelector) external view returns (ChainConfig memory) {
        return supportedChains[chainSelector];
    }

    function getLinkBalance() external view returns (uint256) {
        return i_linkToken.balanceOf(address(this));
    }

    function estimateFee(uint64 destinationChain, bytes memory data) external view returns (uint256) {
        Client.EVM2AnyMessage memory message = Client.EVM2AnyMessage({
            receiver: abi.encode(address(this)),
            data: data,
            tokenAmounts: new Client.EVMTokenAmount[](0),
            extraArgs: Client._argsToBytes(
                Client.EVMExtraArgsV1({
                    gasLimit: supportedChains[destinationChain].gasLimit
                })
            ),
            feeToken: address(i_linkToken)
        });

        return i_router.getFee(destinationChain, message);
    }

    // --- Fallback Functions ---
    receive() external payable {}
}
