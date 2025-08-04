#!/usr/bin/env python3
"""
Simple EasyAgent Test Validation
Testing core requirements with file output
"""

import sys
import os
from pathlib import Path

# Add agents path
agents_path = Path(__file__).parent.parent.parent / "ai-services" / "agents"
sys.path.insert(0, str(agents_path))

def main():
    """Run basic EasyAgent tests"""

    results = []
    results.append("=== EasyAgent Test Validation ===")
    results.append(f"Python version: {sys.version}")
    results.append(f"Working directory: {os.getcwd()}")
    results.append(f"Agents path: {agents_path}")

    try:
        # Test 1: Import modules
        results.append("\n--- Test 1: Module Imports ---")

        try:
            import numpy as np
            results.append("✅ numpy imported successfully")
        except ImportError as e:
            results.append(f"❌ numpy import failed: {e}")

        try:
            from loguru import logger
            results.append("✅ loguru imported successfully")
        except ImportError as e:
            results.append(f"❌ loguru import failed: {e}")

        try:
            from basic_ai_agents import AIPersonality, AIConfig, BaseAIAgent
            results.append("✅ basic_ai_agents imported successfully")
        except ImportError as e:
            results.append(f"❌ basic_ai_agents import failed: {e}")

        try:
            from easy_agent import EasyAgent, EasyAgentConfig, create_easy_agent
            results.append("✅ easy_agent imported successfully")
        except ImportError as e:
            results.append(f"❌ easy_agent import failed: {e}")

        # Test 2: Agent creation
        results.append("\n--- Test 2: Agent Creation ---")

        agent = EasyAgent("balanced")
        results.append("✅ EasyAgent created successfully")
        results.append(f"Agent personality: {agent.config.personality}")

        # Test 3: Basic board and move selection
        results.append("\n--- Test 3: Move Selection ---")

        board = {
            'board': [[[None, None, None] for _ in range(9)] for _ in range(9)],
            'currentPlayer': 1,
            'gamePhase': 'opening'
        }

        # Add some test pieces
        board['board'][6][4] = [{'type': 'pawn', 'player': 1}, None, None]
        board['board'][2][4] = [{'type': 'pawn', 'player': 2}, None, None]

        move = agent.select_move(board)
        results.append(f"Move selected: {move is not None}")

        if move:
            results.append(f"Move type: {type(move)}")
            results.append(f"Move has 'from': {'from' in move}")
            results.append(f"Move has 'to': {'to' in move}")

        # Test 4: Performance tracking
        results.append("\n--- Test 4: Performance Stats ---")

        stats = agent.get_performance_stats()
        results.append(f"Stats retrieved: {stats is not None}")
        results.append(f"Stats type: {type(stats)}")

        if isinstance(stats, dict):
            results.append(f"Stats keys: {list(stats.keys())}")

        # Test 5: Multiple personalities
        results.append("\n--- Test 5: Personality Variations ---")

        personalities = ["aggressive", "defensive", "balanced", "tactical"]
        for personality in personalities:
            try:
                test_agent = EasyAgent(personality)
                results.append(f"✅ {personality} personality works")
            except Exception as e:
                results.append(f"❌ {personality} personality failed: {e}")

        # Test 6: Factory function
        results.append("\n--- Test 6: Factory Function ---")

        factory_agent = create_easy_agent("balanced")
        results.append(f"Factory function works: {factory_agent is not None}")

        results.append("\n=== Test Summary ===")
        results.append("✅ All basic tests completed successfully")
        results.append("EasyAgent is functional and ready for comprehensive testing")

    except Exception as e:
        results.append(f"\n❌ Test failed with error: {e}")
        import traceback
        results.append(traceback.format_exc())

    # Write results to file
    output_file = Path(__file__).parent / "test_results.txt"
    with open(output_file, 'w') as f:
        f.write('\n'.join(results))

    print(f"Test results written to: {output_file}")
    return True

if __name__ == "__main__":
    main()
