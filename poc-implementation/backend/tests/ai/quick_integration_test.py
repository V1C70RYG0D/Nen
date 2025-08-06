#!/usr/bin/env python3
"""
Quick Integration Test
Verify the AI system is working end-to-end
"""

import sys
import time
import json
from pathlib import Path

# Add AI services path
sys.path.append(str(Path(__file__).parent.parent.parent / "ai-services"))

def quick_integration_test():
    """Quick end-to-end test of the AI system"""
    
    print("🚀 QUICK INTEGRATION TEST")
    print("=" * 30)
    
    try:
        # Import all required modules
        from agents.basic_ai_agents import (
            RandomAI, MinimaxAI, MCTSAI, 
            AIConfig, AIPersonality, AIAgentFactory
        )
        print("✅ All modules imported successfully")
        
        # Create agent factory
        factory = AIAgentFactory()
        print("✅ Agent factory created")
        
        # Test creating different agents
        agents = {
            'easy_balanced': factory.create_agent('easy', 'balanced'),
            'medium_aggressive': factory.create_agent('medium', 'aggressive'),
            'hard_defensive': factory.create_agent('hard', 'defensive')
        }
        print(f"✅ Created {len(agents)} test agents")
        
        # Create test board state
        board_state = {
            'pieces': {
                'player1': [
                    {'type': 'marshal', 'position': [4, 8]},
                    {'type': 'pawn', 'position': [2, 6]}
                ],
                'player2': [
                    {'type': 'marshal', 'position': [4, 0]}, 
                    {'type': 'pawn', 'position': [2, 2]}
                ]
            },
            'currentPlayer': 1,
            'gamePhase': 'opening',
            'moveCount': 1
        }
        
        # Valid moves
        valid_moves = [
            {
                'from': [2, 6], 'to': [2, 5],
                'piece': {'type': 'pawn', 'player': 1},
                'isCapture': False, 'moveType': 'advance'
            },
            {
                'from': [2, 6], 'to': [2, 3],
                'piece': {'type': 'pawn', 'player': 1},
                'captured': {'type': 'pawn', 'player': 2},
                'isCapture': True, 'moveType': 'capture'
            }
        ]
        
        # Test each agent can generate moves
        results = {}
        for agent_name, agent in agents.items():
            start_time = time.perf_counter()
            move = agent.get_move(board_state, valid_moves)
            execution_time = (time.perf_counter() - start_time) * 1000
            
            if move:
                results[agent_name] = {
                    'success': True,
                    'time_ms': execution_time,
                    'move_type': move.get('moveType', 'unknown')
                }
                print(f"✅ {agent_name}: Move generated in {execution_time:.2f}ms")
            else:
                results[agent_name] = {
                    'success': False,
                    'time_ms': execution_time
                }
                print(f"❌ {agent_name}: Failed to generate move")
        
        # Check performance requirements
        performance_ok = True
        targets = {'easy': 10.0, 'medium': 50.0, 'hard': 90.0}
        
        print("\n⚡ Performance Check:")
        for agent_name, result in results.items():
            if result['success']:
                difficulty = agent_name.split('_')[0]
                target = targets.get(difficulty, 100.0)
                meets_target = result['time_ms'] < target
                
                if not meets_target:
                    performance_ok = False
                
                status = "✅" if meets_target else "❌"
                print(f"{status} {agent_name}: {result['time_ms']:.2f}ms (target: <{target}ms)")
        
        # Overall assessment
        all_agents_working = all(r['success'] for r in results.values())
        
        print(f"\n📊 RESULTS:")
        print(f"  Agents Working: {sum(r['success'] for r in results.values())}/{len(results)}")
        print(f"  Performance OK: {'✅' if performance_ok else '❌'}")
        print(f"  Overall Status: {'✅ READY' if all_agents_working and performance_ok else '❌ ISSUES'}")
        
        return all_agents_working and performance_ok
        
    except Exception as e:
        print(f"❌ Integration test failed: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = quick_integration_test()
    print(f"\n{'🎉 SUCCESS' if success else '⚠️ FAILED'}: Integration test {'passed' if success else 'failed'}")
    sys.exit(0 if success else 1)
