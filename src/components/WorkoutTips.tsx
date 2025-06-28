"use client";

import React from "react";

export default function WorkoutTips() {
  return (
    <div className="abs-card-brutal p-4">
      <h3 className="font-black uppercase text-center mb-4">🚀 Get Ready!</h3>
      <div className="space-y-3 text-sm font-mono">
        <div>
          <h4 className="font-bold text-blue-600">1. Find a Good Spot</h4>
          <p>
            Choose a well-lit area where your full body is visible to the
            camera.
          </p>
        </div>
        <div>
          <h4 className="font-bold text-blue-600">2. Get in Position</h4>
          <p>
            Lie on your back with your knees bent and feet flat on the floor.
            Place your hands behind your head or across your chest.
          </p>
        </div>
        <div>
          <h4 className="font-bold text-blue-600">3. Focus on Form</h4>
          <p>
            Keep your movements smooth and controlled. The AI will track your
            form and provide feedback.
          </p>
        </div>
        <div>
          <h4 className="font-bold text-blue-600">4. The Challenge</h4>
          <p>
            The 2-minute countdown will begin after your first rep. Do as many
            reps as you can with good form!
          </p>
        </div>
      </div>
    </div>
  );
}
