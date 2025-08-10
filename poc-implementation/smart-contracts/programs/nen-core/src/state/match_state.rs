use anchor_lang::prelude::*;

/// Match state and information
#[account]
pub struct MatchAccount {
    /// Unique match ID
    pub match_id: u64,
    /// Type of match: 0=AI vs AI, 1=Human vs AI, 2=Human vs Human
    pub match_type: u8,
    /// Current status: 0=Pending, 1=Active, 2=Completed, 3=Cancelled
    pub status: u8,
    /// Player 1 (if human)
    pub player1: Option<Pubkey>,
    /// Player 2 (if human)
    pub player2: Option<Pubkey>,
    /// AI Agent 1 (if AI)
    pub ai_agent1: Option<Pubkey>,
    /// AI Agent 2 (if AI)
    pub ai_agent2: Option<Pubkey>,
    /// Winner of the match
    pub winner: Option<Pubkey>,
    /// Winner type: 0=User, 1=AI Agent
    pub winner_type: Option<u8>,
    /// Total betting pool in lamports
    pub betting_pool: u64,
    /// Deadline for placing bets
    pub betting_deadline: i64,
    /// Whether betting is still active
    pub betting_active: bool,
    /// MagicBlock session ID (max 64 chars)
    pub magicblock_session: [u8; 64],
    /// Final board state as JSON (max 2KB)
    pub final_board_state: [u8; 2048],
    /// Match creation timestamp
    pub created_at: i64,
    /// Match completion timestamp
    pub completed_at: Option<i64>,
}

impl MatchAccount {
    pub const LEN: usize = 8 + // discriminator
        8 +  // match_id
        1 +  // match_type
        1 +  // status
        1 + 32 + // player1 (Option<Pubkey>)
        1 + 32 + // player2 (Option<Pubkey>)
        1 + 32 + // ai_agent1 (Option<Pubkey>)
        1 + 32 + // ai_agent2 (Option<Pubkey>)
        1 + 32 + // winner (Option<Pubkey>)
        1 + 1 + // winner_type (Option<u8>)
        8 +  // betting_pool
        8 +  // betting_deadline
        1 +  // betting_active
        64 + // magicblock_session
        2048 + // final_board_state
        8 +  // created_at
        1 + 8; // completed_at (Option<i64>)
}
