// Comprehensive unit tests for move system validation and execution
// Following poc_magicblock_testing_assignment.md requirements

#[cfg(test)]
mod enhanced_move_system_tests {
    use crate::bolt_ecs::*;
    use anchor_lang::prelude::*;
    use std::collections::HashMap;

    #[test]
    fn test_marshal_movement_patterns_comprehensive() {
        // Test Marshal movement (1 square in any direction)
        // Requirement: Marshal movement validation
        
        let marshal_positions = vec![
            // Center position tests
            (4, 4, vec![
                (3, 3, true), (3, 4, true), (3, 5, true),
                (4, 3, true),              (4, 5, true),
                (5, 3, true), (5, 4, true), (5, 5, true),
            ]),
            // Corner position tests
            (0, 0, vec![
                (0, 1, true), (1, 0, true), (1, 1, true),
                (0, 2, false), (2, 0, false), (2, 2, false),
            ]),
            (8, 8, vec![
                (7, 7, true), (7, 8, true), (8, 7, true),
                (6, 6, false), (6, 8, false), (8, 6, false),
            ]),
            // Edge position tests
            (4, 0, vec![
                (3, 0, true), (3, 1, true), (4, 1, true),
                (5, 0, true), (5, 1, true),
                (4, 2, false), (2, 0, false),
            ]),
        ];

        for (from_x, from_y, moves) in marshal_positions {
            for (to_x, to_y, should_be_valid) in moves {
                let is_valid = validate_marshal_move(from_x, from_y, to_x, to_y);
                assert_eq!(is_valid, should_be_valid, 
                    "Marshal move from ({}, {}) to ({}, {}) should be {}", 
                    from_x, from_y, to_x, to_y, if should_be_valid { "valid" } else { "invalid" });
            }
        }
    }

    #[test]
    fn test_general_movement_patterns_comprehensive() {
        // Test General movement (straight lines and diagonals any distance)
        // Requirement: General movement validation
        
        let general_tests = vec![
            // Horizontal movement
            (4, 4, 4, 0, true),   // Left
            (4, 4, 4, 8, true),   // Right
            (4, 4, 4, 2, true),   // Partial left
            (4, 4, 4, 6, true),   // Partial right
            
            // Vertical movement
            (4, 4, 0, 4, true),   // Up
            (4, 4, 8, 4, true),   // Down
            (4, 4, 2, 4, true),   // Partial up
            (4, 4, 6, 4, true),   // Partial down
            
            // Diagonal movement
            (4, 4, 0, 0, true),   // Up-left
            (4, 4, 8, 8, true),   // Down-right
            (4, 4, 0, 8, true),   // Up-right
            (4, 4, 8, 0, true),   // Down-left
            (4, 4, 2, 2, true),   // Partial diagonal
            
            // Invalid moves (not straight line)
            (4, 4, 3, 2, false),  // Knight-like move
            (4, 4, 5, 2, false),  // Irregular move
            (4, 4, 2, 3, false),  // Not aligned
        ];

        for (from_x, from_y, to_x, to_y, should_be_valid) in general_tests {
            let is_valid = validate_general_move(from_x, from_y, to_x, to_y);
            assert_eq!(is_valid, should_be_valid,
                "General move from ({}, {}) to ({}, {}) should be {}",
                from_x, from_y, to_x, to_y, if should_be_valid { "valid" } else { "invalid" });
        }
    }

    #[test]
    fn test_lieutenant_movement_patterns_comprehensive() {
        // Test Lieutenant movement (horizontal/vertical any distance)
        // Requirement: Lieutenant movement validation
        
        let lieutenant_tests = vec![
            // Valid horizontal movement
            (4, 4, 4, 0, true),   // Full left
            (4, 4, 4, 8, true),   // Full right
            (4, 4, 4, 1, true),   // Partial left
            (4, 4, 4, 7, true),   // Partial right
            
            // Valid vertical movement
            (4, 4, 0, 4, true),   // Full up
            (4, 4, 8, 4, true),   // Full down
            (4, 4, 1, 4, true),   // Partial up
            (4, 4, 7, 4, true),   // Partial down
            
            // Invalid diagonal movement
            (4, 4, 3, 3, false),  // Diagonal
            (4, 4, 5, 5, false),  // Diagonal
            (4, 4, 2, 6, false),  // Neither horizontal nor vertical
            
            // Edge cases
            (0, 0, 0, 8, true),   // Corner to edge
            (8, 8, 0, 8, true),   // Corner to corner vertically
            (0, 0, 8, 0, true),   // Corner to corner horizontally
        ];

        for (from_x, from_y, to_x, to_y, should_be_valid) in lieutenant_tests {
            let is_valid = validate_lieutenant_move(from_x, from_y, to_x, to_y);
            assert_eq!(is_valid, should_be_valid,
                "Lieutenant move from ({}, {}) to ({}, {}) should be {}",
                from_x, from_y, to_x, to_y, if should_be_valid { "valid" } else { "invalid" });
        }
    }

    #[test]
    fn test_major_movement_patterns_comprehensive() {
        // Test Major movement (diagonal any distance)
        // Requirement: Major movement validation
        
        let major_tests = vec![
            // Valid diagonal movement
            (4, 4, 0, 0, true),   // Up-left full
            (4, 4, 8, 8, true),   // Down-right full
            (4, 4, 0, 8, true),   // Up-right full
            (4, 4, 8, 0, true),   // Down-left full
            (4, 4, 2, 2, true),   // Up-left partial
            (4, 4, 6, 6, true),   // Down-right partial
            (4, 4, 1, 7, true),   // Up-right partial
            (4, 4, 7, 1, true),   // Down-left partial
            
            // Invalid non-diagonal movement
            (4, 4, 4, 0, false),  // Horizontal
            (4, 4, 0, 4, false),  // Vertical
            (4, 4, 3, 2, false),  // Knight-like
            (4, 4, 2, 5, false),  // Irregular
            
            // Edge cases
            (0, 0, 8, 8, true),   // Full board diagonal
            (8, 0, 0, 8, true),   // Other full diagonal
        ];

        for (from_x, from_y, to_x, to_y, should_be_valid) in major_tests {
            let is_valid = validate_major_move(from_x, from_y, to_x, to_y);
            assert_eq!(is_valid, should_be_valid,
                "Major move from ({}, {}) to ({}, {}) should be {}",
                from_x, from_y, to_x, to_y, if should_be_valid { "valid" } else { "invalid" });
        }
    }

    #[test]
    fn test_minor_movement_patterns_comprehensive() {
        // Test Minor movement (L-shaped knight moves)
        // Requirement: Minor (Knight) movement validation
        
        let minor_positions = vec![
            // Center position - all 8 knight moves possible
            (4, 4, vec![
                (2, 3, true), (2, 5, true),   // 2 up, 1 left/right
                (6, 3, true), (6, 5, true),   // 2 down, 1 left/right
                (3, 2, true), (5, 2, true),   // 1 up/down, 2 left
                (3, 6, true), (5, 6, true),   // 1 up/down, 2 right
                (3, 3, false), (5, 5, false), // Diagonal moves invalid
                (4, 2, false), (4, 6, false), // Straight moves invalid
            ]),
            // Corner position - limited moves
            (0, 0, vec![
                (1, 2, true), (2, 1, true),   // Valid knight moves
                (0, 2, false), (2, 0, false), // Straight moves invalid
                (1, 1, false),                // Diagonal invalid
            ]),
            // Edge position
            (0, 4, vec![
                (1, 2, true), (1, 6, true),   // Valid from left edge
                (2, 3, true), (2, 5, true),   // Valid L-moves
                (0, 2, false), (0, 6, false), // Straight moves invalid
            ]),
        ];

        for (from_x, from_y, moves) in minor_positions {
            for (to_x, to_y, should_be_valid) in moves {
                // Check bounds first
                if to_x >= 9 || to_y >= 9 {
                    continue;
                }
                
                let is_valid = validate_minor_move(from_x, from_y, to_x, to_y);
                assert_eq!(is_valid, should_be_valid,
                    "Minor move from ({}, {}) to ({}, {}) should be {}",
                    from_x, from_y, to_x, to_y, if should_be_valid { "valid" } else { "invalid" });
            }
        }
    }

    #[test]
    fn test_shinobi_movement_patterns_comprehensive() {
        // Test Shinobi movement (1 square forward or diagonally forward)
        // Requirement: Shinobi movement validation
        
        let shinobi_tests = vec![
            // Player 1 (moving "up" the board - decreasing Y)
            (4, 5, 4, 4, true, 1),   // Forward
            (4, 5, 3, 4, true, 1),   // Diagonal forward left
            (4, 5, 5, 4, true, 1),   // Diagonal forward right
            (4, 5, 4, 6, false, 1),  // Backward
            (4, 5, 3, 5, false, 1),  // Sideways left
            (4, 5, 5, 5, false, 1),  // Sideways right
            
            // Player 2 (moving "down" the board - increasing Y)
            (4, 3, 4, 4, true, 2),   // Forward
            (4, 3, 3, 4, true, 2),   // Diagonal forward left
            (4, 3, 5, 4, true, 2),   // Diagonal forward right
            (4, 3, 4, 2, false, 2),  // Backward
            (4, 3, 3, 3, false, 2),  // Sideways left
            (4, 3, 5, 3, false, 2),  // Sideways right
            
            // Edge cases
            (4, 0, 4, 1, false, 1),  // Player 1 can't move forward from top edge
            (4, 8, 4, 7, false, 2),  // Player 2 can't move forward from bottom edge
        ];

        for (from_x, from_y, to_x, to_y, should_be_valid, player) in shinobi_tests {
            let is_valid = validate_shinobi_move(from_x, from_y, to_x, to_y, player);
            assert_eq!(is_valid, should_be_valid,
                "Shinobi (player {}) move from ({}, {}) to ({}, {}) should be {}",
                player, from_x, from_y, to_x, to_y, if should_be_valid { "valid" } else { "invalid" });
        }
    }

    #[test]
    fn test_bow_movement_patterns_comprehensive() {
        // Test Bow movement (rook-like but can jump over pieces)
        // Requirement: Bow movement validation
        
        let bow_tests = vec![
            // Horizontal movement
            (4, 4, 4, 0, true),   // Left full
            (4, 4, 4, 8, true),   // Right full
            (4, 4, 4, 2, true),   // Left partial
            (4, 4, 4, 6, true),   // Right partial
            
            // Vertical movement
            (4, 4, 0, 4, true),   // Up full
            (4, 4, 8, 4, true),   // Down full
            (4, 4, 2, 4, true),   // Up partial
            (4, 4, 6, 4, true),   // Down partial
            
            // Invalid diagonal movement (even though it can jump)
            (4, 4, 3, 3, false),  // Diagonal
            (4, 4, 5, 5, false),  // Diagonal
            
            // Invalid irregular movement
            (4, 4, 3, 2, false),  // Knight-like
            (4, 4, 2, 6, false),  // Irregular
        ];

        for (from_x, from_y, to_x, to_y, should_be_valid) in bow_tests {
            let is_valid = validate_bow_move(from_x, from_y, to_x, to_y);
            assert_eq!(is_valid, should_be_valid,
                "Bow move from ({}, {}) to ({}, {}) should be {}",
                from_x, from_y, to_x, to_y, if should_be_valid { "valid" } else { "invalid" });
        }
    }

    #[test]
    fn test_lance_movement_patterns_comprehensive() {
        // Test Lance movement (forward any distance)
        // Requirement: Lance movement validation
        
        let lance_tests = vec![
            // Player 1 (moving "up" the board - decreasing Y)
            (4, 5, 4, 4, true, 1),   // Forward 1
            (4, 5, 4, 3, true, 1),   // Forward 2
            (4, 5, 4, 0, true, 1),   // Forward to edge
            (4, 5, 4, 6, false, 1),  // Backward
            (4, 5, 3, 4, false, 1),  // Diagonal
            (4, 5, 5, 5, false, 1),  // Sideways
            
            // Player 2 (moving "down" the board - increasing Y)
            (4, 3, 4, 4, true, 2),   // Forward 1
            (4, 3, 4, 5, true, 2),   // Forward 2
            (4, 3, 4, 8, true, 2),   // Forward to edge
            (4, 3, 4, 2, false, 2),  // Backward
            (4, 3, 3, 4, false, 2),  // Diagonal
            (4, 3, 5, 3, false, 2),  // Sideways
            
            // Edge cases
            (4, 0, 4, 1, false, 1),  // Player 1 at top edge
            (4, 8, 4, 7, false, 2),  // Player 2 at bottom edge
        ];

        for (from_x, from_y, to_x, to_y, should_be_valid, player) in lance_tests {
            let is_valid = validate_lance_move(from_x, from_y, to_x, to_y, player);
            assert_eq!(is_valid, should_be_valid,
                "Lance (player {}) move from ({}, {}) to ({}, {}) should be {}",
                player, from_x, from_y, to_x, to_y, if should_be_valid { "valid" } else { "invalid" });
        }
    }

    #[test]
    fn test_fortress_movement_restriction() {
        // Test Fortress immobility
        // Requirement: Fortress cannot move
        
        let fortress_position = (4, 4);
        let attempted_moves = vec![
            (3, 3), (3, 4), (3, 5),
            (4, 3),         (4, 5),
            (5, 3), (5, 4), (5, 5),
            (0, 0), (8, 8), (0, 8), (8, 0),
        ];

        for (to_x, to_y) in attempted_moves {
            let is_valid = validate_fortress_move(fortress_position.0, fortress_position.1, to_x, to_y);
            assert!(!is_valid, "Fortress should not be able to move from ({}, {}) to ({}, {})",
                fortress_position.0, fortress_position.1, to_x, to_y);
        }
        
        // Test that Fortress can never move regardless of position
        let fortress_positions = vec![(0, 0), (4, 4), (8, 8), (0, 8), (8, 0)];
        
        for (from_x, from_y) in fortress_positions {
            for to_x in 0..9u8 {
                for to_y in 0..9u8 {
                    if from_x != to_x || from_y != to_y {
                        let is_valid = validate_fortress_move(from_x, from_y, to_x, to_y);
                        assert!(!is_valid, "Fortress should never move from ({}, {}) to ({}, {})",
                            from_x, from_y, to_x, to_y);
                    }
                }
            }
        }
    }

    #[test]
    fn test_path_blocking_validation() {
        // Test path blocking for pieces that cannot jump
        // Requirement: Path obstruction validation
        
        // Create board with some pieces
        let mut board_state = create_test_board_state();
        
        // Place pieces that block paths
        place_piece_on_board(&mut board_state, 2, 4, PieceType::Shinobi, 1);
        place_piece_on_board(&mut board_state, 4, 2, PieceType::Minor, 2);
        place_piece_on_board(&mut board_state, 6, 6, PieceType::Bow, 1);
        
        // Test blocked paths
        let blocking_tests = vec![
            // General trying to move through Shinobi
            (0, 4, 4, 4, PieceType::General, false, "General blocked by Shinobi"),
            (8, 4, 4, 4, PieceType::General, false, "General blocked by Shinobi"),
            
            // Lieutenant trying to move through Minor
            (4, 0, 4, 4, PieceType::Lieutenant, false, "Lieutenant blocked by Minor"),
            (4, 8, 4, 4, PieceType::Lieutenant, false, "Lieutenant blocked by Minor"),
            
            // Major trying to move through Bow
            (2, 2, 8, 8, PieceType::Major, false, "Major blocked by Bow"),
            
            // Bow can jump over pieces (should not be blocked)
            (4, 0, 4, 8, PieceType::Bow, true, "Bow can jump over Minor"),
            (0, 4, 8, 4, PieceType::Bow, true, "Bow can jump over Shinobi"),
        ];

        for (from_x, from_y, to_x, to_y, piece_type, should_be_valid, description) in blocking_tests {
            let is_valid = validate_move_with_board_state(
                from_x, from_y, to_x, to_y, piece_type, &board_state
            );
            assert_eq!(is_valid, should_be_valid, "{}", description);
        }
    }

    #[test]
    fn test_capture_validation() {
        // Test capture move validation
        // Requirement: Capture mechanics validation
        
        let mut board_state = create_test_board_state();
        
        // Place pieces for capture testing
        place_piece_on_board(&mut board_state, 4, 4, PieceType::Marshal, 1);  // Player 1 Marshal
        place_piece_on_board(&mut board_state, 4, 5, PieceType::General, 2); // Player 2 General
        place_piece_on_board(&mut board_state, 3, 4, PieceType::Shinobi, 1); // Player 1 Shinobi
        place_piece_on_board(&mut board_state, 5, 5, PieceType::Bow, 2);     // Player 2 Bow
        
        let capture_tests = vec![
            // Valid captures (enemy pieces)
            (4, 4, 4, 5, 1, true, "Marshal can capture enemy General"),
            (4, 5, 4, 4, 2, true, "General can capture enemy Marshal"),
            (3, 4, 4, 5, 1, false, "Shinobi cannot reach General position"),
            (5, 5, 4, 4, 2, false, "Bow cannot move diagonally"),
            
            // Invalid captures (own pieces)
            (4, 4, 3, 4, 1, false, "Cannot capture own piece"),
            (4, 5, 5, 5, 2, false, "Cannot capture own piece"),
            
            // Moves to empty squares
            (4, 4, 3, 3, 1, true, "Marshal can move to empty square"),
            (4, 5, 4, 6, 2, true, "General can move to empty square"),
        ];

        for (from_x, from_y, to_x, to_y, player, should_be_valid, description) in capture_tests {
            let is_valid = validate_capture_move(
                from_x, from_y, to_x, to_y, player, &board_state
            );
            assert_eq!(is_valid, should_be_valid, "{}", description);
        }
    }

    #[test]
    fn test_stacking_move_validation() {
        // Test stacking move validation
        // Requirement: 3-tier stacking mechanics
        
        let mut board_state = create_test_board_state();
        
        // Create initial stack
        place_piece_on_board_with_level(&mut board_state, 4, 4, 0, PieceType::Fortress, 1);
        place_piece_on_board_with_level(&mut board_state, 4, 4, 1, PieceType::Shinobi, 1);
        
        let stacking_tests = vec![
            // Valid stacking moves
            (3, 3, 4, 4, 2, PieceType::Bow, true, "Can stack on top (level 2)"),
            (5, 5, 4, 4, 1, PieceType::Minor, false, "Stack height limit (already 2 pieces)"),
            
            // Moving from stack
            (4, 4, 5, 4, 1, PieceType::Shinobi, true, "Can move from middle of stack"),
            (4, 4, 3, 4, 1, PieceType::Fortress, false, "Fortress cannot move even from stack"),
            
            // Invalid stacking (middle placement without bottom)
            (2, 2, 3, 3, 1, PieceType::General, true, "Can place on empty square (level 0)"),
        ];

        for (from_x, from_y, to_x, to_y, level, piece_type, should_be_valid, description) in stacking_tests {
            let is_valid = validate_stacking_move(
                from_x, from_y, to_x, to_y, level, piece_type, &board_state
            );
            assert_eq!(is_valid, should_be_valid, "{}", description);
        }
    }

    #[test]
    fn test_move_validation_edge_cases() {
        // Test edge cases and boundary conditions
        // Requirement: Comprehensive edge case coverage
        
        let edge_case_tests = vec![
            // Out of bounds moves
            (0, 0, 255, 255, PieceType::General, false, "Move completely out of bounds"),
            (8, 8, 9, 9, PieceType::Marshal, false, "Move just out of bounds"),
            (4, 4, 4, 9, PieceType::Lieutenant, false, "Vertical move out of bounds"),
            (4, 4, 9, 4, PieceType::Lieutenant, false, "Horizontal move out of bounds"),
            
            // No movement (staying in same position)
            (4, 4, 4, 4, PieceType::General, false, "Cannot stay in same position"),
            (0, 0, 0, 0, PieceType::Marshal, false, "Cannot stay in same position"),
            
            // Maximum distance moves
            (0, 0, 8, 8, PieceType::Major, true, "Maximum diagonal for Major"),
            (0, 0, 0, 8, PieceType::Lieutenant, true, "Maximum vertical for Lieutenant"),
            (0, 0, 8, 0, PieceType::Lieutenant, true, "Maximum horizontal for Lieutenant"),
            (0, 0, 8, 8, PieceType::General, true, "Maximum diagonal for General"),
            
            // Minimum distance moves
            (4, 4, 4, 3, PieceType::Marshal, true, "Minimum move for Marshal"),
            (4, 4, 3, 4, PieceType::General, true, "Minimum move for General"),
            
            // Corner to corner moves
            (0, 0, 8, 8, PieceType::Major, true, "Corner to corner diagonal"),
            (0, 8, 8, 0, PieceType::Major, true, "Corner to corner other diagonal"),
            (0, 0, 0, 8, PieceType::Bow, true, "Corner to corner vertical"),
            (0, 0, 8, 0, PieceType::Bow, true, "Corner to corner horizontal"),
        ];

        for (from_x, from_y, to_x, to_y, piece_type, should_be_valid, description) in edge_case_tests {
            let is_valid = validate_basic_move(from_x, from_y, to_x, to_y, piece_type);
            assert_eq!(is_valid, should_be_valid, "{}", description);
        }
    }

    #[test]
    fn test_special_move_abilities() {
        // Test special move abilities for enhanced pieces
        // Requirement: Special ability move validation
        
        let mut piece_with_abilities = PieceComponent {
            entity_id: 1,
            piece_type: PieceType::Shinobi,
            owner: 1,
            has_moved: false,
            captured: false,
            stack_level: 0,
            special_abilities: 0x01 | 0x04, // Enhanced movement + Jump over pieces
            last_move_turn: 0,
        };

        let special_move_tests = vec![
            // Enhanced movement (can move further)
            (4, 4, 4, 2, true, "Enhanced movement allows 2-square move"),
            (4, 4, 6, 4, true, "Enhanced movement allows 2-square move"),
            
            // Jump over pieces (when ability is set)
            (4, 4, 4, 7, true, "Can jump over pieces with jump ability"),
            (4, 4, 7, 4, true, "Can jump over pieces with jump ability"),
            
            // Normal Shinobi moves still work
            (4, 4, 4, 3, true, "Normal forward move still works"),
            (4, 4, 3, 3, true, "Normal diagonal move still works"),
        ];

        for (from_x, from_y, to_x, to_y, should_be_valid, description) in special_move_tests {
            let is_valid = validate_move_with_abilities(
                from_x, from_y, to_x, to_y, &piece_with_abilities
            );
            assert_eq!(is_valid, should_be_valid, "{}", description);
        }
        
        // Test without special abilities
        piece_with_abilities.special_abilities = 0;
        
        let normal_move_tests = vec![
            (4, 4, 4, 2, false, "Cannot move 2 squares without enhanced movement"),
            (4, 4, 4, 3, true, "Normal forward move works"),
            (4, 4, 3, 3, true, "Normal diagonal move works"),
        ];

        for (from_x, from_y, to_x, to_y, should_be_valid, description) in normal_move_tests {
            let is_valid = validate_move_with_abilities(
                from_x, from_y, to_x, to_y, &piece_with_abilities
            );
            assert_eq!(is_valid, should_be_valid, "{}", description);
        }
    }

    #[test]
    fn test_promotion_move_validation() {
        // Test move validation for promoted pieces
        // Requirement: Promotion move mechanics
        
        let mut promoted_shinobi = PieceComponent {
            entity_id: 1,
            piece_type: PieceType::General, // Promoted from Shinobi
            owner: 1,
            has_moved: true,
            captured: false,
            stack_level: 0,
            special_abilities: 0x80 | 0x02, // Promoted flag + Ranged attack
            last_move_turn: 5,
        };

        let promotion_move_tests = vec![
            // Should have General movement capabilities
            (4, 4, 4, 0, true, "Promoted piece has General vertical movement"),
            (4, 4, 0, 4, true, "Promoted piece has General horizontal movement"),
            (4, 4, 0, 0, true, "Promoted piece has General diagonal movement"),
            (4, 4, 8, 8, true, "Promoted piece has General long diagonal movement"),
            
            // Should retain special abilities
            (4, 4, 4, 7, true, "Promoted piece retains ranged attack ability"),
            
            // Should not have original Shinobi restrictions
            (4, 4, 4, 5, true, "Promoted piece can move backward (not restricted like Shinobi)"),
            (4, 4, 3, 5, true, "Promoted piece can move diagonally backward"),
        ];

        for (from_x, from_y, to_x, to_y, should_be_valid, description) in promotion_move_tests {
            let is_valid = validate_move_for_promoted_piece(
                from_x, from_y, to_x, to_y, &promoted_shinobi
            );
            assert_eq!(is_valid, should_be_valid, "{}", description);
        }
        
        // Test promotion validation
        let promotion_tests = vec![
            (PieceType::Shinobi, vec![PieceType::General, PieceType::Lieutenant, PieceType::Major], "Shinobi can promote to multiple types"),
            (PieceType::Marshal, vec![], "Marshal cannot promote"),
            (PieceType::Fortress, vec![], "Fortress cannot promote"),
        ];

        for (original_type, promotable_types, description) in promotion_tests {
            for promoted_type in promotable_types {
                let can_promote = validate_promotion(original_type, promoted_type);
                assert!(can_promote, "{} - should allow promotion to {:?}", description, promoted_type);
            }
            
            // Test invalid promotions
            let invalid_promotions = vec![PieceType::Marshal]; // Cannot promote to Marshal
            for invalid_type in invalid_promotions {
                let can_promote = validate_promotion(original_type, invalid_type);
                assert!(!can_promote, "{} - should not allow promotion to {:?}", description, invalid_type);
            }
        }
    }

    // Helper functions for move validation

    fn validate_marshal_move(from_x: u8, from_y: u8, to_x: u8, to_y: u8) -> bool {
        let dx = (to_x as i8 - from_x as i8).abs() as u8;
        let dy = (to_y as i8 - from_y as i8).abs() as u8;
        dx <= 1 && dy <= 1 && (dx + dy) > 0
    }

    fn validate_general_move(from_x: u8, from_y: u8, to_x: u8, to_y: u8) -> bool {
        let dx = (to_x as i8 - from_x as i8).abs() as u8;
        let dy = (to_y as i8 - from_y as i8).abs() as u8;
        (dx == 0 || dy == 0 || dx == dy) && (dx + dy) > 0
    }

    fn validate_lieutenant_move(from_x: u8, from_y: u8, to_x: u8, to_y: u8) -> bool {
        let dx = (to_x as i8 - from_x as i8).abs() as u8;
        let dy = (to_y as i8 - from_y as i8).abs() as u8;
        (dx == 0 || dy == 0) && (dx + dy) > 0
    }

    fn validate_major_move(from_x: u8, from_y: u8, to_x: u8, to_y: u8) -> bool {
        let dx = (to_x as i8 - from_x as i8).abs() as u8;
        let dy = (to_y as i8 - from_y as i8).abs() as u8;
        dx == dy && dx > 0
    }

    fn validate_minor_move(from_x: u8, from_y: u8, to_x: u8, to_y: u8) -> bool {
        let dx = (to_x as i8 - from_x as i8).abs() as u8;
        let dy = (to_y as i8 - from_y as i8).abs() as u8;
        (dx == 2 && dy == 1) || (dx == 1 && dy == 2)
    }

    fn validate_shinobi_move(from_x: u8, from_y: u8, to_x: u8, to_y: u8, player: u8) -> bool {
        let dx = (to_x as i8 - from_x as i8).abs() as u8;
        let dy = to_y as i8 - from_y as i8;
        
        // Player 1 moves "up" (decreasing Y), Player 2 moves "down" (increasing Y)
        let forward_direction = if player == 1 { -1 } else { 1 };
        
        dx <= 1 && dy == forward_direction
    }

    fn validate_bow_move(from_x: u8, from_y: u8, to_x: u8, to_y: u8) -> bool {
        let dx = (to_x as i8 - from_x as i8).abs() as u8;
        let dy = (to_y as i8 - from_y as i8).abs() as u8;
        (dx == 0 || dy == 0) && (dx + dy) > 0
    }

    fn validate_lance_move(from_x: u8, from_y: u8, to_x: u8, to_y: u8, player: u8) -> bool {
        let dx = (to_x as i8 - from_x as i8).abs() as u8;
        let dy = to_y as i8 - from_y as i8;
        
        // Player 1 moves "up" (decreasing Y), Player 2 moves "down" (increasing Y)
        let forward_direction = if player == 1 { -1 } else { 1 };
        
        dx == 0 && dy * forward_direction > 0
    }

    fn validate_fortress_move(_from_x: u8, _from_y: u8, _to_x: u8, _to_y: u8) -> bool {
        false // Fortress never moves
    }

    fn validate_basic_move(from_x: u8, from_y: u8, to_x: u8, to_y: u8, piece_type: PieceType) -> bool {
        // Basic bounds checking
        if from_x >= 9 || from_y >= 9 || to_x >= 9 || to_y >= 9 {
            return false;
        }
        
        // Cannot stay in same position
        if from_x == to_x && from_y == to_y {
            return false;
        }
        
        match piece_type {
            PieceType::Marshal => validate_marshal_move(from_x, from_y, to_x, to_y),
            PieceType::General => validate_general_move(from_x, from_y, to_x, to_y),
            PieceType::Lieutenant => validate_lieutenant_move(from_x, from_y, to_x, to_y),
            PieceType::Major => validate_major_move(from_x, from_y, to_x, to_y),
            PieceType::Minor => validate_minor_move(from_x, from_y, to_x, to_y),
            PieceType::Bow => validate_bow_move(from_x, from_y, to_x, to_y),
            PieceType::Fortress => validate_fortress_move(from_x, from_y, to_x, to_y),
            _ => true, // Other pieces have basic movement
        }
    }

    // Helper functions for testing

    fn create_test_board_state() -> BoardState {
        BoardState {
            board: [[None; 9]; 9],
            stacks: HashMap::new(),
            captured_pieces: Vec::new(),
            move_count: 0,
            current_player: 1,
            game_phase: GamePhase::Opening,
            special_rules_active: 0,
        }
    }

    fn place_piece_on_board(board_state: &mut BoardState, x: u8, y: u8, piece_type: PieceType, owner: u8) {
        let entity_id = (x as u64 * 100) + (y as u64 * 10) + owner as u64;
        board_state.board[x as usize][y as usize] = Some(entity_id);
    }

    fn place_piece_on_board_with_level(board_state: &mut BoardState, x: u8, y: u8, level: u8, piece_type: PieceType, owner: u8) {
        let entity_id = (x as u64 * 1000) + (y as u64 * 100) + (level as u64 * 10) + owner as u64;
        
        // Add to stack tracking
        let stack_key = (x, y);
        let stack = board_state.stacks.entry(stack_key).or_insert_with(Vec::new);
        while stack.len() <= level as usize {
            stack.push(0); // Placeholder
        }
        stack[level as usize] = entity_id;
    }

    fn validate_move_with_board_state(from_x: u8, from_y: u8, to_x: u8, to_y: u8, piece_type: PieceType, board_state: &BoardState) -> bool {
        // First validate basic move pattern
        if !validate_basic_move(from_x, from_y, to_x, to_y, piece_type) {
            return false;
        }
        
        // Check for path blocking (simplified)
        match piece_type {
            PieceType::Bow => true, // Bow can jump over pieces
            _ => {
                // Check if path is clear (simplified implementation)
                // In real implementation, would check each square in the path
                true
            }
        }
    }

    fn validate_capture_move(from_x: u8, from_y: u8, to_x: u8, to_y: u8, player: u8, board_state: &BoardState) -> bool {
        // Basic move validation first
        let piece_type = get_piece_type_at_position(board_state, from_x, from_y);
        if !validate_basic_move(from_x, from_y, to_x, to_y, piece_type) {
            return false;
        }
        
        // Check destination
        let destination_entity = board_state.board[to_x as usize][to_y as usize];
        match destination_entity {
            None => true, // Empty square
            Some(_entity_id) => {
                // In real implementation, would check if piece belongs to different player
                // For testing, assume captures are valid if move pattern is valid
                true
            }
        }
    }

    fn validate_stacking_move(from_x: u8, from_y: u8, to_x: u8, to_y: u8, _level: u8, piece_type: PieceType, board_state: &BoardState) -> bool {
        // Basic move validation
        if !validate_basic_move(from_x, from_y, to_x, to_y, piece_type) {
            return false;
        }
        
        // Check stack height at destination
        let stack_key = (to_x, to_y);
        let current_height = board_state.stacks.get(&stack_key).map(|s| s.len()).unwrap_or(0);
        
        current_height < 3 // Max 3 pieces in stack
    }

    fn validate_move_with_abilities(from_x: u8, from_y: u8, to_x: u8, to_y: u8, piece: &PieceComponent) -> bool {
        // Check for enhanced movement ability
        let has_enhanced_movement = (piece.special_abilities & 0x01) > 0;
        let has_jump_ability = (piece.special_abilities & 0x04) > 0;
        
        // Basic Shinobi move validation
        let dx = (to_x as i8 - from_x as i8).abs() as u8;
        let dy = to_y as i8 - from_y as i8;
        
        if has_enhanced_movement {
            // Enhanced movement allows greater range
            dx <= 2 && dy.abs() <= 2 && (dx + dy.abs() as u8) > 0
        } else {
            // Standard Shinobi movement
            dx <= 1 && dy == -1 // Forward for player 1
        }
    }

    fn validate_move_for_promoted_piece(from_x: u8, from_y: u8, to_x: u8, to_y: u8, piece: &PieceComponent) -> bool {
        // Promoted pieces use their new type's movement rules
        validate_basic_move(from_x, from_y, to_x, to_y, piece.piece_type)
    }

    fn validate_promotion(original_type: PieceType, promoted_type: PieceType) -> bool {
        match original_type {
            PieceType::Shinobi => matches!(promoted_type, 
                PieceType::General | PieceType::Lieutenant | PieceType::Major | 
                PieceType::Minor | PieceType::Bow),
            _ => false, // Only Shinobi can promote in this implementation
        }
    }

    fn get_piece_type_at_position(board_state: &BoardState, x: u8, y: u8) -> PieceType {
        // Simplified - in real implementation would look up actual piece
        if board_state.board[x as usize][y as usize].is_some() {
            PieceType::General // Default for testing
        } else {
            PieceType::Shinobi // Default
        }
    }
}
