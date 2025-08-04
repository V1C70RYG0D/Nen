use anchor_lang::prelude::*;

/// Global platform configuration and state
#[account]
pub struct PlatformState {
    /// Authority that can update platform settings
    pub authority: Pubkey,
    /// Platform fee in basis points (e.g., 250 = 2.5%)
    pub platform_fee: u16,
    /// Minimum bet amount in lamports
    pub min_bet_lamports: u64,
    /// Maximum bet amount in lamports
    pub max_bet_lamports: u64,
    /// Total number of matches created
    pub total_matches: u64,
    /// Total volume bet in lamports
    pub total_volume_lamports: u64,
    /// Total fees collected in lamports
    pub total_fees_collected: u64,
    /// Platform treasury bump
    pub treasury_bump: u8,
    /// When the platform was initialized
    pub created_at: i64,
    /// Last update timestamp
    pub updated_at: i64,
}

impl PlatformState {
    pub const LEN: usize = 8 + // discriminator
        32 + // authority
        2 +  // platform_fee
        8 +  // min_bet_lamports
        8 +  // max_bet_lamports
        8 +  // total_matches
        8 +  // total_volume_lamports
        8 +  // total_fees_collected
        1 +  // treasury_bump
        8 +  // created_at
        8;   // updated_at
}

/// User account storing profile and statistics
#[account]
pub struct UserAccount {
    /// Wallet address of the user
    pub wallet: Pubkey,
    /// Username (max 32 chars, null-terminated)
    pub username: [u8; 32],
    /// User preferences as JSON string (max 256 chars)
    pub preferences: [u8; 256],
    /// Total number of games played
    pub games_played: u32,
    /// Total number of games won
    pub games_won: u32,
    /// Current Elo rating
    pub elo_rating: u16,
    /// Total winnings in lamports
    pub total_winnings: u64,
    /// Total losses in lamports
    pub total_losses: u64,
    /// Total bets placed
    pub total_bets: u32,
    /// Account creation timestamp
    pub created_at: i64,
    /// Last activity timestamp
    pub updated_at: i64,
}

impl UserAccount {
    pub const LEN: usize = 8 + // discriminator
        32 + // wallet
        32 + // username
        256 + // preferences
        4 +  // games_played
        4 +  // games_won
        2 +  // elo_rating
        8 +  // total_winnings
        8 +  // total_losses
        4 +  // total_bets
        8 +  // created_at
        8;   // updated_at
}

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

/// AI Agent registration and metadata
#[account]
pub struct AiAgentAccount {
    /// Owner of the AI agent
    pub owner: Pubkey,
    /// NFT mint address (if minted as NFT)
    pub nft_mint: Option<Pubkey>,
    /// Agent name (max 64 chars)
    pub name: [u8; 64],
    /// Agent description (max 256 chars)
    pub description: [u8; 256],
    /// Personality traits as JSON string (max 512 chars)
    pub personality_traits: [u8; 512],
    /// Skill level (1-10)
    pub skill_level: u8,
    /// Current Elo rating
    pub elo_rating: u16,
    /// Total games played
    pub games_played: u32,
    /// Total wins
    pub wins: u32,
    /// Total losses
    pub losses: u32,
    /// Total draws
    pub draws: u32,
    /// Model hash for verification (max 64 chars)
    pub model_hash: [u8; 64],
    /// Model version (max 16 chars)
    pub model_version: [u8; 16],
    /// Whether agent is publicly available
    pub is_public: bool,
    /// Whether agent can be traded as NFT
    pub is_tradeable: bool,
    /// Current market price in lamports (if listed)
    pub market_price: Option<u64>,
    /// Agent creation timestamp
    pub created_at: i64,
    /// Last update timestamp
    pub updated_at: i64,
}

impl AiAgentAccount {
    pub const LEN: usize = 8 + // discriminator
        32 + // owner
        1 + 32 + // nft_mint (Option<Pubkey>)
        64 + // name
        256 + // description
        512 + // personality_traits
        1 +  // skill_level
        2 +  // elo_rating
        4 +  // games_played
        4 +  // wins
        4 +  // losses
        4 +  // draws
        64 + // model_hash
        16 + // model_version
        1 +  // is_public
        1 +  // is_tradeable
        1 + 8 + // market_price (Option<u64>)
        8 +  // created_at
        8;   // updated_at
}
