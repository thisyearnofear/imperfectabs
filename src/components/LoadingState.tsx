"use client";

import React, { useState, useEffect } from "react";

const quotes = [
  {
    text: "Imperfection is beauty, madness is genius and it's better to be absolutely ridiculous than absolutely boring.",
    author: "Marilyn Monroe",
  },
  {
    text: "I think every single imperfection adds to your beauty. I'd rather be imperfect than perfect.",
    author: "Sonam Kapoor",
  },
  {
    text: "One of the basic rules of the universe is that nothing is perfect. Perfection simply doesn't exist... Without imperfection, neither you nor I would exist.",
    author: "Stephen Hawking",
  },
  {
    text: "Practice doesn't make perfect. Practice reduces the imperfection.",
    author: "Toba Beta",
  },
  {
    text: "Have no fear of perfection - you'll never reach it.",
    author: "Salvador Dali",
  },
];

export default function LoadingState() {
  const [quote, setQuote] = useState({ text: "", author: "" });

  useEffect(() => {
    setQuote(quotes[Math.floor(Math.random() * quotes.length)]);
  }, []);

  return (
    <div className="abs-card-brutal bg-yellow-500 text-black p-6 text-center">
      <div className="flex justify-center items-center mb-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
      </div>
      <p className="text-lg font-bold mb-2">"{quote.text}"</p>
      <p className="text-sm font-mono">- {quote.author}</p>
    </div>
  );
}
