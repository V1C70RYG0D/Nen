#!/usr/bin/env python3
"""
AI Service Test Script
Tests the AI service directly following GI guidelines
"""

import json
import requests
import sys
from datetime import datetime

class AIServiceTester:
    def __init__(self):
        self.base_url = "http://127.0.0.1:3003"
        self.results = {
            "summary": {
                "total": 0,
                "passed": 0,
                "failed": 0,
                "success_rate": 0,
                "timestamp": datetime.utcnow().isoformat()
            },
            "tests": []
        }

    def log_test(self, name, passed, details=""):
        self.results["summary"]["total"] += 1
        if passed:
            self.results["summary"]["passed"] += 1
            print(f"✅ PASS: {name}")
        else:
            self.results["summary"]["failed"] += 1
            print(f"❌ FAIL: {name}")
            if details:
                print(f"   Details: {details}")
        
        self.results["tests"].append({
            "name": name,
            "passed": passed,
            "details": details,
            "timestamp": datetime.utcnow().isoformat()
        })

    def test_health_endpoint(self):
        """Test AI service health endpoint"""
        try:
            response = requests.get(f"{self.base_url}/health", timeout=5)
            passed = response.status_code == 200 and response.json().get("status") == "healthy"
            self.log_test("AI Health Endpoint", passed, 
                         f"Status: {response.status_code}, Body: {response.json()}" if not passed else "")
        except Exception as e:
            self.log_test("AI Health Endpoint", False, str(e))

    def test_root_endpoint(self):
        """Test AI service root endpoint"""
        try:
            response = requests.get(f"{self.base_url}/", timeout=5)
            passed = response.status_code == 200 and "Nen Platform AI Service" in response.json().get("service", "")
            self.log_test("AI Root Endpoint", passed,
                         f"Status: {response.status_code}" if not passed else "")
        except Exception as e:
            self.log_test("AI Root Endpoint", False, str(e))

    def test_move_generation(self):
        """Test AI move generation"""
        try:
            board = [[[None for _ in range(3)] for _ in range(9)] for _ in range(9)]
            data = {
                "board": board,
                "difficulty": "medium"
            }
            
            response = requests.post(f"{self.base_url}/ai/move", 
                                   json=data, timeout=10)
            
            passed = (response.status_code == 200 and 
                     response.json().get("success") is True and
                     "move" in response.json())
            
            self.log_test("AI Move Generation", passed,
                         f"Status: {response.status_code}, Response: {response.json()}" if not passed else "")
        except Exception as e:
            self.log_test("AI Move Generation", False, str(e))

    def test_board_analysis(self):
        """Test AI board analysis"""
        try:
            board = [[[None for _ in range(3)] for _ in range(9)] for _ in range(9)]
            data = {"board": board}
            
            response = requests.post(f"{self.base_url}/ai/analysis", 
                                   json=data, timeout=10)
            
            passed = (response.status_code == 200 and 
                     response.json().get("success") is True and
                     "analysis" in response.json())
            
            self.log_test("AI Board Analysis", passed,
                         f"Status: {response.status_code}" if not passed else "")
        except Exception as e:
            self.log_test("AI Board Analysis", False, str(e))

    def test_difficulty_setting(self):
        """Test AI difficulty setting"""
        try:
            data = {"difficulty": "hard"}
            
            response = requests.post(f"{self.base_url}/ai/difficulty", 
                                   json=data, timeout=5)
            
            passed = (response.status_code == 200 and 
                     response.json().get("success") is True and
                     response.json().get("difficulty") == "hard")
            
            self.log_test("AI Difficulty Setting", passed,
                         f"Status: {response.status_code}" if not passed else "")
        except Exception as e:
            self.log_test("AI Difficulty Setting", False, str(e))

    def test_error_handling(self):
        """Test AI service error handling"""
        try:
            # Test invalid move request
            response = requests.post(f"{self.base_url}/ai/move", 
                                   json={"invalid": "data"}, timeout=5)
            
            passed = response.status_code == 400 and "error" in response.json()
            self.log_test("AI Error Handling", passed,
                         f"Status: {response.status_code}" if not passed else "")
        except Exception as e:
            self.log_test("AI Error Handling", False, str(e))

    def generate_report(self):
        """Generate test report"""
        total = self.results["summary"]["total"]
        passed = self.results["summary"]["passed"]
        
        if total > 0:
            self.results["summary"]["success_rate"] = (passed / total) * 100
        
        print("\n" + "="*60)
        print("📊 AI SERVICE TEST RESULTS")
        print("="*60)
        print(f"Total Tests: {total}")
        print(f"✅ Passed: {passed}")
        print(f"❌ Failed: {self.results['summary']['failed']}")
        print(f"📈 Success Rate: {self.results['summary']['success_rate']:.1f}%")
        print(f"🕐 Completed: {self.results['summary']['timestamp']}")
        
        # Save report
        with open('ai-test-results.json', 'w') as f:
            json.dump(self.results, f, indent=2)
        
        print("📄 Report saved to: ai-test-results.json")
        
        return self.results["summary"]["success_rate"] >= 80

    def run_all_tests(self):
        """Run all AI service tests"""
        print("🤖 AI SERVICE TESTER - GI COMPLIANT")
        print("===================================")
        print("Testing AI service endpoints and functionality")
        print("Following GI guidelines for comprehensive testing")
        print("===================================")
        
        self.test_health_endpoint()
        self.test_root_endpoint()
        self.test_move_generation()
        self.test_board_analysis()
        self.test_difficulty_setting()
        self.test_error_handling()
        
        return self.generate_report()

if __name__ == "__main__":
    tester = AIServiceTester()
    
    try:
        success = tester.run_all_tests()
        sys.exit(0 if success else 1)
    except Exception as e:
        print(f"💥 AI testing failed: {e}")
        sys.exit(1)
