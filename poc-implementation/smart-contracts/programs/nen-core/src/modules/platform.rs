use anchor_lang::prelude::*;
use crate::constants::*;
use crate::errors::*;

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
