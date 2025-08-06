import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Canvas } from '@react-three/fiber';
import { Text, Box, MeshDistortMaterial } from '@react-three/drei';
import { useGameState } from '@/hooks/useGameState';
import { useMagicBlockSession } from '@/hooks/useMagicBlockSession';
import toast from 'react-hot-toast';

interface GameBoardProps {
  matchId: string;
  isLive?: boolean;
  enableMagicBlock?: boolean;
}

interface Piece {
  id: string;
  type: string;
  owner: 1 | 2;
  position: [number, number];
  stackLevel: number;
  nenType?: string;
}

const pieceData = {
  Marshal: { symbol: '👑', nenType: 'specialization', power: 10 },
  General: { symbol: '⚔️', nenType: 'enhancement', power: 9 },
  Lieutenant: { symbol: '🛡️', nenType: 'enhancement', power: 8 },
  Major: { symbol: '🗡️', nenType: 'emission', power: 7 },
  Minor: { symbol: '🏹', nenType: 'emission', power: 6 },
  Pawn: { symbol: '♟️', nenType: 'manipulation', power: 5 },
  Bow: { symbol: '🎯', nenType: 'emission', power: 4 },
  Cannon: { symbol: '💣', nenType: 'transmutation', power: 3 },
  Fort: { symbol: '🏰', nenType: 'conjuration', power: 2 },
};

export const GameBoard: React.FC<GameBoardProps> = ({ 
  matchId, 
  isLive = false,
  enableMagicBlock = true 
}) => {
  const { boardState, currentPlayer, isConnected, latency } = useGameState(matchId);
  const { session, submitMove } = useMagicBlockSession(matchId, { enabled: enableMagicBlock && isLive });
  const [selectedSquare, setSelectedSquare] = useState<[number, number] | null>(null);
  const [possibleMoves, setPossibleMoves] = useState<[number, number][]>([]);
  const [isThinking, setIsThinking] = useState(false);
  const [lastMove, setLastMove] = useState<{ from: [number, number]; to: [number, number] } | null>(null);

  const getPieceAt = (row: number, col: number): Piece | undefined => {
    return boardState?.pieces.find(p => p.position[0] === row && p.position[1] === col);
  };

  const calculatePossibleMoves = (piece: Piece): [number, number][] => {
    // Simplified movement calculation - in real implementation, this would be more complex
    const moves: [number, number][] = [];
    const [row, col] = piece.position;
    
    // Check all adjacent squares
    for (let r = row - 1; r <= row + 1; r++) {
      for (let c = col - 1; c <= col + 1; c++) {
        if (r >= 0 && r < 9 && c >= 0 && c < 9 && !(r === row && c === col)) {
          const targetPiece = getPieceAt(r, c);
          if (!targetPiece || targetPiece.owner !== piece.owner) {
            moves.push([r, c]);
          }
        }
      }
    }
    
    return moves;
  };

  const handleSquareClick = async (row: number, col: number) => {
    if (isThinking || !isLive) return;

    const clickedPiece = getPieceAt(row, col);
    
    if (selectedSquare) {
      // If a piece is already selected, try to move it
      const [fromRow, fromCol] = selectedSquare;
      const selectedPiece = getPieceAt(fromRow, fromCol);
      
      if (selectedPiece && selectedPiece.owner === currentPlayer) {
        const isPossibleMove = possibleMoves.some(([r, c]) => r === row && c === col);
        
        if (isPossibleMove) {
          // Submit move
          setIsThinking(true);
          try {
            const move = {
              from: selectedSquare,
              to: [row, col] as [number, number],
              piece: selectedPiece,
            };
            
            if (enableMagicBlock && session) {
              await submitMove(move);
            } else {
              // Fallback to WebSocket
              // await submitMoveViaWebSocket(move);
            }
            
            setLastMove({ from: selectedSquare, to: [row, col] });
            toast.success('Move submitted!');
          } catch (error) {
            console.error('Move submission failed:', error);
            toast.error('Failed to submit move');
          } finally {
            setIsThinking(false);
            setSelectedSquare(null);
            setPossibleMoves([]);
          }
        } else {
          // Clicked on invalid square, deselect
          setSelectedSquare(null);
          setPossibleMoves([]);
        }
      }
    } else if (clickedPiece && clickedPiece.owner === currentPlayer) {
      // Select the piece
      setSelectedSquare([row, col]);
      setPossibleMoves(calculatePossibleMoves(clickedPiece));
    }
  };

  const getSquareStyle = (row: number, col: number) => {
    const isSelected = selectedSquare?.[0] === row && selectedSquare?.[1] === col;
    const isPossibleMove = possibleMoves.some(([r, c]) => r === row && c === col);
    const isLastMoveFrom = lastMove?.from[0] === row && lastMove?.from[1] === col;
    const isLastMoveTo = lastMove?.to[0] === row && lastMove?.to[1] === col;
    
    let baseClasses = 'gungi-square relative group';
    
    if (isSelected) {
      baseClasses += ' ring-2 ring-solana-purple ring-offset-2 ring-offset-cyber-darker';
    } else if (isPossibleMove) {
      baseClasses += ' ring-1 ring-solana-green animate-pulse';
    } else if (isLastMoveFrom || isLastMoveTo) {
      baseClasses += ' bg-magicblock-primary/20';
    }
    
    return baseClasses;
  };

  return (
    <div className="relative">
      {/* Connection Status Bar */}
      <div className="mb-4 flex items-center justify-between p-4 bg-cyber-dark/50 backdrop-blur-sm border border-solana-purple/30">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-solana-green' : 'bg-red-500'} animate-pulse`} />
            <span className="text-sm font-cyber text-gray-400">
              {isConnected ? 'CONNECTED' : 'DISCONNECTED'}
            </span>
          </div>
          
          {enableMagicBlock && (
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-magicblock-primary rounded-full" />
              <span className="text-xs font-cyber text-magicblock-primary">MAGICBLOCK</span>
            </div>
          )}
          
          {latency > 0 && (
            <div className="flex items-center space-x-1">
              <span className="text-xs font-mono text-gray-400">LATENCY:</span>
              <span className={`text-xs font-mono ${
                latency < 50 ? 'text-solana-green' : 
                latency < 100 ? 'text-yellow-500' : 'text-red-500'
              }`}>
                {latency}ms
              </span>
            </div>
          )}
        </div>
        
        <div className="flex items-center space-x-2">
          <span className="text-sm font-cyber text-gray-400">TURN:</span>
          <span className={`text-sm font-bold ${
            currentPlayer === 1 ? 'text-nen-enhancement' : 'text-nen-emission'
          }`}>
            PLAYER {currentPlayer}
          </span>
        </div>
      </div>

      {/* 3D Board Container */}
      <div className="relative aspect-square max-w-2xl mx-auto">
        {/* Holographic Effect Overlay */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-t from-cyber-accent/10 via-transparent to-transparent animate-cyber-scan" />
        </div>
        
        {/* Game Board Grid */}
        <div className="absolute inset-0 p-2 bg-cyber-dark/80 backdrop-blur-xl border-2 border-solana-purple/50 shadow-2xl">
          <div className="grid grid-cols-9 gap-0.5 h-full bg-solana-purple/10 p-1">
            {Array.from({ length: 81 }).map((_, index) => {
              const row = Math.floor(index / 9);
              const col = index % 9;
              const piece = getPieceAt(row, col);
              const isEvenSquare = (row + col) % 2 === 0;
              
              return (
                <motion.div
                  key={`${row}-${col}`}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleSquareClick(row, col)}
                  className={getSquareStyle(row, col)}
                  style={{
                    background: isEvenSquare 
                      ? 'linear-gradient(135deg, rgba(153, 69, 255, 0.1), rgba(20, 241, 149, 0.05))' 
                      : 'linear-gradient(135deg, rgba(20, 241, 149, 0.05), rgba(153, 69, 255, 0.1))'
                  }}
                >
                  {/* Stack Level Indicator */}
                  {piece && piece.stackLevel > 0 && (
                    <div className="absolute top-1 right-1 text-xs font-mono text-solana-green/80">
                      L{piece.stackLevel}
                    </div>
                  )}
                  
                  {/* Piece */}
                  <AnimatePresence mode="wait">
                    {piece && (
                      <motion.div
                        key={piece.id}
                        initial={{ scale: 0, rotate: -180 }}
                        animate={{ scale: 1, rotate: 0 }}
                        exit={{ scale: 0, rotate: 180 }}
                        transition={{ type: 'spring', stiffness: 200 }}
                        className="relative z-10"
                      >
                        <div className={`
                          text-3xl flex items-center justify-center
                          ${piece.owner === 1 ? 'drop-shadow-[0_0_10px_#FF6B6B]' : 'drop-shadow-[0_0_10px_#4ECDC4]'}
                        `}>
                          <span className={`nen-${pieceData[piece.type].nenType}`}>
                            {pieceData[piece.type].symbol}
                          </span>
                        </div>
                        
                        {/* Power Level */}
                        <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2">
                          <span className="text-xs font-mono text-white/80 bg-black/50 px-1 rounded">
                            {pieceData[piece.type].power}
                          </span>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                  
                  {/* Coordinate Labels */}
                  {col === 0 && (
                    <div className="absolute -left-6 top-1/2 transform -translate-y-1/2 text-xs font-mono text-gray-500">
                      {9 - row}
                    </div>
                  )}
                  {row === 8 && (
                    <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 text-xs font-mono text-gray-500">
                      {String.fromCharCode(65 + col)}
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Thinking Indicator */}
        {isThinking && (
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-20">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              className="nen-spinner"
            />
          </div>
        )}
      </div>

      {/* Action Panel */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mt-4 p-4 bg-cyber-dark/50 backdrop-blur-sm border border-solana-purple/30"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {selectedSquare && (
              <motion.button
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                onClick={() => {
                  setSelectedSquare(null);
                  setPossibleMoves([]);
                }}
                className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 text-red-400 font-cyber text-sm uppercase tracking-wider transition-all"
              >
                CANCEL
              </motion.button>
            )}
            
            <span className="text-sm text-gray-400 font-cyber">
              {selectedSquare 
                ? `SELECTED: ${String.fromCharCode(65 + selectedSquare[1])}${9 - selectedSquare[0]}`
                : 'SELECT A PIECE TO MOVE'
              }
            </span>
          </div>
          
          {isLive && (
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              <span className="text-xs font-cyber text-red-400 uppercase">LIVE MATCH</span>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}; 