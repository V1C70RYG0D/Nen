#!/usr/bin/env python3
"""
Simple debug to understand capture preference
"""

import sys
from pathlib import Path

# Add the correct path to the easy_agent module
agent_path = Path("/workspaces/Nen/backend/ai-services/agents")
sys.path.insert(0, str(agent_path))

print("Importing EasyAgent...")
from easy_agent import create_easy_agent, EasyAgentConfig

print("Creating test board...")
def create_test_board():
    board = [[[None] * 3 for _ in range(9)] for _ in range(9)]
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

print("Creating agent...")
# Create agent with explicit configuration
config = EasyAgentConfig(capture_preference_rate=0.70)
agent = create_easy_agent("balanced", **{'capture_preference_rate': 0.70})

print(f"Agent configuration: {agent.easy_config.capture_preference_rate}")

board_state = create_test_board()

print("Testing 100 moves...")
captures = 0
total = 100

for i in range(total):
    move = agent.select_move(board_state)
    if move and move.get('isCapture', False):
        captures += 1

rate = captures / total
print(f"Captures: {captures}/{total} = {rate:.3f} ({rate*100:.1f}%)")

if 0.65 <= rate <= 0.75:
    print("✅ Within expected range")
else:
    print("❌ Outside expected range")

print(f"Expected: 70% ± 5% (65-75%)")
print(f"Actual: {rate*100:.1f}%")
