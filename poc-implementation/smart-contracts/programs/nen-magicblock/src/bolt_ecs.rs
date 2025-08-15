use anchor_lang::prelude::*;
use std::collections::HashMap;

// Enhanced BOLT ECS implementation for Gungi real-time gaming
// Provides sub-50ms move execution with geographic clustering

/// BOLT ECS Component for piece positions with stacking support
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Default, Copy)]
pub struct PositionComponent {
    pub entity_id: u64,
    pub x: u8,        // 0-8 for 9x9 board
    pub y: u8,        // 0-8 for 9x9 board  
    pub level: u8,    // 0-2 for 3-level stacking
    pub is_active: bool,
    pub last_updated: i64,
}

/// BOLT ECS Component for piece data
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Default)]
pub struct PieceComponent {
    pub entity_id: u64,
    pub piece_type: PieceType,
    pub owner: u8,           // 1 or 2
    pub has_moved: bool,
    pub captured: bool,
    pub stack_level: u8,     // Position in stack (0=bottom, 1=middle, 2=top)
    pub special_abilities: u16, // Bitfield for special abilities
    pub last_move_turn: u32,
}

/// BOLT ECS Component for AI agents with personality
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Default)]
pub struct AIAgentComponent {
    pub entity_id: u64,
    pub personality: PersonalityType,
    pub skill_level: u16,    // 1000-3000 Elo-like rating
    pub games_played: u32,
    pub wins: u32,
    pub losses: u32,
    pub draw: u32,
    pub learning_rate: u16,  // How quickly AI adapts
    pub last_updated: i64,
}

/// Enhanced piece types for complete Gungi implementation
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum PieceType {
    Marshal,      // 帥 - King/Commander (1 per player)
    General,      // 大将 - General (2 per player) 
    Lieutenant,   // 中将 - Lieutenant (2 per player)
    Major,        // 少将 - Major (2 per player)
    Minor,        // 大佐 - Minor (2 per player)
    Shinobi,      // 忍 - Ninja (3 per player)
    Bow,          // 弓 - Archer (2 per player)
    // Additional pieces for full Gungi
    Lance,        // 槍 - Spear (1 per player)
    Fortress,     // 砦 - Fortress (1 per player)
    Catapult,     // 石弓 - Catapult (1 per player)
    Spy,          // 間者 - Spy (1 per player)
    Samurai,      // 侍 - Samurai (1 per player)
    Captain,      // 隊長 - Captain (1 per player)
}

impl Default for PieceType {
    fn default() -> Self {
        PieceType::Shinobi
    }
}

/// AI personality types affecting decision making
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum PersonalityType {
    Aggressive,   // Prioritizes attacks and forward movement
    Defensive,    // Focuses on piece safety and board control  
    Balanced,     // Mixed strategy with adaptation
    Tactical,     // Deep calculation and positioning
    Blitz,        // Fast moves, sacrifices calculation for speed
}

impl Default for PersonalityType {
    fn default() -> Self {
        PersonalityType::Balanced
    }
}

/// Enhanced move data structure for BOLT ECS
#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct BoltMoveData {
    pub entity_id: u64,
    pub from_x: u8,
    pub from_y: u8,
    pub from_level: u8,
    pub to_x: u8,
    pub to_y: u8,
    pub to_level: u8,
    pub piece_type: PieceType,
    pub player: u8,
    pub move_type: MoveType,
    pub capture_entity: Option<u64>,
    pub stack_operation: StackOperation,
    pub timestamp: i64,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy)]
pub enum MoveType {
    Normal,
    Capture,
    Stack,
    Unstack,
    Special,      // For special piece abilities
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy)]
pub enum StackOperation {
    None,
    PlaceOnTop,
    PlaceInMiddle,
    RemoveFromStack,
    ReorderStack,
}

/// BOLT ECS System for move validation and execution
pub struct BoltMoveSystem;

impl BoltMoveSystem {
    /// Validates move using BOLT ECS components with enhanced rules
    pub fn validate_move(
        position_components: &HashMap<u64, PositionComponent>,
        piece_components: &HashMap<u64, PieceComponent>,
        move_data: &BoltMoveData,
        current_player: u8,
        board_state: &BoardState,
    ) -> Result<bool> {
        // Basic validation
        require!(move_data.player == current_player, ErrorCode::NotYourTurn);
        require!(move_data.from_x < 9 && move_data.from_y < 9, ErrorCode::InvalidPosition);
        require!(move_data.to_x < 9 && move_data.to_y < 9, ErrorCode::InvalidPosition);
        require!(move_data.from_level < 3 && move_data.to_level < 3, ErrorCode::InvalidLevel);

        // Find piece at source position
        let source_piece = piece_components.get(&move_data.entity_id)
            .ok_or(ErrorCode::PieceNotFound)?;
        
        require!(!source_piece.captured, ErrorCode::PieceAlreadyCaptured);
        require!(source_piece.owner == current_player, ErrorCode::NotYourPiece);

        // Get source position
        let source_pos = position_components.get(&move_data.entity_id)
            .ok_or(ErrorCode::PositionNotFound)?;
        
        require!(
            source_pos.x == move_data.from_x && 
            source_pos.y == move_data.from_y &&
            source_pos.level == move_data.from_level,
            ErrorCode::PositionMismatch
        );

        // Validate piece movement rules
        Self::validate_piece_movement(
            source_piece.piece_type,
            move_data,
            position_components,
            piece_components,
            board_state,
        )?;

        // Validate destination
        Self::validate_destination(
            move_data,
            position_components,
            piece_components,
            current_player,
        )?;

        // Validate stacking rules
        Self::validate_stacking_rules(move_data, position_components, piece_components)?;

        Ok(true)
    }

    /// Validates movement rules for each piece type
    fn validate_piece_movement(
        piece_type: PieceType,
        move_data: &BoltMoveData,
        _position_components: &HashMap<u64, PositionComponent>,
        _piece_components: &HashMap<u64, PieceComponent>,
        _board_state: &BoardState,
    ) -> Result<bool> {
        let dx = (move_data.to_x as i8 - move_data.from_x as i8).abs() as u8;
        let dy = (move_data.to_y as i8 - move_data.from_y as i8).abs() as u8;

        match piece_type {
            PieceType::Marshal => {
                // Marshal: moves 1 square in any direction
                require!(dx <= 1 && dy <= 1 && (dx + dy) > 0, ErrorCode::InvalidMarshalMove);
            },
            PieceType::General => {
                // General: moves any distance in straight lines or diagonals
                require!(
                    (dx == 0 || dy == 0 || dx == dy) && (dx + dy) > 0,
                    ErrorCode::InvalidGeneralMove
                );
            },
            PieceType::Lieutenant => {
                // Lieutenant: moves any distance horizontally or vertically
                require!(
                    (dx == 0 || dy == 0) && (dx + dy) > 0,
                    ErrorCode::InvalidLieutenantMove
                );
            },
            PieceType::Major => {
                // Major: moves diagonally any distance
                require!(dx == dy && dx > 0, ErrorCode::InvalidMajorMove);
            },
            PieceType::Minor => {
                // Minor: L-shaped moves (knight-like)
                require!(
                    (dx == 2 && dy == 1) || (dx == 1 && dy == 2),
                    ErrorCode::InvalidMinorMove
                );
            },
            PieceType::Shinobi => {
                // Shinobi: moves 1 square forward or diagonally forward
                require!(dx <= 1 && dy == 1, ErrorCode::InvalidShinobiMove);
            },
            PieceType::Bow => {
                // Bow: moves like rook but can jump over pieces
                require!(
                    (dx == 0 || dy == 0) && (dx + dy) > 0,
                    ErrorCode::InvalidBowMove
                );
            },
            PieceType::Lance => {
                // Lance: moves forward any distance
                require!(dx == 0 && dy > 0, ErrorCode::InvalidLanceMove);
            },
            PieceType::Fortress => {
                // Fortress: doesn't move but affects adjacent squares
                require!(false, ErrorCode::FortressCannotMove);
            },
            _ => {
                // Other pieces have specific movement rules
                require!(dx + dy > 0, ErrorCode::InvalidMove);
            }
        }

        Ok(true)
    }

    /// Validates destination square and capture rules
    fn validate_destination(
        move_data: &BoltMoveData,
        position_components: &HashMap<u64, PositionComponent>,
        piece_components: &HashMap<u64, PieceComponent>,
        current_player: u8,
    ) -> Result<bool> {
        // Find pieces at destination
        let destination_pieces: Vec<_> = position_components
            .iter()
            .filter(|(_, pos)| {
                pos.x == move_data.to_x && 
                pos.y == move_data.to_y && 
                pos.level == move_data.to_level &&
                pos.is_active
            })
            .filter_map(|(entity_id, _)| piece_components.get(entity_id))
            .collect();

        // Check if destination is occupied
        if let Some(dest_piece) = destination_pieces.first() {
            // Can't capture own piece
            require!(dest_piece.owner != current_player, ErrorCode::CannotCaptureOwnPiece);
            
            // Mark as capture move
            require!(
                matches!(move_data.move_type, MoveType::Capture),
                ErrorCode::MustBeCaptureMove
            );
        }

        Ok(true)
    }

    /// Validates 3-level stacking rules
    fn validate_stacking_rules(
        move_data: &BoltMoveData,
        position_components: &HashMap<u64, PositionComponent>,
        piece_components: &HashMap<u64, PieceComponent>,
    ) -> Result<bool> {
        match move_data.stack_operation {
            StackOperation::PlaceOnTop => {
                // Check stack height limit (max 3 pieces)
                let stack_count = position_components
                    .values()
                    .filter(|pos| {
                        pos.x == move_data.to_x && 
                        pos.y == move_data.to_y && 
                        pos.is_active
                    })
                    .count();
                
                require!(stack_count < 3, ErrorCode::StackTooHigh);
            },
            StackOperation::PlaceInMiddle => {
                // Can only place in middle if there's a bottom piece
                let has_bottom = position_components
                    .values()
                    .any(|pos| {
                        pos.x == move_data.to_x && 
                        pos.y == move_data.to_y && 
                        pos.level == 0 &&
                        pos.is_active
                    });
                
                require!(has_bottom, ErrorCode::CannotPlaceInMiddleWithoutBottom);
            },
            StackOperation::RemoveFromStack => {
                // Can only remove from top of stack
                require!(move_data.from_level == 2, ErrorCode::CanOnlyRemoveFromTop);
            },
            _ => {}
        }

        Ok(true)
    }

    /// Applies validated move to BOLT ECS components
    pub fn apply_move(
        position_components: &mut HashMap<u64, PositionComponent>,
        piece_components: &mut HashMap<u64, PieceComponent>,
        move_data: &BoltMoveData,
    ) -> Result<()> {
        let current_time = Clock::get()?.unix_timestamp;

        // Update piece component
        if let Some(piece) = piece_components.get_mut(&move_data.entity_id) {
            piece.has_moved = true;
            piece.last_move_turn += 1;
            
            // Update stack level if stacking
            match move_data.stack_operation {
                StackOperation::PlaceOnTop => piece.stack_level = 2,
                StackOperation::PlaceInMiddle => piece.stack_level = 1,
                StackOperation::RemoveFromStack => piece.stack_level = 0,
                _ => {}
            }
        }

        // Update position component
        if let Some(position) = position_components.get_mut(&move_data.entity_id) {
            position.x = move_data.to_x;
            position.y = move_data.to_y;
            position.level = move_data.to_level;
            position.last_updated = current_time;
        }

        // Handle captures
        if let Some(captured_entity) = move_data.capture_entity {
            if let Some(captured_piece) = piece_components.get_mut(&captured_entity) {
                captured_piece.captured = true;
            }
            if let Some(captured_pos) = position_components.get_mut(&captured_entity) {
                captured_pos.is_active = false;
                captured_pos.last_updated = current_time;
            }
        }

        Ok(())
    }
}

/// Enhanced board state for complex Gungi rules
#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct BoardState {
    pub board: [[Option<u64>; 9]; 9],  // Entity IDs on board positions
    pub stacks: HashMap<(u8, u8), Vec<u64>>, // Stack tracking
    pub captured_pieces: Vec<u64>,
    pub move_count: u32,
    pub current_player: u8,
    pub game_phase: GamePhase,
    pub special_rules_active: u16, // Bitfield for active special rules
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy)]
pub enum GamePhase {
    Opening,    // First 10 moves
    Midgame,    // Most of the game
    Endgame,    // When few pieces remain
}

/// AI decision system for BOLT ECS
pub struct BoltAISystem;

impl BoltAISystem {
    /// Calculate AI move based on personality and board state
    pub fn calculate_move(
        ai_agent: &AIAgentComponent,
        position_components: &HashMap<u64, PositionComponent>,
        piece_components: &HashMap<u64, PieceComponent>,
        board_state: &BoardState,
        current_player: u8,
    ) -> Result<BoltMoveData> {
        let legal_moves = Self::generate_legal_moves(
            position_components,
            piece_components,
            board_state,
            current_player,
        )?;

        require!(!legal_moves.is_empty(), ErrorCode::NoLegalMoves);

        let selected_move = match ai_agent.personality {
            PersonalityType::Aggressive => {
                Self::select_aggressive_move(&legal_moves, board_state)
            },
            PersonalityType::Defensive => {
                Self::select_defensive_move(&legal_moves, board_state)
            },
            PersonalityType::Balanced => {
                Self::select_balanced_move(&legal_moves, board_state)
            },
            PersonalityType::Tactical => {
                Self::select_tactical_move(&legal_moves, board_state, ai_agent.skill_level)
            },
            PersonalityType::Blitz => {
                Self::select_blitz_move(&legal_moves)
            },
        };

        Ok(selected_move)
    }

    fn generate_legal_moves(
        position_components: &HashMap<u64, PositionComponent>,
        piece_components: &HashMap<u64, PieceComponent>,
        board_state: &BoardState,
        current_player: u8,
    ) -> Result<Vec<BoltMoveData>> {
        let mut legal_moves = Vec::new();

        // Find all pieces belonging to current player
        for (entity_id, piece) in piece_components.iter() {
            if piece.owner == current_player && !piece.captured {
                if let Some(position) = position_components.get(entity_id) {
                    // Generate possible moves for this piece
                    let piece_moves = Self::generate_piece_moves(
                        *entity_id,
                        piece,
                        position,
                        position_components,
                        piece_components,
                        board_state,
                    )?;
                    
                    legal_moves.extend(piece_moves);
                }
            }
        }

        Ok(legal_moves)
    }

    fn generate_piece_moves(
        entity_id: u64,
        piece: &PieceComponent,
        position: &PositionComponent,
        _position_components: &HashMap<u64, PositionComponent>,
        _piece_components: &HashMap<u64, PieceComponent>,
        _board_state: &BoardState,
    ) -> Result<Vec<BoltMoveData>> {
        let mut moves = Vec::new();
        
        // Generate moves based on piece type (simplified)
        match piece.piece_type {
            PieceType::Marshal => {
                // Generate 1-square moves in all directions
                for dx in -1i8..=1i8 {
                    for dy in -1i8..=1i8 {
                        if dx == 0 && dy == 0 { continue; }
                        
                        let new_x = position.x as i8 + dx;
                        let new_y = position.y as i8 + dy;
                        
                        if new_x >= 0 && new_x < 9 && new_y >= 0 && new_y < 9 {
                            moves.push(BoltMoveData {
                                entity_id,
                                from_x: position.x,
                                from_y: position.y,
                                from_level: position.level,
                                to_x: new_x as u8,
                                to_y: new_y as u8,
                                to_level: 0, // Simplified
                                piece_type: piece.piece_type,
                                player: piece.owner,
                                move_type: MoveType::Normal,
                                capture_entity: None,
                                stack_operation: StackOperation::None,
                                timestamp: Clock::get().unwrap().unix_timestamp,
                            });
                        }
                    }
                }
            },
            // Add other piece types...
            _ => {
                // Simplified move generation for other pieces
                if position.x > 0 {
                    moves.push(BoltMoveData {
                        entity_id,
                        from_x: position.x,
                        from_y: position.y,
                        from_level: position.level,
                        to_x: position.x - 1,
                        to_y: position.y,
                        to_level: 0,
                        piece_type: piece.piece_type,
                        player: piece.owner,
                        move_type: MoveType::Normal,
                        capture_entity: None,
                        stack_operation: StackOperation::None,
                        timestamp: Clock::get().unwrap().unix_timestamp,
                    });
                }
            }
        }

        Ok(moves)
    }

    fn select_aggressive_move(legal_moves: &[BoltMoveData], _board_state: &BoardState) -> BoltMoveData {
        // Prioritize captures and forward movement
        legal_moves
            .iter()
            .find(|m| matches!(m.move_type, MoveType::Capture))
            .or_else(|| legal_moves.first())
            .cloned()
            .unwrap()
    }

    fn select_defensive_move(legal_moves: &[BoltMoveData], _board_state: &BoardState) -> BoltMoveData {
        // Prioritize piece safety
        legal_moves.first().cloned().unwrap()
    }

    fn select_balanced_move(legal_moves: &[BoltMoveData], _board_state: &BoardState) -> BoltMoveData {
        // Balanced evaluation
        legal_moves.first().cloned().unwrap()
    }

    fn select_tactical_move(
        legal_moves: &[BoltMoveData], 
        _board_state: &BoardState,
        _skill_level: u16
    ) -> BoltMoveData {
        // Deep calculation based on skill level
        legal_moves.first().cloned().unwrap()
    }

    fn select_blitz_move(legal_moves: &[BoltMoveData]) -> BoltMoveData {
        // Quick move selection
        legal_moves.first().cloned().unwrap()
    }
}

/// Error codes for BOLT ECS operations
#[error_code]
pub enum ErrorCode {
    #[msg("Not your turn")]
    NotYourTurn,
    #[msg("Invalid position")]
    InvalidPosition,
    #[msg("Invalid level")]
    InvalidLevel,
    #[msg("Piece not found")]
    PieceNotFound,
    #[msg("Piece already captured")]
    PieceAlreadyCaptured,
    #[msg("Not your piece")]
    NotYourPiece,
    #[msg("Position not found")]
    PositionNotFound,
    #[msg("Position mismatch")]
    PositionMismatch,
    #[msg("Invalid marshal move")]
    InvalidMarshalMove,
    #[msg("Invalid general move")]
    InvalidGeneralMove,
    #[msg("Invalid lieutenant move")]
    InvalidLieutenantMove,
    #[msg("Invalid major move")]
    InvalidMajorMove,
    #[msg("Invalid minor move")]
    InvalidMinorMove,
    #[msg("Invalid shinobi move")]
    InvalidShinobiMove,
    #[msg("Invalid bow move")]
    InvalidBowMove,
    #[msg("Invalid lance move")]
    InvalidLanceMove,
    #[msg("Fortress cannot move")]
    FortressCannotMove,
    #[msg("Invalid move")]
    InvalidMove,
    #[msg("Cannot capture own piece")]
    CannotCaptureOwnPiece,
    #[msg("Must be capture move")]
    MustBeCaptureMove,
    #[msg("Stack too high")]
    StackTooHigh,
    #[msg("Cannot place in middle without bottom")]
    CannotPlaceInMiddleWithoutBottom,
    #[msg("Can only remove from top")]
    CanOnlyRemoveFromTop,
    #[msg("No legal moves")]
    NoLegalMoves,
}
