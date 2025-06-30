const { ethers } = require("ethers");

const CONFIG = {
  rpcUrl: "https://api.avax-test.network/ext/bc/C/rpc",
  contractAddress: "0x060F0F142D5BfC721a7C53D00B4bAD77Ad82C776",
  vrfCoordinator: "0x2eD832Ba664535e5886b75D64C46EB9a228C2610",
  subscriptionId: 2835,
  privateKey: process.env.PRIVATE_KEY,
};

// Contract ABI (minimal for debugging)
const CONTRACT_ABI = [
  "function s_subscriptionId() external view returns (uint64)",
  "function s_keyHash() external view returns (bytes32)",
  "function i_vrfCoordinator() external view returns (address)",
  "function getCurrentChallenge() external view returns (tuple(uint256 challengeType, uint256 target, uint256 bonusMultiplier, uint256 expiresAt, bool active))",
  "function manualChallengeUpdate() external",
  "function lastChallengeUpdate() external view returns (uint256)",
  "event DailyChallengeGenerated(uint256 challengeType, uint256 target, uint256 bonus, uint256 expiresAt)",
];

// VRF Coordinator ABI (minimal)
const VRF_COORDINATOR_ABI = [
  "function getSubscription(uint64 subId) external view returns (uint96 balance, uint64 reqCount, address owner, address[] memory consumers)",
  "event RandomWordsRequested(bytes32 indexed keyHash, uint256 requestId, uint256 preSeed, uint64 indexed subId, uint16 minimumRequestConfirmations, uint32 callbackGasLimit, uint32 numWords, address indexed sender)",
];

async function debugVRFIntegration() {
  console.log("🔍 Debugging VRF Integration...");

  // Setup provider and wallet
  const provider = new ethers.providers.JsonRpcProvider(CONFIG.rpcUrl);
  const wallet = new ethers.Wallet(CONFIG.privateKey, provider);
  const contract = new ethers.Contract(
    CONFIG.contractAddress,
    CONTRACT_ABI,
    wallet
  );
  const vrfCoordinator = new ethers.Contract(
    CONFIG.vrfCoordinator,
    VRF_COORDINATOR_ABI,
    provider
  );

  console.log("👤 Wallet Address:", wallet.address);
  console.log("📄 Contract Address:", CONFIG.contractAddress);
  console.log("🎲 VRF Coordinator:", CONFIG.vrfCoordinator);

  try {
    // 1. Check contract VRF configuration
    console.log("\n🔧 Contract VRF Configuration:");
    const contractSubId = await contract.s_subscriptionId();
    const contractKeyHash = await contract.s_keyHash();
    const contractVRFCoordinator = await contract.i_vrfCoordinator();

    console.log("  Subscription ID:", contractSubId.toString());
    console.log("  Key Hash:", contractKeyHash);
    console.log("  VRF Coordinator:", contractVRFCoordinator);

    // 2. Check VRF subscription details
    console.log("\n💰 VRF Subscription Details:");
    const [balance, reqCount, owner, consumers] =
      await vrfCoordinator.getSubscription(CONFIG.subscriptionId);
    console.log("  Balance:", ethers.utils.formatEther(balance), "LINK");
    console.log("  Request Count:", reqCount.toString());
    console.log("  Owner:", owner);
    console.log("  Consumers:", consumers.length);

    // Check if our contract is a consumer
    const isConsumer = consumers.some(
      (consumer) =>
        consumer.toLowerCase() === CONFIG.contractAddress.toLowerCase()
    );
    console.log("  Our contract is consumer:", isConsumer);

    if (consumers.length > 0) {
      console.log("  Consumer addresses:");
      consumers.forEach((consumer, index) => {
        console.log(`    ${index + 1}. ${consumer}`);
      });
    }

    // 3. Check current challenge state
    console.log("\n🎯 Current Challenge State:");
    const challenge = await contract.getCurrentChallenge();
    const lastUpdate = await contract.lastChallengeUpdate();

    console.log("  Challenge Type:", challenge.challengeType.toString());
    console.log("  Target:", challenge.target.toString());
    console.log("  Bonus Multiplier:", challenge.bonusMultiplier.toString());
    console.log("  Expires At:", challenge.expiresAt.toString());
    console.log("  Active:", challenge.active);
    console.log(
      "  Last Update:",
      new Date(lastUpdate.toNumber() * 1000).toLocaleString()
    );

    // 4. Validation checks
    console.log("\n✅ Validation Checks:");
    const checks = {
      "Contract has correct subscription ID":
        contractSubId.toString() === CONFIG.subscriptionId.toString(),
      "Contract has correct VRF coordinator":
        contractVRFCoordinator.toLowerCase() ===
        CONFIG.vrfCoordinator.toLowerCase(),
      "Subscription has LINK balance": balance.gt(0),
      "Contract is VRF consumer": isConsumer,
      "Wallet owns subscription":
        owner.toLowerCase() === wallet.address.toLowerCase(),
    };

    Object.entries(checks).forEach(([check, passed]) => {
      console.log(`  ${passed ? "✅" : "❌"} ${check}`);
    });

    // 5. Test VRF request if everything looks good
    const allChecksPass = Object.values(checks).every((check) => check);

    if (allChecksPass) {
      console.log("\n🧪 All checks pass! Testing VRF request...");

      try {
        console.log("📝 Requesting new challenge...");
        const tx = await contract.manualChallengeUpdate({
          gasLimit: 500000,
        });

        console.log("🔗 Transaction Hash:", tx.hash);
        console.log("⏳ Waiting for confirmation...");

        const receipt = await tx.wait();
        console.log("✅ Transaction confirmed in block:", receipt.blockNumber);
        console.log("⛽ Gas Used:", receipt.gasUsed.toString());
        console.log("📋 Status:", receipt.status === 1 ? "SUCCESS" : "FAILED");

        if (receipt.status === 1) {
          console.log("\n🎉 VRF request submitted successfully!");
          console.log("⏳ Waiting 60 seconds for VRF response...");

          // Wait and check for challenge update
          await new Promise((resolve) => setTimeout(resolve, 60000));

          const newChallenge = await contract.getCurrentChallenge();
          const newLastUpdate = await contract.lastChallengeUpdate();

          console.log("\n🔄 After VRF Response:");
          console.log(
            "  Challenge Type:",
            newChallenge.challengeType.toString()
          );
          console.log("  Target:", newChallenge.target.toString());
          console.log("  Active:", newChallenge.active);
          console.log(
            "  Last Update:",
            new Date(newLastUpdate.toNumber() * 1000).toLocaleString()
          );

          if (newChallenge.active && newChallenge.target.gt(0)) {
            console.log("\n🎉 VRF integration working perfectly!");
          } else {
            console.log(
              "\n⏳ VRF response still pending (can take 2-5 minutes)"
            );
          }
        } else {
          console.log("\n❌ VRF request transaction failed");
        }
      } catch (error) {
        console.error("\n❌ VRF request failed:", error.message);
        if (error.reason) console.error("Reason:", error.reason);

        // Check for common VRF issues
        if (error.message.includes("InvalidConsumer")) {
          console.log("\n💡 Issue: Contract not added as VRF consumer");
          console.log("   Solution: Add contract to VRF subscription");
        } else if (error.message.includes("InsufficientBalance")) {
          console.log("\n💡 Issue: Insufficient LINK balance in subscription");
          console.log("   Solution: Fund subscription with more LINK");
        } else if (error.message.includes("InvalidSubscription")) {
          console.log("\n💡 Issue: Invalid subscription ID");
          console.log("   Solution: Check subscription ID is correct");
        }
      }
    } else {
      console.log(
        "\n❌ Some validation checks failed. Fix these issues first:"
      );
      Object.entries(checks).forEach(([check, passed]) => {
        if (!passed) {
          console.log(`   - ${check}`);
        }
      });
    }
  } catch (error) {
    console.error("❌ Debug error:", error.message);
    if (error.reason) console.error("Reason:", error.reason);
  }

  console.log("\n🔍 VRF debugging complete!");
}

debugVRFIntegration().catch(console.error);
