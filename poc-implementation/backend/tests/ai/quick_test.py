#!/usr/bin/env python3
"""
Quick test without logging
"""

# Test just the basic functionality
print("Starting test...")

try:
    # Simple math test
    result = 2 + 2
    print(f"Math test: {result}")

    # Time test
    import time
    start = time.time()
    time.sleep(0.001)
    elapsed = time.time() - start
    print(f"Time test: {elapsed*1000:.2f}ms")

    print("Basic tests completed successfully")

except Exception as e:
    print(f"Error: {e}")
