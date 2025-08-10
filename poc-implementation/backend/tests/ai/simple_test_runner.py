#!/usr/bin/env python3
"""
Simple Hard Agent Test Runner
Quick validation of Hard Agent implementation
"""

def main():
    print("🔸 Hard Agent Test Runner")
    print("=" * 40)

    try:
        # Test imports
        print("1. Testing imports...")
        from test_hard_agent import HardAgent, TestHardAgent, MockNeuralNetwork
        print("   ✅ All imports successful")

        # Test agent creation
        print("2. Testing agent creation...")
        agent = HardAgent("models/hard_balanced.pt", "balanced")
        print("   ✅ HardAgent created successfully")

        # Test basic move generation
        print("3. Testing move generation...")
        basic_state = {
            'board': [[[None] * 3 for _ in range(9)] for _ in range(9)],
            'currentPlayer': 1,
            'gamePhase': 'midgame',
            'moveCount': 25
        }

        import time
        start_time = time.time()
        move = agent.select_move(basic_state)
        execution_time = (time.time() - start_time) * 1000

        print(f"   ✅ Move generated in {execution_time:.2f}ms")
        print(f"   ✅ Move result: {bool(move)}")

        # Test neural network
        print("4. Testing neural network...")
        evaluation = agent._get_nn_evaluation(basic_state)
        print(f"   ✅ NN evaluation: {evaluation:.3f}")

        # Test performance metrics
        print("5. Testing performance metrics...")
        metrics = agent.get_performance_metrics()
        print(f"   ✅ Metrics available: {len(metrics)} fields")

        print("\n🎉 All tests passed! Hard Agent implementation is working.")
        return True

    except Exception as e:
        print(f"\n❌ Test failed: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)
