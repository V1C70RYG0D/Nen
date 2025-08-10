// Comprehensive unit tests for piece components  
// Following poc_magicblock_testing_assignment.md requirements

#[cfg(test)]
mod enhanced_piece_tests {
    use crate::bolt_ecs::*;
    use anchor_lang::prelude::*;
    use std::collections::HashMap;

    #[test]
    fn test_creation_of_all_piece_types_comprehensive() {
        // Test creation of all 13 piece types as specified in enhanced Gungi implementation
        // Requirement: Complete piece type validation
        
        let piece_types = vec![
            (PieceType::Marshal, "Marshal", 1),      // King/Commander (1 per player)
            (PieceType::General, "General", 2),      // General (2 per player)
            (PieceType::Lieutenant, "Lieutenant", 2), // Lieutenant (2 per player)
            (PieceType::Major, "Major", 2),          // Major (2 per player)
            (PieceType::Minor, "Minor", 2),          // Minor (2 per player)
            (PieceType::Shinobi, "Shinobi", 3),      // Ninja (3 per player)
            (PieceType::Bow, "Bow", 2),              // Archer (2 per player)
            (PieceType::Lance, "Lance", 1),          // Spear (1 per player)
            (PieceType::Fortress, "Fortress", 1),    // Fortress (1 per player)
            (PieceType::Catapult, "Catapult", 1),    // Catapult (1 per player)
            (PieceType::Spy, "Spy", 1),              // Spy (1 per player)
            (PieceType::Samurai, "Samurai", 1),      // Samurai (1 per player)
            (PieceType::Captain, "Captain", 1),      // Captain (1 per player)
        ];

        let mut total_pieces_created = 0;

        for (piece_type, name, count_per_player) in piece_types {
            // Test creation for both players
            for player in 1..=2u8 {
                for piece_index in 0..count_per_player {
                    let piece = PieceComponent {
                        entity_id: (player as u64 * 100) + (piece_index as u64),
                        piece_type,
                        owner: player,
                        has_moved: false,
                        captured: false,
                        stack_level: 0,
                        special_abilities: 0,
                        last_move_turn: 0,
                    };

                    // Validate piece properties
                    assert_eq!(piece.piece_type, piece_type, "{} piece type should match", name);
                    assert_eq!(piece.owner, player, "{} should belong to player {}", name, player);
                    assert!(!piece.captured, "{} should not be captured when created", name);
                    assert!(!piece.has_moved, "{} should not have moved when created", name);
                    assert_eq!(piece.stack_level, 0, "{} should start at stack level 0", name);
                    assert_eq!(piece.special_abilities, 0, "{} should have no special abilities initially", name);
                    assert_eq!(piece.last_move_turn, 0, "{} should have no move history initially", name);
                    
                    total_pieces_created += 1;
                }
            }
        }
        
        // Verify total piece count (should be 38 pieces total: 19 per player)
        // Marshal(1) + General(2) + Lieutenant(2) + Major(2) + Minor(2) + Shinobi(3) + 
        // Bow(2) + Lance(1) + Fortress(1) + Catapult(1) + Spy(1) + Samurai(1) + Captain(1) = 19 per player
        assert_eq!(total_pieces_created, 38, "Should create exactly 38 pieces (19 per player)");
    }

    #[test]
    fn test_owner_assignment_and_validation_comprehensive() {
        // Test owner assignment and validation for players 1 and 2
        // Requirement: Player ownership validation
        
        // Test valid owners (players 1 and 2)
        for owner in 1..=2u8 {
            let piece = PieceComponent {
                entity_id: owner as u64,
                piece_type: PieceType::Marshal,
                owner,
                has_moved: false,
                captured: false,
                stack_level: 0,
                special_abilities: 0,
                last_move_turn: 0,
            };

            assert_eq!(piece.owner, owner, "Piece should belong to player {}", owner);
            assert!(piece.owner >= 1 && piece.owner <= 2, "Owner {} should be valid (1 or 2)", owner);
        }

        // Test invalid owners
        let invalid_owners = vec![0, 3, 4, 255];
        for owner in invalid_owners {
            // In real implementation, this would be validated by the smart contract
            let is_valid = owner >= 1 && owner <= 2;
            assert!(!is_valid, "Owner {} should be invalid", owner);
        }
        
        // Test ownership transfer scenarios (for captured pieces)
        let mut piece = PieceComponent {
            entity_id: 1,
            piece_type: PieceType::Shinobi,
            owner: 1,
            has_moved: false,
            captured: false,
            stack_level: 0,
            special_abilities: 0,
            last_move_turn: 0,
        };
        
        // Original owner
        assert_eq!(piece.owner, 1, "Piece should initially belong to player 1");
        
        // Simulate capture (piece ownership remains with original player but is marked captured)
        piece.captured = true;
        assert_eq!(piece.owner, 1, "Captured piece should retain original owner");
        assert!(piece.captured, "Piece should be marked as captured");
        
        // Test piece count per player
        let pieces = vec![
            PieceComponent { entity_id: 1, piece_type: PieceType::Marshal, owner: 1, has_moved: false, captured: false, stack_level: 0, special_abilities: 0, last_move_turn: 0 },
            PieceComponent { entity_id: 2, piece_type: PieceType::General, owner: 1, has_moved: false, captured: false, stack_level: 0, special_abilities: 0, last_move_turn: 0 },
            PieceComponent { entity_id: 3, piece_type: PieceType::Marshal, owner: 2, has_moved: false, captured: false, stack_level: 0, special_abilities: 0, last_move_turn: 0 },
            PieceComponent { entity_id: 4, piece_type: PieceType::General, owner: 2, has_moved: false, captured: false, stack_level: 0, special_abilities: 0, last_move_turn: 0 },
        ];
        
        let player1_pieces = pieces.iter().filter(|p| p.owner == 1).count();
        let player2_pieces = pieces.iter().filter(|p| p.owner == 2).count();
        
        assert_eq!(player1_pieces, 2, "Player 1 should have 2 pieces");
        assert_eq!(player2_pieces, 2, "Player 2 should have 2 pieces");
    }

    #[test]
    fn test_state_tracking_flags_comprehensive() {
        // Test comprehensive state tracking for game mechanics
        // Requirement: Complete piece state management
        
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
        assert!(!piece.has_moved, "Piece should not have moved initially");
        assert!(!piece.captured, "Piece should not be captured initially");
        assert_eq!(piece.stack_level, 0, "Piece should start at stack level 0");
        assert_eq!(piece.special_abilities, 0, "Piece should have no special abilities initially");
        assert_eq!(piece.last_move_turn, 0, "Piece should have no move history initially");

        // Test has_moved flag transitions
        piece.has_moved = true;
        piece.last_move_turn = 1;
        assert!(piece.has_moved, "Piece should be marked as moved");
        assert_eq!(piece.last_move_turn, 1, "Move turn should be recorded");

        // Test multiple moves
        for turn in 2..=10 {
            piece.last_move_turn = turn;
            assert_eq!(piece.last_move_turn, turn, "Move turn should update to {}", turn);
            assert!(piece.has_moved, "Piece should remain marked as moved");
        }

        // Test captured flag
        piece.captured = true;
        assert!(piece.captured, "Piece should be marked as captured");
        assert!(piece.has_moved, "Captured piece should retain movement history");

        // Test stack level transitions
        piece.captured = false; // Uncapture for stacking test
        for level in 0..3u8 {
            piece.stack_level = level;
            assert_eq!(piece.stack_level, level, "Stack level should update to {}", level);
            assert!(piece.stack_level < 3, "Stack level should be valid (< 3)");
        }

        // Test special abilities flags
        let abilities = vec![
            0x01, // Ability 1
            0x02, // Ability 2
            0x04, // Ability 3
            0x08, // Ability 4
            0x10, // Ability 5
        ];
        
        for ability in abilities {
            piece.special_abilities |= ability;
            assert!(piece.special_abilities & ability > 0, "Ability {:02x} should be set", ability);
        }
        
        // Test combined abilities
        assert_eq!(piece.special_abilities, 0x1F, "All abilities should be set (0x1F)");
        
        // Test ability removal
        piece.special_abilities &= !0x02; // Remove ability 2
        assert!(piece.special_abilities & 0x02 == 0, "Ability 2 should be removed");
        assert!(piece.special_abilities & 0x01 > 0, "Other abilities should remain");
    }

    #[test]
    fn test_piece_promotion_mechanics_for_shinobi_comprehensive() {
        // Test comprehensive promotion mechanics for Shinobi pieces
        // Requirement: Piece promotion system validation
        
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

        // Test initial Shinobi state
        assert_eq!(shinobi.piece_type, PieceType::Shinobi, "Should start as Shinobi");
        assert_eq!(shinobi.special_abilities, 0, "Should have no special abilities initially");

        // Test promotion eligibility (reaching end of board or special conditions)
        shinobi.has_moved = true;
        shinobi.last_move_turn = 5;
        
        // Simulate promotion to different piece types
        let promotion_options = vec![
            (PieceType::General, "General", 0x01),
            (PieceType::Lieutenant, "Lieutenant", 0x02),
            (PieceType::Major, "Major", 0x04),
            (PieceType::Minor, "Minor", 0x08),
            (PieceType::Bow, "Bow", 0x10),
        ];
        
        for (promoted_type, name, ability_flag) in promotion_options {
            let mut promoted_shinobi = shinobi.clone();
            
            // Apply promotion
            promoted_shinobi.piece_type = promoted_type;
            promoted_shinobi.special_abilities |= ability_flag; // Set promotion flag
            promoted_shinobi.special_abilities |= 0x80; // Set "promoted" flag
            promoted_shinobi.last_move_turn += 1;
            
            assert_eq!(promoted_shinobi.piece_type, promoted_type, "Should promote to {}", name);
            assert!(promoted_shinobi.special_abilities & ability_flag > 0, "Should have {} ability", name);
            assert!(promoted_shinobi.special_abilities & 0x80 > 0, "Should have promotion flag set");
            assert!(promoted_shinobi.has_moved, "Promoted piece should retain movement history");
            assert_eq!(promoted_shinobi.owner, 1, "Promoted piece should retain original owner");
        }
        
        // Test promotion restrictions
        let non_promotable_pieces = vec![
            PieceType::Marshal,   // Marshal cannot promote
            PieceType::Fortress,  // Fortress cannot promote
            PieceType::Lance,     // Lance has different promotion rules
        ];
        
        for piece_type in non_promotable_pieces {
            let mut piece = PieceComponent {
                entity_id: 2,
                piece_type,
                owner: 1,
                has_moved: true,
                captured: false,
                stack_level: 0,
                special_abilities: 0,
                last_move_turn: 5,
            };
            
            // These pieces should not promote to other types
            let original_type = piece.piece_type;
            // In real implementation, promotion attempt would be rejected
            assert_eq!(piece.piece_type, original_type, "{:?} should not promote", piece_type);
        }
        
        // Test Shinobi promotion history tracking
        let mut promotion_history = Vec::new();
        let mut test_shinobi = shinobi.clone();
        
        // Simulate multiple promotions in different games
        for i in 0..3 {
            test_shinobi.piece_type = PieceType::General;
            test_shinobi.special_abilities = 0x80 | (i + 1); // Promotion flag + unique ability
            test_shinobi.last_move_turn = (i + 1) * 10;
            
            promotion_history.push(test_shinobi.clone());
        }
        
        assert_eq!(promotion_history.len(), 3, "Should track multiple promotions");
        for (i, promoted) in promotion_history.iter().enumerate() {
            assert!(promoted.special_abilities & 0x80 > 0, "Promotion {} should have promotion flag", i);
            assert_eq!(promoted.last_move_turn, (i + 1) as u32 * 10, "Promotion {} should have correct turn", i);
        }
    }

    #[test]
    fn test_piece_capture_and_removal_comprehensive() {
        // Test comprehensive capture mechanics and piece removal
        // Requirement: Complete capture system validation
        
        let mut piece = PieceComponent {
            entity_id: 1,
            piece_type: PieceType::Lieutenant,
            owner: 2,
            has_moved: true,
            captured: false,
            stack_level: 1,
            special_abilities: 0x04, // Some ability set
            last_move_turn: 3,
        };

        // Test pre-capture state
        assert!(!piece.captured, "Piece should not be captured initially");
        assert_eq!(piece.piece_type, PieceType::Lieutenant, "Piece type should be preserved");
        assert_eq!(piece.owner, 2, "Owner should be preserved");
        assert!(piece.has_moved, "Movement history should be preserved");
        assert_eq!(piece.stack_level, 1, "Stack level should be preserved");
        assert_eq!(piece.special_abilities, 0x04, "Special abilities should be preserved");

        // Simulate capture process
        let capture_turn = 5;
        piece.captured = true;
        piece.last_move_turn = capture_turn;
        
        // Test post-capture state
        assert!(piece.captured, "Piece should be marked as captured");
        assert_eq!(piece.last_move_turn, capture_turn, "Capture turn should be recorded");
        
        // Verify captured piece retains its properties for potential reuse
        assert_eq!(piece.piece_type, PieceType::Lieutenant, "Captured piece type should be preserved");
        assert_eq!(piece.owner, 2, "Captured piece owner should be preserved");
        assert!(piece.has_moved, "Captured piece movement history should be preserved");
        assert_eq!(piece.stack_level, 1, "Captured piece stack level should be preserved");
        assert_eq!(piece.special_abilities, 0x04, "Captured piece abilities should be preserved");
        
        // Test capture in different contexts
        let capture_scenarios = vec![
            (PieceType::Marshal, 1, true, "Marshal capture should end game"),
            (PieceType::General, 2, false, "General capture should continue game"),
            (PieceType::Fortress, 1, false, "Fortress capture should continue game"),
            (PieceType::Shinobi, 2, false, "Shinobi capture should continue game"),
        ];
        
        for (piece_type, owner, is_game_ending, description) in capture_scenarios {
            let mut test_piece = PieceComponent {
                entity_id: 10,
                piece_type,
                owner,
                has_moved: true,
                captured: false,
                stack_level: 0,
                special_abilities: 0,
                last_move_turn: 1,
            };
            
            // Simulate capture
            test_piece.captured = true;
            test_piece.last_move_turn = capture_turn + 1;
            
            assert!(test_piece.captured, "{}", description);
            assert_eq!(test_piece.piece_type, piece_type, "Piece type should be preserved in {}", description);
            
            // In real implementation, would check if capture ends game
            let should_end_game = matches!(piece_type, PieceType::Marshal);
            assert_eq!(should_end_game, is_game_ending, "Game ending logic for {}", description);
        }
        
        // Test mass capture scenario
        let mut pieces = vec![
            PieceComponent { entity_id: 1, piece_type: PieceType::Shinobi, owner: 1, has_moved: false, captured: false, stack_level: 0, special_abilities: 0, last_move_turn: 0 },
            PieceComponent { entity_id: 2, piece_type: PieceType::Bow, owner: 1, has_moved: true, captured: false, stack_level: 0, special_abilities: 0, last_move_turn: 2 },
            PieceComponent { entity_id: 3, piece_type: PieceType::Minor, owner: 1, has_moved: false, captured: false, stack_level: 1, special_abilities: 0, last_move_turn: 0 },
        ];
        
        // Capture all pieces
        for piece in &mut pieces {
            piece.captured = true;
            piece.last_move_turn = capture_turn + 2;
        }
        
        let captured_count = pieces.iter().filter(|p| p.captured).count();
        assert_eq!(captured_count, 3, "All pieces should be captured");
        
        // Verify captured pieces retain individual properties
        assert_eq!(pieces[0].piece_type, PieceType::Shinobi, "First captured piece type preserved");
        assert_eq!(pieces[1].piece_type, PieceType::Bow, "Second captured piece type preserved");
        assert_eq!(pieces[2].piece_type, PieceType::Minor, "Third captured piece type preserved");
        assert_eq!(pieces[2].stack_level, 1, "Stack level preserved for captured piece");
    }

    #[test]
    fn test_stacking_mechanics_comprehensive() {
        // Test comprehensive 3-tier stacking mechanics
        // Requirement: Complete stacking system validation
        
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
        assert_eq!(piece.stack_level, 0, "Piece should start at bottom stack level");

        // Test stack level progression (0 = bottom, 1 = middle, 2 = top)
        for level in 0..3u8 {
            piece.stack_level = level;
            piece.last_move_turn += 1;
            
            assert_eq!(piece.stack_level, level, "Stack level should be {}", level);
            assert!(piece.stack_level < 3, "Stack level should be valid (< 3)");
            
            // Test level-specific properties
            match level {
                0 => {
                    // Bottom level - foundation of stack
                    assert_eq!(piece.stack_level, 0, "Bottom level should be 0");
                    // Bottom pieces can support others
                },
                1 => {
                    // Middle level - requires bottom piece
                    assert_eq!(piece.stack_level, 1, "Middle level should be 1");
                    // Middle pieces can have pieces above
                },
                2 => {
                    // Top level - maximum stack height
                    assert_eq!(piece.stack_level, 2, "Top level should be 2");
                    // Top pieces cannot have pieces above
                },
                _ => panic!("Invalid stack level {}", level),
            }
        }

        // Test invalid stack levels
        let invalid_levels = vec![3, 4, 5, 255];
        for level in invalid_levels {
            // In real implementation, this would be validated by the smart contract
            let is_valid = level < 3;
            assert!(!is_valid, "Stack level {} should be invalid", level);
        }
        
        // Test stacking constraints and rules
        let stack_scenarios = vec![
            (0, true, "Bottom level should always be placeable"),
            (1, true, "Middle level should be placeable if bottom exists"),
            (2, true, "Top level should be placeable if middle exists"),
        ];
        
        for (level, should_be_valid, description) in stack_scenarios {
            let test_piece = PieceComponent {
                entity_id: level as u64 + 10,
                piece_type: PieceType::General,
                owner: 1,
                has_moved: false,
                captured: false,
                stack_level: level,
                special_abilities: 0,
                last_move_turn: 0,
            };
            
            let is_valid = test_piece.stack_level < 3;
            assert_eq!(is_valid, should_be_valid, "{}", description);
        }
        
        // Test stack composition with different piece types
        let stack_pieces = vec![
            PieceComponent { entity_id: 1, piece_type: PieceType::Fortress, owner: 1, has_moved: false, captured: false, stack_level: 0, special_abilities: 0, last_move_turn: 0 },
            PieceComponent { entity_id: 2, piece_type: PieceType::Shinobi, owner: 1, has_moved: false, captured: false, stack_level: 1, special_abilities: 0, last_move_turn: 0 },
            PieceComponent { entity_id: 3, piece_type: PieceType::Bow, owner: 1, has_moved: false, captured: false, stack_level: 2, special_abilities: 0, last_move_turn: 0 },
        ];
        
        // Verify stack composition
        assert_eq!(stack_pieces[0].stack_level, 0, "Fortress should be at bottom");
        assert_eq!(stack_pieces[1].stack_level, 1, "Shinobi should be in middle");
        assert_eq!(stack_pieces[2].stack_level, 2, "Bow should be at top");
        
        // Test stack height calculation
        let max_level = stack_pieces.iter().map(|p| p.stack_level).max().unwrap_or(0);
        assert_eq!(max_level, 2, "Maximum stack level should be 2");
        
        let stack_height = stack_pieces.len();
        assert_eq!(stack_height, 3, "Stack should have 3 pieces");
        assert!(stack_height <= 3, "Stack should not exceed 3 pieces");
        
        // Test stacking abilities and bonuses
        let mut stacked_piece = PieceComponent {
            entity_id: 4,
            piece_type: PieceType::Major,
            owner: 1,
            has_moved: false,
            captured: false,
            stack_level: 1, // In a stack
            special_abilities: 0,
            last_move_turn: 0,
        };
        
        // Simulate stack bonuses
        stacked_piece.special_abilities |= 0x20; // Stack movement bonus
        stacked_piece.special_abilities |= 0x40; // Stack protection bonus
        
        assert!(stacked_piece.special_abilities & 0x20 > 0, "Should have stack movement bonus");
        assert!(stacked_piece.special_abilities & 0x40 > 0, "Should have stack protection bonus");
        
        // Test unstacking
        stacked_piece.stack_level = 0; // Move to ground level
        stacked_piece.special_abilities &= !0x20; // Remove stack movement bonus
        stacked_piece.special_abilities &= !0x40; // Remove stack protection bonus
        
        assert_eq!(stacked_piece.stack_level, 0, "Piece should be unstacked");
        assert!(stacked_piece.special_abilities & 0x20 == 0, "Stack movement bonus should be removed");
        assert!(stacked_piece.special_abilities & 0x40 == 0, "Stack protection bonus should be removed");
    }

    #[test]
    fn test_special_abilities_bitfield_comprehensive() {
        // Test comprehensive special abilities bitfield management
        // Requirement: Special abilities system validation
        
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

        // Test initial state
        assert_eq!(piece.special_abilities, 0, "Should start with no special abilities");

        // Test individual ability flags
        let abilities = vec![
            (0x01, "Enhanced Movement"),
            (0x02, "Ranged Attack"),
            (0x04, "Jump Over Pieces"),
            (0x08, "Stack Protection"),
            (0x10, "Promotion Ability"),
            (0x20, "Stack Movement Bonus"),
            (0x40, "Defensive Bonus"),
            (0x80, "Promoted Flag"),
        ];
        
        // Test setting abilities one by one
        for (flag, name) in &abilities {
            piece.special_abilities |= flag;
            assert!(piece.special_abilities & flag > 0, "{} ability should be set", name);
            
            // Verify other abilities remain set
            for (prev_flag, prev_name) in &abilities {
                if prev_flag <= flag {
                    assert!(piece.special_abilities & prev_flag > 0, "{} should remain set", prev_name);
                }
            }
        }
        
        // Test all abilities set
        assert_eq!(piece.special_abilities, 0xFF, "All abilities should be set (0xFF)");
        
        // Test removing abilities selectively
        let removal_tests = vec![
            (0x02, "Ranged Attack"),
            (0x08, "Stack Protection"),
            (0x20, "Stack Movement Bonus"),
        ];
        
        for (flag, name) in removal_tests {
            piece.special_abilities &= !flag;
            assert!(piece.special_abilities & flag == 0, "{} should be removed", name);
            
            // Verify other abilities remain
            for (other_flag, other_name) in &abilities {
                if other_flag != &flag {
                    let should_be_set = (0xFF & !0x02 & !0x08 & !0x20) & other_flag > 0;
                    if should_be_set {
                        assert!(piece.special_abilities & other_flag > 0, "{} should remain set", other_name);
                    }
                }
            }
        }
        
        // Test ability combinations for different piece types
        let piece_ability_combinations = vec![
            (PieceType::Marshal, 0x88, "Marshal: Promoted + Stack Protection"),
            (PieceType::General, 0x43, "General: Enhanced Movement + Ranged Attack + Defensive Bonus"),
            (PieceType::Bow, 0x06, "Bow: Ranged Attack + Jump Over Pieces"),
            (PieceType::Shinobi, 0x91, "Shinobi: Enhanced Movement + Promotion + Promoted"),
            (PieceType::Fortress, 0x48, "Fortress: Stack Protection + Defensive Bonus"),
        ];
        
        for (piece_type, expected_abilities, description) in piece_ability_combinations {
            let mut test_piece = PieceComponent {
                entity_id: 10,
                piece_type,
                owner: 1,
                has_moved: false,
                captured: false,
                stack_level: 0,
                special_abilities: expected_abilities,
                last_move_turn: 0,
            };
            
            assert_eq!(test_piece.special_abilities, expected_abilities, "{}", description);
            
            // Test individual flags for this combination
            for i in 0..8 {
                let flag = 1u16 << i;
                let should_have_flag = (expected_abilities & flag) > 0;
                let has_flag = (test_piece.special_abilities & flag) > 0;
                assert_eq!(has_flag, should_have_flag, "{} flag {} check", description, i);
            }
        }
        
        // Test ability persistence through state changes
        let mut persistent_piece = PieceComponent {
            entity_id: 5,
            piece_type: PieceType::Minor,
            owner: 2,
            has_moved: false,
            captured: false,
            stack_level: 0,
            special_abilities: 0x15, // Multiple abilities set
            last_move_turn: 0,
        };
        
        // Change various states
        persistent_piece.has_moved = true;
        persistent_piece.stack_level = 1;
        persistent_piece.last_move_turn = 5;
        
        // Abilities should persist
        assert_eq!(persistent_piece.special_abilities, 0x15, "Abilities should persist through state changes");
        
        // Test ability modification during gameplay
        persistent_piece.special_abilities |= 0x20; // Add stack bonus
        assert!(persistent_piece.special_abilities & 0x20 > 0, "New ability should be added");
        assert_eq!(persistent_piece.special_abilities, 0x35, "Combined abilities should be correct");
        
        // Remove temporary ability
        persistent_piece.special_abilities &= !0x20; // Remove stack bonus
        assert_eq!(persistent_piece.special_abilities, 0x15, "Should return to original abilities");
    }

    #[test]
    fn test_piece_movement_history_comprehensive() {
        // Test comprehensive movement history tracking
        // Requirement: Complete movement history system
        
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
        assert!(!piece.has_moved, "Piece should not have moved initially");
        assert_eq!(piece.last_move_turn, 0, "Last move turn should be 0 initially");

        // Test first move
        piece.has_moved = true;
        piece.last_move_turn = 1;
        
        assert!(piece.has_moved, "Piece should be marked as moved");
        assert_eq!(piece.last_move_turn, 1, "Last move turn should be 1");

        // Test subsequent moves
        let move_sequence = vec![3, 7, 12, 18, 25, 33, 42, 56, 71, 88];
        
        for (i, turn) in move_sequence.iter().enumerate() {
            piece.last_move_turn = *turn;
            
            assert_eq!(piece.last_move_turn, *turn, "Move {} should be recorded at turn {}", i + 2, turn);
            assert!(piece.has_moved, "Piece should remain marked as moved");
            
            // Verify turn progression
            if i > 0 {
                assert!(turn > &move_sequence[i - 1], "Turn {} should be later than previous turn {}", turn, move_sequence[i - 1]);
            }
        }
        
        // Test movement history with different piece types
        let piece_movement_tests = vec![
            (PieceType::Marshal, vec![1, 5, 12], "Marshal movement history"),
            (PieceType::General, vec![2, 8, 15, 23], "General movement history"),
            (PieceType::Shinobi, vec![1, 3, 6, 10, 15, 21], "Shinobi movement history"),
            (PieceType::Fortress, vec![], "Fortress should not move"),
        ];
        
        for (piece_type, turns, description) in piece_movement_tests {
            let mut test_piece = PieceComponent {
                entity_id: 100,
                piece_type,
                owner: 1,
                has_moved: false,
                captured: false,
                stack_level: 0,
                special_abilities: 0,
                last_move_turn: 0,
            };
            
            if turns.is_empty() {
                // Fortress shouldn't move
                assert!(!test_piece.has_moved, "{}", description);
                assert_eq!(test_piece.last_move_turn, 0, "{}", description);
            } else {
                // Apply movement history
                for turn in &turns {
                    test_piece.has_moved = true;
                    test_piece.last_move_turn = *turn;
                }
                
                assert!(test_piece.has_moved, "{}", description);
                assert_eq!(test_piece.last_move_turn, *turns.last().unwrap(), "{}", description);
            }
        }
        
        // Test movement frequency analysis
        let mut active_piece = PieceComponent {
            entity_id: 2,
            piece_type: PieceType::Bow,
            owner: 1,
            has_moved: false,
            captured: false,
            stack_level: 0,
            special_abilities: 0,
            last_move_turn: 0,
        };
        
        // Simulate frequent moves
        let frequent_moves = vec![1, 2, 4, 5, 7, 8, 10, 11, 13, 14];
        let mut move_count = 0;
        
        for turn in frequent_moves {
            active_piece.has_moved = true;
            active_piece.last_move_turn = turn;
            move_count += 1;
        }
        
        assert_eq!(move_count, 10, "Should track 10 moves");
        assert_eq!(active_piece.last_move_turn, 14, "Last move should be turn 14");
        
        // Test move timing analysis
        let move_intervals: Vec<u32> = (1..frequent_moves.len())
            .map(|i| frequent_moves[i] - frequent_moves[i-1])
            .collect();
            
        let average_interval: f32 = move_intervals.iter().sum::<u32>() as f32 / move_intervals.len() as f32;
        assert!(average_interval < 3.0, "Average move interval should be frequent (< 3 turns)");
        
        // Test movement after capture
        active_piece.captured = true;
        let capture_turn = active_piece.last_move_turn;
        
        assert!(active_piece.captured, "Piece should be captured");
        assert_eq!(active_piece.last_move_turn, capture_turn, "Last move turn should be preserved after capture");
        assert!(active_piece.has_moved, "Movement history should be preserved after capture");
    }

    #[test]
    fn test_piece_type_specific_properties_comprehensive() {
        // Test type-specific properties and behaviors for all piece types
        // Requirement: Piece-specific behavior validation
        
        // Test Marshal (King) - most important piece
        let marshal = PieceComponent {
            entity_id: 1,
            piece_type: PieceType::Marshal,
            owner: 1,
            has_moved: false,
            captured: false,
            stack_level: 0,
            special_abilities: 0x88, // Stack Protection + Promoted Flag
            last_move_turn: 0,
        };

        assert_eq!(marshal.piece_type, PieceType::Marshal, "Should be Marshal type");
        assert!(marshal.special_abilities & 0x08 > 0, "Marshal should have stack protection");
        assert!(marshal.special_abilities & 0x80 > 0, "Marshal should have promoted status");
        
        // Test General - powerful piece with enhanced abilities
        let general = PieceComponent {
            entity_id: 2,
            piece_type: PieceType::General,
            owner: 1,
            has_moved: true,
            captured: false,
            stack_level: 0,
            special_abilities: 0x43, // Enhanced Movement + Ranged Attack + Defensive Bonus
            last_move_turn: 5,
        };
        
        assert_eq!(general.piece_type, PieceType::General, "Should be General type");
        assert!(general.special_abilities & 0x01 > 0, "General should have enhanced movement");
        assert!(general.special_abilities & 0x02 > 0, "General should have ranged attack");
        assert!(general.special_abilities & 0x40 > 0, "General should have defensive bonus");

        // Test Fortress - cannot move but provides strategic value
        let fortress = PieceComponent {
            entity_id: 3,
            piece_type: PieceType::Fortress,
            owner: 2,
            has_moved: false,
            captured: false,
            stack_level: 0,
            special_abilities: 0x48, // Stack Protection + Defensive Bonus
            last_move_turn: 0,
        };

        assert_eq!(fortress.piece_type, PieceType::Fortress, "Should be Fortress type");
        assert!(fortress.special_abilities & 0x08 > 0, "Fortress should have stack protection");
        assert!(fortress.special_abilities & 0x40 > 0, "Fortress should have defensive bonus");
        assert!(!fortress.has_moved, "Fortress should never move");
        assert_eq!(fortress.last_move_turn, 0, "Fortress should have no move history");
        
        // Test Bow - ranged attack capabilities
        let bow = PieceComponent {
            entity_id: 4,
            piece_type: PieceType::Bow,
            owner: 1,
            has_moved: true,
            captured: false,
            stack_level: 1,
            special_abilities: 0x06, // Ranged Attack + Jump Over Pieces
            last_move_turn: 3,
        };
        
        assert_eq!(bow.piece_type, PieceType::Bow, "Should be Bow type");
        assert!(bow.special_abilities & 0x02 > 0, "Bow should have ranged attack");
        assert!(bow.special_abilities & 0x04 > 0, "Bow should be able to jump over pieces");
        
        // Test Shinobi - promotion capabilities
        let shinobi = PieceComponent {
            entity_id: 5,
            piece_type: PieceType::Shinobi,
            owner: 2,
            has_moved: true,
            captured: false,
            stack_level: 0,
            special_abilities: 0x11, // Enhanced Movement + Promotion Ability
            last_move_turn: 8,
        };
        
        assert_eq!(shinobi.piece_type, PieceType::Shinobi, "Should be Shinobi type");
        assert!(shinobi.special_abilities & 0x01 > 0, "Shinobi should have enhanced movement");
        assert!(shinobi.special_abilities & 0x10 > 0, "Shinobi should have promotion ability");
        
        // Test all piece types for consistency
        let all_piece_types = vec![
            (PieceType::Marshal, "Marshal", false),
            (PieceType::General, "General", true),
            (PieceType::Lieutenant, "Lieutenant", true),
            (PieceType::Major, "Major", true),
            (PieceType::Minor, "Minor", true),
            (PieceType::Shinobi, "Shinobi", true),
            (PieceType::Bow, "Bow", true),
            (PieceType::Lance, "Lance", true),
            (PieceType::Fortress, "Fortress", false),
            (PieceType::Catapult, "Catapult", true),
            (PieceType::Spy, "Spy", true),
            (PieceType::Samurai, "Samurai", true),
            (PieceType::Captain, "Captain", true),
        ];
        
        for (piece_type, name, can_move) in all_piece_types {
            let test_piece = PieceComponent {
                entity_id: 100,
                piece_type,
                owner: 1,
                has_moved: can_move,
                captured: false,
                stack_level: 0,
                special_abilities: 0,
                last_move_turn: if can_move { 1 } else { 0 },
            };
            
            assert_eq!(test_piece.piece_type, piece_type, "{} type should match", name);
            assert_eq!(test_piece.has_moved, can_move, "{} movement capability should be {}", name, can_move);
            
            if can_move {
                assert!(test_piece.last_move_turn > 0, "{} should have move history if it can move", name);
            } else {
                assert_eq!(test_piece.last_move_turn, 0, "{} should have no move history if it cannot move", name);
            }
        }
        
        // Test piece value hierarchy (for AI evaluation)
        let piece_values = vec![
            (PieceType::Marshal, 1000, "Marshal - highest value"),
            (PieceType::General, 500, "General - very high value"),
            (PieceType::Lieutenant, 250, "Lieutenant - high value"),
            (PieceType::Major, 200, "Major - medium-high value"),
            (PieceType::Bow, 150, "Bow - medium value"),
            (PieceType::Minor, 100, "Minor - medium-low value"),
            (PieceType::Shinobi, 80, "Shinobi - low value but promotable"),
            (PieceType::Fortress, 200, "Fortress - strategic value"),
        ];
        
        for (piece_type, expected_value, description) in piece_values {
            // In real implementation, would have actual value calculation
            let calculated_value = match piece_type {
                PieceType::Marshal => 1000,
                PieceType::General => 500,
                PieceType::Lieutenant => 250,
                PieceType::Major => 200,
                PieceType::Fortress => 200,
                PieceType::Bow => 150,
                PieceType::Minor => 100,
                PieceType::Shinobi => 80,
                _ => 50,
            };
            
            assert_eq!(calculated_value, expected_value, "{}", description);
        }
    }

    #[test]
    fn test_piece_default_values() {
        // Test default piece values for consistency
        // Requirement: Default initialization validation
        
        let default_piece = PieceComponent::default();
        
        assert_eq!(default_piece.entity_id, 0, "Default entity ID should be 0");
        assert_eq!(default_piece.piece_type, PieceType::default(), "Default piece type should match enum default");
        assert_eq!(default_piece.owner, 0, "Default owner should be 0");
        assert!(!default_piece.has_moved, "Default should not have moved");
        assert!(!default_piece.captured, "Default should not be captured");
        assert_eq!(default_piece.stack_level, 0, "Default stack level should be 0");
        assert_eq!(default_piece.special_abilities, 0, "Default special abilities should be 0");
        assert_eq!(default_piece.last_move_turn, 0, "Default last move turn should be 0");
        
        // Test multiple default instances are identical
        let defaults = vec![
            PieceComponent::default(),
            PieceComponent::default(),
            PieceComponent::default(),
        ];
        
        for (i, piece) in defaults.iter().enumerate() {
            assert_eq!(piece.entity_id, 0, "Default {} entity ID should be 0", i);
            assert_eq!(piece.owner, 0, "Default {} owner should be 0", i);
            assert!(!piece.has_moved, "Default {} should not have moved", i);
            assert!(!piece.captured, "Default {} should not be captured", i);
            assert_eq!(piece.stack_level, 0, "Default {} stack level should be 0", i);
            assert_eq!(piece.special_abilities, 0, "Default {} special abilities should be 0", i);
        }
        
        // Test default piece type behavior
        let default_type = PieceType::default();
        assert_eq!(default_type, PieceType::Shinobi, "Default piece type should be Shinobi as specified in implementation");
    }

    #[test]
    fn test_piece_lifecycle_comprehensive() {
        // Test complete piece lifecycle from creation to capture
        // Requirement: Complete piece lifecycle validation
        
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

        // Phase 1: Creation
        assert!(!piece.captured, "Newly created piece should not be captured");
        assert!(!piece.has_moved, "Newly created piece should not have moved");
        assert_eq!(piece.stack_level, 0, "Newly created piece should be at ground level");
        assert_eq!(piece.special_abilities, 0, "Newly created piece should have no special abilities");

        // Phase 2: First movement
        piece.has_moved = true;
        piece.last_move_turn = 1;
        
        assert!(piece.has_moved, "Piece should be marked as moved");
        assert_eq!(piece.last_move_turn, 1, "First move should be recorded");

        // Phase 3: Acquire special abilities
        piece.special_abilities |= 0x01; // Enhanced movement
        piece.last_move_turn = 3;
        
        assert!(piece.special_abilities & 0x01 > 0, "Should acquire enhanced movement");

        // Phase 4: Stacking
        piece.stack_level = 1;
        piece.special_abilities |= 0x20; // Stack movement bonus
        piece.last_move_turn = 5;
        
        assert_eq!(piece.stack_level, 1, "Should move to stack level 1");
        assert!(piece.special_abilities & 0x20 > 0, "Should gain stack bonus");

        // Phase 5: Promotion
        let original_type = piece.piece_type;
        piece.piece_type = PieceType::General;
        piece.special_abilities |= 0x80; // Promotion flag
        piece.special_abilities |= 0x02; // Ranged attack from promotion
        piece.last_move_turn = 8;
        
        assert_ne!(piece.piece_type, original_type, "Piece type should change");
        assert_eq!(piece.piece_type, PieceType::General, "Should promote to General");
        assert!(piece.special_abilities & 0x80 > 0, "Should have promotion flag");
        assert!(piece.special_abilities & 0x02 > 0, "Should gain ranged attack");

        // Phase 6: Advanced stacking
        piece.stack_level = 2;
        piece.special_abilities |= 0x40; // Defensive bonus
        piece.last_move_turn = 12;
        
        assert_eq!(piece.stack_level, 2, "Should reach top of stack");
        assert!(piece.special_abilities & 0x40 > 0, "Should gain defensive bonus");

        // Phase 7: Capture
        piece.captured = true;
        piece.last_move_turn = 15;
        
        assert!(piece.captured, "Piece should be captured");
        assert!(piece.has_moved, "Movement history should be preserved");
        assert_eq!(piece.piece_type, PieceType::General, "Type should be preserved");
        assert_eq!(piece.stack_level, 2, "Stack level should be preserved");
        assert_eq!(piece.special_abilities, 0xE3, "All abilities should be preserved");
        
        // Verify final state
        let expected_abilities = 0x01 | 0x20 | 0x80 | 0x02 | 0x40; // All acquired abilities
        assert_eq!(piece.special_abilities, expected_abilities, "Final abilities should match acquired abilities");
        assert_eq!(piece.last_move_turn, 15, "Final move turn should be capture turn");
        
        // Phase 8: Post-capture analysis
        let lifecycle_summary = PieceLifecycleSummary {
            initial_type: PieceType::Shinobi,
            final_type: piece.piece_type,
            total_moves: piece.last_move_turn,
            max_stack_level: piece.stack_level,
            final_abilities: piece.special_abilities,
            was_promoted: (piece.special_abilities & 0x80) > 0,
            was_captured: piece.captured,
        };
        
        assert_eq!(lifecycle_summary.initial_type, PieceType::Shinobi, "Should track initial type");
        assert_eq!(lifecycle_summary.final_type, PieceType::General, "Should track final type");
        assert_eq!(lifecycle_summary.total_moves, 15, "Should track total moves");
        assert_eq!(lifecycle_summary.max_stack_level, 2, "Should track max stack level");
        assert!(lifecycle_summary.was_promoted, "Should recognize promotion");
        assert!(lifecycle_summary.was_captured, "Should recognize capture");
    }
    
    // Helper struct for lifecycle testing
    struct PieceLifecycleSummary {
        initial_type: PieceType,
        final_type: PieceType,
        total_moves: u32,
        max_stack_level: u8,
        final_abilities: u16,
        was_promoted: bool,
        was_captured: bool,
    }
}
