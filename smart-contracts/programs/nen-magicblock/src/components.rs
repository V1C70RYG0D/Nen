use anchor_lang::prelude::*;

/// Position component for pieces on the board
/// Standard Anchor account for POC phase
#[account]
#[derive(Debug)]
pub struct Position {
    pub x: u8,         // 0-8 for 9x9 board
    pub y: u8,         // 0-8 for 9x9 board  
    pub level: u8,     // 0-2 for stacking (0 = bottom, 2 = top)
}

impl Position {
    pub const SIZE: usize = 8 + 1 + 1 + 1; // discriminator + x + y + level
}

/// Piece component representing game pieces
#[account]
#[derive(Debug)]
pub struct Piece {
    pub piece_type: PieceType,
    pub owner: u8,            // 1 or 2
    pub is_captured: bool,
    pub move_count: u16,      // For special rules
}

impl Piece {
    pub const SIZE: usize = 8 + 1 + 1 + 1 + 2; // discriminator + piece_type + owner + is_captured + move_count
}

/// Game session state
#[account]
#[derive(Debug)]
pub struct GameSession {
    pub player1: Pubkey,
    pub player2: Option<Pubkey>, // None for AI opponents
    pub current_turn: u8,        // 1 or 2
    pub move_number: u16,
    pub status: GameStatus,
    pub winner: Option<u8>,
    pub created_at: i64,
    pub last_move_at: i64,
    pub session_id: [u8; 64],    // Fixed size array instead of String
}

impl GameSession {
    pub const SIZE: usize = 8 + 32 + 1 + 32 + 1 + 2 + 1 + 1 + 1 + 8 + 8 + 64;
}

/// Clock component for timed games
#[account]
#[derive(Debug)]
pub struct GameClock {
    pub player1_time: u64,    // Milliseconds remaining
    pub player2_time: u64,    // Milliseconds remaining
    pub increment: u64,       // Increment per move (ms)
    pub last_move_time: i64,  // Unix timestamp
}

impl GameClock {
    pub const SIZE: usize = 8 + 8 + 8 + 8 + 8; // discriminator + 4 u64/i64 fields
}

/// Move history for replay and verification
#[account]
#[derive(Debug)]
pub struct MoveHistory {
    pub move_count: u16,
    pub moves: [GameMove; 50], // Fixed array for POC
    pub board_hashes: [[u8; 32]; 50], // Fixed array for board hashes
}

impl MoveHistory {
    pub const SIZE: usize = 8 + 2 + (50 * 64) + (50 * 32); // discriminator + count + moves + hashes
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug, Default)]
pub struct GameMove {
    pub player: u8,
    pub from_pos: (u8, u8, u8), // x, y, level
    pub to_pos: (u8, u8, u8),   // x, y, level
    pub piece_type: PieceType,
    pub captured: Option<PieceType>,
    pub timestamp: i64,
    pub move_notation: [u8; 32],   // Fixed size move notation
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug, PartialEq, Default)]
pub enum PieceType {
    #[default]
    Marshal,    // King piece - capture to win
    General,    // Powerful piece
    Lieutenant, // Lieutenant General
    Major,      // Major General
    Minor,      // Minor General
    Shinobi,    // Stealth piece
    Bow,        // Ranged piece
    Cannon,     // Heavy artillery
    Fort,       // Defensive structure
    Pawn,       // Basic infantry
    Fortress,   // Heavy defense
    Lance,      // Piercing piece
    Spy,        // Infiltration piece
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug, PartialEq)]
pub enum GameStatus {
    WaitingForPlayers,
    InProgress,
    Paused,
    Completed,
    Aborted,
    TimeExpired,
}

impl PieceType {
    /// Get movement pattern for each piece type
    pub fn get_movement_pattern(&self) -> Vec<(i8, i8)> {
        match self {
            PieceType::Marshal => vec![
                (0, 1), (1, 1), (1, 0), (1, -1),
                (0, -1), (-1, -1), (-1, 0), (-1, 1)
            ], // King movement - 1 square any direction
            PieceType::General => vec![
                (0, 1), (1, 1), (1, 0), (1, -1),
                (0, -1), (-1, -1), (-1, 0), (-1, 1),
                (0, 2), (2, 0), (0, -2), (-2, 0)
            ], // Extended movement
            PieceType::Pawn => vec![(0, 1)], // Forward only
            // Simplified for POC - full movement patterns would be more complex
            _ => vec![
                (0, 1), (1, 1), (1, 0), (1, -1),
                (0, -1), (-1, -1), (-1, 0), (-1, 1)
            ],
        }
    }

    /// Check if piece can stack (some pieces cannot stack)
    pub fn can_stack(&self) -> bool {
        match self {
            PieceType::Fort | PieceType::Fortress => false, // Structures cannot stack
            _ => true,
        }
    }
}
