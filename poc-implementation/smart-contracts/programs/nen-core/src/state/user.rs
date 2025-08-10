use anchor_lang::prelude::*;

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
