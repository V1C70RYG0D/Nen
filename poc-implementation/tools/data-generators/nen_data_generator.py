# nen_data_generator.py

"""
Hunter x Hunter-themed Test Data Generator
This module generates data to simulate game plays and agent behaviors
based on Hunter x Hunter themes and enhanced AI personalities.
"""

import random
import logging
import json
from typing import Dict, List, Optional, Tuple, Any
from enum import Enum, auto
from dataclasses import dataclass, asdict
from pathlib import Path
import time
import math

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Enums for Personality and Difficulty
class PersonalityType(Enum):
    GON_AGGRESSIVE = auto()
    KILLUA_TACTICAL = auto()
    KURAPIKA_STRATEGIC = auto()
    LEORIO_BALANCED = auto()
    HISOKA_UNPREDICTABLE = auto()

class AIDifficulty(Enum):
    BEGINNER = auto()
    INTERMEDIATE = auto()
    EXPERT = auto()

class NenType(Enum):
    """Nen categories from Hunter x Hunter"""
    ENHANCER = auto()
    EMITTER = auto()
    MANIPULATOR = auto()
    TRANSMUTER = auto()
    CONJURER = auto()
    SPECIALIST = auto()

@dataclass
class PersonalityProfile:
    """Comprehensive personality profile for AI agents"""
    aggression: float
    patience: float
    creativity: float
    risk_tolerance: float
    adaptability: float
    strategic_depth: int
    emotional_stability: float
    learning_rate: float

    def validate(self) -> bool:
        """Validate profile values are within expected ranges"""
        return (
            0.0 <= self.aggression <= 1.0 and
            0.0 <= self.patience <= 1.0 and
            0.0 <= self.creativity <= 1.0 and
            0.0 <= self.risk_tolerance <= 1.0 and
            0.0 <= self.adaptability <= 1.0 and
            1 <= self.strategic_depth <= 10 and
            0.0 <= self.emotional_stability <= 1.0 and
            0.0 <= self.learning_rate <= 1.0
        )

@dataclass
class GameScenario:
    """Game scenario with contextual information"""
    scenario_id: str
    description: str
    difficulty: AIDifficulty
    nen_techniques: List[str]
    optimal_strategies: List[str]
    win_conditions: List[str]
    complexity_score: float

# Sample data class to hold generated data
class TestData:
    def __init__(self, test_name: str, data: Dict, metadata: Optional[Dict] = None):
        self.test_name = test_name
        self.data = data
        self.metadata = metadata or {}
        self.created_at = time.time()

    def to_dict(self) -> Dict:
        """Convert to dictionary for serialization"""
        return {
            'test_name': self.test_name,
            'data': self.data,
            'metadata': self.metadata,
            'created_at': self.created_at
        }

# Main data generator class
class NenDataGenerator:
    """Enhanced data generator with advanced personality modeling and scenario generation"""

    def __init__(self, seed: Optional[int] = None, config_path: Optional[str] = None):
        """Initialize generator with configuration"""
        if seed is not None:
            random.seed(seed)

        self.config = self._load_config(config_path)
        self.personality_cache = {}

        # Load Nen techniques and strategies
        self.nen_techniques = self._load_nen_techniques()
        self.strategic_patterns = self._load_strategic_patterns()

    def _load_config(self, config_path: Optional[str]) -> Dict:
        """Load configuration from file or use defaults"""
        default_config = {
            'personality_variance': 0.1,
            'scenario_complexity_range': (0.3, 0.9),
            'technique_pool_size': 20,
            'strategy_depth': 5
        }

        if config_path and Path(config_path).exists():
            try:
                with open(config_path, 'r') as f:
                    user_config = json.load(f)
                    default_config.update(user_config)
            except Exception as e:
                logger.warning(f"Failed to load config from {config_path}: {e}")

        return default_config

    def _load_nen_techniques(self) -> Dict[NenType, List[str]]:
        """Load Nen techniques by type"""
        return {
            NenType.ENHANCER: [
                "Ko", "Gyo", "Shu", "Ken",
                "Enhancement Boost", "Physical Amplification",
                "Aura Hardening", "Power Strike"
            ],
            NenType.EMITTER: [
                "Nen Bullet", "Remote Punch", "Aura Blast",
                "Distance Attack", "Energy Projectile",
                "Phantom Strike", "Guided Shot"
            ],
            NenType.MANIPULATOR: [
                "Object Control", "Body Manipulation", "Mind Control",
                "Puppet Master", "Environmental Control",
                "Behavior Modification", "Strategic Positioning"
            ],
            NenType.TRANSMUTER: [
                "Shape Change", "Property Alteration", "Rubber Nen",
                "Electric Nen", "Magnetic Properties",
                "Element Mimicry", "State Transformation"
            ],
            NenType.CONJURER: [
                "Object Creation", "Weapon Summon", "Barrier Formation",
                "Tool Materialization", "Defensive Construct",
                "Utility Creation", "Complex Apparatus"
            ],
            NenType.SPECIALIST: [
                "Unique Ability", "Reality Manipulation", "Fate Control",
                "Time Distortion", "Space Warping",
                "Conceptual Power", "Abstract Control"
            ]
        }

    def _load_strategic_patterns(self) -> Dict[str, List[str]]:
        """Load strategic patterns by context"""
        return {
            'aggressive': [
                "Direct confrontation", "Overwhelming force",
                "Quick decisive strikes", "Pressure tactics",
                "All-out assault", "Blitz strategy"
            ],
            'tactical': [
                "Calculated moves", "Resource management",
                "Position control", "Timing optimization",
                "Counter-attack preparation", "Weak point exploitation"
            ],
            'strategic': [
                "Long-term planning", "Information gathering",
                "Trap setting", "Multi-layered approach",
                "Contingency preparation", "Psychological warfare"
            ],
            'balanced': [
                "Adaptive response", "Situational awareness",
                "Flexible tactics", "Risk assessment",
                "Measured aggression", "Balanced offense-defense"
            ],
            'unpredictable': [
                "Random elements", "Surprise tactics",
                "Misdirection", "Chaos creation",
                "Unconventional methods", "Pattern breaking"
            ]
        }

    def generate_personality_profile(self, personality: PersonalityType,
                                   difficulty: AIDifficulty = AIDifficulty.INTERMEDIATE) -> PersonalityProfile:
        """Generate comprehensive personality profile"""
        cache_key = (personality, difficulty)
        if cache_key in self.personality_cache:
            return self.personality_cache[cache_key]

        variance = self.config['personality_variance']

        if personality == PersonalityType.GON_AGGRESSIVE:
            profile = PersonalityProfile(
                aggression=self._vary_value(0.9, variance),
                patience=self._vary_value(0.3, variance),
                creativity=self._vary_value(0.7, variance),
                risk_tolerance=self._vary_value(0.8, variance),
                adaptability=self._vary_value(0.6, variance),
                strategic_depth=max(1, int(self._vary_value(3, variance))),
                emotional_stability=self._vary_value(0.4, variance),
                learning_rate=self._vary_value(0.7, variance)
            )
        elif personality == PersonalityType.KILLUA_TACTICAL:
            profile = PersonalityProfile(
                aggression=self._vary_value(0.6, variance),
                patience=self._vary_value(0.9, variance),
                creativity=self._vary_value(0.8, variance),
                risk_tolerance=self._vary_value(0.4, variance),
                adaptability=self._vary_value(0.9, variance),
                strategic_depth=max(1, int(self._vary_value(7, variance))),
                emotional_stability=self._vary_value(0.8, variance),
                learning_rate=self._vary_value(0.9, variance)
            )
        elif personality == PersonalityType.KURAPIKA_STRATEGIC:
            profile = PersonalityProfile(
                aggression=self._vary_value(0.5, variance),
                patience=self._vary_value(0.9, variance),
                creativity=self._vary_value(0.6, variance),
                risk_tolerance=self._vary_value(0.3, variance),
                adaptability=self._vary_value(0.7, variance),
                strategic_depth=max(1, int(self._vary_value(9, variance))),
                emotional_stability=self._vary_value(0.9, variance),
                learning_rate=self._vary_value(0.8, variance)
            )
        elif personality == PersonalityType.LEORIO_BALANCED:
            profile = PersonalityProfile(
                aggression=self._vary_value(0.5, variance),
                patience=self._vary_value(0.6, variance),
                creativity=self._vary_value(0.5, variance),
                risk_tolerance=self._vary_value(0.5, variance),
                adaptability=self._vary_value(0.6, variance),
                strategic_depth=max(1, int(self._vary_value(5, variance))),
                emotional_stability=self._vary_value(0.7, variance),
                learning_rate=self._vary_value(0.6, variance)
            )
        elif personality == PersonalityType.HISOKA_UNPREDICTABLE:
            profile = PersonalityProfile(
                aggression=self._vary_value(0.8, variance),
                patience=self._vary_value(0.7, variance),
                creativity=self._vary_value(0.95, variance),
                risk_tolerance=self._vary_value(0.9, variance),
                adaptability=self._vary_value(0.8, variance),
                strategic_depth=max(1, int(self._vary_value(8, variance))),
                emotional_stability=self._vary_value(0.6, variance),
                learning_rate=self._vary_value(0.8, variance)
            )
        else:
            # Default balanced profile
            profile = PersonalityProfile(
                aggression=0.5, patience=0.5, creativity=0.5,
                risk_tolerance=0.5, adaptability=0.5, strategic_depth=5,
                emotional_stability=0.5, learning_rate=0.5
            )

        # Adjust for difficulty
        profile = self._adjust_for_difficulty(profile, difficulty)

        if profile.validate():
            self.personality_cache[cache_key] = profile
            return profile
        else:
            logger.error(f"Invalid profile generated for {personality}")
            raise ValueError(f"Generated invalid personality profile")

    def _vary_value(self, base: float, variance: float) -> float:
        """Apply variance to a base value"""
        variation = random.uniform(-variance, variance)
        return max(0.0, min(1.0, base + variation))

    def _adjust_for_difficulty(self, profile: PersonalityProfile, difficulty: AIDifficulty) -> PersonalityProfile:
        """Adjust profile based on AI difficulty"""
        if difficulty == AIDifficulty.BEGINNER:
            # Reduce strategic depth and learning rate
            profile.strategic_depth = max(1, profile.strategic_depth - 2)
            profile.learning_rate = max(0.0, min(1.0, profile.learning_rate * 0.7))
            profile.adaptability = max(0.0, min(1.0, profile.adaptability * 0.8))
        elif difficulty == AIDifficulty.EXPERT:
            # Increase strategic capabilities
            profile.strategic_depth = min(10, profile.strategic_depth + 2)
            profile.learning_rate = max(0.0, min(1.0, profile.learning_rate * 1.2))
            profile.adaptability = max(0.0, min(1.0, profile.adaptability * 1.1))
            profile.patience = max(0.0, min(1.0, profile.patience * 1.1))

        return profile

    def generate_game_scenario(self, personality: PersonalityType,
                             difficulty: AIDifficulty = AIDifficulty.INTERMEDIATE) -> GameScenario:
        """Generate contextual game scenario"""
        profile = self.generate_personality_profile(personality, difficulty)

        # Select appropriate Nen type based on personality
        nen_type = self._select_nen_type(personality)
        techniques = random.sample(self.nen_techniques[nen_type],
                                 min(4, len(self.nen_techniques[nen_type])))

        # Generate strategies based on personality
        strategy_key = self._get_strategy_key(personality)
        strategies = random.sample(self.strategic_patterns[strategy_key],
                                 min(3, len(self.strategic_patterns[strategy_key])))

        # Calculate complexity score
        complexity = self._calculate_scenario_complexity(profile, difficulty)

        scenario = GameScenario(
            scenario_id=f"scenario_{personality.name}_{int(time.time())}",
            description=f"{personality.name} playstyle scenario with {difficulty.name} difficulty",
            difficulty=difficulty,
            nen_techniques=techniques,
            optimal_strategies=strategies,
            win_conditions=self._generate_win_conditions(personality, difficulty),
            complexity_score=complexity
        )

        return scenario

    def _select_nen_type(self, personality: PersonalityType) -> NenType:
        """Select Nen type based on personality"""
        mapping = {
            PersonalityType.GON_AGGRESSIVE: NenType.ENHANCER,
            PersonalityType.KILLUA_TACTICAL: NenType.TRANSMUTER,
            PersonalityType.KURAPIKA_STRATEGIC: NenType.CONJURER,
            PersonalityType.LEORIO_BALANCED: NenType.EMITTER,
            PersonalityType.HISOKA_UNPREDICTABLE: NenType.SPECIALIST
        }
        return mapping.get(personality, NenType.ENHANCER)

    def _get_strategy_key(self, personality: PersonalityType) -> str:
        """Get strategy pattern key for personality"""
        mapping = {
            PersonalityType.GON_AGGRESSIVE: 'aggressive',
            PersonalityType.KILLUA_TACTICAL: 'tactical',
            PersonalityType.KURAPIKA_STRATEGIC: 'strategic',
            PersonalityType.LEORIO_BALANCED: 'balanced',
            PersonalityType.HISOKA_UNPREDICTABLE: 'unpredictable'
        }
        return mapping.get(personality, 'balanced')

    def _calculate_scenario_complexity(self, profile: PersonalityProfile, difficulty: AIDifficulty) -> float:
        """Calculate scenario complexity score"""
        base_complexity = {
            AIDifficulty.BEGINNER: 0.3,
            AIDifficulty.INTERMEDIATE: 0.6,
            AIDifficulty.EXPERT: 0.9
        }[difficulty]

        # Adjust based on profile characteristics
        complexity_factors = [
            profile.strategic_depth / 10.0,
            profile.creativity,
            profile.adaptability,
            1.0 - profile.emotional_stability  # More unstable = more complex
        ]

        avg_factor = sum(complexity_factors) / len(complexity_factors)
        final_complexity = (base_complexity + avg_factor) / 2

        return max(0.1, min(1.0, final_complexity))

    def _generate_win_conditions(self, personality: PersonalityType, difficulty: AIDifficulty) -> List[str]:
        """Generate appropriate win conditions"""
        base_conditions = [
            "Eliminate opponent",
            "Control key positions",
            "Achieve strategic advantage"
        ]

        personality_conditions = {
            PersonalityType.GON_AGGRESSIVE: ["Quick victory", "Direct confrontation win"],
            PersonalityType.KILLUA_TACTICAL: ["Efficient elimination", "Perfect execution"],
            PersonalityType.KURAPIKA_STRATEGIC: ["Long-term dominance", "Complete control"],
            PersonalityType.LEORIO_BALANCED: ["Steady progress", "Reliable advancement"],
            PersonalityType.HISOKA_UNPREDICTABLE: ["Surprising victory", "Chaos mastery"]
        }

        conditions = base_conditions + personality_conditions.get(personality, [])

        if difficulty == AIDifficulty.EXPERT:
            conditions.append("Perfect game execution")
        elif difficulty == AIDifficulty.BEGINNER:
            conditions.append("Basic objective completion")

        return conditions

    def generate_with_personality(self, personality: PersonalityType,
                                difficulty: AIDifficulty = AIDifficulty.INTERMEDIATE) -> TestData:
        """
        Generate comprehensive test data based on personality type
        """
        profile = self.generate_personality_profile(personality, difficulty)
        scenario = self.generate_game_scenario(personality, difficulty)

        test_name = f"{personality.name} {difficulty.name} Test"

        data = {
            'personality_profile': asdict(profile),
            'game_scenario': asdict(scenario),
            'generated_metrics': self._generate_performance_metrics(profile)
        }

        metadata = {
            'personality_type': personality.name,
            'difficulty': difficulty.name,
            'nen_type': self._select_nen_type(personality).name,
            'complexity_score': scenario.complexity_score
        }

        return TestData(test_name, data, metadata)

    def _generate_performance_metrics(self, profile: PersonalityProfile) -> Dict[str, float]:
        """Generate expected performance metrics based on profile"""
        return {
            'win_rate_estimate': self._calculate_win_rate(profile),
            'avg_game_length': self._estimate_game_length(profile),
            'tactical_accuracy': profile.patience * profile.learning_rate,
            'strategic_consistency': profile.emotional_stability * (profile.strategic_depth / 10.0),
            'adaptability_score': profile.adaptability * profile.creativity
        }

    def _calculate_win_rate(self, profile: PersonalityProfile) -> float:
        """Calculate expected win rate based on profile"""
        # Weighted combination of key attributes
        factors = [
            profile.strategic_depth / 10.0 * 0.3,
            profile.learning_rate * 0.25,
            profile.adaptability * 0.2,
            profile.emotional_stability * 0.15,
            profile.patience * 0.1
        ]
        return sum(factors)

    def _estimate_game_length(self, profile: PersonalityProfile) -> float:
        """Estimate average game length in moves based on profile"""
        base_length = 50.0  # Base game length

        # Aggressive players tend to have shorter games
        aggression_factor = 1.0 - (profile.aggression * 0.3)

        # Patient strategic players tend to have longer games
        patience_factor = 1.0 + (profile.patience * profile.strategic_depth / 10.0 * 0.4)

        return base_length * aggression_factor * patience_factor

    def simulate_opening_books(self, count: int = 5) -> List[Dict]:
        """
        Simulate diverse opening book sequences with enhanced data
        """
        openings = []

        for i in range(count):
            nen_type = random.choice(list(NenType))
            techniques = random.sample(
                self.nen_techniques[nen_type],
                min(3, len(self.nen_techniques[nen_type]))
            )

            opening = {
                'sequence_id': f"opening_{i+1}",
                'nen_type': nen_type.name,
                'techniques': techniques,
                'effectiveness': random.uniform(0.5, 1.0),
                'complexity': random.uniform(0.3, 0.9),
                'recommended_for': random.choice(list(PersonalityType)).name
            }
            openings.append(opening)

        return openings

    def export_data(self, data: List[TestData], filepath: str) -> bool:
        """Export generated data to file"""
        try:
            export_data = [test.to_dict() for test in data]
            with open(filepath, 'w') as f:
                json.dump(export_data, f, indent=2)
            logger.info(f"Data exported to {filepath}")
            return True
        except Exception as e:
            logger.error(f"Failed to export data: {e}")
            return False# Example usage
if __name__ == "__main__":
    generator = NenDataGenerator()
    # Generate test data for a given personality
    test_data = generator.generate_with_personality(PersonalityType.GON_AGGRESSIVE)
    print(f"Test Data for {test_data.test_name}: {test_data.data}")

    # Simulate opening book data
    opening_books = generator.simulate_opening_books()
    print("Opening Books Simulation:", opening_books)
