#!/usr/bin/env python3
"""
Debug the capture preference issue
"""

import sys
from pathlib import Path

# Add the correct path to the easy_agent module
agent_path = Path("/workspaces/Nen/backend/ai-services/agents")
sys.path.insert(0, str(agent_path))

from easy_agent import create_easy_agent

def create_test_board():
    """Create test board with capture opportunities"""
    board = [[[None] * 3 for _ in range(9)] for _ in range(9)]

    # Place pieces for capture testing
    board[4][4][0] = {'type': 'pawn', 'player': 1}
    board[4][5][0] = {'type': 'pawn', 'player': 2}  # Capturable
    board[3][4][0] = {'type': 'general', 'player': 2}  # Capturable
    board[5][4][0] = {'type': 'major', 'player': 2}  # Capturable

    return {
        'board': board,
        'currentPlayer': 1,
        'moveNumber': 10,
        'gameStatus': 'active'
    }

def debug_move_generation():
    """Debug the move generation to see what's happening"""
    agent = create_easy_agent("balanced")
    board_state = create_test_board()

    print("🔍 Debugging move generation...")

    # Test a few moves to see the structure
    for i in range(10):
        move = agent.select_move(board_state)
        if move:
            print(f"Move {i+1}: {move}")
            print(f"  Is capture: {move.get('isCapture', False)}")
            print(f"  From: {move['from']}")
            print(f"  To: {move['to']}")
            print()

def debug_legal_moves():
    """Debug what legal moves are being generated"""
    agent = create_easy_agent("balanced")
    board_state = create_test_board()

    print("🔍 Debugging legal moves generation...")

    # Access the internal method to see what moves are generated
    legal_moves = agent._get_legal_moves(board_state)

    print(f"Total legal moves: {len(legal_moves)}")

    capture_moves = [move for move in legal_moves if move.get('isCapture', False)]
    non_capture_moves = [move for move in legal_moves if not move.get('isCapture', False)]

    print(f"Capture moves: {len(capture_moves)}")
    print(f"Non-capture moves: {len(non_capture_moves)}")

    if capture_moves:
        print("\nCapture moves:")
        for i, move in enumerate(capture_moves[:5]):  # Show first 5
            print(f"  {i+1}: {move}")

    if non_capture_moves:
        print("\nNon-capture moves:")
        for i, move in enumerate(non_capture_moves[:5]):  # Show first 5
            print(f"  {i+1}: {move}")

if __name__ == "__main__":
    debug_legal_moves()
    print("\n" + "="*50 + "\n")
    debug_move_generation()
