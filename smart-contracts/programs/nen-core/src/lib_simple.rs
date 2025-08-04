use anchor_lang::prelude::*;

declare_id!("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS");

/// Simple platform state for POC
#[account]
pub struct PlatformState {
    pub authority: Pubkey,
    pub platform_fee: u16,
    pub total_matches: u64,
}

impl PlatformState {
    pub const LEN: usize = 8 + 32 + 2 + 8;
}

/// Simple user account for POC
#[account]
pub struct UserAccount {
    pub wallet: Pubkey,
    pub username: [u8; 32],
    pub games_played: u32,
    pub elo_rating: u16,
}

impl UserAccount {
    pub const LEN: usize = 8 + 32 + 32 + 4 + 2;
}

#[program]
pub mod nen_core {
    use super::*;

    pub fn initialize_platform(
        ctx: Context<InitializePlatform>,
        authority: Pubkey,
        platform_fee: u16,
    ) -> Result<()> {
        let platform_state = &mut ctx.accounts.platform_state;
        platform_state.authority = authority;
        platform_state.platform_fee = platform_fee;
        platform_state.total_matches = 0;
        Ok(())
    }

    pub fn create_user_account(
        ctx: Context<CreateUserAccount>,
        username: String,
    ) -> Result<()> {
        let user_account = &mut ctx.accounts.user_account;
        user_account.wallet = ctx.accounts.user.key();
        
        // Convert string to byte array
        let mut username_bytes = [0u8; 32];
        let username_slice = username.as_bytes();
        let copy_len = std::cmp::min(username_slice.len(), 32);
        username_bytes[..copy_len].copy_from_slice(&username_slice[..copy_len]);
        user_account.username = username_bytes;
        
        user_account.games_played = 0;
        user_account.elo_rating = 1200;
        Ok(())
    }
}

#[derive(Accounts)]
pub struct InitializePlatform<'info> {
    #[account(
        init,
        payer = authority,
        space = PlatformState::LEN,
        seeds = [b"platform"],
        bump
    )]
    pub platform_state: Account<'info, PlatformState>,
    
    #[account(mut)]
    pub authority: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CreateUserAccount<'info> {
    #[account(
        init,
        payer = user,
        space = UserAccount::LEN,
        seeds = [b"user", user.key().as_ref()],
        bump
    )]
    pub user_account: Account<'info, UserAccount>,
    
    #[account(mut)]
    pub user: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}
