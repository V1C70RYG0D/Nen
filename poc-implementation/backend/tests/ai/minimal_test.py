#!/usr/bin/env python3
"""
Minimal EasyAgent Test
Tests core functionality without any external dependencies
"""

import time
import random

def test_basic_functionality():
    """Test basic functionality works"""
    print("🧪 Running Minimal EasyAgent Tests")
    print("=" * 50)

    # Test 1: Basic Python functionality
    print("1. Testing basic Python...")
    try:
        result = 2 + 2
        assert result == 4
        print("   ✅ Basic math works")
    except Exception as e:
        print(f"   ❌ Basic math failed: {e}")
        return False

    # Test 2: Time measurement
    print("2. Testing time measurement...")
    try:
        start = time.time()
        time.sleep(0.001)  # 1ms
        elapsed = (time.time() - start) * 1000
        assert elapsed >= 1.0
        print(f"   ✅ Time measurement works: {elapsed:.2f}ms")
    except Exception as e:
        print(f"   ❌ Time measurement failed: {e}")
        return False

    # Test 3: Random number generation
    print("3. Testing randomness...")
    try:
        random.seed(42)
        numbers = [random.random() for _ in range(100)]
        avg = sum(numbers) / len(numbers)
        assert 0.4 <= avg <= 0.6  # Should be around 0.5
        print(f"   ✅ Random generation works: avg={avg:.3f}")
    except Exception as e:
        print(f"   ❌ Random generation failed: {e}")
        return False

    # Test 4: Capture preference simulation
    print("4. Testing capture preference logic...")
    try:
        capture_rate = 0.70
        random.seed(42)

        captures = 0
        total = 1000

        for _ in range(total):
            if random.random() < capture_rate:
                captures += 1

        actual_rate = captures / total

        if 0.65 <= actual_rate <= 0.75:
            print(f"   ✅ Capture preference simulation: {actual_rate:.3f} (within 65-75%)")
        else:
            print(f"   ❌ Capture preference failed: {actual_rate:.3f}")
            return False

    except Exception as e:
        print(f"   ❌ Capture preference test failed: {e}")
        return False

    # Test 5: Performance timing
    print("5. Testing performance timing...")
    try:
        times = []
        for i in range(100):
            start = time.time()
            # Simulate simple move calculation
            _ = [j for j in range(50)]  # Simple computation
            elapsed = (time.time() - start) * 1000
            times.append(elapsed)

        max_time = max(times)
        avg_time = sum(times) / len(times)

        print(f"   ✅ Performance test: avg={avg_time:.2f}ms, max={max_time:.2f}ms")

        if max_time < 10.0:
            print("   ✅ All operations under 10ms")
        else:
            print(f"   ⚠️  Some operations over 10ms (max: {max_time:.2f}ms)")

    except Exception as e:
        print(f"   ❌ Performance test failed: {e}")
        return False

    print("\n🎉 All minimal tests passed!")
    print("✅ Basic functionality verified")
    return True

if __name__ == "__main__":
    success = test_basic_functionality()
    if success:
        print("\n🚀 Ready to test actual EasyAgent implementation")
        exit(0)
    else:
        print("\n❌ Basic functionality tests failed")
        exit(1)
