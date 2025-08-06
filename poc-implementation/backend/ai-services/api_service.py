"""
Simple Flask API service for AI endpoints
Following GI.md guidelines for production-ready API
"""

import os
import time
import logging
from flask import Flask, jsonify, request
from flask_cors import CORS
from typing import Dict, Any, List, Optional

from agents.ai_manager import AIManager
from agents.basic_ai_agents import AIAgentFactory


# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Initialize Flask app
app = Flask(__name__)
CORS(app)

# Initialize AI Manager
ai_manager = None


def get_ai_manager() -> AIManager:
    """Get or create AI Manager instance"""
    global ai_manager
    if ai_manager is None:
        ai_manager = AIManager()
        logger.info("AI Manager initialized")
    return ai_manager


@app.route('/health', methods=['GET'])
def health_check():
    """Service health check endpoint"""
    try:
        manager = get_ai_manager()
        health_data = {
            'status': 'healthy',
            'timestamp': time.time(),
            'service': 'AI Service',
            'version': '1.0.0',
            'total_agents': len(manager.agents),
            'active_games': len(manager.active_games),
            'system_ready': True
        }
        
        return jsonify(health_data), 200
        
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return jsonify({
            'status': 'unhealthy',
            'timestamp': time.time(),
            'error': str(e)
        }), 500


@app.route('/api/ai/move', methods=['POST'])
def generate_move():
    """Generate AI move endpoint"""
    try:
        # Check if request has JSON content type
        if not request.is_json:
            return jsonify({'error': 'Content-Type must be application/json'}), 400
        
        data = request.get_json(force=True, silent=True)
        if not data:
            return jsonify({'error': 'No valid JSON data provided'}), 400
        
        # Validate required fields
        required_fields = ['board_state', 'valid_moves', 'difficulty', 'personality']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'Missing required field: {field}'}), 400
        
        board_state = data['board_state']
        valid_moves = data['valid_moves']
        difficulty = data.get('difficulty', 'medium')
        personality = data.get('personality', 'balanced')
        
        # Validate difficulty and personality
        if difficulty not in ['easy', 'medium', 'hard']:
            return jsonify({'error': 'Invalid difficulty. Must be easy, medium, or hard'}), 400
        
        if personality not in ['aggressive', 'defensive', 'balanced']:
            return jsonify({'error': 'Invalid personality. Must be aggressive, defensive, or balanced'}), 400
        
        if not valid_moves:
            return jsonify({'error': 'No valid moves provided'}), 400
        
        # Get AI agent and generate move
        manager = get_ai_manager()
        agent = manager.get_agent(difficulty, personality)
        
        if not agent:
            return jsonify({'error': 'Failed to get AI agent'}), 500
        
        start_time = time.time()
        move = agent.get_move(board_state, valid_moves)
        execution_time = (time.time() - start_time) * 1000
        
        if move is None:
            return jsonify({'error': 'AI failed to generate move'}), 500
        
        # Get performance metrics
        metrics = agent.get_performance_metrics()
        
        response_data = {
            'move': move,
            'execution_time_ms': execution_time,
            'difficulty': difficulty,
            'personality': personality,
            'agent_type': agent.__class__.__name__,
            'performance_metrics': metrics if not metrics.get('no_data') else None,
            'timestamp': time.time()
        }
        
        return jsonify(response_data), 200
        
    except Exception as e:
        logger.error(f"Move generation failed: {e}")
        return jsonify({
            'error': 'Internal server error',
            'details': str(e)
        }), 500


@app.route('/api/ai/analyze', methods=['POST'])
def analyze_position():
    """Analyze board position endpoint"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        board_state = data.get('board_state')
        if not board_state:
            return jsonify({'error': 'Missing board_state'}), 400
        
        # Get AI agent for analysis
        manager = get_ai_manager()
        difficulty = data.get('difficulty', 'medium')
        personality = data.get('personality', 'balanced')
        
        agent = manager.get_agent(difficulty, personality)
        if not agent:
            return jsonify({'error': 'Failed to get AI agent'}), 500
        
        # Perform analysis
        start_time = time.time()
        
        # Use board evaluator for position analysis
        if hasattr(agent, 'evaluator'):
            score = agent.evaluator.evaluate_position(board_state)
        else:
            score = 0.0
        
        execution_time = (time.time() - start_time) * 1000
        
        # Get personality traits
        personality_traits = agent.get_personality_traits()
        
        analysis_data = {
            'position_score': score,
            'evaluation_perspective': f"Player {board_state.get('currentPlayer', 1)}",
            'game_phase': board_state.get('gamePhase', 'unknown'),
            'move_number': board_state.get('moveNumber', 0),
            'personality_traits': personality_traits,
            'analysis_time_ms': execution_time,
            'difficulty': difficulty,
            'personality': personality,
            'timestamp': time.time()
        }
        
        return jsonify(analysis_data), 200
        
    except Exception as e:
        logger.error(f"Position analysis failed: {e}")
        return jsonify({
            'error': 'Internal server error',
            'details': str(e)
        }), 500


@app.route('/api/ai/difficulty', methods=['POST'])
def assess_difficulty():
    """Assess position difficulty endpoint"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        board_state = data.get('board_state')
        valid_moves = data.get('valid_moves', [])
        
        if not board_state:
            return jsonify({'error': 'Missing board_state'}), 400
        
        # Assess difficulty based on various factors
        start_time = time.time()
        
        # Simple difficulty assessment based on:
        # - Number of valid moves
        # - Game phase
        # - Material balance
        move_count = len(valid_moves)
        game_phase = board_state.get('gamePhase', 'midgame')
        move_number = board_state.get('moveNumber', 1)
        
        # Calculate difficulty score
        difficulty_score = 0.0
        
        # More moves = higher difficulty
        if move_count > 20:
            difficulty_score += 0.3
        elif move_count > 10:
            difficulty_score += 0.2
        else:
            difficulty_score += 0.1
        
        # Game phase influence
        phase_scores = {
            'opening': 0.2,
            'midgame': 0.4,
            'endgame': 0.3
        }
        difficulty_score += phase_scores.get(game_phase, 0.3)
        
        # Move number influence
        if move_number > 40:
            difficulty_score += 0.3  # Late game complexity
        elif move_number < 10:
            difficulty_score += 0.1  # Early game simplicity
        else:
            difficulty_score += 0.2  # Mid game
        
        # Normalize to 0-1 scale
        difficulty_score = min(difficulty_score, 1.0)
        
        # Determine difficulty level
        if difficulty_score < 0.3:
            difficulty_level = 'easy'
        elif difficulty_score < 0.6:
            difficulty_level = 'medium'
        else:
            difficulty_level = 'hard'
        
        execution_time = (time.time() - start_time) * 1000
        
        difficulty_data = {
            'difficulty_score': difficulty_score,
            'difficulty_level': difficulty_level,
            'factors': {
                'move_count': move_count,
                'game_phase': game_phase,
                'move_number': move_number
            },
            'recommended_ai_difficulty': difficulty_level,
            'analysis_time_ms': execution_time,
            'timestamp': time.time()
        }
        
        return jsonify(difficulty_data), 200
        
    except Exception as e:
        logger.error(f"Difficulty assessment failed: {e}")
        return jsonify({
            'error': 'Internal server error',
            'details': str(e)
        }), 500


@app.route('/api/ai/performance', methods=['GET'])
def get_performance_report():
    """Get AI performance report endpoint"""
    try:
        manager = get_ai_manager()
        report = manager.get_performance_report()
        
        return jsonify(report), 200
        
    except Exception as e:
        logger.error(f"Performance report failed: {e}")
        return jsonify({
            'error': 'Internal server error',
            'details': str(e)
        }), 500


@app.route('/api/ai/stress-test', methods=['POST'])
def run_stress_test():
    """Run stress test endpoint"""
    try:
        data = request.get_json() or {}
        
        concurrent_games = data.get('concurrent_games', 5)
        moves_per_game = data.get('moves_per_game', 10)
        
        # Validate parameters
        if concurrent_games > 10:
            return jsonify({'error': 'Maximum 10 concurrent games allowed'}), 400
        
        if moves_per_game > 50:
            return jsonify({'error': 'Maximum 50 moves per game allowed'}), 400
        
        manager = get_ai_manager()
        report = manager.run_stress_test(concurrent_games, moves_per_game)
        
        return jsonify(report), 200
        
    except Exception as e:
        logger.error(f"Stress test failed: {e}")
        return jsonify({
            'error': 'Internal server error',
            'details': str(e)
        }), 500


@app.errorhandler(404)
def not_found(error):
    """Handle 404 errors"""
    return jsonify({'error': 'Endpoint not found'}), 404


@app.errorhandler(405)
def method_not_allowed(error):
    """Handle 405 errors"""
    return jsonify({'error': 'Method not allowed'}), 405


@app.errorhandler(500)
def internal_error(error):
    """Handle 500 errors"""
    return jsonify({'error': 'Internal server error'}), 500


if __name__ == '__main__':
    # Get configuration from environment
    host = os.getenv('FLASK_HOST', '0.0.0.0')
    port = int(os.getenv('FLASK_PORT', 5000))
    debug = os.getenv('FLASK_DEBUG', 'False').lower() == 'true'
    
    logger.info(f"Starting AI Service on {host}:{port}")
    app.run(host=host, port=port, debug=debug)
