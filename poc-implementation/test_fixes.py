#!/usr/bin/env python3
"""
Quick test to verify the fixes for capture preference and personality differentiation
"""

import sys
import random
from pathlib import Path

# Add AI services to path
ai_services_path = str(Path(__file__).parent / "backend/ai-services")
sys.path.insert(0, ai_services_path)

try:
    from agents.basic_ai_agents import RandomAI, AIConfig, AIPersonality, AIAgentFactory
except ImportError:
    print(f"Could not import from {ai_services_path}")
    print(f"Current working directory: {Path.cwd()}")
    print(f"Trying relative import...")
    
    # Try to find the correct path
    current_dir = Path(__file__).parent
    for backend_path in [
        current_dir / "backend/ai-services",
        current_dir.parent / "backend/ai-services", 
        current_dir / "../backend/ai-services"
    ]:
        if backend_path.exists():
            sys.path.insert(0, str(backend_path))
            print(f"Found backend at: {backend_path}")
            break
    
    from agents.basic_ai_agents import RandomAI, AIConfig, AIPersonality, AIAgentFactory

def test_capture_preference_fix():
    """Test that capture preference is closer to 70%"""
    print("🧪 Testing Capture Preference Fix...")
    
    config = AIConfig(personality=AIPersonality.BALANCED)
    agent = RandomAI(config)
    
    # Create test moves with 50/50 capture/non-capture ratio
    captures = [{'from': [i, 4], 'to': [i, 3], 'isCapture': True} for i in range(5)]
    non_captures = [{'from': [i, 5], 'to': [i, 4], 'isCapture': False} for i in range(5)]
    all_moves = captures + non_captures
    
    board_state = {'pieces': {'player1': [], 'player2': []}, 'currentPlayer': 1}
    
    # Test 100 moves
    capture_count = 0
    for _ in range(100):
        move = agent.get_move(board_state, all_moves)
        if move and move.get('isCapture', False):
            capture_count += 1
    
    capture_rate = capture_count / 100
    target_rate = 0.7
    tolerance = 0.1
    
    within_tolerance = abs(capture_rate - target_rate) <= tolerance
    
    print(f"  📊 Capture rate: {capture_rate:.1%}")
    print(f"  🎯 Target: {target_rate:.1%} ± {tolerance:.1%}")
    print(f"  {'✅' if within_tolerance else '❌'} Within tolerance: {within_tolerance}")
    
    return within_tolerance

def test_personality_differentiation_fix():
    """Test that personalities have different aggression levels"""
    print("\n🎭 Testing Personality Differentiation Fix...")
    
    personalities = ['aggressive', 'defensive', 'balanced']
    personality_data = {}
    
    for personality in personalities:
        config = AIAgentFactory.create_personality_config(personality, skill_level=5)
        agent = RandomAI(config)
        
        traits = agent.get_personality_traits()
        aggression = traits['aggression']
        
        personality_data[personality] = {
            'aggression': aggression,
            'traits': traits
        }
        
        print(f"  {personality.capitalize()}: aggression={aggression:.2f}")
    
    # Check differentiation
    agg_aggression = personality_data['aggressive']['aggression']
    def_aggression = personality_data['defensive']['aggression'] 
    bal_aggression = personality_data['balanced']['aggression']
    
    # Aggressive should be higher than defensive
    differentiation_ok = agg_aggression > def_aggression + 0.3  # At least 30% difference
    balanced_ok = def_aggression < bal_aggression < agg_aggression
    
    print(f"  📈 Aggression levels:")
    print(f"    Aggressive: {agg_aggression:.2f}")
    print(f"    Balanced: {bal_aggression:.2f}")
    print(f"    Defensive: {def_aggression:.2f}")
    print(f"  📊 Difference (Agg-Def): {agg_aggression - def_aggression:.2f}")
    print(f"  {'✅' if differentiation_ok else '❌'} Sufficient differentiation: {differentiation_ok}")
    print(f"  {'✅' if balanced_ok else '❌'} Balanced properly positioned: {balanced_ok}")
    
    return differentiation_ok and balanced_ok

def main():
    """Main test execution"""
    print("🔧 QUICK FIXES VALIDATION")
    print("=" * 40)
    
    # Test fixes
    capture_fixed = test_capture_preference_fix()
    personality_fixed = test_personality_differentiation_fix()
    
    # Summary
    print(f"\n📊 FIXES SUMMARY")
    print("=" * 20)
    print(f"Capture Preference Fixed: {'✅' if capture_fixed else '❌'}")
    print(f"Personality Differentiation Fixed: {'✅' if personality_fixed else '❌'}")
    
    all_fixed = capture_fixed and personality_fixed
    print(f"\nOverall Status: {'✅ ALL FIXES SUCCESSFUL' if all_fixed else '❌ SOME FIXES NEEDED'}")
    
    if all_fixed:
        print("🎉 Ready to re-run comprehensive validation!")
    else:
        print("🔧 Additional fixes needed before validation")
    
    return all_fixed

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
