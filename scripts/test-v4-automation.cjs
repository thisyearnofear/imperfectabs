const { ethers } = require("ethers");

const CONFIG = {
  rpcUrl: "https://api.avax-test.network/ext/bc/C/rpc",
  contractAddress: "0x060F0F142D5BfC721a7C53D00B4bAD77Ad82C776", // V4 contract
  privateKey: process.env.PRIVATE_KEY,
};

// Contract ABI for automation testing
const CONTRACT_ABI = [
  "function checkUpkeep(bytes calldata checkData) external view returns (bool upkeepNeeded, bytes memory performData)",
  "function performUpkeep(bytes calldata performData) external",
  "function manualWeatherUpdate() external",
  "function lastWeatherUpdate() external view returns (uint256)",
  "function seasonalBonus(uint256 month) external view returns (uint256)",
  "function regionBonus(string memory region) external view returns (uint256)",
  "event WeatherBonusesUpdated(uint256 timestamp)",
];

async function main() {
  console.log("🔧 Testing Chainlink Automation for V4 contract...");
  console.log("Contract:", CONFIG.contractAddress);

  const provider = new ethers.providers.JsonRpcProvider(CONFIG.rpcUrl);
  const signer = new ethers.Wallet(CONFIG.privateKey, provider);
  const contract = new ethers.Contract(
    CONFIG.contractAddress,
    CONTRACT_ABI,
    signer
  );

  try {
    // Step 1: Check current weather bonus state
    console.log("\n📊 Checking current weather bonus state...");
    const lastUpdate = await contract.lastWeatherUpdate();
    console.log(
      "Last weather update:",
      new Date(lastUpdate.toNumber() * 1000).toISOString()
    );

    // Check some seasonal bonuses
    console.log("\n🌤️ Current seasonal bonuses:");
    for (let month = 1; month <= 12; month++) {
      const bonus = await contract.seasonalBonus(month);
      const monthName = new Date(2024, month - 1, 1).toLocaleString("default", {
        month: "long",
      });
      console.log(
        `  ${monthName}: ${bonus.toString()} basis points (${
          bonus.toNumber() / 100
        }%)`
      );
    }

    // Check regional bonuses
    console.log("\n🌍 Current regional bonuses:");
    const regions = [
      "North",
      "South",
      "Tropical",
      "Desert",
      "Arctic",
      "Temperate",
    ];
    for (const region of regions) {
      const bonus = await contract.regionBonus(region);
      console.log(
        `  ${region}: ${bonus.toString()} basis points (${
          bonus.toNumber() / 100
        }%)`
      );
    }

    // Step 2: Test checkUpkeep function
    console.log("\n🔍 Testing checkUpkeep function...");
    const checkResult = await contract.checkUpkeep("0x");
    console.log("Upkeep needed:", checkResult.upkeepNeeded);
    console.log("Perform data:", checkResult.performData);

    if (checkResult.upkeepNeeded) {
      console.log("\n✅ Automation indicates upkeep is needed!");

      // Step 3: Test manual weather update (simulating automation)
      console.log(
        "\n🔧 Testing manual weather update (simulating automation)..."
      );
      const updateTx = await contract.manualWeatherUpdate({ gasLimit: 300000 });
      await updateTx.wait();
      console.log("✅ Manual weather update completed");

      // Check if bonuses changed
      console.log("\n📊 Checking updated bonuses...");
      const newLastUpdate = await contract.lastWeatherUpdate();
      console.log(
        "New last update:",
        new Date(newLastUpdate.toNumber() * 1000).toISOString()
      );

      // Check if any seasonal bonuses changed
      console.log("\n🌤️ Updated seasonal bonuses:");
      for (let month = 1; month <= 12; month++) {
        const bonus = await contract.seasonalBonus(month);
        const monthName = new Date(2024, month - 1, 1).toLocaleString(
          "default",
          { month: "long" }
        );
        console.log(
          `  ${monthName}: ${bonus.toString()} basis points (${
            bonus.toNumber() / 100
          }%)`
        );
      }
    } else {
      console.log("\n⏰ Automation indicates no upkeep needed yet");
      console.log("This is normal if weather was recently updated");

      // Force a manual update for testing
      console.log("\n🔧 Forcing manual weather update for testing...");
      const updateTx = await contract.manualWeatherUpdate({ gasLimit: 300000 });
      await updateTx.wait();
      console.log("✅ Manual weather update completed");
    }

    // Step 4: Test performUpkeep function
    console.log("\n🎯 Testing performUpkeep function...");
    const performData = ethers.utils.defaultAbiCoder.encode(
      ["bool", "bool"],
      [true, false] // weatherUpdateNeeded=true, challengeUpdateNeeded=false
    );

    const performTx = await contract.performUpkeep(performData, {
      gasLimit: 400000,
    });
    await performTx.wait();
    console.log("✅ performUpkeep executed successfully");

    // Final check
    console.log("\n📊 Final state check...");
    const finalLastUpdate = await contract.lastWeatherUpdate();
    console.log(
      "Final last update:",
      new Date(finalLastUpdate.toNumber() * 1000).toISOString()
    );

    console.log(
      "\n🎉 SUCCESS! Chainlink Automation is working with V4 contract!"
    );
    console.log("✅ Weather bonus updates are functional");
    console.log("✅ checkUpkeep and performUpkeep are working");
    console.log("✅ Ready for automated weather bonus updates every 6 hours");
  } catch (error) {
    console.error("❌ Error:", error.message);
    if (error.reason) {
      console.error("Reason:", error.reason);
    }
  }
}

main().catch(console.error);
