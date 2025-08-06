#[cfg(test)]
mod piece_tests {
    use crate::bolt_ecs::*;
    use anchor_lang::prelude::*;

    #[test]
    fn test_creation_of_all_piece_types() {
        // Test creation of all 7 main piece types + additional pieces
        let piece_types = vec![
            PieceType::Marshal,
            PieceType::General,
            PieceType::Lieutenant,
            PieceType::Major,
            PieceType::Minor,
            PieceType::Shinobi,
            PieceType::Bow,
            PieceType::Lance,
            PieceType::Fortress,
            PieceType::Catapult,
            PieceType::Spy,
            PieceType::Samurai,
            PieceType::Captain,
        ];

        for (i, piece_type) in piece_types.iter().enumerate() {
            let piece = PieceComponent {
                entity_id: i as u64,
                piece_type: *piece_type,
                owner: 1,
                has_moved: false,
                captured: false,
                stack_level: 0,
                special_abilities: 0,
                last_move_turn: 0,
            };

            assert_eq!(piece.piece_type, *piece_type);
            assert!(!piece.captured);
            assert!(!piece.has_moved);
            assert_eq!(piece.stack_level, 0);
        }
    }

    #[test]
    fn test_owner_assignment_and_validation() {
        // Test players 1 and 2
        for owner in 1..=2u8 {
            let piece = PieceComponent {
                entity_id: 1,
                piece_type: PieceType::Marshal,
                owner,
                has_moved: false,
                captured: false,
                stack_level: 0,
                special_abilities: 0,
                last_move_turn: 0,
            };

            assert_eq!(piece.owner, owner);
            assert!(piece.owner >= 1 && piece.owner <= 2);
        }

        // Test invalid owners
        let invalid_owners = vec![0, 3, 4, 255];
        for owner in invalid_owners {
            // In real implementation, this would be validated by the smart contract
            let is_valid = owner >= 1 && owner <= 2;
            assert!(!is_valid, "Owner {} should be invalid", owner);
        }
    }

    #[test]
    fn test_state_tracking_flags() {
        let mut piece = PieceComponent {
            entity_id: 1,
            piece_type: PieceType::General,
            owner: 1,
            has_moved: false,
            captured: false,
            stack_level: 0,
            special_abilities: 0,
            last_move_turn: 0,
        };

        // Test initial state
        assert!(!piece.has_moved);
        assert!(!piece.captured);

        // Test has_moved flag
        piece.has_moved = true;
        assert!(piece.has_moved);

        // Test captured flag
        piece.captured = true;
        assert!(piece.captured);

        // Test last_move_turn tracking
        piece.last_move_turn = 5;
        assert_eq!(piece.last_move_turn, 5);
    }

    #[test]
    fn test_piece_promotion_mechanics_for_shinobi() {
        let mut shinobi = PieceComponent {
            entity_id: 1,
            piece_type: PieceType::Shinobi,
            owner: 1,
            has_moved: false,
            captured: false,
            stack_level: 0,
            special_abilities: 0,
            last_move_turn: 0,
        };

        // Test promotion trigger (reaching end of board)
        // In Gungi, Shinobi can promote to different pieces
        assert_eq!(shinobi.piece_type, PieceType::Shinobi);

        // Simulate promotion (would be handled by game logic)
        let promoted_type = PieceType::General; // Example promotion
        shinobi.piece_type = promoted_type;
        shinobi.special_abilities |= 0x01; // Set promotion flag

        assert_eq!(shinobi.piece_type, PieceType::General);
        assert!(shinobi.special_abilities & 0x01 > 0);
    }

    #[test]
    fn test_piece_capture_and_removal() {
        let mut piece = PieceComponent {
            entity_id: 1,
            piece_type: PieceType::Lieutenant,
            owner: 2,
            has_moved: true,
            captured: false,
            stack_level: 1,
            special_abilities: 0,
            last_move_turn: 3,
        };

        // Test capture process
        assert!(!piece.captured);
        
        // Simulate capture
        piece.captured = true;
        
        assert!(piece.captured);
        // Captured piece should maintain its other properties for potential reuse
        assert_eq!(piece.piece_type, PieceType::Lieutenant);
        assert_eq!(piece.owner, 2);
        assert!(piece.has_moved); // History preserved
    }

    #[test]
    fn test_stacking_mechanics() {
        let mut piece = PieceComponent {
            entity_id: 1,
            piece_type: PieceType::Major,
            owner: 1,
            has_moved: false,
            captured: false,
            stack_level: 0,
            special_abilities: 0,
            last_move_turn: 0,
        };

        // Test initial stack level
        assert_eq!(piece.stack_level, 0);

        // Test stacking up (0 = bottom, 1 = middle, 2 = top)
        piece.stack_level = 1;
        assert_eq!(piece.stack_level, 1);

        piece.stack_level = 2;
        assert_eq!(piece.stack_level, 2);

        // Test invalid stack levels
        for invalid_level in vec![3, 4, 255] {
            // In real implementation, this would be validated
            let is_valid = invalid_level < 3;
            assert!(!is_valid, "Stack level {} should be invalid", invalid_level);
        }
    }

    #[test]
    fn test_special_abilities_bitfield() {
        let mut piece = PieceComponent {
            entity_id: 1,
            piece_type: PieceType::Bow,
            owner: 1,
            has_moved: false,
            captured: false,
            stack_level: 0,
            special_abilities: 0,
            last_move_turn: 0,
        };

        // Test setting special abilities using bitfield
        piece.special_abilities |= 0x01; // Ability 1
        assert!(piece.special_abilities & 0x01 > 0);

        piece.special_abilities |= 0x02; // Ability 2
        assert!(piece.special_abilities & 0x02 > 0);
        assert!(piece.special_abilities & 0x01 > 0); // Previous ability still set

        piece.special_abilities |= 0x04; // Ability 3
        assert!(piece.special_abilities & 0x04 > 0);

        // Test removing abilities
        piece.special_abilities &= !0x02; // Remove ability 2
        assert!(piece.special_abilities & 0x02 == 0);
        assert!(piece.special_abilities & 0x01 > 0); // Others remain
        assert!(piece.special_abilities & 0x04 > 0);
    }

    #[test]
    fn test_piece_movement_history() {
        let mut piece = PieceComponent {
            entity_id: 1,
            piece_type: PieceType::Minor,
            owner: 2,
            has_moved: false,
            captured: false,
            stack_level: 0,
            special_abilities: 0,
            last_move_turn: 0,
        };

        // Test initial state
        assert!(!piece.has_moved);
        assert_eq!(piece.last_move_turn, 0);

        // Simulate first move
        piece.has_moved = true;
        piece.last_move_turn = 1;

        assert!(piece.has_moved);
        assert_eq!(piece.last_move_turn, 1);

        // Simulate additional moves
        for turn in 2..=5 {
            piece.last_move_turn = turn;
            assert_eq!(piece.last_move_turn, turn);
        }
    }

    #[test]
    fn test_piece_type_specific_properties() {
        // Test Marshal (King) - most important piece
        let marshal = PieceComponent {
            entity_id: 1,
            piece_type: PieceType::Marshal,
            owner: 1,
            has_moved: false,
            captured: false,
            stack_level: 0,
            special_abilities: 0x08, // Special protection
            last_move_turn: 0,
        };

        assert_eq!(marshal.piece_type, PieceType::Marshal);
        assert!(marshal.special_abilities & 0x08 > 0);

        // Test Fortress - cannot move
        let fortress = PieceComponent {
            entity_id: 2,
            piece_type: PieceType::Fortress,
            owner: 2,
            has_moved: false,
            captured: false,
            stack_level: 0,
            special_abilities: 0x10, // Immobile flag
            last_move_turn: 0,
        };

        assert_eq!(fortress.piece_type, PieceType::Fortress);
        assert!(fortress.special_abilities & 0x10 > 0);
        assert!(!fortress.has_moved); // Should never move
    }

    #[test]
    fn test_piece_default_values() {
        let default_piece = PieceComponent::default();
        
        assert_eq!(default_piece.entity_id, 0);
        assert_eq!(default_piece.piece_type, PieceType::default());
        assert_eq!(default_piece.owner, 0);
        assert!(!default_piece.has_moved);
        assert!(!default_piece.captured);
        assert_eq!(default_piece.stack_level, 0);
        assert_eq!(default_piece.special_abilities, 0);
        assert_eq!(default_piece.last_move_turn, 0);
    }

    #[test]
    fn test_piece_lifecycle() {
        let mut piece = PieceComponent {
            entity_id: 42,
            piece_type: PieceType::Shinobi,
            owner: 1,
            has_moved: false,
            captured: false,
            stack_level: 0,
            special_abilities: 0,
            last_move_turn: 0,
        };

        // Test piece creation
        assert!(!piece.captured);
        assert!(!piece.has_moved);

        // Test piece movement
        piece.has_moved = true;
        piece.last_move_turn = 1;
        piece.stack_level = 1;

        // Test piece special ability acquisition
        piece.special_abilities |= 0x01;

        // Test piece promotion
        piece.piece_type = PieceType::General;
        piece.special_abilities |= 0x02;

        // Test piece capture
        piece.captured = true;

        // Verify final state
        assert!(piece.captured);
        assert!(piece.has_moved);
        assert_eq!(piece.piece_type, PieceType::General);
        assert_eq!(piece.stack_level, 1);
        assert_eq!(piece.special_abilities, 0x03);
        assert_eq!(piece.last_move_turn, 1);
    }
}
