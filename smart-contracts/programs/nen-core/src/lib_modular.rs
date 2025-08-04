use anchor_lang::prelude::*;

declare_id!("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS");

pub mod constants;
pub mod errors;
pub mod modules;

use modules::platform::*;
use modules::users::*;
use modules::matches::*;
use modules::bets::*;
use modules::ai_agents::*;

#[program]
pub mod nen_core {
    use super::*;

    /// Initialize the Nen Platform
    pub fn initialize_platform(
        ctx: Context<InitializePlatform>,
        authority: Pubkey,
        platform_fee: u16,
        min_bet_lamports: u64,
        max_bet_lamports: u64,
    ) -> Result<()> {
        modules::platform::initialize_platform(ctx, authority, platform_fee, min_bet_lamports, max_bet_lamports)
    }

    /// Create a user account
    pub fn create_user_account(
        ctx: Context<CreateUserAccount>,
        username: String,
    ) -> Result<()> {
        modules::users::create_user_account(ctx, username)
    }

    /// Update user account
    pub fn update_user_account(
        ctx: Context<UpdateUserAccount>,
        username: Option<[u8; 32]>,
        preferences: Option<[u8; 256]>,
    ) -> Result<()> {
        modules::users::update_user_account(ctx, username, preferences)
    }

    /// Create a new match
    pub fn create_match(
        ctx: Context<CreateMatch>,
        match_type: u8,
        player1: Option<Pubkey>,
        player2: Option<Pubkey>,
        ai_agent1: Option<Pubkey>,
        ai_agent2: Option<Pubkey>,
        betting_deadline: i64,
    ) -> Result<()> {
        modules::matches::create_match(ctx, match_type, player1, player2, ai_agent1, ai_agent2, betting_deadline)
    }

    /// Settle a match and determine winner
    pub fn settle_match(
        ctx: Context<SettleMatch>,
        winner: Option<Pubkey>,
        winner_type: Option<u8>,
        final_board_state: [u8; 2048],
    ) -> Result<()> {
        modules::matches::settle_match(ctx, winner, winner_type, final_board_state)
    }

    /// Place a bet on a match
    pub fn place_bet(
        ctx: Context<PlaceBet>,
        amount_lamports: u64,
        predicted_winner: Pubkey,
        predicted_winner_type: u8,
    ) -> Result<()> {
        modules::bets::place_bet(ctx, amount_lamports, predicted_winner, predicted_winner_type)
    }

    /// Claim winnings from a settled bet
    pub fn claim_winnings(ctx: Context<ClaimWinnings>) -> Result<()> {
        modules::bets::claim_winnings(ctx)
    }

    /// Register an AI agent
    pub fn register_ai_agent(
        ctx: Context<RegisterAiAgent>,
        name: [u8; 64],
        description: [u8; 256],
        personality_traits: [u8; 512],
        skill_level: u8,
    ) -> Result<()> {
        modules::ai_agents::register_ai_agent(ctx, name, description, personality_traits, skill_level)
    }

    /// Update an AI agent after training
    pub fn update_ai_agent(
        ctx: Context<UpdateAiAgent>,
        new_skill_level: Option<u8>,
        new_personality_traits: Option<[u8; 512]>,
        model_hash: Option<[u8; 64]>,
    ) -> Result<()> {
        modules::ai_agents::update_ai_agent(ctx, new_skill_level, new_personality_traits, model_hash)
    }
}
