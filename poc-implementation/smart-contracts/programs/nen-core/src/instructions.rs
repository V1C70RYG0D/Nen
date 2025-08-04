use anchor_lang::prelude::*;
use anchor_lang::system_program;

use crate::state::*;
use crate::errors::*;
use crate::constants::*;

/// Initialize the Nen Platform
#[derive(Accounts)]
pub struct InitializePlatform<'info> {
    #[account(
        init,
        payer = authority,
        space = PlatformState::LEN,
        seeds = [PLATFORM_SEED],
        bump
    )]
    pub platform_state: Account<'info, PlatformState>,
    
    /// CHECK: Treasury account for collecting fees
    #[account(
        seeds = [TREASURY_SEED],
        bump
    )]
    pub treasury: UncheckedAccount<'info>,
    
    #[account(mut)]
    pub authority: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

pub fn initialize_platform(
    ctx: Context<InitializePlatform>,
    authority: Pubkey,
    platform_fee: u16,
    min_bet_lamports: u64,
    max_bet_lamports: u64,
) -> Result<()> {
    require!(platform_fee <= MAX_PLATFORM_FEE_BPS, NenPlatformError::PlatformFeeTooHigh);
    require!(min_bet_lamports <= max_bet_lamports, NenPlatformError::BetAmountTooLow);

    let platform_state = &mut ctx.accounts.platform_state;
    let current_time = Clock::get()?.unix_timestamp;

    platform_state.authority = authority;
    platform_state.platform_fee = platform_fee;
    platform_state.min_bet_lamports = min_bet_lamports;
    platform_state.max_bet_lamports = max_bet_lamports;
    platform_state.total_matches = 0;
    platform_state.total_volume_lamports = 0;
    platform_state.total_fees_collected = 0;
    platform_state.treasury_bump = ctx.bumps.treasury;
    platform_state.created_at = current_time;
    platform_state.updated_at = current_time;

    Ok(())
}

/// Create a user account
#[derive(Accounts)]
pub struct CreateUserAccount<'info> {
    #[account(
        init,
        payer = user,
        space = UserAccount::LEN,
        seeds = [USER_SEED, user.key().as_ref()],
        bump
    )]
    pub user_account: Account<'info, UserAccount>,
    
    #[account(mut)]
    pub user: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

pub fn create_user_account(
    ctx: Context<CreateUserAccount>,
    username: String,
) -> Result<()> {
    require!(username.len() <= MAX_USERNAME_LENGTH, NenPlatformError::UsernameTooLong);

    let user_account = &mut ctx.accounts.user_account;
    let current_time = Clock::get()?.unix_timestamp;

    user_account.wallet = ctx.accounts.user.key();
    
    // Convert string to byte array
    let mut username_bytes = [0u8; 32];
    let username_bytes_slice = username.as_bytes();
    let copy_len = std::cmp::min(username_bytes_slice.len(), 32);
    username_bytes[..copy_len].copy_from_slice(&username_bytes_slice[..copy_len]);
    user_account.username = username_bytes;
    
    user_account.preferences = [0u8; 256]; // Initialize empty preferences
    user_account.games_played = 0;
    user_account.games_won = 0;
    user_account.elo_rating = DEFAULT_ELO_RATING;
    user_account.total_winnings = 0;
    user_account.total_losses = 0;
    user_account.total_bets = 0;
    user_account.created_at = current_time;
    user_account.updated_at = current_time;

    Ok(())
}

/// Update user account
#[derive(Accounts)]
pub struct UpdateUserAccount<'info> {
    #[account(
        mut,
        seeds = [USER_SEED, user.key().as_ref()],
        bump,
        has_one = wallet @ NenPlatformError::Unauthorized
    )]
    pub user_account: Account<'info, UserAccount>,
    
    /// CHECK: This should match user_account.wallet
    pub wallet: UncheckedAccount<'info>,
    
    pub user: Signer<'info>,
}

pub fn update_user_account(
    ctx: Context<UpdateUserAccount>,
    username: Option<[u8; 32]>,
    preferences: Option<[u8; 256]>,
) -> Result<()> {
    let user_account = &mut ctx.accounts.user_account;

    if let Some(new_username) = username {
        user_account.username = new_username;
    }

    if let Some(new_preferences) = preferences {
        user_account.preferences = new_preferences;
    }

    user_account.updated_at = Clock::get()?.unix_timestamp;

    Ok(())
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

/// Place a bet on a match
#[derive(Accounts)]
#[instruction(amount_lamports: u64)]
pub struct PlaceBet<'info> {
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
    
    #[account(
        mut,
        seeds = [USER_SEED, bettor.key().as_ref()],
        bump
    )]
    pub user_account: Account<'info, UserAccount>,
    
    #[account(
        init,
        payer = bettor,
        space = BetAccount::LEN,
        seeds = [BET_SEED, match_account.key().as_ref(), bettor.key().as_ref()],
        bump
    )]
    pub bet_account: Account<'info, BetAccount>,
    
    #[account(mut)]
    pub bettor: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

pub fn place_bet(
    ctx: Context<PlaceBet>,
    amount_lamports: u64,
    predicted_winner: Pubkey,
    predicted_winner_type: u8,
) -> Result<()> {
    let platform_state = &ctx.accounts.platform_state;
    let match_account = &mut ctx.accounts.match_account;
    let user_account = &mut ctx.accounts.user_account;
    let bet_account = &mut ctx.accounts.bet_account;
    
    // Validate bet amount
    require!(amount_lamports >= platform_state.min_bet_lamports, NenPlatformError::BetAmountTooLow);
    require!(amount_lamports <= platform_state.max_bet_lamports, NenPlatformError::BetAmountTooHigh);
    
    // Validate betting is still open
    let current_time = Clock::get()?.unix_timestamp;
    require!(current_time < match_account.betting_deadline, NenPlatformError::BettingClosed);
    require!(match_account.betting_active, NenPlatformError::BettingClosed);
    
    // Validate winner type
    require!(predicted_winner_type <= WINNER_TYPE_AI_AGENT, NenPlatformError::InvalidWinnerType);
    
    // Calculate simple odds (this would be more sophisticated in production)
    let odds = 200; // 2.00x odds for simplicity
    let potential_payout = amount_lamports
        .checked_mul(odds)
        .ok_or(NenPlatformError::MathematicalOverflow)?
        .checked_div(100)
        .ok_or(NenPlatformError::DivisionByZero)?;

    // Transfer bet amount to match escrow (simplified - in production use PDA)
    system_program::transfer(
        CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            system_program::Transfer {
                from: ctx.accounts.bettor.to_account_info(),
                to: match_account.to_account_info(),
            },
        ),
        amount_lamports,
    )?;

    // Update bet account
    bet_account.bettor = ctx.accounts.bettor.key();
    bet_account.match_account = match_account.key();
    bet_account.amount = amount_lamports;
    bet_account.predicted_winner = predicted_winner;
    bet_account.predicted_winner_type = predicted_winner_type;
    bet_account.odds = odds;
    bet_account.potential_payout = potential_payout;
    bet_account.status = BET_STATUS_PLACED;
    bet_account.actual_payout = 0;
    bet_account.created_at = current_time;
    bet_account.settled_at = None;

    // Update match betting pool
    match_account.betting_pool = match_account.betting_pool
        .checked_add(amount_lamports)
        .ok_or(NenPlatformError::MathematicalOverflow)?;

    // Update user stats
    user_account.total_bets = user_account.total_bets
        .checked_add(1)
        .ok_or(NenPlatformError::MathematicalOverflow)?;
    user_account.updated_at = current_time;

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

/// Claim winnings from a settled bet
#[derive(Accounts)]
pub struct ClaimWinnings<'info> {
    #[account(
        mut,
        seeds = [PLATFORM_SEED],
        bump
    )]
    pub platform_state: Account<'info, PlatformState>,
    
    #[account(
        seeds = [MATCH_SEED, match_account.match_id.to_le_bytes().as_ref()],
        bump
    )]
    pub match_account: Account<'info, MatchAccount>,
    
    #[account(
        mut,
        seeds = [BET_SEED, match_account.key().as_ref(), bettor.key().as_ref()],
        bump
    )]
    pub bet_account: Account<'info, BetAccount>,
    
    #[account(
        mut,
        seeds = [USER_SEED, bettor.key().as_ref()],
        bump
    )]
    pub user_account: Account<'info, UserAccount>,
    
    /// CHECK: Treasury account for fee collection
    #[account(
        mut,
        seeds = [TREASURY_SEED],
        bump = platform_state.treasury_bump
    )]
    pub treasury: UncheckedAccount<'info>,
    
    #[account(mut)]
    pub bettor: Signer<'info>,
}

pub fn claim_winnings(ctx: Context<ClaimWinnings>) -> Result<()> {
    let match_account = &ctx.accounts.match_account;
    let bet_account = &mut ctx.accounts.bet_account;
    let user_account = &mut ctx.accounts.user_account;
    let platform_state = &mut ctx.accounts.platform_state;
    
    // Verify match is completed
    require!(match_account.status == MATCH_STATUS_COMPLETED, NenPlatformError::MatchNotCompleted);
    
    // Verify bet hasn't been settled yet
    require!(bet_account.status == BET_STATUS_PLACED, NenPlatformError::BetAlreadySettled);
    
    let current_time = Clock::get()?.unix_timestamp;
    
    // Check if bet won
    let bet_won = match_account.winner.is_some() &&
        match_account.winner.unwrap() == bet_account.predicted_winner &&
        match_account.winner_type.is_some() &&
        match_account.winner_type.unwrap() == bet_account.predicted_winner_type;
    
    if bet_won {
        // Calculate payout after platform fee
        let gross_payout = bet_account.potential_payout;
        let platform_fee = gross_payout
            .checked_mul(platform_state.platform_fee as u64)
            .ok_or(NenPlatformError::MathematicalOverflow)?
            .checked_div(10000)
            .ok_or(NenPlatformError::DivisionByZero)?;
        
        let net_payout = gross_payout
            .checked_sub(platform_fee)
            .ok_or(NenPlatformError::MathematicalOverflow)?;
        
        // Transfer winnings to bettor (simplified - use proper escrow in production)
        **match_account.to_account_info().try_borrow_mut_lamports()? = match_account
            .to_account_info()
            .lamports()
            .checked_sub(net_payout)
            .ok_or(NenPlatformError::InsufficientFunds)?;
        
        **ctx.accounts.bettor.to_account_info().try_borrow_mut_lamports()? = ctx.accounts.bettor
            .to_account_info()
            .lamports()
            .checked_add(net_payout)
            .ok_or(NenPlatformError::MathematicalOverflow)?;
        
        // Transfer fee to treasury
        **ctx.accounts.treasury.to_account_info().try_borrow_mut_lamports()? = ctx.accounts.treasury
            .to_account_info()
            .lamports()
            .checked_add(platform_fee)
            .ok_or(NenPlatformError::MathematicalOverflow)?;
        
        // Update bet status
        bet_account.status = BET_STATUS_WON;
        bet_account.actual_payout = net_payout;
        
        // Update user stats
        user_account.total_winnings = user_account.total_winnings
            .checked_add(net_payout)
            .ok_or(NenPlatformError::MathematicalOverflow)?;
        
        // Update platform stats
        platform_state.total_fees_collected = platform_state.total_fees_collected
            .checked_add(platform_fee)
            .ok_or(NenPlatformError::MathematicalOverflow)?;
        
    } else {
        // Bet lost
        bet_account.status = BET_STATUS_LOST;
        bet_account.actual_payout = 0;
        
        // Update user stats
        user_account.total_losses = user_account.total_losses
            .checked_add(bet_account.amount)
            .ok_or(NenPlatformError::MathematicalOverflow)?;
    }
    
    bet_account.settled_at = Some(current_time);
    user_account.updated_at = current_time;
    platform_state.updated_at = current_time;
    
    Ok(())
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
    #[account(
        mut,
        seeds = [AI_AGENT_SEED, owner.key().as_ref(), &ai_agent.name],
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
