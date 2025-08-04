import React from 'react';
import { AIAgent, Move } from '@/types';

interface AIInterfaceProps {
  agent: AIAgent;
  currentMove: Move;
  className?: string;
}

const AIInterface: React.FC<AIInterfaceProps> = ({ agent, currentMove, className = '' }) => {
  return (
    <div className={`ai-interface bg-space-800 rounded-lg p-6 ${className}`}>
      <h2 className="text-xl font-bold text-gray-300 mb-4">AI Personality & Traits</h2>
      <div className="flex items-center justify-between mb-6">
        <div className="flex-1">
          <p className="text-gray-400">Name: <span className="font-bold">{agent.name}</span></p>
          <p className="text-gray-400">Personality: <span className="font-bold capitalize">{agent.personality}</span></p>
          <p className="text-gray-400">Elo Rating: <span className="font-bold">{agent.elo}</span></p>
          <p className="text-gray-400">Win Rate: <span className="font-bold">{(agent.winRate * 100).toFixed(2)}%</span></p>
        </div>
        <div className="flex-1">
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(agent.traits).map(([trait, value]) => (
              <div key={trait} className="flex justify-between">
                <span className="text-gray-400 capitalize">{trait}</span>
                <span className="font-bold text-enhancement-400">{value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      <h3 className="text-lg font-bold text-gray-300 mb-4">Current Move Calculation</h3>
      <div className="bg-space-700 rounded-lg p-4">
        <p className="text-gray-400">Move Piece: <span className="font-bold">{currentMove.piece.type}</span></p>
        <p className="text-gray-400">From: <span className="font-bold">{String.fromCharCode(65 + currentMove.from[1])}{currentMove.from[0] + 1}</span></p>
        <p className="text-gray-400">To: <span className="font-bold">{String.fromCharCode(65 + currentMove.to[1])}{currentMove.to[0] + 1}</span></p>
      </div>
    </div>
  );
};

export default AIInterface;
