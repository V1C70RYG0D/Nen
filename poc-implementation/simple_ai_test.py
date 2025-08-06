#!/usr/bin/env python3
"""
Simple AI Performance Test
"""

import sys
import os
sys.path.append('backend/ai-services')
import time

try:
    from agents.basic_ai_agents import RandomAI, MinimaxAI, MCTSAI, AIConfig, AIPersonality
    from agents.ai_manager import AIManager
    print("✅ All AI imports successful")
except ImportError as e:
    print(f"❌ Import Error: {e}")
    sys.exit(1)

print("\n=== AI Performance Test ===")

# Test configuration
board_state = {
    'pieces': {
        'player1': [{'type': 'marshal', 'position': [4, 8]}],
        'player2': [{'type': 'marshal', 'position': [4, 0]}]
    },
    'currentPlayer': 1
}

valid_moves = [
    {'from': [3, 4], 'to': [3, 3], 'piece': {'type': 'pawn'}, 'isCapture': False},
    {'from': [4, 4], 'to': [4, 3], 'piece': {'type': 'pawn'}, 'isCapture': True, 'captured': {'type': 'pawn'}},
    {'from': [5, 4], 'to': [5, 3], 'piece': {'type': 'pawn'}, 'isCapture': False}
]

# Test each AI type
results = {}

for ai_name, ai_class, target_ms in [
    ('Easy (RandomAI)', RandomAI, 10),
    ('Medium (MinimaxAI)', MinimaxAI, 50), 
    ('Hard (MCTSAI)', MCTSAI, 90)
]:
    print(f'\nTesting {ai_name}...')
    
    config = AIConfig(personality=AIPersonality.BALANCED)
    agent = ai_class(config)
    
    times = []
    for i in range(10):
        start = time.time()
        move = agent.get_move(board_state, valid_moves)
        exec_time = (time.time() - start) * 1000
        times.append(exec_time)
    
    avg_time = sum(times) / len(times)
    max_time = max(times)
    
    results[ai_name] = {
        "avg_time_ms": avg_time,
        "max_time_ms": max_time,
        "target_ms": target_ms,
        "compliant": max_time < 100.0
    }
    
    status = '✅' if avg_time <= target_ms else '⚠️'
    magicblock_status = '✅' if max_time < 100.0 else '❌'
    
    print(f'  {status} Avg: {avg_time:.2f}ms (target: {target_ms}ms)')
    print(f'  {magicblock_status} Max: {max_time:.2f}ms (MagicBlock: <100ms)')

print('\n=== AI Manager Test ===')

try:
    manager = AIManager()
    print(f"✅ AI Manager created with {len(manager.agents)} agents")
    
    # Test agent retrieval
    easy_agent = manager.get_agent("easy", "balanced")
    if easy_agent:
        print("✅ Easy agent retrieved successfully")
    else:
        print("❌ Failed to retrieve easy agent")
    
    # Test match creation
    agent1_config = {"difficulty": "easy", "personality": "balanced"}
    agent2_config = {"difficulty": "medium", "personality": "aggressive"}
    
    match_id = manager.create_match(agent1_config, agent2_config)
    if match_id:
        print(f"✅ Match created successfully: {match_id}")
        
        # Test AI move generation
        ai_move = manager.get_ai_move(match_id, board_state, valid_moves)
        if ai_move:
            print("✅ AI move generated successfully")
        else:
            print("❌ Failed to generate AI move")
        
        # End match
        manager.end_match(match_id, {"winner": 1})
        print("✅ Match ended successfully")
    else:
        print("❌ Failed to create match")
    
    # Get performance report
    report = manager.get_performance_report()
    print(f"✅ Performance report generated")
    
    # Cleanup
    manager.shutdown()
    print("✅ AI Manager shutdown successfully")
    
except Exception as e:
    print(f"❌ AI Manager test failed: {e}")

print('\n=== Performance Summary ===')
for ai_name, data in results.items():
    compliant = "COMPLIANT" if data["compliant"] else "NON-COMPLIANT"
    print(f"  {ai_name}: {compliant}")

# Check overall compliance
all_compliant = all(data["compliant"] for data in results.values())
print(f"\nOverall MagicBlock Compliance: {'✅ PASS' if all_compliant else '❌ FAIL'}")

print("\n=== Test Complete ===")
