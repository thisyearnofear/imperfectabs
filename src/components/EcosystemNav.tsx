'use client';

import { useState } from 'react';

interface EcosystemApp {
  name: string;
  url: string;
  description: string;
  networks: string[];
  exercises: string[];
  status: 'live' | 'beta' | 'coming-soon';
  color: string;
}

const ecosystemApps: EcosystemApp[] = [
  {
    name: 'IMPERFECTCOACH',
    url: 'https://imperfectcoach.netlify.app',
    description: 'AI-POWERED PULLUPS & JUMPS TRACKING',
    networks: ['Base Sepolia'],
    exercises: ['Pull-ups', 'Jumps'],
    status: 'live',
    color: 'bg-blue-600'
  },
  {
    name: 'IMPERFECTFORM',
    url: 'https://imperfectform.fun',
    description: 'COMPREHENSIVE FORM ANALYSIS',
    networks: ['Base', 'Celo', 'Polygon', 'Monad Testnet'],
    exercises: ['Multi-exercise'],
    status: 'live',
    color: 'bg-green-600'
  },
  {
    name: 'IMPERFECTBREATH',
    url: 'https://imperfectbreath.netlify.app',
    description: 'BREATHING & MINDFULNESS TRACKING',
    networks: ['Lens', 'Flow', 'Base', 'Story Protocol'],
    exercises: ['Breathing', 'Meditation'],
    status: 'live',
    color: 'bg-purple-600'
  },
  {
    name: 'IMPERFECTABS',
    url: '#',
    description: 'ABS & CORE EXERCISE ANALYSIS',
    networks: ['Avalanche Fuji'],
    exercises: ['Sit-ups', 'Crunches'],
    status: 'beta',
    color: 'bg-red-600'
  }
];

export default function EcosystemNav() {
  const [isExpanded, setIsExpanded] = useState(false);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'live': return 'bg-green-500';
      case 'beta': return 'bg-yellow-500';
      case 'coming-soon': return 'bg-gray-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'live': return 'LIVE';
      case 'beta': return 'BETA';
      case 'coming-soon': return 'SOON';
      default: return 'UNKNOWN';
    }
  };

  return (
    <div className="fixed top-4 right-4 z-50">
      {/* Toggle Button */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="abs-btn-primary bg-black text-white mb-4 flex items-center space-x-2"
      >
        <div className="h-4 w-4 bg-cyan-400 border-2 border-white transform rotate-45"></div>
        <span>ECOSYSTEM</span>
        <span className={`transform transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
          ▼
        </span>
      </button>

      {/* Expanded Panel */}
      {isExpanded && (
        <div className="abs-card-brutal bg-black text-white w-80 max-h-96 overflow-y-auto">
          <h3 className="text-lg font-black mb-4 uppercase border-b-4 border-white pb-2">
            IMPERFECT FITNESS ECOSYSTEM
          </h3>

          <div className="space-y-4">
            {ecosystemApps.map((app, index) => (
              <div key={index} className="relative">
                <a
                  href={app.url}
                  target={app.url === '#' ? '_self' : '_blank'}
                  rel={app.url === '#' ? '' : 'noopener noreferrer'}
                  className={`block p-4 border-4 border-white transition-all duration-200 hover:transform hover:translate-y-1 ${
                    app.url === '#' ? 'cursor-default' : 'hover:shadow-none'
                  }`}
                  style={{ backgroundColor: app.color, boxShadow: 'var(--shadow-brutal-white)' }}
                >
                  {/* Status Badge */}
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-black text-sm uppercase">{app.name}</h4>
                    <span
                      className={`px-2 py-1 text-xs font-bold border-2 border-white ${getStatusColor(app.status)}`}
                    >
                      {getStatusText(app.status)}
                    </span>
                  </div>

                  {/* Description */}
                  <p className="text-xs font-mono mb-3">{app.description}</p>

                  {/* Exercises */}
                  <div className="flex flex-wrap gap-1 mb-3">
                    {app.exercises.map((exercise, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-1 text-xs font-bold bg-white text-black border border-black"
                      >
                        {exercise}
                      </span>
                    ))}
                  </div>

                  {/* Networks */}
                  <div className="space-y-1">
                    <div className="text-xs font-bold uppercase text-gray-300">NETWORKS:</div>
                    <div className="flex flex-wrap gap-1">
                      {app.networks.map((network, idx) => (
                        <span
                          key={idx}
                          className="px-1 py-0.5 text-xs font-mono bg-black text-white border border-white"
                        >
                          {network}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* External Link Indicator */}
                  {app.url !== '#' && (
                    <div className="absolute top-2 right-2">
                      <div className="h-3 w-3 bg-white border border-black transform rotate-45"></div>
                    </div>
                  )}
                </a>

                {/* Current App Indicator */}
                {app.name === 'IMPERFECTABS' && (
                  <div className="absolute -top-2 -left-2 h-6 w-6 bg-yellow-500 border-4 border-black transform rotate-45 flex items-center justify-center">
                    <span className="text-xs font-black transform -rotate-45">📍</span>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Ecosystem Stats */}
          <div className="mt-6 pt-4 border-t-4 border-white">
            <div className="grid grid-cols-2 gap-4 text-center">
              <div>
                <div className="text-xl font-black text-cyan-400">{ecosystemApps.length}</div>
                <div className="text-xs font-mono">APPS</div>
              </div>
              <div>
                <div className="text-xl font-black text-lime-400">
                  {Array.from(new Set(ecosystemApps.flatMap(app => app.networks))).length}
                </div>
                <div className="text-xs font-mono">NETWORKS</div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-4 pt-4 border-t-2 border-gray-600 text-center">
            <p className="text-xs font-mono text-gray-400">
              BUILDING THE FUTURE OF
              <br />
              DECENTRALIZED FITNESS
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
