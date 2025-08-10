use anchor_lang::prelude::*;

// Aligned with Anchor.toml [programs.devnet].nen_betting
declare_id!("34RNydfkFZmhvUupbW1qHBG5LmASc6zeS3tuUsw6PwC5");

#[program]
pub mod nen_betting {
    use super::*;

    pub fn create_betting_account(ctx: Context<CreateBettingAccount>) -> Result<()> {
        let betting_account = &mut ctx.accounts.betting_account;
        betting_account.owner = ctx.accounts.user.key();
        betting_account.balance = 0;
        betting_account.total_deposited = 0;
        betting_account.total_withdrawn = 0;
        betting_account.locked_funds = 0;
        betting_account.last_activity = Clock::get()?.unix_timestamp;
        betting_account.last_withdrawal = 0; // No previous withdrawals
        betting_account.withdrawal_count = 0;
        
        emit!(BettingAccountCreated {
            user: ctx.accounts.user.key(),
            account: betting_account.key(),
            timestamp: Clock::get()?.unix_timestamp,
        });
        
        Ok(())
    }

    pub fn deposit_sol(ctx: Context<DepositSol>, amount: u64) -> Result<()> {
        require!(amount >= 100_000_000, ErrorCode::DepositTooSmall); // Min 0.1 SOL
        require!(amount <= 100_000_000_000, ErrorCode::DepositTooLarge); // Max 100 SOL

        // Transfer SOL from user to betting account
        let transfer_instruction = anchor_lang::system_program::Transfer {
            from: ctx.accounts.user.to_account_info(),
            to: ctx.accounts.betting_account.to_account_info(),
        };
        let cpi_ctx = CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            transfer_instruction,
        );
        anchor_lang::system_program::transfer(cpi_ctx, amount)?;

        // Update betting account balance
        let betting_account = &mut ctx.accounts.betting_account;
        betting_account.balance = betting_account.balance.checked_add(amount).unwrap();
        betting_account.total_deposited = betting_account.total_deposited.checked_add(amount).unwrap();
        betting_account.last_activity = Clock::get()?.unix_timestamp;

        emit!(SolDeposited {
            user: ctx.accounts.user.key(),
            account: betting_account.key(),
            amount,
            new_balance: betting_account.balance,
            timestamp: Clock::get()?.unix_timestamp,
        });

        Ok(())
    }

    /// User Story 2a: Withdraw SOL from betting account
    /// Implements the core on-chain requirements:
    /// - Validate against locked funds on devnet PDA
    /// - Transfer real SOL from PDA to wallet via devnet transaction
    /// - Enforce cooldown using devnet timestamps
    /// - Emit withdrawal event; update real balance records on devnet
    pub fn withdraw_sol(ctx: Context<WithdrawSol>, amount: u64) -> Result<()> {
        require!(amount > 0, ErrorCode::WithdrawalAmountInvalid);
        require!(amount >= 10_000_000, ErrorCode::WithdrawalTooSmall); // Min 0.01 SOL
        
        let current_time = Clock::get()?.unix_timestamp;
        
        // User Story 2a: Enforce 24-hour cooldown for security
        const COOLDOWN_SECONDS: i64 = 24 * 60 * 60; // 24 hours
        if ctx.accounts.betting_account.last_withdrawal > 0 {
            let time_since_last_withdrawal = current_time - ctx.accounts.betting_account.last_withdrawal;
            require!(
                time_since_last_withdrawal >= COOLDOWN_SECONDS,
                ErrorCode::WithdrawalCooldownActive
            );
        }
        
        // Validate against locked funds - User Story 2a requirement
        let available_balance = ctx.accounts.betting_account.balance.checked_sub(ctx.accounts.betting_account.locked_funds)
            .ok_or(ErrorCode::InsufficientAvailableBalance)?;
        
        require!(amount <= available_balance, ErrorCode::InsufficientAvailableBalance);
        
        // Transfer SOL from betting account PDA to user wallet
        // PDAs with data cannot use system_program::transfer, so we manually adjust lamports
        let betting_account_info = ctx.accounts.betting_account.to_account_info();
        let user_info = ctx.accounts.user.to_account_info();
        
        // Validate PDA has enough lamports for withdrawal plus rent
        let rent = Rent::get()?;
        let required_rent = rent.minimum_balance(betting_account_info.data_len());
        let account_lamports = betting_account_info.lamports();
        
        require!(
            account_lamports >= amount + required_rent, 
            ErrorCode::InsufficientAccountLamports
        );
        
        // Manually transfer lamports from PDA to user
        **betting_account_info.try_borrow_mut_lamports()? -= amount;
        **user_info.try_borrow_mut_lamports()? += amount;
        
        // Now update betting account balances and counters
        let betting_account = &mut ctx.accounts.betting_account;
        betting_account.balance = betting_account.balance.checked_sub(amount).unwrap();
        betting_account.total_withdrawn = betting_account.total_withdrawn.checked_add(amount).unwrap();
        betting_account.withdrawal_count = betting_account.withdrawal_count.checked_add(1).unwrap();
        betting_account.last_withdrawal = current_time;
        betting_account.last_activity = current_time;
        
        // User Story 2a: Emit withdrawal event for tracking, verifiable on devnet
        emit!(SolWithdrawn {
            user: ctx.accounts.user.key(),
            account: betting_account.key(),
            amount,
            new_balance: betting_account.balance,
            available_balance: betting_account.balance - betting_account.locked_funds,
            timestamp: current_time,
        });
        
        Ok(())
    }

    /// Lock funds for active bets - prevents withdrawal of funds in active wagers
    pub fn lock_funds(ctx: Context<LockFunds>, amount: u64) -> Result<()> {
        let betting_account = &mut ctx.accounts.betting_account;
        
        require!(amount > 0, ErrorCode::LockAmountInvalid);
        let available_balance = betting_account.balance.checked_sub(betting_account.locked_funds)
            .ok_or(ErrorCode::InsufficientAvailableBalance)?;
        require!(amount <= available_balance, ErrorCode::InsufficientAvailableBalance);
        
        betting_account.locked_funds = betting_account.locked_funds.checked_add(amount).unwrap();
        betting_account.last_activity = Clock::get()?.unix_timestamp;
        
        emit!(FundsLocked {
            user: ctx.accounts.user.key(),
            account: betting_account.key(),
            amount,
            total_locked: betting_account.locked_funds,
            timestamp: Clock::get()?.unix_timestamp,
        });
        
        Ok(())
    }

    /// Unlock funds after bet settlement
    pub fn unlock_funds(ctx: Context<UnlockFunds>, amount: u64) -> Result<()> {
        let betting_account = &mut ctx.accounts.betting_account;
        
        require!(amount > 0, ErrorCode::UnlockAmountInvalid);
        require!(amount <= betting_account.locked_funds, ErrorCode::UnlockAmountExceedsLocked);
        
        betting_account.locked_funds = betting_account.locked_funds.checked_sub(amount).unwrap();
        betting_account.last_activity = Clock::get()?.unix_timestamp;
        
        emit!(FundsUnlocked {
            user: ctx.accounts.user.key(),
            account: betting_account.key(),
            amount,
            total_locked: betting_account.locked_funds,
            timestamp: Clock::get()?.unix_timestamp,
        });
        
        Ok(())
    }
}

#[derive(Accounts)]
pub struct CreateBettingAccount<'info> {
    #[account(
        init,
        payer = user,
        space = 8 + 32 + 8 + 8 + 8 + 8 + 8 + 8 + 8, // Account discriminator + Pubkey + 6 u64 + 2 i64
        seeds = [b"betting-account", user.key().as_ref()],
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
        seeds = [b"betting-account", user.key().as_ref()],
        bump
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
        seeds = [b"betting-account", user.key().as_ref()],
        bump,
        constraint = betting_account.owner == user.key() @ ErrorCode::UnauthorizedWithdrawal
    )]
    pub betting_account: Account<'info, BettingAccount>,
    #[account(mut)]
    pub user: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct LockFunds<'info> {
    #[account(
        mut,
        seeds = [b"betting-account", user.key().as_ref()],
        bump,
        constraint = betting_account.owner == user.key() @ ErrorCode::UnauthorizedLock
    )]
    pub betting_account: Account<'info, BettingAccount>,
    #[account(mut)]
    pub user: Signer<'info>,
}

#[derive(Accounts)]
pub struct UnlockFunds<'info> {
    #[account(
        mut,
        seeds = [b"betting-account", user.key().as_ref()],
        bump,
        constraint = betting_account.owner == user.key() @ ErrorCode::UnauthorizedUnlock
    )]
    pub betting_account: Account<'info, BettingAccount>,
    #[account(mut)]
    pub user: Signer<'info>,
}

#[account]
pub struct BettingAccount {
    pub owner: Pubkey,
    pub balance: u64,
    pub total_deposited: u64,
    pub total_withdrawn: u64,
    pub locked_funds: u64,
    pub last_activity: i64,
    /// User Story 2a: Track last withdrawal timestamp for 24-hour cooldown
    pub last_withdrawal: i64,
    pub withdrawal_count: u64,
}

#[event]
pub struct BettingAccountCreated {
    pub user: Pubkey,
    pub account: Pubkey,
    pub timestamp: i64,
}

#[event]
pub struct SolDeposited {
    pub user: Pubkey,
    pub account: Pubkey,
    pub amount: u64,
    pub new_balance: u64,
    pub timestamp: i64,
}

/// User Story 2a: SOL withdrawal event for tracking, verifiable on devnet
#[event]
pub struct SolWithdrawn {
    pub user: Pubkey,
    pub account: Pubkey,
    pub amount: u64,
    pub new_balance: u64,
    pub available_balance: u64,
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

#[error_code]
pub enum ErrorCode {
    #[msg("Deposit amount too small (minimum 0.1 SOL)")]
    DepositTooSmall,
    #[msg("Deposit amount too large (maximum 100 SOL)")]
    DepositTooLarge,
    // User Story 2a: Withdrawal error codes
    #[msg("Withdrawal amount must be greater than 0")]
    WithdrawalAmountInvalid,
    #[msg("Withdrawal amount too small (minimum 0.01 SOL)")]
    WithdrawalTooSmall,
    #[msg("Insufficient available balance (funds may be locked in active bets)")]
    InsufficientAvailableBalance,
    #[msg("Withdrawal cooldown active - must wait 24 hours between withdrawals")]
    WithdrawalCooldownActive,
    #[msg("Unauthorized withdrawal attempt")]
    UnauthorizedWithdrawal,
    #[msg("Insufficient lamports in account for withdrawal plus rent")]
    InsufficientAccountLamports,
    #[msg("Lock amount must be greater than 0")]
    LockAmountInvalid,
    #[msg("Unauthorized lock attempt")]
    UnauthorizedLock,
    #[msg("Unlock amount must be greater than 0")]
    UnlockAmountInvalid,
    #[msg("Unlock amount exceeds locked funds")]
    UnlockAmountExceedsLocked,
    #[msg("Unauthorized unlock attempt")]
    UnauthorizedUnlock,
}
