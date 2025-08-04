use anchor_lang::prelude::*;
use crate::constants::*;
use crate::errors::*;
use crate::modules::platform::PlatformState;

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

/// Create a new match
#[derive(Accounts)]
#[instruction(match_type: u8)]
pub struct CreateMatch<'info> {
    #[account(
        mut,
        seeds = [PLATFORM_SEED],
        bump
    )]
    pub platform_state: Account<'info, PlatformState>,
    
    #[account(
        init,
        payer = creator,
        space = MatchAccount::LEN,
        seeds = [MATCH_SEED, platform_state.total_matches.to_le_bytes().as_ref()],
        bump
    )]
    pub match_account: Account<'info, MatchAccount>,
    
    #[account(mut)]
    pub creator: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

pub fn create_match(
    ctx: Context<CreateMatch>,
    match_type: u8,
    player1: Option<Pubkey>,
    player2: Option<Pubkey>,
    ai_agent1: Option<Pubkey>,
    ai_agent2: Option<Pubkey>,
    betting_deadline: i64,
) -> Result<()> {
    require!(match_type <= MATCH_TYPE_HUMAN_VS_HUMAN, NenPlatformError::InvalidMatchType);
    
    let current_time = Clock::get()?.unix_timestamp;
    require!(betting_deadline > current_time, NenPlatformError::InvalidTimestamp);

    let platform_state = &mut ctx.accounts.platform_state;
    let match_account = &mut ctx.accounts.match_account;

    match_account.match_id = platform_state.total_matches;
    match_account.match_type = match_type;
    match_account.status = MATCH_STATUS_PENDING;
    match_account.player1 = player1;
    match_account.player2 = player2;
    match_account.ai_agent1 = ai_agent1;
    match_account.ai_agent2 = ai_agent2;
    match_account.winner = None;
    match_account.winner_type = None;
    match_account.betting_pool = 0;
    match_account.betting_deadline = betting_deadline;
    match_account.betting_active = true;
    match_account.magicblock_session = [0u8; 64]; // Initialize empty
    match_account.final_board_state = [0u8; 2048]; // Initialize empty
    match_account.created_at = current_time;
    match_account.completed_at = None;

    platform_state.total_matches = platform_state.total_matches
        .checked_add(1)
        .ok_or(NenPlatformError::MathematicalOverflow)?;
    platform_state.updated_at = current_time;

    Ok(())
}

/// Settle a match and determine winner
#[derive(Accounts)]
pub struct SettleMatch<'info> {
    #[account(
        seeds = [PLATFORM_SEED],
        bump
    )]
    pub platform_state: Account<'info, PlatformState>,
    
    #[account(
        mut,
        seeds = [MATCH_SEED, match_account.match_id.to_le_bytes().as_ref()],
        bump
    )]
    pub match_account: Account<'info, MatchAccount>,
    
    pub authority: Signer<'info>, // Only platform authority can settle matches
}

pub fn settle_match(
    ctx: Context<SettleMatch>,
    winner: Option<Pubkey>,
    winner_type: Option<u8>,
    final_board_state: [u8; 2048],
) -> Result<()> {
    let platform_state = &ctx.accounts.platform_state;
    let match_account = &mut ctx.accounts.match_account;
    
    // Verify authority
    require!(ctx.accounts.authority.key() == platform_state.authority, NenPlatformError::InvalidAuthority);
    
    // Verify match can be settled
    require!(match_account.status == MATCH_STATUS_ACTIVE, NenPlatformError::InvalidMatchStatus);
    
    // Validate winner type if winner is provided
    if let Some(w_type) = winner_type {
        require!(w_type <= WINNER_TYPE_AI_AGENT, NenPlatformError::InvalidWinnerType);
    }

    let current_time = Clock::get()?.unix_timestamp;

    match_account.status = MATCH_STATUS_COMPLETED;
    match_account.winner = winner;
    match_account.winner_type = winner_type;
    match_account.final_board_state = final_board_state;
    match_account.betting_active = false;
    match_account.completed_at = Some(current_time);

    Ok(())
}
