use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer};

// Devnet program ID
declare_id!("8FbcrTGS9wQCyC99h5jbHx2bzZjYfkGERSMCjmYBDisH");

#[program]
pub mod nen_marketplace {
    use super::*;

    pub fn create_listing(ctx: Context<CreateListing>, price: u64, fee_bps: u16, listing_type: ListingType) -> Result<()> {
        require!(fee_bps <= 1000, MarketplaceError::InvalidFeeBps);
        require!(price > 0, MarketplaceError::InvalidPrice);

        let listing = &mut ctx.accounts.listing;
        let clock = Clock::get()?;

        listing.seller = ctx.accounts.seller.key();
        listing.mint = ctx.accounts.mint.key();
        listing.escrow_authority = ctx.accounts.escrow_authority.key();
        listing.escrow_ata = ctx.accounts.escrow_token_account.key();
        listing.price = price;
        listing.fee_bps = fee_bps;
        listing.created_at = clock.unix_timestamp;
        listing.expires_at = clock.unix_timestamp + 30 * 24 * 60 * 60;
        listing.status = ListingStatus::Active;
        listing.listing_type = listing_type;
    // bump not stored to avoid feature requirements; address is PDA via seeds

        let cpi_accounts = Transfer {
            from: ctx.accounts.seller_token_account.to_account_info(),
            to: ctx.accounts.escrow_token_account.to_account_info(),
            authority: ctx.accounts.seller.to_account_info(),
        };
        let cpi_ctx = CpiContext::new(ctx.accounts.token_program.to_account_info(), cpi_accounts);
        token::transfer(cpi_ctx, 1)?;

        emit!(ListingCreated {
            seller: listing.seller,
            mint: listing.mint,
            price,
            fee_bps,
            expires_at: listing.expires_at,
            listing_type,
            listing: listing.key(),
            escrow_ata: listing.escrow_ata,
        });

        Ok(())
    }

    pub fn buy_listing(ctx: Context<BuyListing>) -> Result<()> {
        let listing = &mut ctx.accounts.listing;
        // Basic state checks
        require!(listing.status == ListingStatus::Active, MarketplaceError::ListingNotActive);
        let clock = Clock::get()?;
        require!(clock.unix_timestamp < listing.expires_at, MarketplaceError::ListingExpired);

        // Verify listing wiring
        require_keys_eq!(listing.mint, ctx.accounts.mint.key(), MarketplaceError::InvalidMint);
        require_keys_eq!(listing.escrow_authority, ctx.accounts.escrow_authority.key(), MarketplaceError::InvalidEscrowAuth);
        require_keys_eq!(listing.escrow_ata, ctx.accounts.escrow_token_account.key(), MarketplaceError::InvalidEscrowAta);

        // Verify buyer ATA
        require!(ctx.accounts.buyer_token_account.mint == ctx.accounts.mint.key(), MarketplaceError::InvalidBuyerAta);
        require!(ctx.accounts.buyer_token_account.owner == ctx.accounts.buyer.key(), MarketplaceError::InvalidBuyerAta);

        // Amounts
        let price: u64 = listing.price;
        let fee_bps: u64 = listing.fee_bps as u64; // e.g., 250 = 2.5%
        let fee_amount: u64 = price.saturating_mul(fee_bps) / 10_000;
        let royalty_bps: u64 = 500; // 5%
        let royalty_amount: u64 = price.saturating_mul(royalty_bps) / 10_000;
        let seller_amount: u64 = price
            .saturating_sub(fee_amount)
            .saturating_sub(royalty_amount);

        // Ensure buyer can afford
        let buyer_lamports = **ctx.accounts.buyer.to_account_info().lamports.borrow();
        require!(buyer_lamports >= price, MarketplaceError::InsufficientFunds);

        // Transfer SOL: buyer -> treasury (fee)
        if fee_amount > 0 {
            let ix = anchor_lang::solana_program::system_instruction::transfer(
                &ctx.accounts.buyer.key(),
                &ctx.accounts.treasury.key(),
                fee_amount,
            );
            anchor_lang::solana_program::program::invoke(
                &ix,
                &[
                    ctx.accounts.buyer.to_account_info(),
                    ctx.accounts.treasury.to_account_info(),
                    ctx.accounts.system_program.to_account_info(),
                ],
            )?;
        }

        // Transfer SOL: buyer -> creator (royalty)
        if royalty_amount > 0 {
            let ix = anchor_lang::solana_program::system_instruction::transfer(
                &ctx.accounts.buyer.key(),
                &ctx.accounts.creator.key(),
                royalty_amount,
            );
            anchor_lang::solana_program::program::invoke(
                &ix,
                &[
                    ctx.accounts.buyer.to_account_info(),
                    ctx.accounts.creator.to_account_info(),
                    ctx.accounts.system_program.to_account_info(),
                ],
            )?;
        }

        // Transfer SOL: buyer -> seller (remainder)
        if seller_amount > 0 {
            let ix = anchor_lang::solana_program::system_instruction::transfer(
                &ctx.accounts.buyer.key(),
                &listing.seller,
                seller_amount,
            );
            // For seller account info, load via remaining_accounts or require account passed. We'll pass as `seller_account`.
            anchor_lang::solana_program::program::invoke(
                &ix,
                &[
                    ctx.accounts.buyer.to_account_info(),
                    ctx.accounts.seller_account.to_account_info(),
                    ctx.accounts.system_program.to_account_info(),
                ],
            )?;
        }

        // Transfer NFT from escrow to buyer's ATA
        let mint_key = ctx.accounts.mint.key();
        let (_pda, bump) = Pubkey::find_program_address(
            &[b"escrow_auth", mint_key.as_ref()],
            ctx.program_id,
        );
        // Ensure derived PDA matches provided
        require!(ctx.accounts.escrow_authority.key() == _pda, MarketplaceError::InvalidEscrowAuth);
        let signer_seeds: &[&[u8]] = &[b"escrow_auth", mint_key.as_ref(), &[bump]];
        let signer = &[signer_seeds];

        let cpi_accounts = Transfer {
            from: ctx.accounts.escrow_token_account.to_account_info(),
            to: ctx.accounts.buyer_token_account.to_account_info(),
            authority: ctx.accounts.escrow_authority.to_account_info(),
        };
        let cpi_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            cpi_accounts,
            signer,
        );
        token::transfer(cpi_ctx, 1)?;

        // Mark listing as sold
        listing.status = ListingStatus::Sold;

        emit!(SaleCompleted {
            listing: listing.key(),
            seller: listing.seller,
            buyer: ctx.accounts.buyer.key(),
            mint: ctx.accounts.mint.key(),
            price,
            fee_amount,
            royalty_amount,
            seller_amount,
            escrow_ata: listing.escrow_ata,
        });

        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(price: u64, fee_bps: u16, listing_type: ListingType)]
pub struct CreateListing<'info> {
    #[account(mut)]
    pub seller: Signer<'info>,
    pub mint: Account<'info, Mint>,

    #[account(
        mut,
        constraint = seller_token_account.mint == mint.key(),
        constraint = seller_token_account.owner == seller.key(),
        constraint = seller_token_account.amount >= 1,
    )]
    pub seller_token_account: Account<'info, TokenAccount>,

    /// CHECK: PDA authority for escrow
    #[account(seeds = [b"escrow_auth", mint.key().as_ref()], bump)]
    pub escrow_authority: UncheckedAccount<'info>,

    #[account(
        mut,
        constraint = escrow_token_account.mint == mint.key(),
        constraint = escrow_token_account.owner == escrow_authority.key(),
    )]
    pub escrow_token_account: Account<'info, TokenAccount>,

    #[account(
        init,
        payer = seller,
        space = 8 + Listing::SIZE,
        seeds = [b"listing", seller.key().as_ref(), mint.key().as_ref()],
        bump
    )]
    pub listing: Account<'info, Listing>,

    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    // Associated Token Account must be created client-side prior to calling
}

#[derive(Accounts)]
pub struct BuyListing<'info> {
    #[account(mut)]
    pub buyer: Signer<'info>,

    pub mint: Account<'info, Mint>,

    #[account(
        mut,
        has_one = mint,
        has_one = escrow_authority,
        constraint = listing.escrow_ata == escrow_token_account.key() @ MarketplaceError::InvalidEscrowAta,
    )]
    pub listing: Account<'info, Listing>,

    /// CHECK: PDA authority for escrow; verified via PDA derivation
    #[account(seeds = [b"escrow_auth", mint.key().as_ref()], bump)]
    pub escrow_authority: UncheckedAccount<'info>,

    #[account(
        mut,
        constraint = escrow_token_account.mint == mint.key(),
        constraint = escrow_token_account.owner == escrow_authority.key(),
        constraint = escrow_token_account.amount >= 1,
    )]
    pub escrow_token_account: Account<'info, TokenAccount>,

    #[account(
        mut,
        constraint = buyer_token_account.mint == mint.key(),
        constraint = buyer_token_account.owner == buyer.key(),
    )]
    pub buyer_token_account: Account<'info, TokenAccount>,

    /// CHECK: lamports recipient (platform treasury)
    #[account(mut)]
    pub treasury: UncheckedAccount<'info>,

    /// CHECK: lamports recipient (original creator)
    #[account(mut)]
    pub creator: UncheckedAccount<'info>,

    /// CHECK: lamports recipient (seller); matches listing.seller
    #[account(mut, address = listing.seller @ MarketplaceError::Unauthorized)]
    pub seller_account: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
}

#[account]
pub struct Listing {
    pub seller: Pubkey,
    pub mint: Pubkey,
    pub escrow_authority: Pubkey,
    pub escrow_ata: Pubkey,
    pub price: u64,
    pub fee_bps: u16,
    pub created_at: i64,
    pub expires_at: i64,
    pub status: ListingStatus,
    pub listing_type: ListingType,
    // bump omitted
}

impl Listing { pub const SIZE: usize = 32 + 32 + 32 + 32 + 8 + 2 + 8 + 8 + 1 + 1; }

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq, Debug, Copy)]
pub enum ListingStatus { Active = 0, Sold = 1, Cancelled = 2, Expired = 3 }

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq, Debug, Copy)]
pub enum ListingType { FixedPrice = 0, Auction = 1 }

#[error_code]
pub enum MarketplaceError {
    #[msg("Invalid fee bps")] InvalidFeeBps,
    #[msg("Invalid price")] InvalidPrice,
    #[msg("Listing is not active")] ListingNotActive,
    #[msg("Listing expired")] ListingExpired,
    #[msg("Insufficient funds")] InsufficientFunds,
    #[msg("Invalid mint")] InvalidMint,
    #[msg("Invalid escrow authority")] InvalidEscrowAuth,
    #[msg("Invalid escrow ATA")] InvalidEscrowAta,
    #[msg("Invalid buyer ATA")] InvalidBuyerAta,
    #[msg("Unauthorized")] Unauthorized,
}

#[event]
pub struct ListingCreated {
    pub seller: Pubkey,
    pub mint: Pubkey,
    pub price: u64,
    pub fee_bps: u16,
    pub expires_at: i64,
    pub listing_type: ListingType,
    pub listing: Pubkey,
    pub escrow_ata: Pubkey,
}

#[event]
pub struct SaleCompleted {
    pub listing: Pubkey,
    pub seller: Pubkey,
    pub buyer: Pubkey,
    pub mint: Pubkey,
    pub price: u64,
    pub fee_amount: u64,
    pub royalty_amount: u64,
    pub seller_amount: u64,
    pub escrow_ata: Pubkey,
}
