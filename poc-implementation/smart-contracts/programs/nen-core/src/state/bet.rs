use anchor_lang::prelude::*;

/// Individual bet placed by a user
#[account]
pub struct BetAccount {
    /// The user who placed the bet
    pub bettor: Pubkey,
    /// The match this bet is for
    pub match_account: Pubkey,
    /// Amount bet in lamports
    pub amount: u64,
    /// Predicted winner
    pub predicted_winner: Pubkey,
    /// Predicted winner type: 0=User, 1=AI Agent
    pub predicted_winner_type: u8,
    /// Odds when bet was placed (fixed point, 2 decimals)
    pub odds: u32, // e.g., 250 = 2.50x
    /// Potential payout in lamports
    pub potential_payout: u64,
    /// Bet status: 0=Placed, 1=Won, 2=Lost, 3=Refunded
    pub status: u8,
    /// Actual payout received
    pub actual_payout: u64,
    /// When the bet was placed
    pub created_at: i64,
    /// When the bet was settled
    pub settled_at: Option<i64>,
}

impl BetAccount {
    pub const LEN: usize = 8 + // discriminator
        32 + // bettor
        32 + // match_account
        8 +  // amount
        32 + // predicted_winner
        1 +  // predicted_winner_type
        4 +  // odds
        8 +  // potential_payout
        1 +  // status
        8 +  // actual_payout
        8 +  // created_at
        1 + 8; // settled_at (Option<i64>)
}
