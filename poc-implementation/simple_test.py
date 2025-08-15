import sys
import os
from pathlib import Path

# Add AI services to path
ai_services_path = Path(__file__).parent / "backend" / "ai-services"
sys.path.insert(0, str(ai_services_path))

print(f"Added to path: {ai_services_path}")
print(f"Path exists: {ai_services_path.exists()}")

try:
    from agents.basic_ai_agents import AIConfig, RandomAI, AIPersonality
    print("✓ Successfully imported basic AI agents")
    
    config = AIConfig(personality=AIPersonality.BALANCED)
    agent = RandomAI(config)
    print("✓ Successfully created RandomAI agent")
    
    # Test simple move generation
    board_state = {
        'currentPlayer': 1,
        'pieces': {
            'player1': [{'type': 'marshal', 'position': [8, 4]}],
            'player2': [{'type': 'marshal', 'position': [0, 4]}]
        }
    }
    
    valid_moves = [
        {'from': [8, 4], 'to': [7, 4], 'piece': {'type': 'marshal'}, 'isCapture': False}
    ]
    
    move = agent.get_move(board_state, valid_moves)
    print(f"✓ Move generated: {move}")
    
    print("✓ Basic AI system is working!")
    
except Exception as e:
    print(f"✗ Error: {e}")
    import traceback
    traceback.print_exc()
