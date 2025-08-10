#[cfg(test)]
mod position_tests {
    use super::super::bolt_ecs::*;
    use std::collections::HashMap;

    #[test]
    fn test_position_component_creation() {
        let position = PositionComponent {
            entity_id: 1,
            x: 4,
            y: 4,
            level: 0,
            is_active: true,
            last_updated: 0,
        };

        assert_eq!(position.x, 4);
        assert_eq!(position.y, 4);
        assert_eq!(position.level, 0);
        assert!(position.is_active);
    }

    #[test]
    fn test_position_bounds_validation() {
        // Valid positions
        assert!(is_valid_position(0, 0, 0));
        assert!(is_valid_position(8, 8, 2));
        assert!(is_valid_position(4, 4, 1));

        // Invalid positions - out of bounds
        assert!(!is_valid_position(9, 4, 0));
        assert!(!is_valid_position(4, 9, 0));
        assert!(!is_valid_position(4, 4, 3));
    }

    #[test]
    fn test_stacking_mechanics_level_0() {
        let mut positions = HashMap::new();
        
        // Place piece at bottom level
        positions.insert(1u64, PositionComponent {
            entity_id: 1,
            x: 4,
            y: 4,
            level: 0,
            is_active: true,
            last_updated: 0,
        });

        let stack_count = count_stack_at_position(&positions, 4, 4);
        assert_eq!(stack_count, 1);
    }

    #[test]
    fn test_stacking_mechanics_3_tier() {
        let mut positions = HashMap::new();
        
        // Place pieces at all three levels
        positions.insert(1u64, PositionComponent {
            entity_id: 1,
            x: 4,
            y: 4,
            level: 0,
            is_active: true,
            last_updated: 0,
        });
        
        positions.insert(2u64, PositionComponent {
            entity_id: 2,
            x: 4,
            y: 4,
            level: 1,
            is_active: true,
            last_updated: 0,
        });
        
        positions.insert(3u64, PositionComponent {
            entity_id: 3,
            x: 4,
            y: 4,
            level: 2,
            is_active: true,
            last_updated: 0,
        });

        let stack_count = count_stack_at_position(&positions, 4, 4);
        assert_eq!(stack_count, 3);
    }

    #[test]
    fn test_stacking_limit_exceeded() {
        let mut positions = HashMap::new();
        
        // Fill all three levels
        for level in 0..3 {
            positions.insert((level + 1) as u64, PositionComponent {
                entity_id: (level + 1) as u64,
                x: 4,
                y: 4,
                level: level as u8,
                is_active: true,
                last_updated: 0,
            });
        }

        // Try to validate placing a 4th piece (should fail)
        let move_data = BoltMoveData {
            entity_id: 4,
            from_x: 3,
            from_y: 3,
            from_level: 0,
            to_x: 4,
            to_y: 4,
            to_level: 0, // Any level should fail
            piece_type: PieceType::Marshal,
            player: 1,
            move_type: MoveType::Stack,
            capture_entity: None,
            stack_operation: StackOperation::PlaceOnTop,
            timestamp: 0,
        };

        let result = BoltMoveSystem::validate_stacking_rules(
            &move_data,
            &positions,
            &HashMap::new(),
        );

        assert!(result.is_err(), "Should reject stacking when limit exceeded");
    }

    #[test]
    fn test_middle_level_placement_validation() {
        let mut positions = HashMap::new();
        
        // Place only bottom piece
        positions.insert(1u64, PositionComponent {
            entity_id: 1,
            x: 4,
            y: 4,
            level: 0,
            is_active: true,
            last_updated: 0,
        });

        let move_data = BoltMoveData {
            entity_id: 2,
            from_x: 3,
            from_y: 3,
            from_level: 0,
            to_x: 4,
            to_y: 4,
            to_level: 1,
            piece_type: PieceType::General,
            player: 1,
            move_type: MoveType::Stack,
            capture_entity: None,
            stack_operation: StackOperation::PlaceInMiddle,
            timestamp: 0,
        };

        // Should succeed - has bottom piece
        let result = BoltMoveSystem::validate_stacking_rules(
            &move_data,
            &positions,
            &HashMap::new(),
        );

        assert!(result.is_ok(), "Should allow middle placement with bottom piece");
    }

    #[test]
    fn test_middle_level_placement_without_bottom() {
        let positions = HashMap::new(); // Empty board
        
        let move_data = BoltMoveData {
            entity_id: 1,
            from_x: 3,
            from_y: 3,
            from_level: 0,
            to_x: 4,
            to_y: 4,
            to_level: 1, // Try to place in middle without bottom
            piece_type: PieceType::General,
            player: 1,
            move_type: MoveType::Stack,
            capture_entity: None,
            stack_operation: StackOperation::PlaceInMiddle,
            timestamp: 0,
        };

        let result = BoltMoveSystem::validate_stacking_rules(
            &move_data,
            &positions,
            &HashMap::new(),
        );

        assert!(result.is_err(), "Should reject middle placement without bottom piece");
    }

    #[test]
    fn test_remove_from_stack_validation() {
        let mut positions = HashMap::new();
        
        // Create a 3-piece stack
        for level in 0..3 {
            positions.insert((level + 1) as u64, PositionComponent {
                entity_id: (level + 1) as u64,
                x: 4,
                y: 4,
                level: level as u8,
                is_active: true,
                last_updated: 0,
            });
        }

        // Try to remove from top (level 2) - should succeed
        let move_data_top = BoltMoveData {
            entity_id: 3,
            from_x: 4,
            from_y: 4,
            from_level: 2, // Top level
            to_x: 5,
            to_y: 5,
            to_level: 0,
            piece_type: PieceType::General,
            player: 1,
            move_type: MoveType::Normal,
            capture_entity: None,
            stack_operation: StackOperation::RemoveFromStack,
            timestamp: 0,
        };

        let result_top = BoltMoveSystem::validate_stacking_rules(
            &move_data_top,
            &positions,
            &HashMap::new(),
        );

        assert!(result_top.is_ok(), "Should allow removal from top of stack");

        // Try to remove from middle (level 1) - should fail
        let move_data_middle = BoltMoveData {
            entity_id: 2,
            from_x: 4,
            from_y: 4,
            from_level: 1, // Middle level
            to_x: 5,
            to_y: 5,
            to_level: 0,
            piece_type: PieceType::General,
            player: 1,
            move_type: MoveType::Normal,
            capture_entity: None,
            stack_operation: StackOperation::RemoveFromStack,
            timestamp: 0,
        };

        let result_middle = BoltMoveSystem::validate_stacking_rules(
            &move_data_middle,
            &positions,
            &HashMap::new(),
        );

        assert!(result_middle.is_err(), "Should reject removal from middle of stack");
    }

    // Helper functions for tests
    fn is_valid_position(x: u8, y: u8, level: u8) -> bool {
        x < 9 && y < 9 && level < 3
    }

    fn count_stack_at_position(positions: &HashMap<u64, PositionComponent>, x: u8, y: u8) -> usize {
        positions
            .values()
            .filter(|pos| pos.x == x && pos.y == y && pos.is_active)
            .count()
    }
}
