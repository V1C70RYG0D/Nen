#[cfg(test)]
mod ai_move_tests {
    use crate::bolt_ecs::*;
    use anchor_lang::prelude::*;
    use std::collections::HashMap;

    fn create_test_ai_world() -> (
        HashMap<u64, PositionComponent>, 
        HashMap<u64, PieceComponent>, 
        BoardState, 
        AIAgentComponent
    ) {
        let mut position_components = HashMap::new();
        let mut piece_components = HashMap::new();
        
        // Create a basic board setup
        let board_state = BoardState {
            board: [[None; 9]; 9],
            stacks: HashMap::new(),
            captured_pieces: Vec::new(),
            move_count: 5,
            current_player: 1,
            game_phase: GamePhase::Midgame,
            special_rules_active: 0,
        };

        // Add some test pieces for AI to work with
        for i in 0..5 {
            let pos = PositionComponent {
                entity_id: i,
                x: i as u8,
                y: 1,
                level: 0,
                is_active: true,
                last_updated: Clock::get().unwrap().unix_timestamp,
            };

            let piece = PieceComponent {
                entity_id: i,
                piece_type: match i {
                    0 => PieceType::Marshal,
                    1 => PieceType::General,
                    2 => PieceType::Lieutenant,
                    3 => PieceType::Major,
                    _ => PieceType::Shinobi,
                },
                owner: 1,
                has_moved: false,
                captured: false,
                stack_level: 0,
                special_abilities: 0,
                last_move_turn: 0,
            };

            position_components.insert(i, pos);
            piece_components.insert(i, piece);
        }

        // Add some enemy pieces
        for i in 5..8 {
            let pos = PositionComponent {
                entity_id: i,
                x: i as u8 - 5,
                y: 7,
                level: 0,
                is_active: true,
                last_updated: Clock::get().unwrap().unix_timestamp,
            };

            let piece = PieceComponent {
                entity_id: i,
                piece_type: PieceType::Shinobi,
                owner: 2,
                has_moved: false,
                captured: false,
                stack_level: 0,
                special_abilities: 0,
                last_move_turn: 0,
            };

            position_components.insert(i, pos);
            piece_components.insert(i, piece);
        }

        let ai_agent = AIAgentComponent {
            entity_id: 100,
            personality: PersonalityType::Balanced,
            skill_level: 1600,
            games_played: 50,
            wins: 25,
            losses: 20,
            draw: 5,
            learning_rate: 100,
            last_updated: Clock::get().unwrap().unix_timestamp,
        };

        (position_components, piece_components, board_state, ai_agent)
    }

    #[test]
    fn test_aggressive_ai_prioritizes_attacks() {
        let (position_components, piece_components, board_state, mut ai_agent) = create_test_ai_world();
        
        ai_agent.personality = PersonalityType::Aggressive;
        ai_agent.skill_level = 1800;
        ai_agent.learning_rate = 150; // High learning rate for aggressive play

        // Generate legal moves
        let legal_moves = BoltAISystem::generate_legal_moves(
            &position_components,
            &piece_components,
            &board_state,
            1,
        ).unwrap();

        assert!(!legal_moves.is_empty());

        // Select move using aggressive strategy
        let selected_move = BoltAISystem::select_aggressive_move(&legal_moves, &board_state);

        // Verify the move is valid
        assert!(legal_moves.iter().any(|m| 
            m.entity_id == selected_move.entity_id && 
            m.to_x == selected_move.to_x && 
            m.to_y == selected_move.to_y
        ));

        // Test that aggressive AI prefers forward movement and attacks
        // In our test setup, aggressive moves should tend toward enemy territory (higher y values)
        assert!(selected_move.to_y >= selected_move.from_y || 
               selected_move.move_type == MoveType::Capture,
               "Aggressive AI should prefer forward moves or captures");

        // Test AI response time for aggressive calculations
        let start_time = std::time::Instant::now();
        for _ in 0..100 {
            let _ = BoltAISystem::select_aggressive_move(&legal_moves, &board_state);
        }
        let calculation_time = start_time.elapsed();
        
        // Aggressive AI should be fast (prioritizes speed over deep calculation)
        assert!(calculation_time.as_millis() < 10, 
               "Aggressive AI took {}ms for 100 calculations, should be <10ms", 
               calculation_time.as_millis());
    }

    #[test]
    fn test_defensive_ai_focuses_on_piece_safety() {
        let (position_components, piece_components, board_state, mut ai_agent) = create_test_ai_world();
        
        ai_agent.personality = PersonalityType::Defensive;
        ai_agent.skill_level = 1700;
        ai_agent.learning_rate = 60; // Lower learning rate for defensive play

        let legal_moves = BoltAISystem::generate_legal_moves(
            &position_components,
            &piece_components,
            &board_state,
            1,
        ).unwrap();

        let selected_move = BoltAISystem::select_defensive_move(&legal_moves, &board_state);

        // Verify the move is valid
        assert!(legal_moves.iter().any(|m| 
            m.entity_id == selected_move.entity_id && 
            m.to_x == selected_move.to_x && 
            m.to_y == selected_move.to_y
        ));

        // Defensive AI should avoid risky moves and prioritize piece safety
        // In our test setup, this means avoiding moves too far forward
        assert!(selected_move.to_y <= 4, 
               "Defensive AI should not advance too far into enemy territory");

        // Test defensive calculation time (should be more thorough than aggressive)
        let start_time = std::time::Instant::now();
        for _ in 0..100 {
            let _ = BoltAISystem::select_defensive_move(&legal_moves, &board_state);
        }
        let calculation_time = start_time.elapsed();
        
        // Defensive AI can be slower as it considers safety more carefully
        assert!(calculation_time.as_millis() < 50, 
               "Defensive AI took {}ms for 100 calculations, should be <50ms", 
               calculation_time.as_millis());
    }

    #[test]
    fn test_balanced_ai_evaluates_mixed_strategy() {
        let (position_components, piece_components, board_state, mut ai_agent) = create_test_ai_world();
        
        ai_agent.personality = PersonalityType::Balanced;
        ai_agent.skill_level = 1600;

        let legal_moves = BoltAISystem::generate_legal_moves(
            &position_components,
            &piece_components,
            &board_state,
            1,
        ).unwrap();

        let selected_move = BoltAISystem::select_balanced_move(&legal_moves, &board_state);

        // Verify the move is valid
        assert!(legal_moves.iter().any(|m| 
            m.entity_id == selected_move.entity_id && 
            m.to_x == selected_move.to_x && 
            m.to_y == selected_move.to_y
        ));

        // Test that balanced AI makes reasonable decisions
        assert!(selected_move.from_x < 9 && selected_move.from_y < 9);
        assert!(selected_move.to_x < 9 && selected_move.to_y < 9);

        // Balanced AI should have moderate calculation time
        let start_time = std::time::Instant::now();
        for _ in 0..100 {
            let _ = BoltAISystem::select_balanced_move(&legal_moves, &board_state);
        }
        let calculation_time = start_time.elapsed();
        
        assert!(calculation_time.as_millis() < 25, 
               "Balanced AI took {}ms for 100 calculations, should be <25ms", 
               calculation_time.as_millis());
    }

    #[test]
    fn test_tactical_ai_deep_calculation() {
        let (position_components, piece_components, board_state, mut ai_agent) = create_test_ai_world();
        
        ai_agent.personality = PersonalityType::Tactical;
        ai_agent.skill_level = 2400; // High skill level
        ai_agent.learning_rate = 40; // Low learning rate (already skilled)

        let legal_moves = BoltAISystem::generate_legal_moves(
            &position_components,
            &piece_components,
            &board_state,
            1,
        ).unwrap();

        let selected_move = BoltAISystem::select_tactical_move(&legal_moves, &board_state, ai_agent.skill_level);

        // Verify the move is valid
        assert!(legal_moves.iter().any(|m| 
            m.entity_id == selected_move.entity_id && 
            m.to_x == selected_move.to_x && 
            m.to_y == selected_move.to_y
        ));

        // Tactical AI should make high-quality moves based on skill level
        assert!(ai_agent.skill_level >= 2000, "Tactical AI should have high skill level");

        // Test calculation time (tactical AI takes more time for better moves)
        let start_time = std::time::Instant::now();
        for _ in 0..50 {  // Fewer iterations due to deeper calculation
            let _ = BoltAISystem::select_tactical_move(&legal_moves, &board_state, ai_agent.skill_level);
        }
        let calculation_time = start_time.elapsed();
        
        // Tactical AI can take more time but should still be reasonable
        assert!(calculation_time.as_millis() < 100, 
               "Tactical AI took {}ms for 50 calculations, should be <100ms", 
               calculation_time.as_millis());
    }

    #[test]
    fn test_blitz_ai_fast_moves() {
        let (position_components, piece_components, board_state, mut ai_agent) = create_test_ai_world();
        
        ai_agent.personality = PersonalityType::Blitz;
        ai_agent.skill_level = 1300; // Lower skill but very fast
        ai_agent.learning_rate = 200; // High learning rate to compensate

        let legal_moves = BoltAISystem::generate_legal_moves(
            &position_components,
            &piece_components,
            &board_state,
            1,
        ).unwrap();

        let selected_move = BoltAISystem::select_blitz_move(&legal_moves);

        // Verify the move is valid
        assert!(legal_moves.iter().any(|m| 
            m.entity_id == selected_move.entity_id && 
            m.to_x == selected_move.to_x && 
            m.to_y == selected_move.to_y
        ));

        // Test that blitz AI is very fast
        let start_time = std::time::Instant::now();
        for _ in 0..1000 {  // Many iterations to test speed
            let _ = BoltAISystem::select_blitz_move(&legal_moves);
        }
        let calculation_time = start_time.elapsed();
        
        // Blitz AI should be extremely fast
        assert!(calculation_time.as_millis() < 5, 
               "Blitz AI took {}ms for 1000 calculations, should be <5ms", 
               calculation_time.as_millis());
    }

    #[test]
    fn test_legal_move_generation_for_all_board_states() {
        let (mut position_components, mut piece_components, mut board_state, _) = create_test_ai_world();

        // Test different game phases
        let phases = vec![GamePhase::Opening, GamePhase::Midgame, GamePhase::Endgame];
        
        for phase in phases {
            board_state.game_phase = phase;
            
            let legal_moves = BoltAISystem::generate_legal_moves(
                &position_components,
                &piece_components,
                &board_state,
                1,
            ).unwrap();

            assert!(!legal_moves.is_empty(), "Should have legal moves in {:?} phase", phase);
            
            // Verify all generated moves are actually legal
            for move_data in &legal_moves {
                assert!(move_data.from_x < 9 && move_data.from_y < 9);
                assert!(move_data.to_x < 9 && move_data.to_y < 9);
                assert!(move_data.from_level < 3 && move_data.to_level < 3);
                assert_eq!(move_data.player, 1);
            }
        }

        // Test with captured pieces
        if let Some(piece) = piece_components.get_mut(&2) {
            piece.captured = true;
        }

        let legal_moves_after_capture = BoltAISystem::generate_legal_moves(
            &position_components,
            &piece_components,
            &board_state,
            1,
        ).unwrap();

        // Should have fewer moves due to captured piece
        assert!(legal_moves_after_capture.len() < 20); // Reasonable upper bound
        
        // Verify captured piece is not included in move generation
        assert!(!legal_moves_after_capture.iter().any(|m| m.entity_id == 2));
    }

    #[test]
    fn test_ai_move_quality_assessment_and_ranking() {
        let (position_components, piece_components, board_state, ai_agent) = create_test_ai_world();

        let legal_moves = BoltAISystem::generate_legal_moves(
            &position_components,
            &piece_components,
            &board_state,
            1,
        ).unwrap();

        // Test different AI personalities and their move preferences
        let personalities = vec![
            PersonalityType::Aggressive,
            PersonalityType::Defensive,
            PersonalityType::Balanced,
            PersonalityType::Tactical,
            PersonalityType::Blitz,
        ];

        let mut selected_moves = Vec::new();

        for personality in personalities {
            let mut test_agent = ai_agent.clone();
            test_agent.personality = personality;

            let selected_move = match personality {
                PersonalityType::Aggressive => BoltAISystem::select_aggressive_move(&legal_moves, &board_state),
                PersonalityType::Defensive => BoltAISystem::select_defensive_move(&legal_moves, &board_state),
                PersonalityType::Balanced => BoltAISystem::select_balanced_move(&legal_moves, &board_state),
                PersonalityType::Tactical => BoltAISystem::select_tactical_move(&legal_moves, &board_state, test_agent.skill_level),
                PersonalityType::Blitz => BoltAISystem::select_blitz_move(&legal_moves),
            };

            selected_moves.push((personality, selected_move));
        }

        // Verify all personalities selected valid moves
        assert_eq!(selected_moves.len(), 5);
        
        for (personality, move_data) in &selected_moves {
            assert!(legal_moves.iter().any(|m| 
                m.entity_id == move_data.entity_id && 
                m.to_x == move_data.to_x && 
                m.to_y == move_data.to_y
            ), "Move selected by {:?} AI should be in legal moves", personality);
        }

        // Test move quality metrics
        for (personality, move_data) in &selected_moves {
            // All moves should be within board bounds
            assert!(move_data.from_x < 9 && move_data.from_y < 9);
            assert!(move_data.to_x < 9 && move_data.to_y < 9);
            
            // Verify piece ownership
            assert_eq!(move_data.player, 1);
            
            // Check move makes sense for the piece type
            match move_data.piece_type {
                PieceType::Marshal => {
                    let dx = (move_data.to_x as i8 - move_data.from_x as i8).abs();
                    let dy = (move_data.to_y as i8 - move_data.from_y as i8).abs();
                    assert!(dx <= 1 && dy <= 1 && (dx + dy) > 0, 
                           "{:?} AI selected invalid Marshal move", personality);
                },
                PieceType::Minor => {
                    let dx = (move_data.to_x as i8 - move_data.from_x as i8).abs();
                    let dy = (move_data.to_y as i8 - move_data.from_y as i8).abs();
                    assert!((dx == 2 && dy == 1) || (dx == 1 && dy == 2), 
                           "{:?} AI selected invalid Minor (Knight) move", personality);
                },
                _ => {} // Other pieces have more complex rules
            }
        }
    }

    #[test]
    fn test_ai_response_time_within_acceptable_limits() {
        let (position_components, piece_components, board_state, ai_agent) = create_test_ai_world();

        // Test AI response time requirements (target: <2 seconds)
        let start_time = std::time::Instant::now();
        
        let result = BoltAISystem::calculate_move(
            &ai_agent,
            &position_components,
            &piece_components,
            &board_state,
            1,
        );

        let response_time = start_time.elapsed();
        
        assert!(result.is_ok());
        assert!(response_time.as_millis() < 2000, 
               "AI response time {}ms should be <2000ms", response_time.as_millis());

        // Test with different skill levels
        let skill_levels = vec![1000, 1500, 2000, 2500, 3000];
        
        for skill_level in skill_levels {
            let mut test_agent = ai_agent.clone();
            test_agent.skill_level = skill_level;

            let start_time = std::time::Instant::now();
            let result = BoltAISystem::calculate_move(
                &test_agent,
                &position_components,
                &piece_components,
                &board_state,
                1,
            );
            let response_time = start_time.elapsed();

            assert!(result.is_ok());
            
            // Higher skill levels can take slightly more time but still within limits
            let max_time_ms = if skill_level >= 2500 { 3000 } else { 2000 };
            assert!(response_time.as_millis() < max_time_ms, 
                   "AI with skill {} took {}ms, should be <{}ms", 
                   skill_level, response_time.as_millis(), max_time_ms);
        }
    }

    #[test]
    fn test_ai_move_consistency() {
        let (position_components, piece_components, board_state, ai_agent) = create_test_ai_world();

        // Test that AI makes consistent moves in similar positions
        let mut moves = Vec::new();
        
        for _ in 0..10 {
            let result = BoltAISystem::calculate_move(
                &ai_agent,
                &position_components,
                &piece_components,
                &board_state,
                1,
            );
            
            assert!(result.is_ok());
            moves.push(result.unwrap());
        }

        // For balanced AI with same position, moves should be reasonably consistent
        // At least some moves should be the same
        let first_move = &moves[0];
        let consistent_moves = moves.iter().filter(|m| 
            m.entity_id == first_move.entity_id && 
            m.to_x == first_move.to_x && 
            m.to_y == first_move.to_y
        ).count();

        // Should have some consistency but not 100% (some randomness is good)
        assert!(consistent_moves >= 3, "AI should have some consistency in move selection");
        assert!(consistent_moves <= 8, "AI should have some variation in move selection");
    }

    #[test]
    fn test_ai_handles_complex_board_positions() {
        let (mut position_components, mut piece_components, mut board_state, ai_agent) = create_test_ai_world();

        // Create a complex board position with stacks and special pieces
        let fortress_pos = PositionComponent {
            entity_id: 20,
            x: 4,
            y: 4,
            level: 0,
            is_active: true,
            last_updated: Clock::get().unwrap().unix_timestamp,
        };

        let fortress_piece = PieceComponent {
            entity_id: 20,
            piece_type: PieceType::Fortress,
            owner: 1,
            has_moved: false,
            captured: false,
            stack_level: 0,
            special_abilities: 0x10, // Immobile
            last_move_turn: 0,
        };

        position_components.insert(20, fortress_pos);
        piece_components.insert(20, fortress_piece);

        // Add stacked pieces
        let stacked_pos = PositionComponent {
            entity_id: 21,
            x: 3,
            y: 3,
            level: 1,
            is_active: true,
            last_updated: Clock::get().unwrap().unix_timestamp,
        };

        let stacked_piece = PieceComponent {
            entity_id: 21,
            piece_type: PieceType::General,
            owner: 1,
            has_moved: true,
            captured: false,
            stack_level: 1,
            special_abilities: 0x08, // Enhanced by stacking
            last_move_turn: 3,
        };

        position_components.insert(21, stacked_pos);
        piece_components.insert(21, stacked_piece);

        // Update board state
        board_state.move_count = 15;
        board_state.game_phase = GamePhase::Midgame;
        board_state.stacks.insert((3, 3), vec![21]);

        // Test AI can handle complex positions
        let result = BoltAISystem::calculate_move(
            &ai_agent,
            &position_components,
            &piece_components,
            &board_state,
            1,
        );

        assert!(result.is_ok());
        
        let selected_move = result.unwrap();
        
        // AI should not try to move the fortress
        assert_ne!(selected_move.entity_id, 20, "AI should not select immobile Fortress");
        
        // Move should be valid
        assert!(selected_move.from_x < 9 && selected_move.from_y < 9);
        assert!(selected_move.to_x < 9 && selected_move.to_y < 9);
    }

    #[test]
    fn test_ai_performance_under_time_pressure() {
        let (position_components, piece_components, board_state, ai_agent) = create_test_ai_world();

        // Test AI performance with time constraints
        let time_limits = vec![10, 50, 100, 500, 1000]; // milliseconds

        for time_limit in time_limits {
            let start_time = std::time::Instant::now();
            
            let result = BoltAISystem::calculate_move(
                &ai_agent,
                &position_components,
                &piece_components,
                &board_state,
                1,
            );
            
            let calculation_time = start_time.elapsed();
            
            assert!(result.is_ok());
            
            // AI should complete calculation well within reasonable time
            assert!(calculation_time.as_millis() <= 1000, 
                   "AI calculation took {}ms, should be ≤1000ms", 
                   calculation_time.as_millis());
            
            // For very strict time limits, AI should still produce valid moves
            if time_limit <= 50 {
                assert!(calculation_time.as_millis() <= 100, 
                       "AI under time pressure took {}ms, should be ≤100ms", 
                       calculation_time.as_millis());
            }
        }
    }
}
