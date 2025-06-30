// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {IRouterClient} from "@chainlink/contracts-ccip/src/v0.8/ccip/interfaces/IRouterClient.sol";
import {OwnerIsCreator} from "@chainlink/contracts-ccip/src/v0.8/shared/access/OwnerIsCreator.sol";
import {Client} from "@chainlink/contracts-ccip/src/v0.8/ccip/libraries/Client.sol";
import {IERC20} from "@chainlink/contracts-ccip/src/v0.8/vendor/openzeppelin-solidity/v4.8.3/contracts/token/ERC20/IERC20.sol";

/**
 * @title FitnessCCIPBridge
 * @notice Bridges fitness data from local contracts to Avalanche CCIP hub
 * @dev Reads from existing FitnessLeaderboard contracts and sends via CCIP
 */
contract FitnessCCIPBridge is OwnerIsCreator {
    // Custom errors
    error NotEnoughBalance(uint256 currentBalance, uint256 calculatedFees);
    error NothingToWithdraw();
    error FailedToWithdrawEth(address owner, address target, uint256 value);
    error DestinationChainNotWhitelisted(uint64 destinationChainSelector);
    error InvalidUserAddress();
    error NoScoreFound(address user);

    // Events
    event MessageSent(
        bytes32 indexed messageId,
        uint64 indexed destinationChainSelector,
        address receiver,
        address user,
        uint256 score,
        uint256 fees
    );

    // Network configurations
    struct NetworkConfig {
        IRouterClient router;
        uint64 destinationChainSelector; // Avalanche Fuji selector
        address destinationReceiver;    // Avalanche CCIP hub address
        address fitnessContract;        // Local fitness contract
        bool isActive;
    }

    // Fitness contract interface
    interface IFitnessLeaderboard {
        function getUserScore(address user) external view returns (
            address userAddr,
            uint256 pushups,
            uint256 squats,
            uint256 timestamp
        );

        function getUserScoreSafe(address user) external view returns (
            address userAddr,
            uint256 pushups,
            uint256 squats,
            uint256 timestamp,
            bool exists
        );
    }

    NetworkConfig public networkConfig;
    mapping(uint64 => bool) public whitelistedDestinationChains;
    mapping(address => uint256) public lastBridgedScore;
    mapping(address => uint256) public lastBridgeTime;

    uint256 public constant BRIDGE_COOLDOWN = 1 hours; // Prevent spam
    uint256 public constant MIN_SCORE_THRESHOLD = 10;   // Minimum score to bridge

    modifier onlyWhitelistedDestination(uint64 _destinationChainSelector) {
        if (!whitelistedDestinationChains[_destinationChainSelector])
            revert DestinationChainNotWhitelisted(_destinationChainSelector);
        _;
    }

    modifier validUser(address user) {
        if (user == address(0)) revert InvalidUserAddress();
        _;
    }

    constructor(
        address _router,
        uint64 _destinationChainSelector,
        address _destinationReceiver,
        address _fitnessContract
    ) {
        networkConfig = NetworkConfig({
            router: IRouterClient(_router),
            destinationChainSelector: _destinationChainSelector,
            destinationReceiver: _destinationReceiver,
            fitnessContract: _fitnessContract,
            isActive: true
        });

        whitelistedDestinationChains[_destinationChainSelector] = true;
    }

    /**
     * @notice Bridge user's fitness data to Avalanche hub
     * @param user Address of the user whose data to bridge
     * @return messageId The ID of the CCIP message
     */
    function bridgeUserData(address user)
        external
        payable
        validUser(user)
        onlyWhitelistedDestination(networkConfig.destinationChainSelector)
        returns (bytes32 messageId)
    {
        require(networkConfig.isActive, "Bridge is not active");
        require(
            block.timestamp >= lastBridgeTime[user] + BRIDGE_COOLDOWN,
            "Bridge cooldown active"
        );

        // Read user's score from local fitness contract
        uint256 totalScore = _getUserTotalScore(user);
        require(totalScore >= MIN_SCORE_THRESHOLD, "Score too low to bridge");
        require(totalScore > lastBridgedScore[user], "No new score to bridge");

        // Build CCIP message
        Client.EVM2AnyMessage memory evm2AnyMessage = Client.EVM2AnyMessage({
            receiver: abi.encode(networkConfig.destinationReceiver),
            data: abi.encode(user, totalScore),
            tokenAmounts: new Client.EVMTokenAmount[](0), // No tokens
            extraArgs: Client._argsToBytes(
                Client.EVMExtraArgsV1({gasLimit: 400_000}) // Gas limit for receiver
            ),
            feeToken: address(0) // Pay in native token
        });

        // Calculate fees
        uint256 fees = networkConfig.router.getFee(
            networkConfig.destinationChainSelector,
            evm2AnyMessage
        );

        if (fees > msg.value) {
            revert NotEnoughBalance(msg.value, fees);
        }

        // Send CCIP message
        messageId = networkConfig.router.ccipSend{value: fees}(
            networkConfig.destinationChainSelector,
            evm2AnyMessage
        );

        // Update tracking
        lastBridgedScore[user] = totalScore;
        lastBridgeTime[user] = block.timestamp;

        // Refund excess payment
        if (msg.value > fees) {
            payable(msg.sender).transfer(msg.value - fees);
        }

        emit MessageSent(
            messageId,
            networkConfig.destinationChainSelector,
            networkConfig.destinationReceiver,
            user,
            totalScore,
            fees
        );

        return messageId;
    }

    /**
     * @notice Bridge multiple users' data in one transaction
     * @param users Array of user addresses to bridge
     * @return messageIds Array of CCIP message IDs
     */
    function bridgeMultipleUsers(address[] calldata users)
        external
        payable
        returns (bytes32[] memory messageIds)
    {
        require(users.length > 0 && users.length <= 10, "Invalid users array");

        messageIds = new bytes32[](users.length);
        uint256 totalFeesUsed = 0;

        for (uint256 i = 0; i < users.length; i++) {
            if (users[i] == address(0)) continue;

            // Check if user has new score to bridge
            uint256 totalScore = _getUserTotalScore(users[i]);
            if (totalScore <= lastBridgedScore[users[i]] || totalScore < MIN_SCORE_THRESHOLD) {
                continue;
            }

            // Calculate individual fees
            Client.EVM2AnyMessage memory evm2AnyMessage = Client.EVM2AnyMessage({
                receiver: abi.encode(networkConfig.destinationReceiver),
                data: abi.encode(users[i], totalScore),
                tokenAmounts: new Client.EVMTokenAmount[](0),
                extraArgs: Client._argsToBytes(
                    Client.EVMExtraArgsV1({gasLimit: 400_000})
                ),
                feeToken: address(0)
            });

            uint256 fees = networkConfig.router.getFee(
                networkConfig.destinationChainSelector,
                evm2AnyMessage
            );

            if (totalFeesUsed + fees > msg.value) {
                break; // Stop if not enough funds
            }

            // Send message
            messageIds[i] = networkConfig.router.ccipSend{value: fees}(
                networkConfig.destinationChainSelector,
                evm2AnyMessage
            );

            // Update tracking
            lastBridgedScore[users[i]] = totalScore;
            lastBridgeTime[users[i]] = block.timestamp;
            totalFeesUsed += fees;

            emit MessageSent(
                messageIds[i],
                networkConfig.destinationChainSelector,
                networkConfig.destinationReceiver,
                users[i],
                totalScore,
                fees
            );
        }

        // Refund unused funds
        if (msg.value > totalFeesUsed) {
            payable(msg.sender).transfer(msg.value - totalFeesUsed);
        }

        return messageIds;
    }

    /**
     * @notice Get estimated fee for bridging user data
     * @param user Address of the user
     * @return fee Estimated fee in wei
     */
    function getEstimatedFee(address user) external view returns (uint256 fee) {
        uint256 totalScore = _getUserTotalScore(user);

        Client.EVM2AnyMessage memory evm2AnyMessage = Client.EVM2AnyMessage({
            receiver: abi.encode(networkConfig.destinationReceiver),
            data: abi.encode(user, totalScore),
            tokenAmounts: new Client.EVMTokenAmount[](0),
            extraArgs: Client._argsToBytes(
                Client.EVMExtraArgsV1({gasLimit: 400_000})
            ),
            feeToken: address(0)
        });

        return networkConfig.router.getFee(
            networkConfig.destinationChainSelector,
            evm2AnyMessage
        );
    }

    /**
     * @notice Get user's total score from local fitness contract
     * @param user Address of the user
     * @return totalScore Combined pushups and squats score
     */
    function _getUserTotalScore(address user) internal view returns (uint256 totalScore) {
        IFitnessLeaderboard fitnessContract = IFitnessLeaderboard(networkConfig.fitnessContract);

        try fitnessContract.getUserScoreSafe(user) returns (
            address,
            uint256 pushups,
            uint256 squats,
            uint256,
            bool exists
        ) {
            if (exists) {
                // Convert pushups/squats to unified score (similar to abs reps)
                totalScore = pushups + squats;
            }
        } catch {
            // Fallback to basic getUserScore
            try fitnessContract.getUserScore(user) returns (
                address,
                uint256 pushups,
                uint256 squats,
                uint256
            ) {
                totalScore = pushups + squats;
            } catch {
                totalScore = 0;
            }
        }

        return totalScore;
    }

    // Admin functions
    function updateNetworkConfig(
        address _router,
        uint64 _destinationChainSelector,
        address _destinationReceiver,
        address _fitnessContract
    ) external onlyOwner {
        networkConfig.router = IRouterClient(_router);
        networkConfig.destinationChainSelector = _destinationChainSelector;
        networkConfig.destinationReceiver = _destinationReceiver;
        networkConfig.fitnessContract = _fitnessContract;
    }

    function toggleBridge(bool _isActive) external onlyOwner {
        networkConfig.isActive = _isActive;
    }

    function whitelistDestinationChain(
        uint64 _destinationChainSelector,
        bool _whitelisted
    ) external onlyOwner {
        whitelistedDestinationChains[_destinationChainSelector] = _whitelisted;
    }

    function updateCooldownAndThreshold(
        uint256 _newCooldown,
        uint256 _newThreshold
    ) external onlyOwner {
        // Update via storage (constants can't be changed)
        // This would require making them storage variables instead
    }

    // Emergency functions
    function withdraw(address _beneficiary) public onlyOwner {
        uint256 amount = address(this).balance;
        if (amount == 0) revert NothingToWithdraw();

        (bool sent, ) = _beneficiary.call{value: amount}("");
        if (!sent) revert FailedToWithdrawEth(msg.sender, _beneficiary, amount);
    }

    function withdrawToken(
        address _beneficiary,
        address _token
    ) public onlyOwner {
        uint256 amount = IERC20(_token).balanceOf(address(this));
        if (amount == 0) revert NothingToWithdraw();
        IERC20(_token).transfer(_beneficiary, amount);
    }

    // View functions
    function getNetworkConfig() external view returns (NetworkConfig memory) {
        return networkConfig;
    }

    function getUserBridgeInfo(address user) external view returns (
        uint256 lastScore,
        uint256 lastTime,
        uint256 currentScore,
        bool canBridge
    ) {
        lastScore = lastBridgedScore[user];
        lastTime = lastBridgeTime[user];
        currentScore = _getUserTotalScore(user);

        canBridge = (
            networkConfig.isActive &&
            currentScore >= MIN_SCORE_THRESHOLD &&
            currentScore > lastScore &&
            block.timestamp >= lastTime + BRIDGE_COOLDOWN
        );
    }

    // Receive function to accept native tokens
    receive() external payable {}
    fallback() external payable {}
}
