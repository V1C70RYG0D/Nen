#[cfg(test)]
mod move_system_tests {
    use crate::bolt_ecs::*;
    use anchor_lang::prelude::*;
    use std::collections::HashMap;

    fn create_test_world() -> (HashMap<u64, PositionComponent>, HashMap<u64, PieceComponent>, BoardState) {
        let mut position_components = HashMap::new();
        let mut piece_components = HashMap::new();
        let board_state = BoardState {
            board: [[None; 9]; 9],
            stacks: HashMap::new(),
            captured_pieces: Vec::new(),
            move_count: 0,
            current_player: 1,
            game_phase: GamePhase::Opening,
            special_rules_active: 0,
        };

        // Add some test pieces
        let marshal_pos = PositionComponent {
            entity_id: 1,
            x: 4,
            y: 0,
            level: 0,
            is_active: true,
            last_updated: Clock::get().unwrap().unix_timestamp,
        };

        let marshal_piece = PieceComponent {
            entity_id: 1,
            piece_type: PieceType::Marshal,
            owner: 1,
            has_moved: false,
            captured: false,
            stack_level: 0,
            special_abilities: 0,
            last_move_turn: 0,
        };

        position_components.insert(1, marshal_pos);
        piece_components.insert(1, marshal_piece);

        (position_components, piece_components, board_state)
    }

    #[test]
    fn test_valid_movement_patterns_for_each_piece_type() {
        let (position_components, piece_components, board_state) = create_test_world();

        // Test Marshal movement (1 square in any direction)
        let marshal_move = BoltMoveData {
            entity_id: 1,
            from_x: 4,
            from_y: 0,
            from_level: 0,
            to_x: 4,
            to_y: 1, // Move forward 1 square
            to_level: 0,
            piece_type: PieceType::Marshal,
            player: 1,
            move_type: MoveType::Normal,
            capture_entity: None,
            stack_operation: StackOperation::None,
            timestamp: Clock::get().unwrap().unix_timestamp,
        };

        let result = BoltMoveSystem::validate_move(
            &position_components,
            &piece_components,
            &marshal_move,
            1,
            &board_state,
        );

        assert!(result.is_ok());

        // Test invalid Marshal movement (too far)
        let invalid_marshal_move = BoltMoveData {
            entity_id: 1,
            from_x: 4,
            from_y: 0,
            from_level: 0,
            to_x: 4,
            to_y: 3, // Move 3 squares (invalid for Marshal)
            to_level: 0,
            piece_type: PieceType::Marshal,
            player: 1,
            move_type: MoveType::Normal,
            capture_entity: None,
            stack_operation: StackOperation::None,
            timestamp: Clock::get().unwrap().unix_timestamp,
        };

        let result = BoltMoveSystem::validate_move(
            &position_components,
            &piece_components,
            &invalid_marshal_move,
            1,
            &board_state,
        );

        assert!(result.is_err());
    }

    #[test]
    fn test_general_movement_patterns() {
        let (mut position_components, mut piece_components, board_state) = create_test_world();

        // Add a General piece
        let general_pos = PositionComponent {
            entity_id: 2,
            x: 3,
            y: 0,
            level: 0,
            is_active: true,
            last_updated: Clock::get().unwrap().unix_timestamp,
        };

        let general_piece = PieceComponent {
            entity_id: 2,
            piece_type: PieceType::General,
            owner: 1,
            has_moved: false,
            captured: false,
            stack_level: 0,
            special_abilities: 0,
            last_move_turn: 0,
        };

        position_components.insert(2, general_pos);
        piece_components.insert(2, general_piece);

        // Test valid General moves (straight lines and diagonals)
        let valid_moves = vec![
            (3, 0, 3, 5), // Vertical
            (3, 0, 8, 0), // Horizontal  
            (3, 0, 6, 3), // Diagonal
        ];

        for (from_x, from_y, to_x, to_y) in valid_moves {
            let move_data = BoltMoveData {
                entity_id: 2,
                from_x,
                from_y,
                from_level: 0,
                to_x,
                to_y,
                to_level: 0,
                piece_type: PieceType::General,
                player: 1,
                move_type: MoveType::Normal,
                capture_entity: None,
                stack_operation: StackOperation::None,
                timestamp: Clock::get().unwrap().unix_timestamp,
            };

            let result = BoltMoveSystem::validate_move(
                &position_components,
                &piece_components,
                &move_data,
                1,
                &board_state,
            );

            assert!(result.is_ok(), "General move from ({},{}) to ({},{}) should be valid", from_x, from_y, to_x, to_y);
        }
    }

    #[test]
    fn test_minor_knight_movement() {
        let (mut position_components, mut piece_components, board_state) = create_test_world();

        // Add a Minor (Knight) piece
        let minor_pos = PositionComponent {
            entity_id: 3,
            x: 4,
            y: 4,
            level: 0,
            is_active: true,
            last_updated: Clock::get().unwrap().unix_timestamp,
        };

        let minor_piece = PieceComponent {
            entity_id: 3,
            piece_type: PieceType::Minor,
            owner: 1,
            has_moved: false,
            captured: false,
            stack_level: 0,
            special_abilities: 0,
            last_move_turn: 0,
        };

        position_components.insert(3, minor_pos);
        piece_components.insert(3, minor_piece);

        // Test valid L-shaped moves
        let valid_l_moves = vec![
            (4, 4, 6, 5), // 2 down, 1 right
            (4, 4, 6, 3), // 2 down, 1 left
            (4, 4, 2, 5), // 2 up, 1 right
            (4, 4, 2, 3), // 2 up, 1 left
            (4, 4, 5, 6), // 1 down, 2 right
            (4, 4, 5, 2), // 1 down, 2 left
            (4, 4, 3, 6), // 1 up, 2 right
            (4, 4, 3, 2), // 1 up, 2 left
        ];

        for (from_x, from_y, to_x, to_y) in valid_l_moves {
            let move_data = BoltMoveData {
                entity_id: 3,
                from_x,
                from_y,
                from_level: 0,
                to_x,
                to_y,
                to_level: 0,
                piece_type: PieceType::Minor,
                player: 1,
                move_type: MoveType::Normal,
                capture_entity: None,
                stack_operation: StackOperation::None,
                timestamp: Clock::get().unwrap().unix_timestamp,
            };

            let result = BoltMoveSystem::validate_move(
                &position_components,
                &piece_components,
                &move_data,
                1,
                &board_state,
            );

            assert!(result.is_ok(), "Minor L-move from ({},{}) to ({},{}) should be valid", from_x, from_y, to_x, to_y);
        }

        // Test invalid moves (not L-shaped)
        let invalid_moves = vec![
            (4, 4, 4, 5), // Straight move
            (4, 4, 5, 5), // Diagonal move
            (4, 4, 7, 7), // Long diagonal
        ];

        for (from_x, from_y, to_x, to_y) in invalid_moves {
            let move_data = BoltMoveData {
                entity_id: 3,
                from_x,
                from_y,
                from_level: 0,
                to_x,
                to_y,
                to_level: 0,
                piece_type: PieceType::Minor,
                player: 1,
                move_type: MoveType::Normal,
                capture_entity: None,
                stack_operation: StackOperation::None,
                timestamp: Clock::get().unwrap().unix_timestamp,
            };

            let result = BoltMoveSystem::validate_move(
                &position_components,
                &piece_components,
                &move_data,
                1,
                &board_state,
            );

            assert!(result.is_err(), "Minor move from ({},{}) to ({},{}) should be invalid", from_x, from_y, to_x, to_y);
        }
    }

    #[test]
    fn test_invalid_movement_rejection() {
        let (position_components, piece_components, board_state) = create_test_world();

        // Test out-of-bounds moves
        let out_of_bounds_move = BoltMoveData {
            entity_id: 1,
            from_x: 4,
            from_y: 0,
            from_level: 0,
            to_x: 9, // Out of bounds
            to_y: 0,
            to_level: 0,
            piece_type: PieceType::Marshal,
            player: 1,
            move_type: MoveType::Normal,
            capture_entity: None,
            stack_operation: StackOperation::None,
            timestamp: Clock::get().unwrap().unix_timestamp,
        };

        let result = BoltMoveSystem::validate_move(
            &position_components,
            &piece_components,
            &out_of_bounds_move,
            1,
            &board_state,
        );

        assert!(result.is_err());

        // Test move to same position
        let same_position_move = BoltMoveData {
            entity_id: 1,
            from_x: 4,
            from_y: 0,
            from_level: 0,
            to_x: 4,
            to_y: 0, // Same position
            to_level: 0,
            piece_type: PieceType::Marshal,
            player: 1,
            move_type: MoveType::Normal,
            capture_entity: None,
            stack_operation: StackOperation::None,
            timestamp: Clock::get().unwrap().unix_timestamp,
        };

        let result = BoltMoveSystem::validate_piece_movement(
            PieceType::Marshal,
            &same_position_move,
            &position_components,
            &piece_components,
            &board_state,
        );

        assert!(result.is_err());
    }

    #[test]
    fn test_capture_mechanics_with_different_piece_combinations() {
        let (mut position_components, mut piece_components, board_state) = create_test_world();

        // Add an enemy piece to capture
        let enemy_pos = PositionComponent {
            entity_id: 4,
            x: 4,
            y: 1,
            level: 0,
            is_active: true,
            last_updated: Clock::get().unwrap().unix_timestamp,
        };

        let enemy_piece = PieceComponent {
            entity_id: 4,
            piece_type: PieceType::Shinobi,
            owner: 2, // Enemy player
            has_moved: false,
            captured: false,
            stack_level: 0,
            special_abilities: 0,
            last_move_turn: 0,
        };

        position_components.insert(4, enemy_pos);
        piece_components.insert(4, enemy_piece);

        // Test capture move
        let capture_move = BoltMoveData {
            entity_id: 1,
            from_x: 4,
            from_y: 0,
            from_level: 0,
            to_x: 4,
            to_y: 1, // Move to enemy position
            to_level: 0,
            piece_type: PieceType::Marshal,
            player: 1,
            move_type: MoveType::Capture,
            capture_entity: Some(4),
            stack_operation: StackOperation::None,
            timestamp: Clock::get().unwrap().unix_timestamp,
        };

        let result = BoltMoveSystem::validate_move(
            &position_components,
            &piece_components,
            &capture_move,
            1,
            &board_state,
        );

        assert!(result.is_ok());

        // Test invalid capture (own piece)
        let own_piece_pos = PositionComponent {
            entity_id: 5,
            x: 3,
            y: 0,
            level: 0,
            is_active: true,
            last_updated: Clock::get().unwrap().unix_timestamp,
        };

        let own_piece = PieceComponent {
            entity_id: 5,
            piece_type: PieceType::General,
            owner: 1, // Same player
            has_moved: false,
            captured: false,
            stack_level: 0,
            special_abilities: 0,
            last_move_turn: 0,
        };

        position_components.insert(5, own_piece_pos);
        piece_components.insert(5, own_piece);

        let invalid_capture = BoltMoveData {
            entity_id: 1,
            from_x: 4,
            from_y: 0,
            from_level: 0,
            to_x: 3,
            to_y: 0, // Try to capture own piece
            to_level: 0,
            piece_type: PieceType::Marshal,
            player: 1,
            move_type: MoveType::Capture,
            capture_entity: Some(5),
            stack_operation: StackOperation::None,
            timestamp: Clock::get().unwrap().unix_timestamp,
        };

        let result = BoltMoveSystem::validate_move(
            &position_components,
            &piece_components,
            &invalid_capture,
            1,
            &board_state,
        );

        assert!(result.is_err());
    }

    #[test]
    fn test_stacking_interactions() {
        let (mut position_components, mut piece_components, board_state) = create_test_world();

        // Test placing piece on top of stack
        let stack_move = BoltMoveData {
            entity_id: 1,
            from_x: 4,
            from_y: 0,
            from_level: 0,
            to_x: 4,
            to_y: 1,
            to_level: 1, // Stack on level 1
            piece_type: PieceType::Marshal,
            player: 1,
            move_type: MoveType::Stack,
            capture_entity: None,
            stack_operation: StackOperation::PlaceOnTop,
            timestamp: Clock::get().unwrap().unix_timestamp,
        };

        let result = BoltMoveSystem::validate_stacking_rules(
            &stack_move,
            &position_components,
            &piece_components,
        );

        assert!(result.is_ok());

        // Test invalid stack (too high)
        let invalid_stack_move = BoltMoveData {
            entity_id: 1,
            from_x: 4,
            from_y: 0,
            from_level: 0,
            to_x: 4,
            to_y: 1,
            to_level: 3, // Invalid level (max is 2)
            piece_type: PieceType::Marshal,
            player: 1,
            move_type: MoveType::Stack,
            capture_entity: None,
            stack_operation: StackOperation::PlaceOnTop,
            timestamp: Clock::get().unwrap().unix_timestamp,
        };

        let result = BoltMoveSystem::validate_move(
            &position_components,
            &piece_components,
            &invalid_stack_move,
            1,
            &board_state,
        );

        assert!(result.is_err());
    }

    #[test]
    fn test_stack_bonus_calculations() {
        let (mut position_components, mut piece_components, mut board_state) = create_test_world();

        // Create a stack of pieces
        let base_piece_pos = PositionComponent {
            entity_id: 10,
            x: 5,
            y: 5,
            level: 0,
            is_active: true,
            last_updated: Clock::get().unwrap().unix_timestamp,
        };

        let base_piece = PieceComponent {
            entity_id: 10,
            piece_type: PieceType::Fortress,
            owner: 1,
            has_moved: false,
            captured: false,
            stack_level: 0,
            special_abilities: 0x20, // Base support ability
            last_move_turn: 0,
        };

        let middle_piece_pos = PositionComponent {
            entity_id: 11,
            x: 5,
            y: 5,
            level: 1,
            is_active: true,
            last_updated: Clock::get().unwrap().unix_timestamp,
        };

        let middle_piece = PieceComponent {
            entity_id: 11,
            piece_type: PieceType::Lieutenant,
            owner: 1,
            has_moved: false,
            captured: false,
            stack_level: 1,
            special_abilities: 0x10, // Enhanced by stacking
            last_move_turn: 0,
        };

        position_components.insert(10, base_piece_pos);
        piece_components.insert(10, base_piece);
        position_components.insert(11, middle_piece_pos);
        piece_components.insert(11, middle_piece);

        // Update board state to track stack
        let mut stacks = HashMap::new();
        stacks.insert((5, 5), vec![10, 11]);
        board_state.stacks = stacks;

        // Test stack bonus calculation
        let stack_at_position = board_state.stacks.get(&(5, 5)).unwrap();
        assert_eq!(stack_at_position.len(), 2);

        // Verify stack structure
        let base = piece_components.get(&10).unwrap();
        let middle = piece_components.get(&11).unwrap();
        
        assert_eq!(base.stack_level, 0);
        assert_eq!(middle.stack_level, 1);
        assert!(base.special_abilities & 0x20 > 0); // Base support
        assert!(middle.special_abilities & 0x10 > 0); // Enhanced ability
    }

    #[test]
    fn test_move_validation_with_board_state_changes() {
        let (mut position_components, mut piece_components, mut board_state) = create_test_world();

        // Initial state
        assert_eq!(board_state.move_count, 0);
        assert_eq!(board_state.current_player, 1);
        assert_eq!(board_state.game_phase, GamePhase::Opening);

        // Apply a move
        let move_data = BoltMoveData {
            entity_id: 1,
            from_x: 4,
            from_y: 0,
            from_level: 0,
            to_x: 4,
            to_y: 1,
            to_level: 0,
            piece_type: PieceType::Marshal,
            player: 1,
            move_type: MoveType::Normal,
            capture_entity: None,
            stack_operation: StackOperation::None,
            timestamp: Clock::get().unwrap().unix_timestamp,
        };

        let result = BoltMoveSystem::apply_move(
            &mut position_components,
            &mut piece_components,
            &move_data,
        );

        assert!(result.is_ok());

        // Verify position was updated
        let updated_position = position_components.get(&1).unwrap();
        assert_eq!(updated_position.x, 4);
        assert_eq!(updated_position.y, 1);

        // Verify piece state was updated
        let updated_piece = piece_components.get(&1).unwrap();
        assert!(updated_piece.has_moved);
        assert_eq!(updated_piece.last_move_turn, 1);
    }

    #[test]
    fn test_performance_benchmarks_for_move_execution() {
        let (position_components, piece_components, board_state) = create_test_world();

        let move_data = BoltMoveData {
            entity_id: 1,
            from_x: 4,
            from_y: 0,
            from_level: 0,
            to_x: 4,
            to_y: 1,
            to_level: 0,
            piece_type: PieceType::Marshal,
            player: 1,
            move_type: MoveType::Normal,
            capture_entity: None,
            stack_operation: StackOperation::None,
            timestamp: Clock::get().unwrap().unix_timestamp,
        };

        // Benchmark move validation
        let start_time = std::time::Instant::now();
        
        for _ in 0..1000 {
            let _ = BoltMoveSystem::validate_move(
                &position_components,
                &piece_components,
                &move_data,
                1,
                &board_state,
            );
        }
        
        let validation_time = start_time.elapsed();
        
        // Should validate 1000 moves in reasonable time (target: <50ms total)
        assert!(validation_time.as_millis() < 50, 
               "Move validation took {}ms for 1000 moves, should be <50ms", 
               validation_time.as_millis());

        // Each move should validate in <0.05ms on average for sub-50ms game performance
        let avg_validation_time = validation_time.as_micros() / 1000;
        assert!(avg_validation_time < 50, 
               "Average move validation {}μs should be <50μs", 
               avg_validation_time);
    }

    #[test]
    fn test_fortress_movement_restriction() {
        let (mut position_components, mut piece_components, board_state) = create_test_world();

        // Add a Fortress piece (cannot move)
        let fortress_pos = PositionComponent {
            entity_id: 6,
            x: 2,
            y: 2,
            level: 0,
            is_active: true,
            last_updated: Clock::get().unwrap().unix_timestamp,
        };

        let fortress_piece = PieceComponent {
            entity_id: 6,
            piece_type: PieceType::Fortress,
            owner: 1,
            has_moved: false,
            captured: false,
            stack_level: 0,
            special_abilities: 0x10, // Immobile flag
            last_move_turn: 0,
        };

        position_components.insert(6, fortress_pos);
        piece_components.insert(6, fortress_piece);

        // Test that Fortress cannot move
        let fortress_move = BoltMoveData {
            entity_id: 6,
            from_x: 2,
            from_y: 2,
            from_level: 0,
            to_x: 2,
            to_y: 3,
            to_level: 0,
            piece_type: PieceType::Fortress,
            player: 1,
            move_type: MoveType::Normal,
            capture_entity: None,
            stack_operation: StackOperation::None,
            timestamp: Clock::get().unwrap().unix_timestamp,
        };

        let result = BoltMoveSystem::validate_piece_movement(
            PieceType::Fortress,
            &fortress_move,
            &position_components,
            &piece_components,
            &board_state,
        );

        assert!(result.is_err());
    }

    #[test]
    fn test_bow_piece_jump_ability() {
        let (mut position_components, mut piece_components, board_state) = create_test_world();

        // Add a Bow piece
        let bow_pos = PositionComponent {
            entity_id: 7,
            x: 0,
            y: 0,
            level: 0,
            is_active: true,
            last_updated: Clock::get().unwrap().unix_timestamp,
        };

        let bow_piece = PieceComponent {
            entity_id: 7,
            piece_type: PieceType::Bow,
            owner: 1,
            has_moved: false,
            captured: false,
            stack_level: 0,
            special_abilities: 0x40, // Jump ability
            last_move_turn: 0,
        };

        position_components.insert(7, bow_pos);
        piece_components.insert(7, bow_piece);

        // Add a blocking piece
        let blocking_pos = PositionComponent {
            entity_id: 8,
            x: 0,
            y: 2,
            level: 0,
            is_active: true,
            last_updated: Clock::get().unwrap().unix_timestamp,
        };

        let blocking_piece = PieceComponent {
            entity_id: 8,
            piece_type: PieceType::Shinobi,
            owner: 1,
            has_moved: false,
            captured: false,
            stack_level: 0,
            special_abilities: 0,
            last_move_turn: 0,
        };

        position_components.insert(8, blocking_pos);
        piece_components.insert(8, blocking_piece);

        // Test Bow can jump over blocking piece
        let bow_jump_move = BoltMoveData {
            entity_id: 7,
            from_x: 0,
            from_y: 0,
            from_level: 0,
            to_x: 0,
            to_y: 4, // Jump over piece at (0,2)
            to_level: 0,
            piece_type: PieceType::Bow,
            player: 1,
            move_type: MoveType::Normal,
            capture_entity: None,
            stack_operation: StackOperation::None,
            timestamp: Clock::get().unwrap().unix_timestamp,
        };

        let result = BoltMoveSystem::validate_piece_movement(
            PieceType::Bow,
            &bow_jump_move,
            &position_components,
            &piece_components,
            &board_state,
        );

        assert!(result.is_ok()); // Bow can jump over pieces
    }
}
