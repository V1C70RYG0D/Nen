use anchor_lang::prelude::*;
use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer};

declare_id!("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS");

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
        listing.bump = ctx.bumps.listing;
        listing.escrow_bump = ctx.bumps.escrow_authority;

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

    pub fn cancel_listing(ctx: Context<CancelListing>) -> Result<()> {
        let listing = &mut ctx.accounts.listing;
        require!(listing.status == ListingStatus::Active, MarketplaceError::ListingNotActive);
        require!(listing.seller == ctx.accounts.seller.key(), MarketplaceError::Unauthorized);

        let signer_seeds: &[&[u8]] = &[b"escrow_auth", listing.mint.as_ref(), &[listing.escrow_bump]];
        let signer = &[signer_seeds];

        let cpi_accounts = Transfer {
            from: ctx.accounts.escrow_token_account.to_account_info(),
            to: ctx.accounts.seller_token_account.to_account_info(),
            authority: ctx.accounts.escrow_authority.to_account_info(),
        };
        let cpi_ctx = CpiContext::new_with_signer(ctx.accounts.token_program.to_account_info(), cpi_accounts, signer);
        token::transfer(cpi_ctx, 1)?;

        listing.status = ListingStatus::Cancelled;

        emit!(ListingCancelled {
            seller: listing.seller,
            mint: listing.mint,
            listing: listing.key(),
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
        init_if_needed,
        payer = seller,
        associated_token::mint = mint,
        associated_token::authority = escrow_authority,
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
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct CancelListing<'info> {
    #[account(mut)]
    pub seller: Signer<'info>,
    pub mint: Account<'info, Mint>,

    #[account(
        mut,
        seeds = [b"listing", seller.key().as_ref(), mint.key().as_ref()],
        bump = listing.bump,
        has_one = seller,
        has_one = mint,
        has_one = escrow_authority,
    )]
    pub listing: Account<'info, Listing>,

    /// CHECK: PDA authority for escrow
    #[account(seeds = [b"escrow_auth", mint.key().as_ref()], bump = listing.escrow_bump)]
    pub escrow_authority: UncheckedAccount<'info>,

    #[account(
        mut,
        associated_token::mint = mint,
        associated_token::authority = escrow_authority,
    )]
    pub escrow_token_account: Account<'info, TokenAccount>,

    #[account(
        mut,
        constraint = seller_token_account.mint == mint.key(),
        constraint = seller_token_account.owner == seller.key(),
    )]
    pub seller_token_account: Account<'info, TokenAccount>,

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
    pub bump: u8,
    pub escrow_bump: u8,
}

impl Listing {
    pub const SIZE: usize = 32 + 32 + 32 + 32 + 8 + 2 + 8 + 8 + 1 + 1 + 1 + 1;
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq, Debug, Copy)]
pub enum ListingStatus {
    Active = 0,
    Sold = 1,
    Cancelled = 2,
    Expired = 3,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq, Debug, Copy)]
pub enum ListingType {
    FixedPrice = 0,
    Auction = 1,
}

#[error_code]
pub enum MarketplaceError {
    #[msg("Invalid fee bps")] InvalidFeeBps,
    #[msg("Invalid price")] InvalidPrice,
    #[msg("Listing is not active")] ListingNotActive,
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
pub struct ListingCancelled {
    pub seller: Pubkey,
    pub mint: Pubkey,
    pub listing: Pubkey,
}
