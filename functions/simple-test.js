// Simple test function for Chainlink Functions
const reps = parseInt(args[0] || "0");
const formAccuracy = parseInt(args[1] || "0");
const duration = parseInt(args[2] || "0");
const latitude = parseFloat(args[3] || "40.7128");
const longitude = parseFloat(args[4] || "-74.0060");

// Basic validation
if (reps < 0 || reps > 500) throw Error("Invalid reps");
if (formAccuracy < 0 || formAccuracy > 100) throw Error("Invalid form accuracy");

// Calculate enhanced score with weather bonus
const baseScore = Math.min(100, Math.floor(reps * 2 + formAccuracy * 0.8));
const weatherBonus = 15; // 15% bonus for testing
const enhancedScore = Math.round(baseScore * 1.15);

// Return JSON response
const response = {
  conditions: "clear",
  temperature: 72,
  weatherBonus: weatherBonus,
  score: enhancedScore
};

console.log("WeatherXM Test Response:", response);
return Functions.encodeString(JSON.stringify(response));
