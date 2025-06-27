// Chainlink Functions JavaScript code for Imperfect Abs
// This function analyzes workout data and provides AI-enhanced feedback

// Input arguments from the smart contract:
// args[0] = reps (number of repetitions)
// args[1] = formAccuracy (percentage 0-100)
// args[2] = duration (workout duration in seconds)
// args[3] = exerciseType (type of exercise, default: "abs")

const reps = parseInt(args[0] || "0");
const formAccuracy = parseInt(args[1] || "0");
const duration = parseInt(args[2] || "0");
const exerciseType = args[3] || "abs";

// Validate inputs
if (reps < 0 || reps > 500) {
  throw Error("Invalid reps count");
}

if (formAccuracy < 0 || formAccuracy > 100) {
  throw Error("Invalid form accuracy");
}

if (duration < 0 || duration > 3600) {
  throw Error("Invalid duration");
}

// Calculate performance metrics
const repsPerMinute = duration > 0 ? Math.round((reps / duration) * 60) : 0;
const efficiency = formAccuracy > 0 ? Math.round((reps * formAccuracy) / 100) : 0;

// Performance scoring algorithm
let baseScore = Math.min(100, Math.floor((reps * 2) + (formAccuracy * 0.8)));
let performanceLevel = "Beginner";

if (baseScore >= 80 && formAccuracy >= 75) {
  performanceLevel = "Advanced";
} else if (baseScore >= 60 && formAccuracy >= 60) {
  performanceLevel = "Intermediate";
}

// Generate feedback based on performance
let feedback = "";
let recommendations = [];

if (formAccuracy >= 85) {
  feedback = "Excellent form! Your technique is spot on.";
} else if (formAccuracy >= 70) {
  feedback = "Good form overall, keep working on consistency.";
  recommendations.push("Focus on maintaining proper posture throughout");
} else if (formAccuracy >= 50) {
  feedback = "Form needs improvement. Quality over quantity!";
  recommendations.push("Slow down and focus on proper technique");
  recommendations.push("Consider working with a trainer");
} else {
  feedback = "Form significantly needs work. Start with basics.";
  recommendations.push("Review proper form tutorials");
  recommendations.push("Start with fewer reps at higher quality");
}

// Rep-specific feedback
if (reps >= 50) {
  recommendations.push("Great endurance! Try increasing difficulty");
} else if (reps >= 20) {
  recommendations.push("Good rep count, focus on form improvement");
} else if (reps > 0) {
  recommendations.push("Building up gradually - keep it consistent");
}

// Duration feedback
if (duration > 0) {
  if (repsPerMinute > 30) {
    recommendations.push("Slow down for better form control");
  } else if (repsPerMinute < 10) {
    recommendations.push("Try to maintain a steady pace");
  }
}

// Create analysis result
const analysis = {
  score: baseScore,
  performanceLevel: performanceLevel,
  metrics: {
    reps: reps,
    formAccuracy: formAccuracy,
    duration: duration,
    repsPerMinute: repsPerMinute,
    efficiency: efficiency
  },
  feedback: feedback,
  recommendations: recommendations.slice(0, 3), // Limit to 3 recommendations
  timestamp: Math.floor(Date.now() / 1000),
  exerciseType: exerciseType
};

// For production, you would integrate with OpenAI API here:
// const openaiApiKey = secrets.OPENAI_API_KEY;
// const prompt = `Analyze this ${exerciseType} workout: ${reps} reps, ${formAccuracy}% form accuracy, ${duration}s duration. Provide brief professional feedback.`;
//
// const openaiRequest = Functions.makeHttpRequest({
//   url: "https://api.openai.com/v1/chat/completions",
//   method: "POST",
//   headers: {
//     "Authorization": `Bearer ${openaiApiKey}`,
//     "Content-Type": "application/json"
//   },
//   data: {
//     model: "gpt-3.5-turbo",
//     messages: [
//       {
//         role: "system",
//         content: "You are a professional fitness trainer. Provide brief, encouraging workout feedback."
//       },
//       {
//         role: "user",
//         content: prompt
//       }
//     ],
//     max_tokens: 150
//   }
// });
//
// const openaiResponse = await openaiRequest;
// if (openaiResponse.error) {
//   console.error("OpenAI API error:", openaiResponse.error);
// } else {
//   analysis.aiAdvice = openaiResponse.data.choices[0].message.content;
// }

// Return the analysis as encoded string
return Functions.encodeString(JSON.stringify(analysis));
