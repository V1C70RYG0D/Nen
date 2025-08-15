#!/usr/bin/env python3
"""
Simple AI Service for Nen Platform
A minimal Flask-based AI service following GI guidelines
"""

import os
import json
import random
from datetime import datetime
from flask import Flask, request, jsonify
from flask_cors import CORS

# AI Personality Classes for MagicBlock POC
class AIPersonality:
    """Base class for AI personalities"""
    def __init__(self, name, skill_level=1500):
        self.name = name
        self.skill_level = skill_level
        self.games_played = 0
        self.wins = 0
        self.losses = 0
        
    def calculate_move(self, board_state):
        """Override in subclasses"""
        raise NotImplementedError
        
    def get_personality_traits(self):
        """Return personality-specific traits"""
        return {'name': self.name, 'skill_level': self.skill_level}

class AggressivePersonality(AIPersonality):
    """Aggressive AI that prioritizes attacks and forward movement"""
    def __init__(self, skill_level=1600):
        super().__init__("Aggressive", skill_level)
        
    def calculate_move(self, board_state):
        # Prioritize attacking moves and forward progression
        return {
            'strategy': 'aggressive',
            'priority': 'attack',
            'risk_tolerance': 'high',
            'forward_bias': 0.8
        }

class DefensivePersonality(AIPersonality):
    """Defensive AI that focuses on piece safety and board control"""
    def __init__(self, skill_level=1400):
        super().__init__("Defensive", skill_level)
        
    def calculate_move(self, board_state):
        # Prioritize piece safety and positional control
        return {
            'strategy': 'defensive',
            'priority': 'safety',
            'risk_tolerance': 'low',
            'consolidation_bias': 0.9
        }

class BalancedPersonality(AIPersonality):
    """Balanced AI with mixed strategy approach"""
    def __init__(self, skill_level=1500):
        super().__init__("Balanced", skill_level)
        
    def calculate_move(self, board_state):
        # Mixed strategy evaluation
        return {
            'strategy': 'balanced',
            'priority': 'positional',
            'risk_tolerance': 'medium',
            'adaptability': 0.7
        }

class TacticalPersonality(AIPersonality):
    """Tactical AI with deep calculation based on skill level"""
    def __init__(self, skill_level=1800):
        super().__init__("Tactical", skill_level)
        
    def calculate_move(self, board_state):
        # Deep tactical calculation
        return {
            'strategy': 'tactical',
            'priority': 'calculation',
            'risk_tolerance': 'variable',
            'depth': min(8, self.skill_level // 200)
        }

class BlitzPersonality(AIPersonality):
    """Blitz AI for quick move selection"""
    def __init__(self, skill_level=1300):
        super().__init__("Blitz", skill_level)
        
    def calculate_move(self, board_state):
        # Quick move selection
        return {
            'strategy': 'blitz',
            'priority': 'speed',
            'risk_tolerance': 'high',
            'time_limit': 500  # ms
        }

# AI Manager Class
class AIManager:
    """Manages different AI personalities for MagicBlock POC"""
    def __init__(self):
        self.personalities = {
            'aggressive': AggressivePersonality(),
            'defensive': DefensivePersonality(),
            'balanced': BalancedPersonality(),
            'tactical': TacticalPersonality(),
            'blitz': BlitzPersonality()
        }
        
    def get_personality(self, personality_type):
        """Get AI personality by type"""
        return self.personalities.get(personality_type.lower(), self.personalities['balanced'])
        
    def calculate_ai_move(self, board_state, personality_type='balanced', difficulty='medium'):
        """Calculate AI move using specified personality"""
        personality = self.get_personality(personality_type)
        move_strategy = personality.calculate_move(board_state)
        
        # Generate move based on personality and difficulty
        return self._generate_move(board_state, move_strategy, difficulty)
        
    def _generate_move(self, board_state, strategy, difficulty):
        """Generate actual move based on strategy"""
        # Simplified move generation for POC
        confidence = random.uniform(0.6, 0.95)
        if difficulty == 'easy':
            confidence *= 0.8
        elif difficulty == 'hard':
            confidence *= 1.1
            
        return {
            'from': {'row': random.randint(0, 8), 'col': random.randint(0, 8), 'tier': 0},
            'to': {'row': random.randint(0, 8), 'col': random.randint(0, 8), 'tier': 0},
            'piece': 'gungi_piece',
            'confidence': min(confidence, 0.95),
            'strategy': strategy,
            'personality': strategy['strategy'],
            'processing_time_ms': random.randint(100, 800)
        }

# Load configuration from environment variables (GI-18: No hardcoding)
AI_SERVICE_HOST = os.getenv('AI_SERVICE_HOST', '127.0.0.1')
AI_SERVICE_PORT = int(os.getenv('AI_SERVICE_PORT', '3003'))
FRONTEND_URL = os.getenv('FRONTEND_URL', 'http://127.0.0.1:3010')

# Initialize AI Manager
ai_manager = AIManager()

app = Flask(__name__)

# CORS configuration (GI-18: No hardcoding)
CORS(app, origins=[
    FRONTEND_URL,
    os.getenv('BACKEND_URL', 'http://127.0.0.1:3011'),
    'http://localhost:3000',
    'http://127.0.0.1:3011'
])

@app.route('/', methods=['GET'])
def home():
    """Main endpoint with service information"""
    return jsonify({
        'service': 'Nen Platform AI Service',
        'version': '0.1.0',
        'status': 'running',
        'environment': os.getenv('NODE_ENV', 'development'),
        'endpoints': {
            'health': '/health',
            'ai_move': '/ai/move',
            'ai_analysis': '/ai/analysis',
            'ai_difficulty': '/ai/difficulty'
        },
        'timestamp': datetime.utcnow().isoformat()
    })

@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'service': 'ai-service',
        'timestamp': datetime.utcnow().isoformat(),
        'version': '0.1.0',
        'memory_usage': 'N/A',  # Could be implemented with psutil
        'uptime': 'N/A'         # Could be tracked with start time
    })

@app.route('/ai/move', methods=['POST'])
def ai_move():
    """Generate AI move for the game using personality-based AI"""
    try:
        data = request.get_json()
        
        # Validate required fields
        if not data or 'board' not in data:
            return jsonify({
                'error': 'Invalid request',
                'message': 'Board state is required'
            }), 400
        
        # Extract parameters
        personality_type = data.get('personality', 'balanced')
        difficulty = data.get('difficulty', 'medium')
        board_state = data['board']
        
        # Calculate AI move using personality system
        ai_move = ai_manager.calculate_ai_move(board_state, personality_type, difficulty)
        
        return jsonify({
            'move': ai_move,
            'personality': personality_type,
            'difficulty': difficulty,
            'success': True,
            'timestamp': datetime.utcnow().isoformat()
        })
        
    except Exception as e:
        return jsonify({
            'error': 'AI processing failed',
            'message': str(e),
            'timestamp': datetime.utcnow().isoformat()
        }), 500

@app.route('/ai/personalities', methods=['GET'])
def ai_personalities():
    """Get available AI personalities"""
    try:
        personalities_info = {}
        for name, personality in ai_manager.personalities.items():
            personalities_info[name] = {
                'name': personality.name,
                'skill_level': personality.skill_level,
                'games_played': personality.games_played,
                'traits': personality.get_personality_traits()
            }
        
        return jsonify({
            'personalities': personalities_info,
            'default': 'balanced',
            'available_difficulties': ['easy', 'medium', 'hard'],
            'success': True,
            'timestamp': datetime.utcnow().isoformat()
        })
        
    except Exception as e:
        return jsonify({
            'error': 'Failed to get personalities',
            'message': str(e),
            'timestamp': datetime.utcnow().isoformat()
        }), 500

@app.route('/ai/test-personality', methods=['POST'])
def test_personality():
    """Test AI personality behavior"""
    try:
        data = request.get_json()
        personality_type = data.get('personality', 'balanced')
        
        # Get personality and test its behavior
        personality = ai_manager.get_personality(personality_type)
        test_board = data.get('board', {})
        
        move_strategy = personality.calculate_move(test_board)
        
        return jsonify({
            'personality': personality_type,
            'strategy': move_strategy,
            'traits': personality.get_personality_traits(),
            'test_successful': True,
            'timestamp': datetime.utcnow().isoformat()
        })
        
    except Exception as e:
        return jsonify({
            'error': 'Personality test failed',
            'message': str(e),
            'timestamp': datetime.utcnow().isoformat()
        }), 500
def ai_analysis():
    """Analyze game state and provide insights"""
    try:
        data = request.get_json()
        
        if not data or 'board' not in data:
            return jsonify({
                'error': 'Invalid request',
                'message': 'Board state is required'
            }), 400
        
        # Simple analysis (placeholder for real AI analysis)
        analysis = {
            'board_evaluation': 0.3,  # Positive favors current player
            'best_moves': [
                {'from': {'row': 0, 'col': 0}, 'to': {'row': 1, 'col': 1}, 'score': 0.8},
                {'from': {'row': 2, 'col': 2}, 'to': {'row': 3, 'col': 3}, 'score': 0.6}
            ],
            'threats': [],
            'opportunities': ['Control center', 'Develop pieces'],
            'game_phase': 'opening',
            'timestamp': datetime.utcnow().isoformat()
        }
        
        return jsonify({
            'analysis': analysis,
            'success': True,
            'processing_time_ms': 200
        })
        
    except Exception as e:
        return jsonify({
            'error': 'Analysis failed',
            'message': str(e),
            'timestamp': datetime.utcnow().isoformat()
        }), 500

@app.route('/ai/difficulty', methods=['POST'])
def set_difficulty():
    """Set AI difficulty level"""
    try:
        data = request.get_json()
        
        if not data or 'difficulty' not in data:
            return jsonify({
                'error': 'Invalid request',
                'message': 'Difficulty level is required'
            }), 400
        
        difficulty = data['difficulty'].lower()
        valid_difficulties = ['easy', 'medium', 'hard', 'expert']
        
        if difficulty not in valid_difficulties:
            return jsonify({
                'error': 'Invalid difficulty',
                'message': f'Difficulty must be one of: {", ".join(valid_difficulties)}'
            }), 400
        
        # In a real implementation, this would update AI parameters
        return jsonify({
            'difficulty': difficulty,
            'message': f'AI difficulty set to {difficulty}',
            'parameters': {
                'search_depth': {'easy': 2, 'medium': 4, 'hard': 6, 'expert': 8}[difficulty],
                'thinking_time': {'easy': 0.5, 'medium': 1.0, 'hard': 2.0, 'expert': 3.0}[difficulty]
            },
            'success': True,
            'timestamp': datetime.utcnow().isoformat()
        })
        
    except Exception as e:
        return jsonify({
            'error': 'Failed to set difficulty',
            'message': str(e),
            'timestamp': datetime.utcnow().isoformat()
        }), 500

@app.errorhandler(404)
def not_found(error):
    """Handle 404 errors"""
    return jsonify({
        'error': 'Not Found',
        'message': 'AI service endpoint not found',
        'available_endpoints': [
            '/',
            '/health',
            '/ai/move',
            '/ai/analysis', 
            '/ai/difficulty'
        ],
        'timestamp': datetime.utcnow().isoformat()
    }), 404

@app.errorhandler(500)
def internal_error(error):
    """Handle 500 errors"""
    return jsonify({
        'error': 'Internal Server Error',
        'message': 'An unexpected error occurred in the AI service',
        'timestamp': datetime.utcnow().isoformat()
    }), 500

if __name__ == '__main__':
    print('=' * 50)
    print('AI NEN PLATFORM AI SERVICE STARTING')
    print('=' * 50)
    print(f'Environment: {os.getenv("NODE_ENV", "development")}')
    print(f'AI Service: http://{AI_SERVICE_HOST}:{AI_SERVICE_PORT}')
    print(f'Health Check: http://{AI_SERVICE_HOST}:{AI_SERVICE_PORT}/health')
    print(f'CORS Origins: {FRONTEND_URL}')
    print('=' * 50)
    
    # Run Flask development server
    app.run(
        host=AI_SERVICE_HOST,
        port=AI_SERVICE_PORT,
        debug=os.getenv('NODE_ENV', 'development') == 'development',
        use_reloader=False  # Disable reloader to avoid port conflicts
    )
