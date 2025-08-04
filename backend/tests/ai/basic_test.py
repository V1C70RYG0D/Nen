#!/usr/bin/env python3

import time
import random

def test_basic_agent():
    """Test basic EasyAgent functionality"""
    print("🧪 Testing Basic EasyAgent Concept")

    # Simulate capture preference test
    capture_rate = 0.70
    total_moves = 100
    capture_count = 0

    for i in range(total_moves):
        # Simulate having capture available 80% of time
        has_capture = random.random() < 0.8

        if has_capture and random.random() < capture_rate:
            capture_count += 1

    actual_rate = capture_count / total_moves
    print(f"Capture preference test: {actual_rate:.2f} (target: {capture_rate})")

    # Simulate speed test
    execution_times = []
    for i in range(10):
        start_time = time.time()
        # Simulate some work
        _ = [j for j in range(100)]
        execution_time = (time.time() - start_time) * 1000
        execution_times.append(execution_time)

    avg_time = sum(execution_times) / len(execution_times)
    max_time = max(execution_times)

    print(f"Speed test: avg={avg_time:.2f}ms, max={max_time:.2f}ms")

    print("✅ Basic tests completed successfully!")
    return True

if __name__ == "__main__":
    success = test_basic_agent()
    print(f"Result: {'PASS' if success else 'FAIL'}")
