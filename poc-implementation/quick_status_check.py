#!/usr/bin/env python3
"""
Quick AI System Status Check
"""

import sys
import time
import json
from datetime import datetime

# Add AI services to path
sys.path.append('backend/ai-services')

def quick_status_check():
    """Quick status check of AI system"""
    print("🔍 Quick AI System Status Check")
    print("=" * 50)
    
    results = {}
    
    # Test 1: Basic Imports
    try:
        from agents.basic_ai_agents import RandomAI, MinimaxAI, MCTSAI, AIConfig, AIPersonality
        from agents.ai_manager import AIManager
        results['imports'] = True
        print("✅ All imports successful")
    except Exception as e:
        results['imports'] = False
        print(f"❌ Import failed: {e}")
        return results
    
    # Test 2: Basic Agent Creation
    try:
        config = AIConfig(personality=AIPersonality.BALANCED)
        agents = {
            'random': RandomAI(config),
            'minimax': MinimaxAI(config),
            'mcts': MCTSAI(config)
        }
        results['agent_creation'] = True
        print("✅ Agent creation successful")
    except Exception as e:
        results['agent_creation'] = False
        print(f"❌ Agent creation failed: {e}")
        return results
    
    # Test 3: Basic Move Generation
    try:
        board_state = {
            'pieces': {
                'player1': [{'type': 'marshal', 'position': [4, 8]}],
                'player2': [{'type': 'marshal', 'position': [4, 0]}]
            },
            'currentPlayer': 1
        }
        
        valid_moves = [
            {'from': [3, 4], 'to': [3, 3], 'piece': {'type': 'pawn'}, 'isCapture': False},
            {'from': [4, 4], 'to': [4, 3], 'piece': {'type': 'pawn'}, 'isCapture': True}
        ]
        
        move_results = {}
        for name, agent in agents.items():
            start_time = time.time()
            move = agent.get_move(board_state, valid_moves)
            execution_time = (time.time() - start_time) * 1000
            
            move_results[name] = {
                'move_generated': move is not None,
                'execution_time_ms': execution_time,
                'magicblock_compliant': execution_time < 100.0
            }
            
            status = "✅" if move is not None else "❌"
            time_status = "✅" if execution_time < 100.0 else "❌"
            print(f"  {status} {name}: {execution_time:.2f}ms {time_status}")
        
        results['move_generation'] = move_results
        results['basic_functionality'] = all(r['move_generated'] for r in move_results.values())
        print("✅ Move generation successful")
        
    except Exception as e:
        results['move_generation'] = False
        results['basic_functionality'] = False
        print(f"❌ Move generation failed: {e}")
        return results
    
    # Test 4: AI Manager
    try:
        with AIManager() as manager:
            agent_count = len(manager.agents)
            easy_agent = manager.get_agent("easy", "balanced")
            
            results['ai_manager'] = {
                'initialized': True,
                'agent_count': agent_count,
                'agent_retrieval': easy_agent is not None
            }
            
        print(f"✅ AI Manager: {agent_count} agents loaded")
        
    except Exception as e:
        results['ai_manager'] = False
        print(f"❌ AI Manager failed: {e}")
    
    # Test 5: Performance Summary
    try:
        all_compliant = all(
            r.get('magicblock_compliant', False) 
            for r in results.get('move_generation', {}).values()
        )
        
        results['magicblock_compliance'] = all_compliant
        results['overall_status'] = all([
            results.get('imports', False),
            results.get('agent_creation', False),
            results.get('basic_functionality', False),
            results.get('ai_manager', {}).get('initialized', False)
        ])
        
        print(f"\nMagicBlock Compliance: {'✅ PASS' if all_compliant else '❌ FAIL'}")
        print(f"Overall Status: {'✅ OPERATIONAL' if results['overall_status'] else '❌ ISSUES'}")
        
    except Exception as e:
        results['performance_summary'] = False
        print(f"❌ Performance summary failed: {e}")
    
    return results

def generate_status_report(results):
    """Generate status report"""
    report = {
        'timestamp': datetime.now().isoformat(),
        'test_type': 'Quick Status Check',
        'results': results,
        'summary': {
            'system_operational': results.get('overall_status', False),
            'magicblock_compliant': results.get('magicblock_compliance', False),
            'ready_for_testing': results.get('basic_functionality', False)
        }
    }
    
    # Save report
    with open('quick_status_report.json', 'w') as f:
        json.dump(report, f, indent=2)
    
    return report

if __name__ == "__main__":
    try:
        results = quick_status_check()
        report = generate_status_report(results)
        
        print(f"\n📊 Status report saved: quick_status_report.json")
        
        if results.get('overall_status', False):
            print("🎉 System is operational and ready for comprehensive testing!")
        else:
            print("⚠️ System has issues that need to be addressed")
            
    except Exception as e:
        print(f"💥 Status check failed: {e}")
        sys.exit(1)
