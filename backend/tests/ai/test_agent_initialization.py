import pytest
from ai_services.agents.basic_ai_agents import BaseAIAgent, GungiBoardEvaluator, AIConfig, AIPersonality
from ai_services.agents.easy_agent import EasyAgent

class TestAgentInitialization:

    @pytest.mark.parametrize("config,expected_personality", [
        (AIConfig(personality=AIPersonality.AGGRESSIVE), AIPersonality.AGGRESSIVE),
        (AIConfig(personality=AIPersonality.DEFENSIVE), AIPersonality.DEFENSIVE),
        (AIConfig(personality=AIPersonality.TACTICAL), AIPersonality.TACTICAL),
        (AIConfig(personality=AIPersonality.BALANCED), AIPersonality.BALANCED),
    ])
    def test_agent_initialization(self, config, expected_personality):
        agent = EasyAgent(config.personality)
        assert agent.config.personality == expected_personality

class TestGungiBoardEvaluator:

    def test_piece_values(self):
        evaluator = GungiBoardEvaluator()
        board_state = {
            'board': [
                [[{'type': 'marshal', 'player': 1, 'isActive': True}], [], []],
                [[{'type': 'general', 'player': 2, 'isActive': True}], [], []],
                [[], [], []],
                [[], [], []],
                [[], [], []],
                [[], [], []],
                [[], [], []],
                [[], [], []],
                [[], [], []]
            ]
        }
        result = evaluator.evaluate_board(board_state, player=1)
        assert result > 0  # Player 1 has the marshal

class TestBaseAIAgent:

    def test_base_ai_agent_instantiation(self):
        with pytest.raises(TypeError):
            BaseAIAgent(AIConfig())  # Should raise TypeError as BaseAIAgent is abstract

class TestPersonalityInfluence:

    @pytest.mark.parametrize("agent_type,personality_modifier", [
        ('random', 'aggressive'),
        ('random', 'defensive'),
        ('random', 'tactical'),
    ])
    def test_personality_influence(self, agent_type, personality_modifier):
        config = AIConfig(personality=AIPersonality(personality_modifier.upper()))
        agent = EasyAgent(config.personality)
        assert agent.config.personality == AIPersonality(personality_modifier.upper())

