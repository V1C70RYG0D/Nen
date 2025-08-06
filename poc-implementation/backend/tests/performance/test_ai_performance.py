# """
# Performance Tests for AI Chess Engine
#
# Extensive test suite to evaluate AI chess engine performance and capability.
# """

import pytest
import sys
import os

# Add the parent directories to path for imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', 'ai-services'))

try:
    from backend.ai_services.game_logic.enhanced_position_generator import EnhancedPositionGenerator, PositionType
    ENHANCED_POSITION_AVAILABLE = True
except ImportError:
    ENHANCED_POSITION_AVAILABLE = False

NUM_COMPLEX_BRANCHING = 50
NUM_DEEP_CALCULATION = 50
NUM_TIME_CRITICAL = 100

@pytest.fixture
def generator():
    """Create Enhanced Position Generator for testing"""
    if not ENHANCED_POSITION_AVAILABLE:
        pytest.skip("Enhanced Position Generator not available")
    return EnhancedPositionGenerator()

@pytest.mark.skipif(not ENHANCED_POSITION_AVAILABLE, reason="Enhanced Position Generator not available")
def test_complex_branching_positions(generator):
    """Generate complex branching positions"""
    positions = generator.generate_multiple_positions(NUM_COMPLEX_BRANCHING, PositionType.TACTICAL)
    assert len(positions) == NUM_COMPLEX_BRANCHING

    # Check that all positions are tactical and playable
    for position in positions:
        assert position.position_type == PositionType.TACTICAL
        assert position.is_playable

@pytest.mark.skipif(not ENHANCED_POSITION_AVAILABLE, reason="Enhanced Position Generator not available")
def test_deep_calculation_positions(generator):
    """Generate deep calculation positions"""
    positions = generator.generate_multiple_positions(NUM_DEEP_CALCULATION, PositionType.ENDGAME)
    assert len(positions) == NUM_DEEP_CALCULATION

    # Check that all positions are endgame and playable
    for position in positions:
        assert position.position_type == PositionType.ENDGAME
        assert position.is_playable

@pytest.mark.skipif(not ENHANCED_POSITION_AVAILABLE, reason="Enhanced Position Generator not available")
def test_time_critical_positions(generator):
    """Generate time-critical positions"""
    positions = generator.generate_multiple_positions(NUM_TIME_CRITICAL, PositionType.MIDGAME)
    assert len(positions) == NUM_TIME_CRITICAL

    # Check that all positions are midgame and playable
    for position in positions:
        assert position.position_type == PositionType.MIDGAME
        assert position.is_playable

