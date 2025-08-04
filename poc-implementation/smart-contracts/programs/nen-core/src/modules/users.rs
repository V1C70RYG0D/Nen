use anchor_lang::prelude::*;
use crate::constants::*;
use crate::errors::*;

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
