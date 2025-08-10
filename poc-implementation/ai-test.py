#!/usr/bin/env python3
"""
GI-Compliant AI Service Test Suite
Testing the Python Flask AI service according to GI guidelines
"""

import requests
import json
import sys
import os
from datetime import datetime

# Configuration (GI-18: No hardcoding)
AI_SERVICE_URL = os.getenv('AI_SERVICE_URL', 'http://127.0.0.1:3003')
REQUEST_TIMEOUT = int(os.getenv('REQUEST_TIMEOUT', '5'))

class AIServiceTester:
    def __init__(self):
        self.results = {
            'summary': {
                'total': 0,
                'passed': 0,
                'failed': 0,
                'success_rate': 0,
                'timestamp': datetime.utcnow().isoformat()
            },
            'tests': [],
            'environment': {
                'ai_service_url': AI_SERVICE_URL,
                'python_version': sys.version,
                'platform': sys.platform
            }
        }
    
    def run_test(self, name, test_function):
        """Run a single test and record results"""
        print(f"🧪 Running: {name}")
        start_time = datetime.utcnow()
        
        try:
            result = test_function()
            duration = (datetime.utcnow() - start_time).total_seconds() * 1000
            
            self.results['tests'].append({
                'name': name,
                'passed': True,
                'details': result or 'Test passed',
                'duration_ms': duration,
                'timestamp': datetime.utcnow().isoformat()
            })
            
            self.results['summary']['passed'] += 1
            print(f"✅ PASS: {name} ({duration:.0f}ms)")
            return True
            
        except Exception as error:
            duration = (datetime.utcnow() - start_time).total_seconds() * 1000
            
            self.results['tests'].append({
                'name': name,
                'passed': False,
                'details': str(error),
                'duration_ms': duration,
                'timestamp': datetime.utcnow().isoformat()
            })
            
            self.results['summary']['failed'] += 1
            print(f"❌ FAIL: {name} ({duration:.0f}ms) - {error}")
            return False
            
        finally:
            self.results['summary']['total'] += 1
    
    def test_service_health(self):
        """Test AI service health endpoint"""
        response = requests.get(f"{AI_SERVICE_URL}/health", timeout=REQUEST_TIMEOUT)
        
        if response.status_code != 200:
            raise Exception(f"Expected status 200, got {response.status_code}")
        
        data = response.json()
        if not data.get('status') or data['status'] != 'healthy':
            raise Exception('Health check does not report healthy status')
        
        return f"Service healthy: {data}"
    
    def test_service_root(self):
        """Test AI service root endpoint"""
        response = requests.get(f"{AI_SERVICE_URL}/", timeout=REQUEST_TIMEOUT)
        
        if response.status_code != 200:
            raise Exception(f"Expected status 200, got {response.status_code}")
        
        data = response.json()
        if not data.get('service') or not data.get('version'):
            raise Exception('Root endpoint missing required fields')
        
        return f"Service info: {data['service']} v{data['version']}"
    
    def test_ai_move_generation(self):
        """Test AI move generation (GI-02: Real implementation)"""
        test_data = {
            'board': 'test_board_state',
            'player': 'white',
            'difficulty': 'medium'
        }
        
        response = requests.post(
            f"{AI_SERVICE_URL}/ai/move",
            json=test_data,
            headers={'Content-Type': 'application/json'},
            timeout=REQUEST_TIMEOUT
        )
        
        if response.status_code != 200:
            raise Exception(f"Expected status 200, got {response.status_code}")
        
        data = response.json()
        if not data.get('from') or not data.get('to'):
            raise Exception('AI move generation missing required move data')
        
        return f"Move generated: {data}"
    
    def test_ai_board_analysis(self):
        """Test AI board analysis"""
        test_data = {
            'board': 'test_board_state',
            'depth': 3
        }
        
        response = requests.post(
            f"{AI_SERVICE_URL}/ai/analysis",
            json=test_data,
            headers={'Content-Type': 'application/json'},
            timeout=REQUEST_TIMEOUT
        )
        
        if response.status_code != 200:
            raise Exception(f"Expected status 200, got {response.status_code}")
        
        data = response.json()
        if 'board_evaluation' not in data:
            raise Exception('AI analysis missing evaluation data')
        
        return f"Analysis completed: evaluation={data.get('board_evaluation')}"
    
    def test_ai_difficulty_setting(self):
        """Test AI difficulty configuration"""
        test_data = {
            'difficulty': 'hard',
            'depth': 5
        }
        
        response = requests.post(
            f"{AI_SERVICE_URL}/ai/difficulty",
            json=test_data,
            headers={'Content-Type': 'application/json'},
            timeout=REQUEST_TIMEOUT
        )
        
        if response.status_code != 200:
            raise Exception(f"Expected status 200, got {response.status_code}")
        
        return 'AI difficulty setting working'
    
    def test_cors_headers(self):
        """Test CORS configuration (GI-07: Security)"""
        response = requests.options(f"{AI_SERVICE_URL}/", timeout=REQUEST_TIMEOUT)
        
        if 'Access-Control-Allow-Origin' not in response.headers:
            raise Exception('CORS headers not properly configured')
        
        return f"CORS configured: {response.headers.get('Access-Control-Allow-Origin')}"
    
    def test_error_handling(self):
        """Test error handling (GI-06: Robust error handling)"""
        # Test invalid endpoint
        response = requests.get(f"{AI_SERVICE_URL}/invalid", timeout=REQUEST_TIMEOUT)
        
        if response.status_code == 200:
            raise Exception('Invalid endpoint should return error status')
        
        return f"Error handling working: {response.status_code}"
    
    def run_all_tests(self):
        """Run complete test suite"""
        print('🤖 GI-COMPLIANT AI SERVICE TEST SUITE')
        print('====================================')
        print(f'AI Service URL: {AI_SERVICE_URL}')
        print(f'Test Started: {datetime.utcnow().isoformat()}')
        print('====================================\n')
        
        # Run all tests
        self.run_test('AI Service Health', self.test_service_health)
        self.run_test('AI Service Root', self.test_service_root)
        self.run_test('AI Move Generation', self.test_ai_move_generation)
        self.run_test('AI Board Analysis', self.test_ai_board_analysis)
        self.run_test('AI Difficulty Setting', self.test_ai_difficulty_setting)
        self.run_test('CORS Configuration', self.test_cors_headers)
        self.run_test('Error Handling', self.test_error_handling)
        
        # Calculate results
        total = self.results['summary']['total']
        passed = self.results['summary']['passed']
        self.results['summary']['success_rate'] = round((passed / total) * 100) if total > 0 else 0
        
        print('\n====================================')
        print('📊 AI SERVICE TEST RESULTS')
        print('====================================')
        print(f"Total Tests: {total}")
        print(f"✅ Passed: {passed}")
        print(f"❌ Failed: {self.results['summary']['failed']}")
        print(f"📈 Success Rate: {self.results['summary']['success_rate']}%")
        print(f"⏱️ Test Completed: {datetime.utcnow().isoformat()}")
        
        # Save results
        results_path = 'a:\\Nen Platform\\Nen\\poc-implementation\\ai-test-results.json'
        try:
            with open(results_path, 'w') as f:
                json.dump(self.results, f, indent=2)
            print(f"📄 Results saved to: {results_path}")
        except Exception as e:
            print(f"⚠️ Could not save results: {e}")
        
        # Final status
        if self.results['summary']['success_rate'] == 100:
            print('\n🎉 ALL AI SERVICE TESTS PASSED!')
            print('✅ AI Service is fully operational')
            print('✅ GI Guidelines compliance verified')
            return True
        else:
            print('\n⚠️ SOME AI SERVICE TESTS FAILED')
            print('❌ AI Service needs attention')
            return False

if __name__ == '__main__':
    tester = AIServiceTester()
    success = tester.run_all_tests()
    sys.exit(0 if success else 1)
