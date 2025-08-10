use anchor_lang::prelude::*;

/// Training session PDA for AI agent training
#[account]
pub struct TrainingSession {
    /// Unique session ID (UUID v4, 36 bytes)
    pub session_id: [u8; 36],
    /// Owner wallet
    pub owner: Pubkey,
    /// AI agent NFT mint
    pub agent_mint: Pubkey,
    /// Replay commitment hashes (up to 20, each 64 bytes)
    pub replay_commitments: [[u8; 64]; 20],
    /// Number of replays used
    pub replay_count: u8,
    /// Training parameters as JSON (max 256 bytes)
    pub training_params: [u8; 256],
    /// Status: 0=Pending, 1=Active, 2=Completed
    pub status: u8,
    /// Lock flag: true if agent is locked for training
    pub agent_locked: bool,
    /// Priority (0=normal, 1=high)
    pub priority: u8,
    /// Fee paid in lamports
    pub fee_paid: u64,
    /// Created timestamp
    pub created_at: i64,
    /// Completed timestamp
    pub completed_at: Option<i64>,
}

impl TrainingSession {
    pub const LEN: usize = 8 + // discriminator
        36 + // session_id
        32 + // owner
        32 + // agent_mint
        (64 * 20) + // replay_commitments
        1 + // replay_count
        256 + // training_params
        1 + // status
        1 + // agent_locked
        1 + // priority
        8 + // fee_paid
        8 + // created_at
        1 + 8; // completed_at (Option<i64>)
}
