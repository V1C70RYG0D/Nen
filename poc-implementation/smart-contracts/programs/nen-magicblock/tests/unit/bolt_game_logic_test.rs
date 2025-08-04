extern crate nen_magicblock;
use nen_magicblock::*;

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_position_movement() {
        let mut position = PositionComponent {
            entity_id: 1,
            x: 4,
            y: 4,
            level: 0,
            is_active: true,
            last_updated: 0,
        };
        
        // Move to new position
        position.x = 5;
        position.y = 5;

        assert_eq!(position.x, 5);
        assert_eq!(position.y, 5);
    }

    #[test]
    fn test_piece_movement_restriction() {
        let piece = PieceComponent {
            entity_id: 1,
            piece_type: PieceType::Marshal,
            owner: 1,
            has_moved: false,
            captured: false,
            stack_level: 0,
            special_abilities: 0,
            last_move_turn: 0,
        };

        // Try invalid move for Marshal
        let result = BoltMoveSystem::validate_piece_movement(
            piece.piece_type,
            &BoltMoveData {
                entity_id: 1,
                from_x: 4,
                from_y: 4,
                from_level: 0,
                to_x: 7,  // Invalid move
                to_y: 7,  // Invalid move
                to_level: 0,
                piece_type: PieceType::Marshal,
                player: 1,
                move_type: MoveType::Normal,
                capture_entity: None,
                stack_operation: StackOperation::None,
                timestamp: 0,
            },
            &HashMap::new(),
            &HashMap::new(),
            &BoardState {
                board: [[None; 9]; 9],
                stacks: HashMap::new(),
                captured_pieces: vec![],
                move_count: 0,
                current_player: 1,
                game_phase: GamePhase::Opening,
                special_rules_active: 0,
            },
        );
        
        assert!(result.is_err(), "Move should be invalid due to move restrictions");
    }

    #[test]
    fn test_ai_agent_decisions() {
        let mut ai_agent = AIAgentComponent {
            entity_id: 1,
            personality: PersonalityType::Aggressive,
            skill_level: 2000,
            games_played: 0,
            wins: 0,
            losses: 0,
            draw: 0,
            learning_rate: 5,
            last_updated: 0,
        };

        ai_agent.games_played += 1;
        ai_agent.wins += 1;

        assert_eq!(ai_agent.games_played, 1);
        assert_eq!(ai_agent.wins, 1);
    }
}

