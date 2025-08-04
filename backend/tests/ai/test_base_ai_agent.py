import pytest
from ai_services.agents.basic_ai_agents import BaseAIAgent, AIConfig, AIPersonality

class TestBaseAIAgent:
    @pytest.fixture
    def config(self):
        return AIConfig(
            personality=AIPersonality.BALANCED,
            skill_level=5
        )

    @pytest.fixture
    def base_agent(self, config):
        return BaseAIAgent(config)

    def test_initialization(self, base_agent):
        assert base_agent.config.skill_level == 5
        assert base_agent.config.personality == AIPersonality.BALANCED

    def test_get_personality_traits(self, base_agent):
        traits = base_agent.get_personality_traits()
        assert 'aggression' in traits
        assert 'risk_tolerance' in traits

    def test_update_performance(self, base_agent):
        base_agent.update_performance('win', 1.2)
        assert base_agent.performance_stats['games_played'] == 1
        assert base_agent.performance_stats['wins'] == 1

