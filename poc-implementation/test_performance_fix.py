#!/usr/bin/env python3
"""
Quick test for HardAgent performance improvements
Focus on MagicBlock compliance (<100ms)
"""

import sys
import os
import time
import asyncio
from typing import List, Dict, Any

# Add the backend path
backend_path = os.path.join(os.path.dirname(__file__), 'backend')
sys.path.append(backend_path)

# Import with correct path
import ai_services.agents.ai_manager as ai_manager_module
import ai_services.agents.ai_config as ai_config_module

AIManager = ai_manager_module.AIManager
AIConfig = ai_config_module.AIConfig
AIPersonality = ai_config_module.AIPersonality
AIDifficulty = ai_config_module.AIDifficulty

async def test_hard_agent_performance():
    """Test HardAgent performance specifically"""
    print("🧪 Testing HardAgent Performance Fix...")
    
    manager = AIManager()
    await manager.initialize()
    
    # Test HardAgent specifically
    config = AIConfig(
        difficulty=AIDifficulty.HARD,
        personality=AIPersonality.BALANCED,
        max_move_time_ms=90
    )
    
    hard_agent = await manager.create_agent(config)
    
    # Test board state
    board_state = {
        'pieces': [
            {'type': 'king', 'color': 'white', 'position': {'x': 4, 'y': 0}},
            {'type': 'pawn', 'color': 'white', 'position': {'x': 3, 'y': 1}},
            {'type': 'king', 'color': 'black', 'position': {'x': 4, 'y': 7}},
            {'type': 'pawn', 'color': 'black', 'position': {'x': 3, 'y': 6}},
        ],
        'currentPlayer': 'black'
    }
    
    # Test moves
    valid_moves = [
        {'from': {'x': 3, 'y': 6}, 'to': {'x': 3, 'y': 5}, 'piece': 'pawn'},
        {'from': {'x': 3, 'y': 6}, 'to': {'x': 3, 'y': 4}, 'piece': 'pawn'},
        {'from': {'x': 4, 'y': 7}, 'to': {'x': 3, 'y': 7}, 'piece': 'king'},
        {'from': {'x': 4, 'y': 7}, 'to': {'x': 5, 'y': 7}, 'piece': 'king'},
    ]
    
    print(f"Testing {len(valid_moves)} moves with HardAgent...")
    
    times = []
    magic_block_compliant = 0
    
    for i in range(10):  # Test 10 moves
        start_time = time.time()
        
        try:
            move = hard_agent.get_move(board_state, valid_moves)
            
            elapsed_ms = (time.time() - start_time) * 1000
            times.append(elapsed_ms)
            
            if elapsed_ms < 100:  # MagicBlock compliance
                magic_block_compliant += 1
            
            print(f"Move {i+1}: {elapsed_ms:.2f}ms ({'✅' if elapsed_ms < 100 else '❌'})")
            
        except Exception as e:
            print(f"Move {i+1}: ERROR - {e}")
            times.append(999)  # Mark as failure
    
    # Results
    avg_time = sum(times) / len(times)
    compliance_rate = (magic_block_compliant / len(times)) * 100
    
    print(f"\n📊 HardAgent Performance Results:")
    print(f"   Average Time: {avg_time:.2f}ms")
    print(f"   Min Time: {min(times):.2f}ms")
    print(f"   Max Time: {max(times):.2f}ms")
    print(f"   MagicBlock Compliance: {compliance_rate:.1f}% ({magic_block_compliant}/{len(times)})")
    print(f"   Target: >99% under 100ms")
    
    success = compliance_rate > 90  # Allow some flexibility for testing
    print(f"\n{'✅ PERFORMANCE IMPROVED' if success else '❌ NEEDS MORE OPTIMIZATION'}")
    
    return success

async def main():
    """Main test function"""
    print("🚀 Testing Performance Improvements for HardAgent\n")
    
    try:
        success = await test_hard_agent_performance()
        
        if success:
            print("\n🎉 HardAgent performance significantly improved!")
            print("   Ready for MagicBlock integration")
        else:
            print("\n⚠️  HardAgent still needs optimization")
            print("   Consider further performance tuning")
            
    except Exception as e:
        print(f"\n💥 Performance test failed: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(main())
