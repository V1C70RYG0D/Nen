// MoveHistory component for tracking game moves
import React from 'react';
import { motion } from 'framer-motion';
import { getPieceSymbol } from '@/utils/theme';
import type { Move } from '@/types';

interface MoveHistoryProps {
  moves: Move[];
  maxDisplay?: number;
  className?: string;
}

export const MoveHistory: React.FC<MoveHistoryProps> = ({ 
  moves, 
  maxDisplay = 10,
  className = '' 
}) => {
  const recentMoves = moves.slice(-maxDisplay);

  const formatCoordinate = (coord: [number, number]) => {
    const [row, col] = coord;
    return `${String.fromCharCode(65 + col)}${row + 1}`;
  };

  return (
    <div className={`bg-space-800 rounded-lg p-4 border border-space-600 ${className}`}>
      <h3 className="text-sm font-bold text-gray-400 mb-3 flex items-center gap-2">
        <span>📜</span>
        Move History
        {moves.length > 0 && (
          <span className="text-xs bg-space-700 px-2 py-0.5 rounded-full">
            {moves.length}
          </span>
        )}
      </h3>

      <div className="space-y-2 max-h-64 overflow-y-auto">
        {recentMoves.length === 0 ? (
          <div className="text-center py-4">
            <p className="text-gray-500 text-sm">No moves yet</p>
            <p className="text-xs text-gray-600 mt-1">Game hasn't started</p>
          </div>
        ) : (
          recentMoves.map((move, index) => (
            <motion.div
              key={`${move.timestamp}-${index}`}
              className="flex items-center justify-between p-2 rounded-lg bg-space-700/50 hover:bg-space-700 transition-colors"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              data-testid={`move-${index}`}
            >
              {/* Move Number & Player */}
              <div className="flex items-center gap-3">
                <div className="text-xs bg-space-600 px-2 py-1 rounded font-mono">
                  #{moves.length - recentMoves.length + index + 1}
                </div>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                  move.player === 1 
                    ? 'bg-enhancement-500/20 text-enhancement-400 border border-enhancement-500/50' 
                    : 'bg-emission-500/20 text-emission-400 border border-emission-500/50'
                }`}>
                  P{move.player}
                </div>
              </div>

              {/* Move Details */}
              <div className="flex-1 mx-3">
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-lg" title={move.piece.type}>
                    {getPieceSymbol(move.piece.type)}
                  </span>
                  <span className="text-gray-300 font-mono">
                    {formatCoordinate(move.from)} → {formatCoordinate(move.to)}
                  </span>
                </div>
                {move.captured && (
                  <div className="text-xs text-red-400 mt-1">
                    Captured: {getPieceSymbol(move.captured.type)}
                  </div>
                )}
              </div>

              {/* Timestamp */}
              <div className="text-xs text-gray-500">
                {new Date(move.timestamp).toLocaleTimeString([], { 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })}
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* Show indicator if there are more moves */}
      {moves.length > maxDisplay && (
        <div className="mt-3 pt-3 border-t border-space-600 text-center">
          <p className="text-xs text-gray-500">
            Showing last {maxDisplay} of {moves.length} moves
          </p>
        </div>
      )}

      {/* Export/Share Options */}
      {moves.length > 0 && (
        <div className="mt-3 pt-3 border-t border-space-600 flex gap-2">
          <button 
            className="flex-1 text-xs px-3 py-1 rounded bg-space-700 hover:bg-space-600 text-gray-400 hover:text-white transition-colors"
            onClick={() => {
              const moveList = moves.map((move, i) => 
                `${i + 1}. P${move.player}: ${getPieceSymbol(move.piece.type)} ${formatCoordinate(move.from)}→${formatCoordinate(move.to)}`
              ).join('\n');
              navigator.clipboard.writeText(moveList);
            }}
            data-testid="copy-moves-button"
          >
            📋 Copy
          </button>
          <button 
            className="flex-1 text-xs px-3 py-1 rounded bg-space-700 hover:bg-space-600 text-gray-400 hover:text-white transition-colors"
            data-testid="export-moves-button"
          >
            📤 Export
          </button>
        </div>
      )}
    </div>
  );
};
