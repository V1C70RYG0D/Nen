use anchor_lang::prelude::*;
use anchor_lang::system_program;
use crate::constants::*;
use crate::errors::*;
use crate::modules::platform::PlatformState;
use crate::modules::matches::MatchAccount;
use crate::modules::users::UserAccount;

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
