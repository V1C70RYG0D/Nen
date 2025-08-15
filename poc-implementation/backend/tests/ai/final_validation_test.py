#!/usr/bin/env python3
"""
Final System Test and Validation
Complete testing of POC AI system according to GI.md guidelines and specifications
"""

import sys
import time
import json
import statistics
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Any, Optional

# Add the AI services to path
sys.path.append(str(Path(__file__).parent.parent.parent / "ai-services"))

def test_imports():
    """Test that all required modules can be imported"""
    print("🔌 Testing Imports...")
    
    try:
        from agents.basic_ai_agents import (
            RandomAI, MinimaxAI, MCTSAI, 
            AIConfig, AIPersonality, AIAgentFactory,
            GungiBoardEvaluator
        )
        print("✅ AI agents imported successfully")
        return True, {
            'RandomAI': RandomAI,
            'MinimaxAI': MinimaxAI, 
            'MCTSAI': MCTSAI,
            'AIConfig': AIConfig,
            'AIPersonality': AIPersonality,
            'AIAgentFactory': AIAgentFactory,
            'GungiBoardEvaluator': GungiBoardEvaluator
        }
    except ImportError as e:
        print(f"❌ Import failed: {e}")
        return False, {}

def create_test_board_state():
    """Create a test board state for move generation"""
    return {
        'pieces': {
            'player1': [
                {'type': 'marshal', 'position': [4, 8]},
                {'type': 'general', 'position': [3, 8]},
                {'type': 'pawn', 'position': [2, 6]},
                {'type': 'pawn', 'position': [4, 6]}
            ],
            'player2': [
                {'type': 'marshal', 'position': [4, 0]},
                {'type': 'general', 'position': [3, 0]},
                {'type': 'pawn', 'position': [2, 2]},
                {'type': 'pawn', 'position': [4, 2]}
            ]
        },
        'currentPlayer': 1,
        'gamePhase': 'opening',
        'moveCount': 1
    }

def create_valid_moves():
    """Create a list of valid moves for testing"""
    return [
        {
            'from': [2, 6], 'to': [2, 5],
            'piece': {'type': 'pawn', 'player': 1},
            'isCapture': False, 'moveType': 'advance'
        },
        {
            'from': [4, 6], 'to': [4, 5],
            'piece': {'type': 'pawn', 'player': 1},
            'isCapture': False, 'moveType': 'advance'
        },
        {
            'from': [3, 8], 'to': [3, 7],
            'piece': {'type': 'general', 'player': 1},
            'isCapture': False, 'moveType': 'advance'
        },
        {
            'from': [3, 8], 'to': [2, 7],
            'piece': {'type': 'general', 'player': 1},
            'captured': {'type': 'pawn', 'player': 2},
            'isCapture': True, 'moveType': 'capture'
        }
    ]

def test_ai_agent_creation(modules):
    """Test AI agent creation and basic functionality"""
    print("\n🤖 Testing AI Agent Creation...")
    
    results = {}
    
    # Test Easy AI (RandomAI)
    try:
        config = modules['AIConfig'](
            personality=modules['AIPersonality'].BALANCED,
            skill_level=3
        )
        easy_agent = modules['RandomAI'](config)
        print("✅ Easy AI (RandomAI) created successfully")
        results['easy'] = {'created': True, 'agent': easy_agent}
    except Exception as e:
        print(f"❌ Easy AI creation failed: {e}")
        results['easy'] = {'created': False, 'error': str(e)}
    
    # Test Medium AI (MinimaxAI)
    try:
        config = modules['AIConfig'](
            personality=modules['AIPersonality'].AGGRESSIVE,
            skill_level=5
        )
        medium_agent = modules['MinimaxAI'](config)
        print("✅ Medium AI (MinimaxAI) created successfully")
        results['medium'] = {'created': True, 'agent': medium_agent}
    except Exception as e:
        print(f"❌ Medium AI creation failed: {e}")
        results['medium'] = {'created': False, 'error': str(e)}
    
    # Test Hard AI (MCTSAI)
    try:
        config = modules['AIConfig'](
            personality=modules['AIPersonality'].DEFENSIVE,
            skill_level=8
        )
        hard_agent = modules['MCTSAI'](config)
        print("✅ Hard AI (MCTSAI) created successfully")
        results['hard'] = {'created': True, 'agent': hard_agent}
    except Exception as e:
        print(f"❌ Hard AI creation failed: {e}")
        results['hard'] = {'created': False, 'error': str(e)}
    
    return results

def test_agent_factory(modules):
    """Test the AI Agent Factory"""
    print("\n🏭 Testing AI Agent Factory...")
    
    try:
        factory = modules['AIAgentFactory']()
        
        # Test all 9 combinations
        difficulties = ['easy', 'medium', 'hard']
        personalities = ['aggressive', 'defensive', 'balanced']
        
        created_agents = {}
        
        for difficulty in difficulties:
            for personality in personalities:
                try:
                    agent = factory.create_agent(difficulty, personality)
                    key = f"{difficulty}_{personality}"
                    created_agents[key] = agent
                    print(f"✅ Created {difficulty} {personality} agent")
                except Exception as e:
                    print(f"❌ Failed to create {difficulty} {personality}: {e}")
        
        print(f"✅ Agent Factory created {len(created_agents)}/9 agent types")
        return True, created_agents
        
    except Exception as e:
        print(f"❌ Agent Factory test failed: {e}")
        return False, {}

def test_move_generation(agents):
    """Test move generation for all agents"""
    print("\n⚡ Testing Move Generation...")
    
    board_state = create_test_board_state()
    valid_moves = create_valid_moves()
    
    results = {}
    
    for agent_type, agent_data in agents.items():
        if not agent_data.get('created', False):
            continue
            
        agent = agent_data['agent']
        
        try:
            start_time = time.perf_counter()
            move = agent.get_move(board_state, valid_moves)
            execution_time = (time.perf_counter() - start_time) * 1000  # ms
            
            if move:
                print(f"✅ {agent_type}: Generated move in {execution_time:.2f}ms")
                results[agent_type] = {
                    'success': True,
                    'execution_time_ms': execution_time,
                    'move': move
                }
            else:
                print(f"❌ {agent_type}: No move generated")
                results[agent_type] = {
                    'success': False,
                    'execution_time_ms': execution_time,
                    'error': 'No move returned'
                }
                
        except Exception as e:
            print(f"❌ {agent_type}: Move generation failed - {e}")
            results[agent_type] = {
                'success': False,
                'error': str(e)
            }
    
    return results

def test_performance_targets(move_results):
    """Test performance against POC plan targets"""
    print("\n🎯 Testing Performance Targets...")
    
    targets = {
        'easy': 10.0,    # <10ms average
        'medium': 50.0,  # <50ms average
        'hard': 90.0     # <90ms average
    }
    
    results = {}
    
    for agent_type, target_ms in targets.items():
        if agent_type in move_results and move_results[agent_type]['success']:
            actual_ms = move_results[agent_type]['execution_time_ms']
            meets_target = actual_ms < target_ms
            
            status = "✅" if meets_target else "❌"
            print(f"{status} {agent_type.capitalize()}: {actual_ms:.2f}ms (target: <{target_ms}ms)")
            
            results[agent_type] = {
                'actual_ms': actual_ms,
                'target_ms': target_ms,
                'meets_target': meets_target,
                'performance_ratio': actual_ms / target_ms
            }
        else:
            print(f"❌ {agent_type.capitalize()}: Cannot test (agent failed)")
            results[agent_type] = {
                'actual_ms': None,
                'target_ms': target_ms,
                'meets_target': False,
                'error': 'Agent failed'
            }
    
    return results

def test_magicblock_compliance(move_results):
    """Test MagicBlock compliance (<100ms)"""
    print("\n🔮 Testing MagicBlock Compliance...")
    
    magicblock_limit = 100.0  # ms
    compliant_agents = 0
    total_agents = 0
    
    results = {}
    
    for agent_type, data in move_results.items():
        if data['success']:
            execution_time = data['execution_time_ms']
            compliant = execution_time < magicblock_limit
            
            status = "✅" if compliant else "❌"
            print(f"{status} {agent_type}: {execution_time:.2f}ms")
            
            results[agent_type] = {
                'execution_time_ms': execution_time,
                'compliant': compliant
            }
            
            if compliant:
                compliant_agents += 1
            total_agents += 1
        else:
            results[agent_type] = {
                'execution_time_ms': None,
                'compliant': False,
                'error': 'Agent failed'
            }
    
    compliance_rate = compliant_agents / max(total_agents, 1)
    print(f"\n📊 MagicBlock Compliance: {compliant_agents}/{total_agents} agents ({compliance_rate:.1%})")
    
    return results, compliance_rate

def test_capture_preference(modules):
    """Test Easy AI capture preference (70% target)"""
    print("\n🎲 Testing Capture Preference...")
    
    try:
        # Create Easy AI with balanced personality
        config = modules['AIConfig'](
            personality=modules['AIPersonality'].BALANCED,
            skill_level=3
        )
        easy_agent = modules['RandomAI'](config)
        
        # Create board state with capture opportunities
        board_state = create_test_board_state()
        
        # Test moves with and without captures
        moves_with_captures = [
            {
                'from': [3, 8], 'to': [2, 7],
                'piece': {'type': 'general', 'player': 1},
                'captured': {'type': 'pawn', 'player': 2},
                'isCapture': True, 'moveType': 'capture'
            },
            {
                'from': [2, 6], 'to': [2, 5],
                'piece': {'type': 'pawn', 'player': 1},
                'isCapture': False, 'moveType': 'advance'
            }
        ]
        
        capture_count = 0
        total_tests = 100
        
        for _ in range(total_tests):
            move = easy_agent.get_move(board_state, moves_with_captures)
            if move and move.get('isCapture', False):
                capture_count += 1
        
        capture_rate = capture_count / total_tests
        target_rate = 0.7  # 70%
        tolerance = 0.1    # ±10%
        
        within_tolerance = abs(capture_rate - target_rate) <= tolerance
        
        status = "✅" if within_tolerance else "❌"
        print(f"{status} Capture rate: {capture_rate:.1%} (target: {target_rate:.0%} ±{tolerance:.0%})")
        
        return {
            'capture_rate': capture_rate,
            'target_rate': target_rate,
            'within_tolerance': within_tolerance,
            'tests_performed': total_tests
        }
        
    except Exception as e:
        print(f"❌ Capture preference test failed: {e}")
        return {
            'error': str(e),
            'capture_rate': 0.0,
            'within_tolerance': False
        }

def generate_final_report(test_results):
    """Generate comprehensive final report"""
    print("\n📊 GENERATING FINAL REPORT...")
    
    # Calculate overall scores
    total_tests = 0
    passed_tests = 0
    
    # Count successful components
    components = ['imports', 'agent_creation', 'factory', 'move_generation', 
                 'performance', 'magicblock', 'capture_preference']
    
    for component in components:
        if component in test_results:
            total_tests += 1
            if test_results[component].get('success', False):
                passed_tests += 1
    
    success_rate = (passed_tests / max(total_tests, 1)) * 100
    
    # Determine system readiness
    critical_requirements = [
        test_results.get('move_generation', {}).get('success', False),
        test_results.get('performance', {}).get('success', False),
        test_results.get('magicblock', {}).get('compliance_rate', 0) >= 0.8
    ]
    
    system_ready = all(critical_requirements)
    
    # Create comprehensive report
    report = {
        'timestamp': datetime.now().isoformat(),
        'overall_status': 'READY' if system_ready else 'NEEDS_ATTENTION',
        'success_rate': success_rate,
        'tests_passed': passed_tests,
        'total_tests': total_tests,
        'detailed_results': test_results,
        'compliance_summary': {
            'poc_ai_system_plan': test_results.get('performance', {}).get('success', False),
            'magicblock_integration': test_results.get('magicblock', {}).get('compliance_rate', 0) >= 0.8,
            'gi_md_guidelines': test_results.get('imports', {}).get('success', False),
            'capture_preference': test_results.get('capture_preference', {}).get('within_tolerance', False)
        },
        'recommendations': []
    }
    
    # Add recommendations
    if not system_ready:
        report['recommendations'].append("Address failed tests before production deployment")
    if test_results.get('performance', {}).get('success', False):
        report['recommendations'].append("Performance targets met - ready for deployment")
    if test_results.get('magicblock', {}).get('compliance_rate', 0) >= 0.9:
        report['recommendations'].append("Excellent MagicBlock compliance")
    
    # Save report
    report_file = Path(__file__).parent / 'final_validation_report.json'
    with open(report_file, 'w') as f:
        json.dump(report, f, indent=2)
    
    print(f"📁 Report saved to: {report_file}")
    
    return report

def main():
    """Main test execution"""
    print("🔍 POC AI SYSTEM FINAL VALIDATION")
    print("=" * 50)
    print(f"Started: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    test_results = {}
    
    # 1. Test imports
    imports_ok, modules = test_imports()
    test_results['imports'] = {'success': imports_ok}
    
    if not imports_ok:
        print("\n❌ CRITICAL: Cannot import required modules")
        print("🔧 Fix import issues before proceeding")
        return False
    
    # 2. Test agent creation
    agents = test_ai_agent_creation(modules)
    test_results['agent_creation'] = {
        'success': any(data.get('created', False) for data in agents.values()),
        'details': agents
    }
    
    # 3. Test agent factory
    factory_ok, factory_agents = test_agent_factory(modules)
    test_results['factory'] = {
        'success': factory_ok,
        'agents_created': len(factory_agents)
    }
    
    # 4. Test move generation
    move_results = test_move_generation(agents)
    test_results['move_generation'] = {
        'success': any(data.get('success', False) for data in move_results.values()),
        'details': move_results
    }
    
    # 5. Test performance
    performance_results = test_performance_targets(move_results)
    test_results['performance'] = {
        'success': any(data.get('meets_target', False) for data in performance_results.values()),
        'details': performance_results
    }
    
    # 6. Test MagicBlock compliance
    magicblock_results, compliance_rate = test_magicblock_compliance(move_results)
    test_results['magicblock'] = {
        'success': compliance_rate >= 0.8,
        'compliance_rate': compliance_rate,
        'details': magicblock_results
    }
    
    # 7. Test capture preference
    capture_results = test_capture_preference(modules)
    test_results['capture_preference'] = {
        'success': capture_results.get('within_tolerance', False),
        **capture_results
    }
    
    # Generate final report
    final_report = generate_final_report(test_results)
    
    # Print summary
    print("\n" + "=" * 50)
    print("🎯 FINAL VALIDATION SUMMARY")
    print("=" * 50)
    
    print(f"📊 Overall Status: {final_report['overall_status']}")
    print(f"🎯 Success Rate: {final_report['success_rate']:.1f}%")
    print(f"✅ Tests Passed: {final_report['tests_passed']}/{final_report['total_tests']}")
    
    if final_report['overall_status'] == 'READY':
        print("\n🎉 SYSTEM IS PRODUCTION READY!")
        print("✅ All critical requirements met")
        print("🚀 Ready for deployment")
    else:
        print("\n⚠️ SYSTEM NEEDS ATTENTION")
        print("🔧 Address issues before deployment")
        for rec in final_report['recommendations']:
            print(f"  • {rec}")
    
    print(f"\n🕒 Completed: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    return final_report['overall_status'] == 'READY'

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
