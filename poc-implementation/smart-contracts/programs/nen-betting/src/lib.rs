use anchor_lang::prelude::*;

declare_id!("34RNydfkFZmhvUupbW1qHBG5LmASc6zeS3tuUsw6PwC5");

#[program]
pub mod nen_betting {
    use super::*;

    pub fn create_betting_account(ctx: Context<CreateBettingAccount>) -> Result<()> {
        let betting_account = &mut ctx.accounts.betting_account;
        let user = ctx.accounts.user.key();
        let current_time = Clock::get()?.unix_timestamp;
        
        betting_account.user = user;
        betting_account.balance = 0;
        betting_account.total_deposited = 0;
        betting_account.total_withdrawn = 0;
        betting_account.locked_balance = 0;
        betting_account.deposit_count = 0;
        betting_account.withdrawal_count = 0;
        betting_account.created_at = current_time;
        betting_account.last_updated = current_time;
        betting_account.last_withdrawal_time = 0; // User Story 2a: Initialize withdrawal timestamp
        betting_account.bump = ctx.bumps.betting_account;

        emit!(BettingAccountCreated {
            user,
            pda_address: betting_account.key(),
            timestamp: current_time,
        });
        
        Ok(())
    }

    /// Deposit SOL into betting account (User Story 2: Real SOL transfer)
    pub fn deposit_sol(
        ctx: Context<DepositSol>,
        amount: u64,
    ) -> Result<()> {
        // Validate deposit amount (User Story 2: Enforce minimum deposit 0.1 SOL)
        require!(amount >= 100_000_000, BettingError::BelowMinimumDeposit); // 0.1 SOL
        require!(amount <= 100_000_000_000, BettingError::AboveMaximumDeposit); // 100 SOL

        // Transfer SOL from user wallet to betting PDA (User Story 2: Real transfer)
        let transfer_instruction = anchor_lang::system_program::Transfer {
            from: ctx.accounts.user.to_account_info(),
            to: ctx.accounts.betting_account.to_account_info(),
        };
        let cpi_ctx = CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            transfer_instruction,
        );
        anchor_lang::system_program::transfer(cpi_ctx, amount)?;

        let betting_account = &mut ctx.accounts.betting_account;
        
        // Update user's on-chain balance record (User Story 2 requirement)
        let previous_balance = betting_account.balance;
        betting_account.balance += amount;
        betting_account.total_deposited += amount;
        betting_account.deposit_count += 1;
        betting_account.last_updated = Clock::get()?.unix_timestamp;

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

        Ok(())
    }

    /// Withdraw SOL from betting account (User Story 2a)
    pub fn withdraw_sol(
        ctx: Context<WithdrawSol>,
        amount: u64,
    ) -> Result<()> {
        require!(amount > 0, BettingError::InvalidWithdrawalAmount);
        
        let betting_account = &mut ctx.accounts.betting_account;
        let current_time = Clock::get()?.unix_timestamp;
        
        // User Story 2a: Enforce 24-hour cooldown using devnet timestamps
        let cooldown_period = 24 * 60 * 60; // 24 hours in seconds
        if betting_account.withdrawal_count > 0 && 
           current_time - betting_account.last_withdrawal_time < cooldown_period {
            let remaining_time = cooldown_period - (current_time - betting_account.last_withdrawal_time);
            msg!("24-hour cooldown active. Remaining time: {} seconds", remaining_time);
            return Err(BettingError::WithdrawalCooldownActive.into());
        }
        
        // User Story 2a: Validate against locked funds on devnet PDA
        let available_balance = betting_account.balance - betting_account.locked_balance;
        require!(amount <= available_balance, BettingError::InsufficientBalance);

        // User Story 2a: Transfer real SOL from PDA to wallet via devnet transaction
        let betting_account_info = betting_account.to_account_info();
        let user_info = ctx.accounts.user.to_account_info();
        
        // Validate PDA has enough lamports for withdrawal plus rent
        let rent = Rent::get()?;
        let required_rent = rent.minimum_balance(betting_account_info.data_len());
        let account_lamports = betting_account_info.lamports();
        
        require!(
            account_lamports >= amount + required_rent, 
            BettingError::InsufficientBalance
        );
        
        // Manually transfer lamports from PDA to user
        **betting_account_info.try_borrow_mut_lamports()? -= amount;
        **user_info.try_borrow_mut_lamports()? += amount;

        // Update balance records with real devnet timestamps
        let previous_balance = betting_account.balance;
        betting_account.balance -= amount;
        betting_account.total_withdrawn += amount;
        betting_account.withdrawal_count += 1;
        betting_account.last_updated = current_time;
        betting_account.last_withdrawal_time = current_time; // User Story 2a: Track withdrawal time

        // User Story 2a: Emit withdrawal event; update real balance records on devnet
        emit!(WithdrawalCompleted {
            user: ctx.accounts.user.key(),
            pda_address: betting_account.key(),
            amount,
            previous_balance,
            new_balance: betting_account.balance,
            transaction_count: betting_account.withdrawal_count,
            timestamp: current_time,
        });

        Ok(())
    }

    pub fn lock_funds(ctx: Context<LockFunds>, amount: u64) -> Result<()> {
        require!(amount > 0, BettingError::InvalidWithdrawalAmount);
        
        let betting_account = &mut ctx.accounts.betting_account;
        let available_balance = betting_account.balance - betting_account.locked_balance;
        require!(amount <= available_balance, BettingError::InsufficientBalance);
        
        betting_account.locked_balance += amount;
        betting_account.last_updated = Clock::get()?.unix_timestamp;
        
        emit!(FundsLocked {
            user: ctx.accounts.user.key(),
            account: betting_account.key(),
            amount,
            total_locked: betting_account.locked_balance,
            timestamp: Clock::get()?.unix_timestamp,
        });
        
        Ok(())
    }

    pub fn unlock_funds(ctx: Context<UnlockFunds>, amount: u64) -> Result<()> {
        require!(amount > 0, BettingError::InvalidWithdrawalAmount);
        
        let betting_account = &mut ctx.accounts.betting_account;
        require!(amount <= betting_account.locked_balance, BettingError::InsufficientLockedFunds);
        
        betting_account.locked_balance -= amount;
        betting_account.last_updated = Clock::get()?.unix_timestamp;
        
        emit!(FundsUnlocked {
            user: ctx.accounts.user.key(),
            account: betting_account.key(),
            amount,
            total_locked: betting_account.locked_balance,
            timestamp: Clock::get()?.unix_timestamp,
        });
        
        Ok(())
    }
}

// ==========================================
// ACCOUNT CONTEXTS
// ==========================================

#[derive(Accounts)]
pub struct CreateBettingAccount<'info> {
    #[account(
        init,
        payer = user,
        space = 8 + 32 + 8 + 8 + 8 + 8 + 4 + 4 + 8 + 8 + 8 + 1, // discriminator + user + balances + counts + timestamps + bump
        seeds = [b"betting_account", user.key().as_ref()],
        bump
    )]
    pub betting_account: Account<'info, BettingAccount>,
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
    pub user: Signer<'info>,
    pub system_program: Program<'info, System>,
}

/// User Story 2a: Withdraw SOL account context
#[derive(Accounts)]
pub struct WithdrawSol<'info> {
    #[account(
        mut,
        seeds = [b"betting_account", user.key().as_ref()],
        bump = betting_account.bump,
        has_one = user
    )]
    pub betting_account: Account<'info, BettingAccount>,
    #[account(mut)]
    pub user: Signer<'info>,
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

// ==========================================
// ACCOUNT STRUCTURES  
// ==========================================

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
    pub last_withdrawal_time: i64, // Last withdrawal timestamp for cooldown (User Story 2a)
    pub bump: u8,                  // PDA bump seed
}

// ==========================================
// EVENTS (User Story 2: Emit deposit event for tracking)
// ==========================================

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
    pub account: Pubkey,
    pub amount: u64,
    pub total_locked: u64,
    pub timestamp: i64,
}

#[event]
pub struct FundsUnlocked {
    pub user: Pubkey,
    pub account: Pubkey,
    pub amount: u64,
    pub total_locked: u64,
    pub timestamp: i64,
}

// ==========================================
// ERROR CODES
// ==========================================

#[error_code]
pub enum BettingError {
    #[msg("Deposit amount below minimum required")]
    BelowMinimumDeposit,
    
    #[msg("Deposit amount above maximum allowed")]
    AboveMaximumDeposit,
    
    #[msg("Invalid withdrawal amount")]
    InvalidWithdrawalAmount,
    
    #[msg("Insufficient balance for this operation")]
    InsufficientBalance,
    
    #[msg("Insufficient locked funds for this operation")]
    InsufficientLockedFunds,
    
    #[msg("24-hour withdrawal cooldown is active")]
    WithdrawalCooldownActive,
    
    #[msg("Unauthorized access")]
    Unauthorized,
}
