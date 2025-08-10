use anchor_lang::prelude::*;
use crate::constants::*;
use crate::errors::*;

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

/// Register an AI agent
#[derive(Accounts)]
pub struct RegisterAiAgent<'info> {
    #[account(
        init,
        payer = owner,
        space = AiAgentAccount::LEN,
        seeds = [AI_AGENT_SEED, owner.key().as_ref()],
        bump
    )]
    pub ai_agent: Account<'info, AiAgentAccount>,
    
    #[account(mut)]
    pub owner: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

pub fn register_ai_agent(
    ctx: Context<RegisterAiAgent>,
    name: [u8; 64],
    description: [u8; 256],
    personality_traits: [u8; 512],
    skill_level: u8,
) -> Result<()> {
    require!(skill_level >= MIN_SKILL_LEVEL && skill_level <= MAX_SKILL_LEVEL, NenPlatformError::InvalidSkillLevel);

    let ai_agent = &mut ctx.accounts.ai_agent;
    let current_time = Clock::get()?.unix_timestamp;

    ai_agent.owner = ctx.accounts.owner.key();
    ai_agent.nft_mint = None;
    ai_agent.name = name;
    ai_agent.description = description;
    ai_agent.personality_traits = personality_traits;
    ai_agent.skill_level = skill_level;
    ai_agent.elo_rating = DEFAULT_ELO_RATING;
    ai_agent.games_played = 0;
    ai_agent.wins = 0;
    ai_agent.losses = 0;
    ai_agent.draws = 0;
    ai_agent.model_hash = [0u8; 64]; // Initialize empty
    
    // Convert "v1.0" to byte array
    let mut version_bytes = [0u8; 16];
    let version_str = b"v1.0";
    version_bytes[..version_str.len()].copy_from_slice(version_str);
    ai_agent.model_version = version_bytes;
    
    ai_agent.is_public = false;
    ai_agent.is_tradeable = true;
    ai_agent.market_price = None;
    ai_agent.created_at = current_time;
    ai_agent.updated_at = current_time;

    Ok(())
}

/// Update an AI agent after training
#[derive(Accounts)]
pub struct UpdateAiAgent<'info> {
    #[account(
        mut,
        seeds = [AI_AGENT_SEED, owner.key().as_ref()],
        bump,
        has_one = owner @ NenPlatformError::Unauthorized
    )]
    pub ai_agent: Account<'info, AiAgentAccount>,
    pub owner: Signer<'info>,
}

pub fn update_ai_agent(
    ctx: Context<UpdateAiAgent>,
    new_skill_level: Option<u8>,
    new_personality_traits: Option<[u8; 512]>,
    model_hash: Option<[u8; 64]>,
) -> Result<()> {
    let ai_agent = &mut ctx.accounts.ai_agent;

    if let Some(skill_level) = new_skill_level {
        require!(skill_level >= MIN_SKILL_LEVEL && skill_level <= MAX_SKILL_LEVEL, NenPlatformError::InvalidSkillLevel);
        ai_agent.skill_level = skill_level;
    }

    if let Some(traits) = new_personality_traits {
        ai_agent.personality_traits = traits;
    }

    if let Some(hash) = model_hash {
        ai_agent.model_hash = hash;
    }

    ai_agent.updated_at = Clock::get()?.unix_timestamp;

    Ok(())
}
