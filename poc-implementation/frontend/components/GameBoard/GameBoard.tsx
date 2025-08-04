// Enhanced GameBoard component with 3D Gungi board and MagicBlock integration
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameState } from '@/hooks/useGameState';
import { useMagicBlockSession } from '@/hooks/useMagicBlockSession';
import { getPieceSymbol, getConnectionStatus } from '@/utils/theme';
import { validateMoveCoordinates } from '@/utils/validation';
import { announceGameStateChange, announceFormError } from '@/utils/screenReader';
import type { GamePiece, Move } from '@/types';

interface GameBoardProps {
  matchId: string;
  isLive?: boolean;
  enableMagicBlock?: boolean;
  className?: string;
}

interface SquareProps {
  row: number;
  col: number;
  pieces: GamePiece[];
  isSelected: boolean;
  isValidMove: boolean;
  onClick: (row: number, col: number) => void;
}

// Individual board square component
const BoardSquare: React.FC<SquareProps> = ({ 
  row, 
  col, 
  pieces, 
  isSelected, 
  isValidMove, 
  onClick 
}) => {
  const isLightSquare = (row + col) % 2 === 0;
  const topPiece = pieces[pieces.length - 1]; // Top piece in stack
  
  return (
    <motion.div
      className={`
        gungi-board-square relative cursor-pointer w-8 h-8 flex-shrink-0
        ${isSelected ? 'selected ring-2 ring-emission-400' : ''}
        ${isValidMove ? 'ring-2 ring-manipulation-400 ring-opacity-50' : ''}
        ${isLightSquare ? 'bg-yellow-600' : 'bg-yellow-800'}
      `}
      onClick={() => onClick(row, col)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick(row, col);
        }
      }}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      style={{
        background: isLightSquare 
          ? 'linear-gradient(135deg, #F4A460, #D2691E)' 
          : 'linear-gradient(135deg, #D2691E, #8B4513)',
      }}
      role="gridcell"
      tabIndex={0}
      aria-selected={isSelected}
      aria-label={`Board square ${String.fromCharCode(65 + col)}${row + 1}${topPiece ? `, contains ${topPiece.type}` : ', empty'}${isValidMove ? ', valid move target' : ''}${pieces.length > 1 ? `, stack of ${pieces.length} pieces` : ''}`}
    >
      {/* Stack indicator */}
      {pieces.length > 1 && (
        <div className="absolute top-0 right-0 bg-enhancement-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
          {pieces.length}
        </div>
      )}

      {/* Top piece */}
      {topPiece && (
        <motion.div
          className={`
            gungi-piece
            ${topPiece.owner === 1 ? 'text-enhancement-400' : 'text-emission-400'}
          `}
          initial={{ scale: 0, rotate: 180 }}
          animate={{ scale: 1, rotate: 0 }}
          exit={{ scale: 0, rotate: -180 }}
          whileHover={{ scale: 1.2, y: -2 }}
          style={{
            filter: `drop-shadow(0 0 8px ${topPiece.owner === 1 ? '#FF6B6B' : '#4ECDC4'})`,
          }}
        >
          {getPieceSymbol(topPiece.type)}
        </motion.div>
      )}

      {/* Valid move indicator */}
      {isValidMove && (
        <motion.div
          className="absolute inset-0 bg-manipulation-400 bg-opacity-30 rounded"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
        />
      )}
    </motion.div>
  );
};

// Connection status indicator
const ConnectionStatus: React.FC<{ 
  isConnected: boolean; 
  latency: number; 
  enableMagicBlock: boolean;
}> = ({ isConnected, latency, enableMagicBlock }) => {
  const status = getConnectionStatus(isConnected, latency);
  
  return (
    <div className="flex items-center gap-2 text-sm">
      <div className={`w-2 h-2 rounded-full ${status.color.replace('text-', 'bg-')} animate-pulse`} />
      <span className={status.color}>
        {enableMagicBlock ? '⚡' : '🌐'} {status.text}
      </span>
      {enableMagicBlock && latency < 50 && (
        <span className="text-xs text-emission-400 font-mono">OPTIMIZED</span>
      )}
    </div>
  );
};

// Move history component
const MoveHistory: React.FC<{ moves: Move[]; maxDisplay?: number }> = ({ 
  moves, 
  maxDisplay = 5 
}) => {
  const recentMoves = moves.slice(-maxDisplay);
  
  return (
    <div className="bg-space-800 rounded-lg p-4 border border-space-600">
      <h3 className="text-sm font-bold text-gray-400 mb-3">Recent Moves</h3>
      <div className="space-y-2 max-h-32 overflow-y-auto">
        {recentMoves.length === 0 ? (
          <p className="text-gray-500 text-sm">No moves yet</p>
        ) : (
          recentMoves.map((move, index) => (
            <motion.div
              key={`${move.timestamp}-${index}`}
              className="flex items-center justify-between text-sm"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <span className={`font-mono ${move.player === 1 ? 'text-enhancement-400' : 'text-emission-400'}`}>
                P{move.player}
              </span>
              <span className="text-gray-300">
                {String.fromCharCode(65 + move.from[1])}{move.from[0] + 1} → {String.fromCharCode(65 + move.to[1])}{move.to[0] + 1}
              </span>
              <span className="text-xs text-gray-500">
                {getPieceSymbol(move.piece.type)}
              </span>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
};

// Main GameBoard component
export const GameBoard: React.FC<GameBoardProps> = ({
  matchId,
  isLive = false,
  enableMagicBlock = true,
  className = '',
}) => {
  const [selectedSquare, setSelectedSquare] = useState<[number, number] | null>(null);
  const [validMoves, setValidMoves] = useState<[number, number][]>([]);
  const [moveHistory, setMoveHistory] = useState<Move[]>([]);

  // Hooks
  const { 
    boardState, 
    currentPlayer, 
    gameHistory, 
    isConnected, 
    latency, 
    error: gameError, 
    submitMove 
  } = useGameState(matchId, { enableMagicBlock });

  const { 
    session, 
    isConnected: magicBlockConnected, 
    error: magicBlockError 
  } = useMagicBlockSession(matchId, { enabled: enableMagicBlock && isLive });

  // Group pieces by position for rendering stacks
  const piecesByPosition = useMemo(() => {
    if (!boardState?.pieces) return new Map();
    
    const map = new Map<string, GamePiece[]>();
    boardState.pieces.forEach(piece => {
      const key = `${piece.position[0]}-${piece.position[1]}`;
      if (!map.has(key)) {
        map.set(key, []);
      }
      map.get(key)!.push(piece);
    });
    
    // Sort pieces by stack level
    map.forEach(pieces => pieces.sort((a, b) => a.stackLevel - b.stackLevel));
    
    return map;
  }, [boardState?.pieces]);

  // Calculate valid moves for selected piece
  const calculateValidMoves = useCallback((piece: GamePiece): [number, number][] => {
    if (!boardState) return [];
    
    const moves: [number, number][] = [];
    const [row, col] = piece.position;
    
    // Basic movement patterns (simplified Gungi rules)
    const directions = [
      [-1, -1], [-1, 0], [-1, 1],
      [0, -1],           [0, 1],
      [1, -1],  [1, 0],  [1, 1],
    ];
    
    directions.forEach(([dr, dc]) => {
      const newRow = row + dr;
      const newCol = col + dc;
      
      // Check bounds
      if (newRow >= 0 && newRow < 9 && newCol >= 0 && newCol < 9) {
        // Check if move is valid (simplified logic)
        const targetKey = `${newRow}-${newCol}`;
        const targetPieces = piecesByPosition.get(targetKey) || [];
        const topPiece = targetPieces[targetPieces.length - 1];
        
        // Can move to empty square or capture opponent piece
        if (!topPiece || topPiece.owner !== piece.owner) {
          moves.push([newRow, newCol]);
        }
      }
    });
    
    return moves;
  }, [boardState, piecesByPosition]);

  // Handle square click
const handleSquareClick = useCallback(async (row: number, col: number) => {
    if (!boardState || boardState.gamePhase === 'finished') return;
    
    const squareKey = `${row}-${col}`;
    const piecesAtSquare = piecesByPosition.get(squareKey) || [];
    const topPiece = piecesAtSquare[piecesAtSquare.length - 1];
    
    if (selectedSquare) {
      // Attempting to move
      const [fromRow, fromCol] = selectedSquare;
      const fromKey = `${fromRow}-${fromCol}`;
      const selectedPieces = piecesByPosition.get(fromKey) || [];
      const selectedPiece = selectedPieces[selectedPieces.length - 1];
      
      if (selectedPiece && selectedPiece.owner === currentPlayer) {
        // Validate move
        const validation = validateMoveCoordinates([fromRow, fromCol], [row, col]);
        if (!validation.isValid) {
          console.warn('Invalid move:', validation.error);
          setSelectedSquare(null);
          setValidMoves([]);
          announceFormError(`Invalid move from ${String.fromCharCode(65 + fromCol)}${fromRow + 1} to ${String.fromCharCode(65 + col)}${row + 1}`);
          return;
        }
        
        // Check if this is a valid move
        const isValidMove = validMoves.some(([r, c]) => r === row && c === col);
        if (isValidMove) {
          try {
            const move: Move = {
              from: [fromRow, fromCol],
              to: [row, col],
              piece: selectedPiece,
              timestamp: Date.now(),
              player: currentPlayer,
            };
            
            await submitMove(move);
            setMoveHistory(prev => [...prev, move]);
            announceGameStateChange(`Moved ${selectedPiece.type} from ${String.fromCharCode(65 + fromCol)}${fromRow + 1} to ${String.fromCharCode(65 + col)}${row + 1}`);
          } catch (error) {
            console.error('Failed to submit move:', error);
            announceFormError('Failed to submit move');
          }
        }
      }
      
      setSelectedSquare(null);
      setValidMoves([]);
    } else {
      // Selecting a piece
      if (topPiece && topPiece.owner === currentPlayer) {
        setSelectedSquare([row, col]);
        setValidMoves(calculateValidMoves(topPiece));
        announceGameStateChange(`Selected ${topPiece.type} at ${String.fromCharCode(65 + col)}${row + 1}`);
      }
    }
  }, [boardState, currentPlayer, selectedSquare, piecesByPosition, validMoves, calculateValidMoves, submitMove]);

  // Update move history when game history changes
  useEffect(() => {
    if (gameHistory && JSON.stringify(gameHistory) !== JSON.stringify(moveHistory)) {
      setMoveHistory(gameHistory);
    }
  }, [gameHistory, moveHistory]);

  const connectionError = gameError || magicBlockError;

  return (
    <div className={`bg-space-800 rounded-xl p-6 border border-space-600 ${className}`} role="application" aria-label="Gungi game board">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-bold bg-gradient-to-r from-emission-400 to-manipulation-400 bg-clip-text text-transparent">
            Gungi Board
          </h2>
          {isLive && (
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-enhancement-500 rounded-full animate-pulse" />
              <span className="text-sm text-enhancement-400 font-bold">LIVE</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-4">
          <ConnectionStatus 
            isConnected={isConnected && (!enableMagicBlock || magicBlockConnected)}
            latency={latency}
            enableMagicBlock={enableMagicBlock}
          />
        </div>
      </div>

      {/* Error Display */}
      {connectionError && (
        <motion.div
          className="bg-enhancement-500/20 border border-enhancement-500 rounded-lg p-3 mb-4"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center gap-2">
            <span className="text-enhancement-400">⚠️</span>
            <span className="text-sm text-enhancement-400">{connectionError}</span>
          </div>
        </motion.div>
      )}

      {/* Game Info */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-space-700 rounded-lg p-3">
          <div className="text-sm text-gray-400">Current Turn</div>
          <div className={`text-lg font-bold ${currentPlayer === 1 ? 'text-enhancement-400' : 'text-emission-400'}`}>
            Player {currentPlayer}
          </div>
        </div>
        <div className="bg-space-700 rounded-lg p-3">
          <div className="text-sm text-gray-400">Move Count</div>
          <div className="text-lg font-bold text-neural-400 font-mono">
            {boardState?.moveCount || 0}
          </div>
        </div>
      </div>

      {/* Board Container */}
      <div className="flex gap-6">
        {/* Game Board */}
        <div className="flex-1">
          <div className="relative">
            {/* Board Background */}
            <div className="absolute inset-0 bg-gradient-to-br from-yellow-900 to-yellow-600 rounded-lg blur-sm opacity-50" />
            
            {/* Board Grid */}
            <div className="relative bg-yellow-900 p-3 rounded-lg border-2 border-yellow-600" role="grid" aria-label="9x9 Gungi board">
              {Array.from({ length: 9 }, (_, rowIndex) => (
                <div key={`row-${rowIndex}`} className="flex gap-0.5" role="row">
                  {Array.from({ length: 9 }, (_, colIndex) => {
                    const squareKey = `${rowIndex}-${colIndex}`;
                    const piecesAtSquare = piecesByPosition.get(squareKey) || [];
                    const isSelected = selectedSquare?.[0] === rowIndex && selectedSquare?.[1] === colIndex;
                    const isValidMove = validMoves.some(([r, c]) => r === rowIndex && c === colIndex);

                    return (
                      <BoardSquare
                        key={`${rowIndex}-${colIndex}`}
                        row={rowIndex}
                        col={colIndex}
                        pieces={piecesAtSquare}
                        isSelected={isSelected}
                        isValidMove={isValidMove}
                        onClick={handleSquareClick}
                      />
                    );
                  })}
                </div>
              ))}
            </div>

            {/* Coordinate Labels */}
            <div className="absolute -left-8 top-0 h-full flex flex-col justify-around text-xs text-gray-400">
              {Array.from({ length: 9 }, (_, i) => (
                <span key={i}>{9 - i}</span>
              ))}
            </div>
            <div className="absolute -bottom-8 left-0 w-full flex justify-around text-xs text-gray-400">
              {Array.from({ length: 9 }, (_, i) => (
                <span key={i}>{String.fromCharCode(65 + i)}</span>
              ))}
            </div>
          </div>

          {/* Instructions */}
          <div className="mt-4 text-sm text-gray-400 text-center" role="status" aria-live="polite">
            {selectedSquare ? (
              <span className="text-emission-400">Click a highlighted square to move</span>
            ) : (
              <span>Click your pieces to see possible moves</span>
            )}
          </div>
        </div>

        {/* Side Panel */}
        <div className="w-64 space-y-4">
          <MoveHistory moves={moveHistory} />
          
          {/* Performance Stats */}
          {enableMagicBlock && session && (
            <div className="bg-space-800 rounded-lg p-4 border border-space-600">
              <h3 className="text-sm font-bold text-gray-400 mb-3">⚡ MagicBlock Stats</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Latency:</span>
                  <span className={`font-mono ${latency < 50 ? 'text-emission-400' : 'text-yellow-400'}`}>
                    {latency}ms
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Players:</span>
                  <span className="font-mono text-neural-400">{session.playersConnected}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Session:</span>
                  <span className="font-mono text-xs text-gray-500">
                    {session.sessionId.slice(0, 8)}...
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
