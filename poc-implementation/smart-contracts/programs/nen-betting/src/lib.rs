use anchor_lang::prelude::*;
use anchor_lang::system_program;

declare_id!("Bet1111111111111111111111111111111111111111");

/// Nen Platform Betting Program
/// Implements User Story 2: Real SOL deposits with proper PDA management
/// Complies with GI.md directives: No simulations, no hardcoding, real implementations
#[program]
pub mod nen_betting {
    use super::*;

    /// Initialize the betting platform
    pub fn initialize_betting_platform(
        ctx: Context<InitializeBettingPlatform>,
        admin: Pubkey,
        minimum_deposit: u64,
        maximum_deposit: u64,
        platform_fee_bps: u16, // basis points (100 = 1%)
    ) -> Result<()> {
        require!(minimum_deposit > 0, BettingError::InvalidMinimumDeposit);
        require!(maximum_deposit > minimum_deposit, BettingError::InvalidMaximumDeposit);
        require!(platform_fee_bps <= 1000, BettingError::InvalidFeePercentage); // Max 10%

        let platform = &mut ctx.accounts.betting_platform;
        platform.admin = admin;
        platform.minimum_deposit = minimum_deposit;
        platform.maximum_deposit = maximum_deposit;
        platform.platform_fee_bps = platform_fee_bps;
        platform.total_deposits = 0;
        platform.total_withdrawals = 0;
        platform.total_users = 0;
        platform.is_paused = false;
        platform.created_at = Clock::get()?.unix_timestamp;
        platform.bump = ctx.bumps.betting_platform;

        emit!(BettingPlatformInitialized {
            admin,
            minimum_deposit,
            maximum_deposit,
            platform_fee_bps,
            timestamp: Clock::get()?.unix_timestamp,
        });

        Ok(())
    }

    /// Create or access user's betting account PDA (User Story 2 requirement)
    pub fn create_betting_account(ctx: Context<CreateBettingAccount>) -> Result<()> {
        let betting_account = &mut ctx.accounts.betting_account;
        let user = ctx.accounts.user.key();
        
        betting_account.user = user;
        betting_account.balance = 0;
        betting_account.total_deposited = 0;
        betting_account.total_withdrawn = 0;
        betting_account.locked_balance = 0;
        betting_account.deposit_count = 0;
        betting_account.withdrawal_count = 0;
        betting_account.created_at = Clock::get()?.unix_timestamp;
        betting_account.last_updated = Clock::get()?.unix_timestamp;
        betting_account.bump = ctx.bumps.betting_account;

        // Update platform stats
        let platform = &mut ctx.accounts.betting_platform;
        platform.total_users += 1;

        emit!(BettingAccountCreated {
            user,
            pda_address: betting_account.key(),
            timestamp: Clock::get()?.unix_timestamp,
        });

        Ok(())
    }

    /// Deposit SOL into betting account (User Story 2: Real SOL transfer)
    pub fn deposit_sol(
        ctx: Context<DepositSol>,
        amount: u64,
    ) -> Result<()> {
        let platform = &ctx.accounts.betting_platform;
        let betting_account = &mut ctx.accounts.betting_account;
        
        // Validate deposit amount (User Story 2: Enforce minimum deposit 0.1 SOL)
        require!(amount >= platform.minimum_deposit, BettingError::BelowMinimumDeposit);
        require!(amount <= platform.maximum_deposit, BettingError::AboveMaximumDeposit);
        require!(!platform.is_paused, BettingError::PlatformPaused);

        // Transfer SOL from user wallet to betting PDA (User Story 2: Real transfer)
        let transfer_instruction = system_program::Transfer {
            from: ctx.accounts.user.to_account_info(),
            to: ctx.accounts.betting_account.to_account_info(),
        };
        
        let transfer_ctx = CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            transfer_instruction,
        );
        
        system_program::transfer(transfer_ctx, amount)?;

        // Update user's on-chain balance record (User Story 2 requirement)
        let previous_balance = betting_account.balance;
        betting_account.balance += amount;
        betting_account.total_deposited += amount;
        betting_account.deposit_count += 1;
        betting_account.last_updated = Clock::get()?.unix_timestamp;

        // Update platform statistics
        let platform = &mut ctx.accounts.betting_platform;
        platform.total_deposits += amount;

        // Emit deposit event for tracking (User Story 2 requirement)
        emit!(DepositCompleted {
            user: ctx.accounts.user.key(),
            pda_address: betting_account.key(),
            amount,
            previous_balance,
            new_balance: betting_account.balance,
            transaction_count: betting_account.deposit_count,
            timestamp: Clock::get()?.unix_timestamp,
        });

        msg!(
            "Deposit successful: User {} deposited {} lamports. Balance: {} -> {}",
            ctx.accounts.user.key(),
            amount,
            previous_balance,
            betting_account.balance
        );

        Ok(())
    }

    /// Withdraw SOL from betting account
    pub fn withdraw_sol(
        ctx: Context<WithdrawSol>,
        amount: u64,
    ) -> Result<()> {
        let platform = &ctx.accounts.betting_platform;
        let betting_account = &mut ctx.accounts.betting_account;
        
        require!(!platform.is_paused, BettingError::PlatformPaused);
        require!(amount > 0, BettingError::InvalidWithdrawalAmount);
        
        // Check available balance (excluding locked funds)
        let available_balance = betting_account.balance - betting_account.locked_balance;
        require!(amount <= available_balance, BettingError::InsufficientBalance);

        // Transfer SOL from betting PDA back to user
        let betting_account_info = ctx.accounts.betting_account.to_account_info();
        let user_info = ctx.accounts.user.to_account_info();
        
        **betting_account_info.try_borrow_mut_lamports()? -= amount;
        **user_info.try_borrow_mut_lamports()? += amount;

        // Update balance records
        let previous_balance = betting_account.balance;
        betting_account.balance -= amount;
        betting_account.total_withdrawn += amount;
        betting_account.withdrawal_count += 1;
        betting_account.last_updated = Clock::get()?.unix_timestamp;

        // Update platform statistics
        let platform = &mut ctx.accounts.betting_platform;
        platform.total_withdrawals += amount;

        emit!(WithdrawalCompleted {
            user: ctx.accounts.user.key(),
            pda_address: betting_account.key(),
            amount,
            previous_balance,
            new_balance: betting_account.balance,
            transaction_count: betting_account.withdrawal_count,
            timestamp: Clock::get()?.unix_timestamp,
        });

        Ok(())
    }

    /// Lock funds for betting (prevents withdrawal during active bets)
    pub fn lock_funds(
        ctx: Context<LockFunds>,
        amount: u64,
    ) -> Result<()> {
        let betting_account = &mut ctx.accounts.betting_account;
        
        let available_balance = betting_account.balance - betting_account.locked_balance;
        require!(amount <= available_balance, BettingError::InsufficientBalance);

        betting_account.locked_balance += amount;
        betting_account.last_updated = Clock::get()?.unix_timestamp;

        emit!(FundsLocked {
            user: ctx.accounts.user.key(),
            amount,
            total_locked: betting_account.locked_balance,
            timestamp: Clock::get()?.unix_timestamp,
        });

        Ok(())
    }

    /// Unlock funds after bet settlement
    pub fn unlock_funds(
        ctx: Context<UnlockFunds>,
        amount: u64,
    ) -> Result<()> {
        let betting_account = &mut ctx.accounts.betting_account;
        
        require!(amount <= betting_account.locked_balance, BettingError::InsufficientLockedFunds);

        betting_account.locked_balance -= amount;
        betting_account.last_updated = Clock::get()?.unix_timestamp;

        emit!(FundsUnlocked {
            user: ctx.accounts.user.key(),
            amount,
            total_locked: betting_account.locked_balance,
            timestamp: Clock::get()?.unix_timestamp,
        });

        Ok(())
    }

    /// Emergency pause functionality (admin only)
    pub fn toggle_pause(ctx: Context<TogglePause>) -> Result<()> {
        let platform = &mut ctx.accounts.betting_platform;
        platform.is_paused = !platform.is_paused;

        emit!(PlatformToggled {
            admin: ctx.accounts.admin.key(),
            is_paused: platform.is_paused,
            timestamp: Clock::get()?.unix_timestamp,
        });

        Ok(())
    }
}

// ==========================================
// ACCOUNT CONTEXTS
// ==========================================

#[derive(Accounts)]
pub struct InitializeBettingPlatform<'info> {
    #[account(
        init,
        payer = admin,
        space = 8 + std::mem::size_of::<BettingPlatform>(),
        seeds = [b"betting_platform"],
        bump
    )]
    pub betting_platform: Account<'info, BettingPlatform>,
    #[account(mut)]
    pub admin: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CreateBettingAccount<'info> {
    #[account(
        init,
        payer = user,
        space = 8 + std::mem::size_of::<BettingAccount>(),
        seeds = [b"betting_account", user.key().as_ref()],
        bump
    )]
    pub betting_account: Account<'info, BettingAccount>,
    #[account(mut)]
    pub betting_platform: Account<'info, BettingPlatform>,
    #[account(mut)]
    pub user: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct DepositSol<'info> {
    #[account(
        mut,
        seeds = [b"betting_account", user.key().as_ref()],
        bump = betting_account.bump
    )]
    pub betting_account: Account<'info, BettingAccount>,
    #[account(mut)]
    pub betting_platform: Account<'info, BettingPlatform>,
    #[account(mut)]
    pub user: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct WithdrawSol<'info> {
    #[account(
        mut,
        seeds = [b"betting_account", user.key().as_ref()],
        bump = betting_account.bump,
        has_one = user
    )]
    pub betting_account: Account<'info, BettingAccount>,
    pub betting_platform: Account<'info, BettingPlatform>,
    #[account(mut)]
    pub user: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct LockFunds<'info> {
    #[account(
        mut,
        seeds = [b"betting_account", user.key().as_ref()],
        bump = betting_account.bump,
        has_one = user
    )]
    pub betting_account: Account<'info, BettingAccount>,
    pub user: Signer<'info>,
}

#[derive(Accounts)]
pub struct UnlockFunds<'info> {
    #[account(
        mut,
        seeds = [b"betting_account", user.key().as_ref()],
        bump = betting_account.bump,
        has_one = user
    )]
    pub betting_account: Account<'info, BettingAccount>,
    pub user: Signer<'info>,
}

#[derive(Accounts)]
pub struct TogglePause<'info> {
    #[account(
        mut,
        seeds = [b"betting_platform"],
        bump = betting_platform.bump,
        has_one = admin
    )]
    pub betting_platform: Account<'info, BettingPlatform>,
    pub admin: Signer<'info>,
}

// ==========================================
// ACCOUNT STRUCTURES  
// ==========================================

#[account]
pub struct BettingPlatform {
    pub admin: Pubkey,
    pub minimum_deposit: u64,      // Minimum deposit in lamports
    pub maximum_deposit: u64,      // Maximum deposit in lamports  
    pub platform_fee_bps: u16,     // Platform fee in basis points
    pub total_deposits: u64,       // Total deposited across all users
    pub total_withdrawals: u64,    // Total withdrawn across all users
    pub total_users: u64,          // Number of users with betting accounts
    pub is_paused: bool,           // Emergency pause flag
    pub created_at: i64,           // Platform initialization timestamp
    pub bump: u8,                  // PDA bump seed
}

#[account]
pub struct BettingAccount {
    pub user: Pubkey,              // Owner of this betting account
    pub balance: u64,              // Current SOL balance in lamports
    pub total_deposited: u64,      // Lifetime deposits
    pub total_withdrawn: u64,      // Lifetime withdrawals
    pub locked_balance: u64,       // Funds locked in active bets
    pub deposit_count: u32,        // Number of deposits made
    pub withdrawal_count: u32,     // Number of withdrawals made
    pub created_at: i64,           // Account creation timestamp
    pub last_updated: i64,         // Last transaction timestamp
    pub bump: u8,                  // PDA bump seed
}

// ==========================================
// EVENTS (User Story 2: Emit deposit event for tracking)
// ==========================================

#[event]
pub struct BettingPlatformInitialized {
    pub admin: Pubkey,
    pub minimum_deposit: u64,
    pub maximum_deposit: u64,
    pub platform_fee_bps: u16,
    pub timestamp: i64,
}

#[event]
pub struct BettingAccountCreated {
    pub user: Pubkey,
    pub pda_address: Pubkey,
    pub timestamp: i64,
}

#[event]
pub struct DepositCompleted {
    pub user: Pubkey,
    pub pda_address: Pubkey,
    pub amount: u64,
    pub previous_balance: u64,
    pub new_balance: u64,
    pub transaction_count: u32,
    pub timestamp: i64,
}

#[event]
pub struct WithdrawalCompleted {
    pub user: Pubkey,
    pub pda_address: Pubkey,
    pub amount: u64,
    pub previous_balance: u64,
    pub new_balance: u64,
    pub transaction_count: u32,
    pub timestamp: i64,
}

#[event]
pub struct FundsLocked {
    pub user: Pubkey,
    pub amount: u64,
    pub total_locked: u64,
    pub timestamp: i64,
}

#[event]
pub struct FundsUnlocked {
    pub user: Pubkey,
    pub amount: u64,
    pub total_locked: u64,
    pub timestamp: i64,
}

#[event]
pub struct PlatformToggled {
    pub admin: Pubkey,
    pub is_paused: bool,
    pub timestamp: i64,
}

// ==========================================
// ERROR CODES
// ==========================================

#[error_code]
pub enum BettingError {
    #[msg("Invalid minimum deposit amount")]
    InvalidMinimumDeposit,
    
    #[msg("Invalid maximum deposit amount")]
    InvalidMaximumDeposit,
    
    #[msg("Invalid fee percentage")]
    InvalidFeePercentage,
    
    #[msg("Deposit amount below minimum required")]
    BelowMinimumDeposit,
    
    #[msg("Deposit amount above maximum allowed")]
    AboveMaximumDeposit,
    
    #[msg("Platform is currently paused")]
    PlatformPaused,
    
    #[msg("Invalid withdrawal amount")]
    InvalidWithdrawalAmount,
    
    #[msg("Insufficient balance for this operation")]
    InsufficientBalance,
    
    #[msg("Insufficient locked funds for this operation")]
    InsufficientLockedFunds,
    
    #[msg("Unauthorized access")]
    Unauthorized,
}
