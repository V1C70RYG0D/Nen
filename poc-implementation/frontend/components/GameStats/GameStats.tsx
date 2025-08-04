// GameStats component for live game statistics
import React from 'react';

interface StatsProps {
  currentPlayer: number;
  moveCount: number;
  player1Name: string;
  player2Name: string;
  player1Elo: number;
  player2Elo: number;
  player1WinRate: number;
  player2WinRate: number;
  className?: string;
}

export const GameStats: React.FC<StatsProps> = ({
  currentPlayer,
  moveCount,
  player1Name,
  player2Name,
  player1Elo,
  player2Elo,
  player1WinRate,
  player2WinRate,
  className = '',
}) => {
  return (
    <div className={`bg-space-900 rounded-xl p-6 border border-space-600 ${className}`}>
      {/* Header */}
      <h3 className="text-xl font-bold bg-gradient-to-r from-emission-400 to-manipulation-400 bg-clip-text text-transparent">
        Live Game Statistics
      </h3>

      {/* Current Turn */}
      <div className="bg-space-800 rounded-lg p-3 mb-3 flex items-center justify-between text-sm">
        <span className="text-gray-400">Current Turn</span>
        <span
          className={`text-lg font-bold ${
            currentPlayer === 1 ? 'text-enhancement-400' : 'text-emission-400'
          }`}
        >
          {currentPlayer === 1 ? player1Name : player2Name}
        </span>
      </div>

      {/* Move Count */}
      <div className="bg-space-800 rounded-lg p-3 mb-3 flex items-center justify-between text-sm">
        <span className="text-gray-400">Move Count</span>
        <span className="text-lg font-bold text-neural-400 font-mono">{moveCount}</span>
      </div>

      {/* Player Stats */}
      <div className="bg-space-800 rounded-lg p-3 text-sm">
        {/* Player 1 Stats */}
        <div className="mb-3">
          <h4 className="font-bold text-enhancement-400">{player1Name}</h4>
          <div className="flex justify-between">
            <span className="text-gray-400">ELO:</span>
            <span className="font-mono font-bold">{player1Elo}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Win Rate:</span>
            <span className="font-mono">{(player1WinRate * 100).toFixed(1)}%</span>
          </div>
        </div>

        <hr className="border-space-700 my-2" />

        {/* Player 2 Stats */}
        <div>
          <h4 className="font-bold text-emission-400">{player2Name}</h4>
          <div className="flex justify-between">
            <span className="text-gray-400">ELO:</span>
            <span className="font-mono font-bold">{player2Elo}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Win Rate:</span>
            <span className="font-mono">{(player2WinRate * 100).toFixed(1)}%</span>
          </div>
        </div>
      </div>
    </div>
  );
};

