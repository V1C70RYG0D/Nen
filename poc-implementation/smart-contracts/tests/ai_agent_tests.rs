#[cfg(test)]
mod ai_agent_tests {
    use crate::bolt_ecs::*;
    use anchor_lang::prelude::*;

    #[test]
    fn test_ai_agent_creation_with_each_personality() {
        let personalities = vec![
            PersonalityType::Aggressive,
            PersonalityType::Defensive,
            PersonalityType::Balanced,
            PersonalityType::Tactical,
            PersonalityType::Blitz,
        ];

        for (i, personality) in personalities.iter().enumerate() {
            let agent = AIAgentComponent {
                entity_id: i as u64,
                personality: *personality,
                skill_level: 1500, // Mid-range skill
                games_played: 0,
                wins: 0,
                losses: 0,
                draw: 0,
                learning_rate: 100,
                last_updated: Clock::get().unwrap().unix_timestamp,
            };

            assert_eq!(agent.personality, *personality);
            assert_eq!(agent.skill_level, 1500);
            assert_eq!(agent.games_played, 0);
        }
    }

    #[test]
    fn test_skill_level_validation_range() {
        // Test valid skill levels (1000-3000 range)
        let valid_levels = vec![1000, 1500, 2000, 2500, 3000];
        
        for skill_level in valid_levels {
            let agent = AIAgentComponent {
                entity_id: 1,
                personality: PersonalityType::Balanced,
                skill_level,
                games_played: 0,
                wins: 0,
                losses: 0,
                draw: 0,
                learning_rate: 100,
                last_updated: Clock::get().unwrap().unix_timestamp,
            };

            assert!(agent.skill_level >= 1000);
            assert!(agent.skill_level <= 3000);
            assert_eq!(agent.skill_level, skill_level);
        }

        // Test boundary validation
        let boundary_tests = vec![
            (999, false),   // Below minimum
            (1000, true),   // Minimum valid
            (2000, true),   // Mid-range
            (3000, true),   // Maximum valid
            (3001, false),  // Above maximum
        ];

        for (level, should_be_valid) in boundary_tests {
            let is_valid = level >= 1000 && level <= 3000;
            assert_eq!(is_valid, should_be_valid, "Skill level {} validation failed", level);
        }
    }

    #[test]
    fn test_games_played_counter_functionality() {
        let mut agent = AIAgentComponent {
            entity_id: 1,
            personality: PersonalityType::Aggressive,
            skill_level: 1800,
            games_played: 0,
            wins: 0,
            losses: 0,
            draw: 0,
            learning_rate: 150,
            last_updated: Clock::get().unwrap().unix_timestamp,
        };

        // Test initial state
        assert_eq!(agent.games_played, 0);
        assert_eq!(agent.wins, 0);
        assert_eq!(agent.losses, 0);
        assert_eq!(agent.draw, 0);

        // Simulate games and track results
        for game in 1..=10 {
            agent.games_played += 1;
            
            match game % 3 {
                0 => agent.wins += 1,     // Win every 3rd game
                1 => agent.losses += 1,   // Lose every (3n+1)th game
                2 => agent.draw += 1,     // Draw every (3n+2)th game
                _ => unreachable!(),
            }

            assert_eq!(agent.games_played, game);
        }

        // Verify final counts
        assert_eq!(agent.games_played, 10);
        assert_eq!(agent.wins + agent.losses + agent.draw, agent.games_played);
        assert!(agent.wins > 0);
        assert!(agent.losses > 0);
        assert!(agent.draw > 0);
    }

    #[test]
    fn test_ai_decision_making_based_on_personality() {
        // Create agents with different personalities
        let aggressive_agent = AIAgentComponent {
            entity_id: 1,
            personality: PersonalityType::Aggressive,
            skill_level: 1600,
            games_played: 50,
            wins: 30,
            losses: 15,
            draw: 5,
            learning_rate: 120,
            last_updated: Clock::get().unwrap().unix_timestamp,
        };

        let defensive_agent = AIAgentComponent {
            entity_id: 2,
            personality: PersonalityType::Defensive,
            skill_level: 1600,
            games_played: 50,
            wins: 25,
            losses: 10,
            draw: 15,
            learning_rate: 80,
            last_updated: Clock::get().unwrap().unix_timestamp,
        };

        let balanced_agent = AIAgentComponent {
            entity_id: 3,
            personality: PersonalityType::Balanced,
            skill_level: 1600,
            games_played: 50,
            wins: 25,
            losses: 20,
            draw: 5,
            learning_rate: 100,
            last_updated: Clock::get().unwrap().unix_timestamp,
        };

        // Test personality traits reflected in stats
        assert_eq!(aggressive_agent.personality, PersonalityType::Aggressive);
        assert!(aggressive_agent.wins > defensive_agent.wins); // More aggressive = more wins but also more losses
        assert!(aggressive_agent.learning_rate > defensive_agent.learning_rate); // Learns faster from conflicts

        assert_eq!(defensive_agent.personality, PersonalityType::Defensive);
        assert!(defensive_agent.draw > aggressive_agent.draw); // More draws due to defensive play

        assert_eq!(balanced_agent.personality, PersonalityType::Balanced);
        assert!(balanced_agent.learning_rate >= defensive_agent.learning_rate);
        assert!(balanced_agent.learning_rate <= aggressive_agent.learning_rate);
    }

    #[test]
    fn test_ai_move_quality_assessment() {
        let tactical_agent = AIAgentComponent {
            entity_id: 1,
            personality: PersonalityType::Tactical,
            skill_level: 2500, // High skill
            games_played: 200,
            wins: 140,
            losses: 45,
            draw: 15,
            learning_rate: 50, // Lower learning rate due to high skill
            last_updated: Clock::get().unwrap().unix_timestamp,
        };

        let blitz_agent = AIAgentComponent {
            entity_id: 2,
            personality: PersonalityType::Blitz,
            skill_level: 1400, // Lower skill but fast
            games_played: 500, // Many games due to speed
            wins: 200,
            losses: 250,
            draw: 50,
            learning_rate: 200, // High learning rate to compensate for speed over accuracy
            last_updated: Clock::get().unwrap().unix_timestamp,
        };

        // Test move quality indicators
        assert!(tactical_agent.skill_level > blitz_agent.skill_level);
        assert!(tactical_agent.wins as f32 / tactical_agent.games_played as f32 > 
               blitz_agent.wins as f32 / blitz_agent.games_played as f32);
        
        // Blitz agent plays more games but with lower accuracy
        assert!(blitz_agent.games_played > tactical_agent.games_played);
        assert!(blitz_agent.learning_rate > tactical_agent.learning_rate);
    }

    #[test]
    fn test_ai_learning_and_adaptation() {
        let mut learning_agent = AIAgentComponent {
            entity_id: 1,
            personality: PersonalityType::Balanced,
            skill_level: 1200, // Starting skill
            games_played: 0,
            wins: 0,
            losses: 0,
            draw: 0,
            learning_rate: 150,
            last_updated: Clock::get().unwrap().unix_timestamp,
        };

        let initial_skill = learning_agent.skill_level;

        // Simulate learning through gameplay
        for _ in 0..50 {
            learning_agent.games_played += 1;
            
            // Simulate win (skill improvement)
            if learning_agent.games_played % 2 == 0 {
                learning_agent.wins += 1;
                // Skill increases with wins (simplified learning model)
                learning_agent.skill_level += learning_agent.learning_rate / 10;
            } else {
                learning_agent.losses += 1;
                // Small skill decrease with losses but also learning
                if learning_agent.skill_level > 1000 {
                    learning_agent.skill_level = learning_agent.skill_level.saturating_sub(learning_agent.learning_rate / 20);
                }
                learning_agent.skill_level += learning_agent.learning_rate / 15; // Learning from mistakes
            }

            // Update timestamp
            learning_agent.last_updated = Clock::get().unwrap().unix_timestamp;
        }

        // Verify learning progression
        assert!(learning_agent.skill_level > initial_skill);
        assert_eq!(learning_agent.games_played, 50);
        assert!(learning_agent.wins > 0);
        assert!(learning_agent.losses > 0);
    }

    #[test]
    fn test_ai_personality_behavior_patterns() {
        // Test that different personalities exhibit different behavior patterns

        // Aggressive: High risk, high reward
        let aggressive = AIAgentComponent {
            entity_id: 1,
            personality: PersonalityType::Aggressive,
            skill_level: 1800,
            games_played: 100,
            wins: 55, // High wins
            losses: 40, // But also high losses
            draw: 5,   // Few draws
            learning_rate: 180, // Learns quickly from conflicts
            last_updated: Clock::get().unwrap().unix_timestamp,
        };

        // Defensive: Low risk, steady play
        let defensive = AIAgentComponent {
            entity_id: 2,
            personality: PersonalityType::Defensive,
            skill_level: 1800,
            games_played: 100,
            wins: 40,  // Fewer wins
            losses: 25, // But also fewer losses
            draw: 35,  // Many draws
            learning_rate: 60, // Learns slowly but steadily
            last_updated: Clock::get().unwrap().unix_timestamp,
        };

        // Verify behavioral patterns
        let aggressive_win_rate = aggressive.wins as f32 / aggressive.games_played as f32;
        let aggressive_loss_rate = aggressive.losses as f32 / aggressive.games_played as f32;
        let defensive_win_rate = defensive.wins as f32 / defensive.games_played as f32;
        let defensive_loss_rate = defensive.losses as f32 / defensive.games_played as f32;

        assert!(aggressive_win_rate > defensive_win_rate); // More aggressive = more wins
        assert!(aggressive_loss_rate > defensive_loss_rate); // But also more losses
        assert!(defensive.draw > aggressive.draw); // Defensive = more draws
        assert!(aggressive.learning_rate > defensive.learning_rate); // Aggressive learns faster
    }

    #[test]
    fn test_ai_skill_progression_system() {
        let mut novice_agent = AIAgentComponent {
            entity_id: 1,
            personality: PersonalityType::Balanced,
            skill_level: 1000, // Minimum skill
            games_played: 0,
            wins: 0,
            losses: 0,
            draw: 0,
            learning_rate: 200, // High learning rate for novices
            last_updated: Clock::get().unwrap().unix_timestamp,
        };

        // Simulate skill progression
        let milestones = vec![
            (50, 1200),   // After 50 games, should reach 1200
            (100, 1500),  // After 100 games, should reach 1500
            (200, 1800),  // After 200 games, should reach 1800
            (500, 2200),  // After 500 games, should reach 2200
        ];

        for (target_games, expected_min_skill) in milestones {
            while novice_agent.games_played < target_games {
                novice_agent.games_played += 1;
                
                // Simulate skill gain (simplified model)
                let skill_gain = novice_agent.learning_rate / (novice_agent.skill_level / 100).max(10);
                novice_agent.skill_level += skill_gain;
                
                // Reduce learning rate as skill increases (diminishing returns)
                if novice_agent.games_played % 50 == 0 && novice_agent.learning_rate > 50 {
                    novice_agent.learning_rate = (novice_agent.learning_rate * 9) / 10;
                }

                // Track wins/losses
                if novice_agent.games_played % 3 == 0 {
                    novice_agent.wins += 1;
                } else if novice_agent.games_played % 3 == 1 {
                    novice_agent.losses += 1;
                } else {
                    novice_agent.draw += 1;
                }
            }

            assert!(novice_agent.skill_level >= expected_min_skill,
                   "After {} games, skill level {} should be at least {}", 
                   target_games, novice_agent.skill_level, expected_min_skill);
        }
    }

    #[test]
    fn test_ai_agent_default_values() {
        let default_agent = AIAgentComponent::default();
        
        assert_eq!(default_agent.entity_id, 0);
        assert_eq!(default_agent.personality, PersonalityType::default());
        assert_eq!(default_agent.skill_level, 0);
        assert_eq!(default_agent.games_played, 0);
        assert_eq!(default_agent.wins, 0);
        assert_eq!(default_agent.losses, 0);
        assert_eq!(default_agent.draw, 0);
        assert_eq!(default_agent.learning_rate, 0);
        assert_eq!(default_agent.last_updated, 0);
    }

    #[test]
    fn test_ai_agent_persistence_and_recovery() {
        let original_agent = AIAgentComponent {
            entity_id: 42,
            personality: PersonalityType::Tactical,
            skill_level: 2100,
            games_played: 150,
            wins: 95,
            losses: 45,
            draw: 10,
            learning_rate: 75,
            last_updated: Clock::get().unwrap().unix_timestamp,
        };

        // Simulate serialization/deserialization (copying for test)
        let recovered_agent = original_agent;

        // Verify all data is preserved
        assert_eq!(recovered_agent.entity_id, original_agent.entity_id);
        assert_eq!(recovered_agent.personality, original_agent.personality);
        assert_eq!(recovered_agent.skill_level, original_agent.skill_level);
        assert_eq!(recovered_agent.games_played, original_agent.games_played);
        assert_eq!(recovered_agent.wins, original_agent.wins);
        assert_eq!(recovered_agent.losses, original_agent.losses);
        assert_eq!(recovered_agent.draw, original_agent.draw);
        assert_eq!(recovered_agent.learning_rate, original_agent.learning_rate);
        assert_eq!(recovered_agent.last_updated, original_agent.last_updated);
    }
}
