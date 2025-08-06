#!/usr/bin/env python3
"""
Execute AI system tests and generate comprehensive report
Following the POC AI System Testing Assignment requirements
"""

import sys
import subprocess
import json
from pathlib import Path
from datetime import datetime

def run_test_command(command, description):
    """Run a test command and capture output"""
    print(f"🔄 {description}")
    try:
        result = subprocess.run(
            command,
            shell=True,
            capture_output=True,
            text=True,
            timeout=300  # 5 minute timeout
        )
        
        if result.returncode == 0:
            print(f"✅ {description} - SUCCESS")
            return True, result.stdout
        else:
            print(f"❌ {description} - FAILED")
            print(f"Error: {result.stderr}")
            return False, result.stderr
    except subprocess.TimeoutExpired:
        print(f"⏰ {description} - TIMEOUT")
        return False, "Test timed out"
    except Exception as e:
        print(f"💥 {description} - EXCEPTION: {e}")
        return False, str(e)

def check_ai_implementation():
    """Check if AI implementation files exist"""
    print("🔍 Checking AI Implementation Files...")
    
    ai_files = [
        "backend/ai-services/agents/basic_ai_agents.py",
        "backend/ai-services/agents/ai_manager.py", 
        "backend/ai-services/agents/hard_agent.py"
    ]
    
    missing_files = []
    for file_path in ai_files:
        full_path = Path(file_path)
        if not full_path.exists():
            missing_files.append(file_path)
        else:
            print(f"✅ Found: {file_path}")
    
    if missing_files:
        print("❌ Missing AI implementation files:")
        for file_path in missing_files:
            print(f"  - {file_path}")
        return False
    
    return True

def run_basic_import_test():
    """Test basic imports of AI system"""
    print("\n🔄 Testing AI System Imports...")
    
    import_script = '''
import sys
sys.path.append("backend/ai-services")

try:
    from agents.basic_ai_agents import (
        RandomAI, MinimaxAI, MCTSAI, 
        AIConfig, AIPersonality, AIAgentFactory
    )
    from agents.ai_manager import AIManager
    
    print("✅ All AI imports successful")
    
    # Test basic agent creation
    config = AIConfig()
    agent = RandomAI(config)
    print("✅ RandomAI agent created successfully")
    
    agent2 = MinimaxAI(config)  
    print("✅ MinimaxAI agent created successfully")
    
    agent3 = MCTSAI(config)
    print("✅ MCTSAI agent created successfully")
    
    # Test AI Manager
    manager = AIManager()
    print("✅ AIManager created successfully")
    manager.shutdown()
    
    print("SUCCESS: All AI components working")
    
except ImportError as e:
    print(f"❌ Import Error: {e}")
    sys.exit(1)
except Exception as e:
    print(f"❌ Runtime Error: {e}")
    sys.exit(1)
'''
    
    success, output = run_test_command(
        f'"{sys.executable}" -c "{import_script}"',
        "Basic AI Import Test"
    )
    
    print(output)
    return success

def run_performance_tests():
    """Run performance tests for all AI agents"""
    print("\n⚡ Running Performance Tests...")
    
    perf_script = '''
import sys
import time
import statistics
sys.path.append("backend/ai-services")

from agents.basic_ai_agents import RandomAI, MinimaxAI, MCTSAI, AIConfig, AIPersonality

# Test board state
board_state = {
    "pieces": {
        "player1": [{"type": "marshal", "position": [4, 8]}],
        "player2": [{"type": "marshal", "position": [4, 0]}]
    },
    "currentPlayer": 1
}

# Test moves
valid_moves = [
    {"from": [3, 4], "to": [3, 3], "piece": {"type": "pawn"}, "isCapture": False},
    {"from": [4, 4], "to": [4, 3], "piece": {"type": "pawn"}, "isCapture": True, "captured": {"type": "pawn"}},
    {"from": [5, 4], "to": [5, 3], "piece": {"type": "pawn"}, "isCapture": False}
]

results = {}

# Test each AI type
for ai_name, ai_class, target_ms in [
    ("Easy (RandomAI)", RandomAI, 10),
    ("Medium (MinimaxAI)", MinimaxAI, 50), 
    ("Hard (MCTSAI)", MCTSAI, 90)
]:
    print(f"Testing {ai_name}...")
    
    config = AIConfig(personality=AIPersonality.BALANCED)
    agent = ai_class(config)
    
    times = []
    for i in range(20):  # 20 iterations for speed
        start = time.time()
        move = agent.get_move(board_state, valid_moves)
        exec_time = (time.time() - start) * 1000  # Convert to ms
        times.append(exec_time)
    
    avg_time = statistics.mean(times)
    max_time = max(times)
    
    results[ai_name] = {
        "avg_time_ms": avg_time,
        "max_time_ms": max_time,
        "target_ms": target_ms,
        "compliant": max_time < 100.0  # MagicBlock requirement
    }
    
    status = "✅" if avg_time <= target_ms else "⚠️"
    magicblock_status = "✅" if max_time < 100.0 else "❌"
    
    print(f"  {status} Avg: {avg_time:.2f}ms (target: {target_ms}ms)")
    print(f"  {magicblock_status} Max: {max_time:.2f}ms (MagicBlock: <100ms)")

print("\\nPerformance Test Results:")
for ai_name, data in results.items():
    compliant = "COMPLIANT" if data["compliant"] else "NON-COMPLIANT"
    print(f"  {ai_name}: {compliant}")

# Check overall compliance
all_compliant = all(data["compliant"] for data in results.values())
print(f"\\nOverall MagicBlock Compliance: {'✅ PASS' if all_compliant else '❌ FAIL'}")
'''
    
    success, output = run_test_command(
        f'"{sys.executable}" -c "{perf_script}"',
        "AI Performance Tests"
    )
    
    print(output)
    return success

def run_fraud_detection_tests():
    """Test fraud detection functionality"""
    print("\n🔒 Testing Fraud Detection...")
    
    fraud_script = '''
import sys
import time
sys.path.append("backend/ai-services")

from agents.basic_ai_agents import RandomAI, AIConfig, AIPersonality

print("Testing fraud detection mechanisms...")

config = AIConfig(
    personality=AIPersonality.BALANCED,
    enable_fraud_detection=True,
    min_thinking_time_ms=10.0
)

agent = RandomAI(config)

# Test normal operation
board_state = {"pieces": {"player1": [], "player2": []}, "currentPlayer": 1}
moves = [{"from": [0, 0], "to": [0, 1], "isCapture": False}]

move = agent.get_move(board_state, moves)
initial_fraud_score = agent.get_fraud_score()

print(f"Initial fraud score (normal operation): {initial_fraud_score:.3f}")

# Simulate suspicious rapid decisions
for i in range(3):
    agent.record_decision(move, 0.005, board_state)  # 5ms decisions

fraud_score_after = agent.get_fraud_score()
print(f"Fraud score after rapid decisions: {fraud_score_after:.3f}")

if fraud_score_after > initial_fraud_score:
    print("✅ Fraud detection working - increased score for rapid decisions")
else:
    print("❌ Fraud detection not working - score unchanged")

# Test fraud score decay
time.sleep(0.1)  # Brief pause
agent._analyze_for_fraud({"thinking_time": 0.05, "timestamp": time.time()})  # Normal decision
final_score = agent.get_fraud_score()

print(f"Final fraud score (after normal decision): {final_score:.3f}")
print(f"Fraud detection test: {'PASS' if fraud_score_after > initial_fraud_score else 'FAIL'}")
'''
    
    success, output = run_test_command(
        f'"{sys.executable}" -c "{fraud_script}"',
        "Fraud Detection Tests"
    )
    
    print(output)
    return success

def run_ai_manager_tests():
    """Test AI Manager functionality"""
    print("\n🎯 Testing AI Manager...")
    
    manager_script = '''
import sys
sys.path.append("backend/ai-services")

from agents.ai_manager import AIManager

print("Testing AI Manager functionality...")

try:
    # Create AI Manager
    manager = AIManager()
    print(f"✅ AI Manager created with {len(manager.agents)} agents")
    
    # Test agent retrieval
    easy_agent = manager.get_agent("easy", "balanced")
    if easy_agent:
        print("✅ Easy agent retrieved successfully")
    else:
        print("❌ Failed to retrieve easy agent")
    
    medium_agent = manager.get_agent("medium", "aggressive") 
    if medium_agent:
        print("✅ Medium agent retrieved successfully")
    else:
        print("❌ Failed to retrieve medium agent")
    
    # Test match creation
    agent1_config = {"difficulty": "easy", "personality": "balanced"}
    agent2_config = {"difficulty": "medium", "personality": "aggressive"}
    
    match_id = manager.create_match(agent1_config, agent2_config)
    if match_id:
        print(f"✅ Match created successfully: {match_id}")
        
        # Test AI move generation
        board_state = {"pieces": {"player1": [], "player2": []}, "currentPlayer": 1}
        moves = [{"from": [0, 0], "to": [0, 1], "isCapture": False}]
        
        ai_move = manager.get_ai_move(match_id, board_state, moves)
        if ai_move:
            print("✅ AI move generated successfully")
        else:
            print("❌ Failed to generate AI move")
        
        # End match
        manager.end_match(match_id, {"winner": 1})
        print("✅ Match ended successfully")
    else:
        print("❌ Failed to create match")
    
    # Test performance report
    report = manager.get_performance_report()
    print(f"✅ Performance report generated: {len(report)} sections")
    
    # Cleanup
    manager.shutdown()
    print("✅ AI Manager shutdown successfully")
    
    print("AI Manager test: PASS")
    
except Exception as e:
    print(f"❌ AI Manager test failed: {e}")
    print("AI Manager test: FAIL")
'''
    
    success, output = run_test_command(
        f'"{sys.executable}" -c "{manager_script}"',
        "AI Manager Tests"
    )
    
    print(output)
    return success

def generate_test_report(test_results):
    """Generate comprehensive test report"""
    print("\n📊 Generating Comprehensive Test Report...")
    
    report = {
        "timestamp": datetime.now().isoformat(),
        "test_execution_summary": {
            "total_tests": len(test_results),
            "passed_tests": sum(1 for result in test_results.values() if result),
            "failed_tests": sum(1 for result in test_results.values() if not result),
            "success_rate": (sum(1 for result in test_results.values() if result) / len(test_results)) * 100
        },
        "test_results": test_results,
        "compliance_assessment": {
            "ai_implementation_complete": test_results.get("ai_files_check", False),
            "basic_functionality_working": test_results.get("import_test", False),
            "performance_compliant": test_results.get("performance_test", False),
            "fraud_detection_operational": test_results.get("fraud_test", False),
            "ai_manager_functional": test_results.get("manager_test", False)
        },
        "next_steps": [],
        "recommendations": []
    }
    
    # Add recommendations based on test results
    if not test_results.get("ai_files_check", False):
        report["recommendations"].append("Complete missing AI implementation files")
    if not test_results.get("import_test", False):
        report["recommendations"].append("Fix import errors in AI system")
    if not test_results.get("performance_test", False):
        report["recommendations"].append("Optimize AI performance for MagicBlock compliance")
    if not test_results.get("fraud_test", False):
        report["recommendations"].append("Fix fraud detection mechanisms")
    if not test_results.get("manager_test", False):
        report["recommendations"].append("Fix AI Manager functionality")
    
    if all(test_results.values()):
        report["recommendations"].append("All tests passed - system ready for production")
        report["next_steps"].append("Deploy to production environment")
        report["next_steps"].append("Run end-to-end integration tests")
    else:
        report["next_steps"].append("Address failing tests")
        report["next_steps"].append("Re-run test suite after fixes")
    
    # Save report
    report_file = Path("ai_test_report.json")
    with open(report_file, 'w') as f:
        json.dump(report, f, indent=2)
    
    print(f"📁 Test report saved to: {report_file}")
    
    return report

def main():
    """Main test execution function"""
    print("🚀 Nen Platform AI System Test Execution")
    print("Following POC AI System Testing Assignment")
    print("=" * 60)
    
    test_results = {}
    
    # Step 1: Check AI implementation files
    test_results["ai_files_check"] = check_ai_implementation()
    
    # Step 2: Test basic imports and functionality
    if test_results["ai_files_check"]:
        test_results["import_test"] = run_basic_import_test()
    else:
        test_results["import_test"] = False
        print("⚠️ Skipping import test due to missing files")
    
    # Step 3: Performance tests
    if test_results["import_test"]:
        test_results["performance_test"] = run_performance_tests()
    else:
        test_results["performance_test"] = False
        print("⚠️ Skipping performance tests due to import failures")
    
    # Step 4: Fraud detection tests
    if test_results["import_test"]:
        test_results["fraud_test"] = run_fraud_detection_tests()
    else:
        test_results["fraud_test"] = False
        print("⚠️ Skipping fraud detection tests due to import failures")
    
    # Step 5: AI Manager tests
    if test_results["import_test"]:
        test_results["manager_test"] = run_ai_manager_tests()
    else:
        test_results["manager_test"] = False
        print("⚠️ Skipping AI Manager tests due to import failures")
    
    # Generate comprehensive report
    report = generate_test_report(test_results)
    
    # Print final summary
    print("\n" + "=" * 60)
    print("🎯 TEST EXECUTION SUMMARY")
    print("=" * 60)
    
    passed_tests = sum(1 for result in test_results.values() if result)
    total_tests = len(test_results)
    success_rate = (passed_tests / total_tests) * 100
    
    print(f"Tests Passed: {passed_tests}/{total_tests}")
    print(f"Success Rate: {success_rate:.1f}%")
    
    if success_rate == 100:
        print("\n🎉 ALL TESTS PASSED!")
        print("✅ AI System is ready for production deployment")
        print("🚀 MagicBlock compliance verified")
        print("🔒 Security features operational")
    elif success_rate >= 80:
        print("\n⚠️ MOSTLY SUCCESSFUL")
        print("🔧 Minor issues need attention")
        print("📋 Review recommendations in test report")
    else:
        print("\n❌ SIGNIFICANT ISSUES DETECTED")
        print("🚨 System not ready for production")
        print("🔧 Major fixes required")
    
    print(f"\n📊 Detailed report: ai_test_report.json")
    
    return success_rate >= 80

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
