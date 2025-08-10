use anchor_lang::prelude::*;
use anchor_spl::token::{TokenAccount, Token, Mint};

mod errors;
use errors::NenPlatformError;

declare_id!("Xs4PKxWNyY1C7i5bdqMh5tNhwPbDbxMXf4YcJAreJcF");

// Enhanced Nen Platform Core Smart Contract
// Implements comprehensive gaming features with security frameworks

#[program]
pub mod nen_core {
    use super::*;

    /// Initialize the Nen Platform with enhanced security
    pub fn initialize_platform(
        ctx: Context<InitializePlatform>,
        admin_authority: Pubkey,
        platform_fee_percentage: u16,
    ) -> Result<()> {
        require!(platform_fee_percentage <= 1000, ErrorCode::InvalidFeePercentage); // Max 10%
        
        let platform = &mut ctx.accounts.platform;
        platform.admin_authority = admin_authority;
        platform.platform_fee_percentage = platform_fee_percentage;
        platform.total_matches = 0;
        platform.total_bets = 0;
        platform.total_volume = 0;
        platform.created_at = Clock::get()?.unix_timestamp;
        platform.is_paused = false;
        
        emit!(PlatformInitialized {
            admin_authority,
            platform_fee_percentage,
            timestamp: Clock::get()?.unix_timestamp,
        });
        
        Ok(())
    }

    /// Create user account with KYC compliance framework
    pub fn create_user_account(
        ctx: Context<CreateUserAccount>,
        kyc_level: u8,
        compliance_flags: u32,
    ) -> Result<()> {
        require!(kyc_level <= 3, ErrorCode::InvalidKycLevel); // Basic, Verified, Premium
        
        let user_account = &mut ctx.accounts.user_account;
        user_account.authority = ctx.accounts.user.key();
        user_account.kyc_level = kyc_level;
        user_account.compliance_flags = compliance_flags;
        user_account.total_matches = 0;
        user_account.total_winnings = 0;
        user_account.total_losses = 0;
        user_account.reputation_score = 1000; // Starting reputation
        user_account.created_at = Clock::get()?.unix_timestamp;
        user_account.is_active = true;
        user_account.last_activity = Clock::get()?.unix_timestamp;
        
        emit!(UserAccountCreated {
            user: ctx.accounts.user.key(),
            kyc_level,
            timestamp: Clock::get()?.unix_timestamp,
        });
        
        Ok(())
    }

    /// Enhanced user creation with username and regional clustering
    /// Implements requirements from testing specification
    pub fn create_enhanced_user(
        ctx: Context<CreateUserAccount>,
        username: String,
        kyc_level: u8,
        region: u8,
    ) -> Result<()> {
        require!(kyc_level <= 2, ErrorCode::InvalidKycLevel); // 0=None, 1=Basic, 2=Enhanced
        require!(region <= 4, NenPlatformError::InvalidRegion); // 0=Global, 1=NA, 2=EU, 3=APAC, 4=LATAM
        require!(username.len() >= 3, NenPlatformError::UsernameTooShort);
        require!(username.len() <= 30, NenPlatformError::UsernameTooLong);
        
        // Validate username characters (alphanumeric, underscore, dash only)
        for ch in username.chars() {
            require!(
                ch.is_alphanumeric() || ch == '_' || ch == '-',
                NenPlatformError::InvalidUsernameCharacters
            );
        }
        
        let user_account = &mut ctx.accounts.user_account;
        user_account.authority = ctx.accounts.user.key();
        user_account.kyc_level = kyc_level;
        user_account.compliance_flags = region as u32; // Store region in compliance flags
        user_account.total_matches = 0;
        user_account.total_winnings = 0;
        user_account.total_losses = 0;
        user_account.reputation_score = 1000; // Starting reputation
        user_account.created_at = Clock::get()?.unix_timestamp;
        user_account.is_active = true;
        user_account.last_activity = Clock::get()?.unix_timestamp;
        
        emit!(EnhancedUserCreated {
            user: ctx.accounts.user.key(),
            username: username.clone(),
            kyc_level,
            region,
            timestamp: Clock::get()?.unix_timestamp,
        });
        
        Ok(())
    }

    /// Create Gungi match with enhanced features
    pub fn create_match(
        ctx: Context<CreateMatch>,
        match_type: MatchType,
        bet_amount: u64,
        time_limit_seconds: u32,
        ai_difficulty: u8,
    ) -> Result<()> {
        require!(bet_amount >= 1_000_000, ErrorCode::MinimumBetNotMet); // 0.001 SOL min
        require!(ai_difficulty <= 5, ErrorCode::InvalidDifficulty);
        require!(time_limit_seconds >= 300, ErrorCode::InvalidTimeLimit); // 5 min minimum
        
        let match_account = &mut ctx.accounts.match_account;
        let platform = &mut ctx.accounts.platform;
        
        match_account.match_id = platform.total_matches;
        match_account.player = ctx.accounts.player.key();
        match_account.match_type = match_type.clone();
        match_account.bet_amount = bet_amount;
        match_account.time_limit_seconds = time_limit_seconds;
        match_account.ai_difficulty = ai_difficulty;
        match_account.status = MatchStatus::Created;
        match_account.created_at = Clock::get()?.unix_timestamp;
        match_account.moves_count = 0;
        match_account.winner = None;
        
        // Initialize Gungi board (9x9 with 3-tier stacking)
        match_account.board_state = [[[0u8; 3]; 9]; 9];
        match_account.current_turn = PlayerTurn::Human;
        
        platform.total_matches += 1;
        
        emit!(MatchCreated {
            match_id: match_account.match_id,
            player: ctx.accounts.player.key(),
            bet_amount,
            match_type,
            timestamp: Clock::get()?.unix_timestamp,
        });
        
        Ok(())
    }

    /// Submit move with fraud detection
    pub fn submit_move(
        ctx: Context<SubmitMove>,
        from_x: u8,
        from_y: u8,
        to_x: u8,
        to_y: u8,
        piece_type: u8,
        move_timestamp: i64,
    ) -> Result<()> {
        let match_account = &mut ctx.accounts.match_account;
        
        require!(match_account.status == MatchStatus::InProgress, ErrorCode::MatchNotActive);
        require!(from_x < 9 && from_y < 9 && to_x < 9 && to_y < 9, ErrorCode::InvalidPosition);
        require!(piece_type <= 13, ErrorCode::InvalidPieceType); // 13 Gungi piece types
        
        // Fraud detection: Check timestamp variance
        let current_time = Clock::get()?.unix_timestamp;
        require!(
            (current_time - move_timestamp).abs() < 30, // 30 second tolerance
            ErrorCode::SuspiciousTimestamp
        );
        
        // Validate move according to Gungi rules (simplified)
        require!(
            validate_gungi_move(
                &match_account.board_state,
                from_x, from_y, to_x, to_y, piece_type
            ),
            ErrorCode::InvalidMove
        );
        
        // Update board state
        update_board_state(
            &mut match_account.board_state,
            from_x, from_y, to_x, to_y, piece_type
        );
        
        match_account.moves_count += 1;
        match_account.last_move_at = current_time;
        
        // Switch turns
        match_account.current_turn = match match_account.current_turn {
            PlayerTurn::Human => PlayerTurn::AI,
            PlayerTurn::AI => PlayerTurn::Human,
        };
        
        emit!(MoveSubmitted {
            match_id: match_account.match_id,
            player: ctx.accounts.player.key(),
            from_x, from_y, to_x, to_y,
            piece_type,
            moves_count: match_account.moves_count,
            timestamp: current_time,
        });
        
        Ok(())
    }

    /// Enhanced betting with compliance checks
    pub fn place_bet(
        ctx: Context<PlaceBet>,
        bet_amount: u64,
        bet_type: BetType,
        compliance_signature: [u8; 64],
    ) -> Result<()> {
        let user_account = &ctx.accounts.user_account;
        let match_account = &ctx.accounts.match_account;
        
        // KYC/AML compliance checks
        require!(user_account.kyc_level >= 1, ErrorCode::InsufficientKyc);
        require!(bet_amount >= 1_000_000, ErrorCode::MinimumBetNotMet); // 0.001 SOL
        require!(bet_amount <= 1_000_000_000, ErrorCode::MaximumBetExceeded); // 1 SOL max for POC
        
        // Verify compliance signature (simplified)
        require!(
            verify_compliance_signature(&compliance_signature, user_account.authority),
            ErrorCode::InvalidComplianceSignature
        );
        
        let bet_account = &mut ctx.accounts.bet_account;
        bet_account.bettor = ctx.accounts.bettor.key();
        bet_account.match_id = match_account.match_id;
        bet_account.bet_amount = bet_amount;
        bet_account.bet_type = bet_type.clone();
        bet_account.odds = calculate_odds(&match_account, &bet_type);
        bet_account.status = BetStatus::Pending;
        bet_account.placed_at = Clock::get()?.unix_timestamp;
        
        // Transfer SOL to escrow
        **ctx.accounts.bettor.to_account_info().try_borrow_mut_lamports()? -= bet_amount;
        **ctx.accounts.escrow_account.to_account_info().try_borrow_mut_lamports()? += bet_amount;
        
        emit!(BetPlaced {
            bettor: ctx.accounts.bettor.key(),
            match_id: match_account.match_id,
            bet_amount,
            bet_type,
            odds: bet_account.odds,
            timestamp: Clock::get()?.unix_timestamp,
        });
        
        Ok(())
    }

    /// Mint AI agent NFT with enhanced traits
    pub fn mint_ai_agent_nft(
        ctx: Context<MintAiAgentNft>,
        agent_name: String,
        personality_traits: PersonalityTraits,
        performance_metrics: PerformanceMetrics,
    ) -> Result<()> {
        require!(agent_name.len() <= 32, ErrorCode::NameTooLong);
        
        let nft_account = &mut ctx.accounts.nft_account;
        nft_account.owner = ctx.accounts.owner.key();
        nft_account.agent_name = agent_name;
        nft_account.personality_traits = personality_traits;
        nft_account.performance_metrics = performance_metrics;
        nft_account.created_at = Clock::get()?.unix_timestamp;
        
        emit!(AiAgentNftMinted {
            owner: ctx.accounts.owner.key(),
            mint: ctx.accounts.mint.key(),
            agent_name: nft_account.agent_name.clone(),
            timestamp: Clock::get()?.unix_timestamp,
        });
        
        Ok(())
    }

    /// Start a training session: initializes a TrainingSession PDA and locks the agent
    pub fn start_training_session(
        ctx: Context<StartTrainingSession>,
        session_id: [u8; 16],
        replay_commitments: Vec<[u8; 32]>,
        params: TrainingParams,
    ) -> Result<()> {
        // Basic bounds
        require!(
            replay_commitments.len() as u32 <= TrainingSession::MAX_REPLAYS as u32,
            ErrorCode::TooManyReplays
        );

        // Verify authority owns the agent
        let agent = &mut ctx.accounts.agent_nft;
        require!(agent.owner == ctx.accounts.owner.key(), ErrorCode::InvalidComplianceSignature); // reuse generic error
        require!(!agent.is_training, NenPlatformError::InvalidMatchStatus); // already training

        // Initialize session
        let session = &mut ctx.accounts.training_session;
        session.session_id = session_id;
        session.owner = ctx.accounts.owner.key();
        session.agent_mint = ctx.accounts.mint.key();
        session.status = TrainingStatus::Initiated;
        session.replay_commitments = replay_commitments;
        session.params = params;
        session.created_at = Clock::get()?.unix_timestamp;
        session.updated_at = session.created_at;

        // Lock agent
        agent.is_training = true;

        emit!(TrainingSessionStarted {
            owner: session.owner,
            agent_mint: session.agent_mint,
            session_id,
            replay_count: session.replay_commitments.len() as u32,
            timestamp: session.created_at,
        });

        Ok(())
    }

    /// End a training session and unlock the agent
    pub fn end_training_session(
        ctx: Context<EndTrainingSession>,
        status: TrainingStatus,
    ) -> Result<()> {
        require!(matches!(status, TrainingStatus::Completed | TrainingStatus::Cancelled | TrainingStatus::Failed), NenPlatformError::InvalidMatchStatus);

        let session = &mut ctx.accounts.training_session;
        require!(session.owner == ctx.accounts.owner.key(), NenPlatformError::Unauthorized);

        session.status = status.clone();
        session.updated_at = Clock::get()?.unix_timestamp;

        // Unlock agent
        let agent = &mut ctx.accounts.agent_nft;
        agent.is_training = false;

        emit!(TrainingSessionEnded {
            owner: session.owner,
            agent_mint: session.agent_mint,
            session_id: session.session_id,
            status,
            timestamp: session.updated_at,
        });

        Ok(())
    }

    /// Start a training session (light): initializes a TrainingSession PDA without requiring the on-chain AiAgentNft account
    /// This variant persists session metadata and can be used when the AiAgentNft account address is unknown/not initialized.
    pub fn start_training_session_light(
        ctx: Context<StartTrainingSessionLight>,
        session_id: [u8; 16],
        replay_commitments: Vec<[u8; 32]>,
        params: TrainingParams,
    ) -> Result<()> {
        require!(
            replay_commitments.len() as u32 <= TrainingSession::MAX_REPLAYS as u32,
            ErrorCode::TooManyReplays
        );

        // Initialize session
        let session = &mut ctx.accounts.training_session;
        session.session_id = session_id;
        session.owner = ctx.accounts.owner.key();
        session.agent_mint = ctx.accounts.mint.key();
        session.status = TrainingStatus::Initiated;
        session.replay_commitments = replay_commitments;
        session.params = params;
        session.created_at = Clock::get()?.unix_timestamp;
        session.updated_at = session.created_at;

        emit!(TrainingSessionStarted {
            owner: session.owner,
            agent_mint: session.agent_mint,
            session_id,
            replay_count: session.replay_commitments.len() as u32,
            timestamp: session.created_at,
        });

        Ok(())
    }
}

// ==========================================
// ACCOUNT STRUCTURES
// ==========================================

#[derive(Accounts)]
pub struct InitializePlatform<'info> {
    #[account(
        init,
        payer = admin,
        space = 8 + std::mem::size_of::<Platform>(),
        seeds = [b"platform"],
        bump
    )]
    pub platform: Account<'info, Platform>,
    #[account(mut)]
    pub admin: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CreateUserAccount<'info> {
    #[account(
        init,
        payer = user,
        space = 8 + std::mem::size_of::<UserAccount>(),
        seeds = [b"user", user.key().as_ref()],
        bump
    )]
    pub user_account: Account<'info, UserAccount>,
    #[account(mut)]
    pub user: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CreateMatch<'info> {
    #[account(
        init,
        payer = player,
        space = 8 + std::mem::size_of::<MatchAccount>(),
        seeds = [b"match", platform.total_matches.to_le_bytes().as_ref()],
        bump
    )]
    pub match_account: Account<'info, MatchAccount>,
    #[account(mut)]
    pub platform: Account<'info, Platform>,
    #[account(mut)]
    pub player: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct SubmitMove<'info> {
    #[account(mut)]
    pub match_account: Account<'info, MatchAccount>,
    pub player: Signer<'info>,
}

#[derive(Accounts)]
pub struct PlaceBet<'info> {
    #[account(
        init,
        payer = bettor,
        space = 8 + std::mem::size_of::<BetAccount>(),
    )]
    pub bet_account: Account<'info, BetAccount>,
    pub user_account: Account<'info, UserAccount>,
    pub match_account: Account<'info, MatchAccount>,
    #[account(mut)]
    pub bettor: Signer<'info>,
    /// CHECK: This is safe as we only use it for escrow
    #[account(mut)]
    pub escrow_account: AccountInfo<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct MintAiAgentNft<'info> {
    #[account(
        init,
        payer = owner,
        space = 8 + std::mem::size_of::<AiAgentNft>(),
    )]
    pub nft_account: Account<'info, AiAgentNft>,
    #[account(mut)]
    pub mint: Account<'info, Mint>,
    #[account(mut)]
    pub token_account: Account<'info, TokenAccount>,
    #[account(mut)]
    pub owner: Signer<'info>,
    /// CHECK: Mint authority for the NFT
    pub mint_authority: AccountInfo<'info>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct StartTrainingSession<'info> {
    #[account(
        init,
        payer = owner,
        space = 8 + TrainingSession::MAX_SIZE,
        seeds = [b"training", owner.key().as_ref(), mint.key().as_ref()],
        bump
    )]
    pub training_session: Account<'info, TrainingSession>,
    #[account(mut)]
    pub agent_nft: Account<'info, AiAgentNft>,
    pub mint: Account<'info, Mint>,
    #[account(mut)]
    pub owner: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct EndTrainingSession<'info> {
    #[account(mut,
        seeds = [b"training", owner.key().as_ref(), mint.key().as_ref()],
        bump
    )]
    pub training_session: Account<'info, TrainingSession>,
    #[account(mut)]
    pub agent_nft: Account<'info, AiAgentNft>,
    pub mint: Account<'info, Mint>,
    #[account(mut)]
    pub owner: Signer<'info>,
}

#[derive(Accounts)]
pub struct StartTrainingSessionLight<'info> {
    #[account(
        init,
        payer = owner,
        space = 8 + TrainingSession::MAX_SIZE,
        seeds = [b"training", owner.key().as_ref(), mint.key().as_ref()],
        bump
    )]
    pub training_session: Account<'info, TrainingSession>,
    pub mint: Account<'info, Mint>,
    #[account(mut)]
    pub owner: Signer<'info>,
    pub system_program: Program<'info, System>,
}

// ==========================================
// DATA STRUCTURES
// ==========================================

#[account]
pub struct Platform {
    pub admin_authority: Pubkey,
    pub platform_fee_percentage: u16,
    pub total_matches: u64,
    pub total_bets: u64,
    pub total_volume: u64,
    pub created_at: i64,
    pub is_paused: bool,
}

#[account]
pub struct UserAccount {
    pub authority: Pubkey,
    pub kyc_level: u8,
    pub compliance_flags: u32,
    pub total_matches: u32,
    pub total_winnings: u64,
    pub total_losses: u64,
    pub reputation_score: u32,
    pub created_at: i64,
    pub last_activity: i64,
    pub is_active: bool,
}

#[account]
pub struct MatchAccount {
    pub match_id: u64,
    pub player: Pubkey,
    pub match_type: MatchType,
    pub bet_amount: u64,
    pub time_limit_seconds: u32,
    pub ai_difficulty: u8,
    pub status: MatchStatus,
    pub created_at: i64,
    pub last_move_at: i64,
    pub moves_count: u32,
    pub winner: Option<Pubkey>,
    pub board_state: [[[u8; 3]; 9]; 9], // 9x9 board with 3-tier stacking
    pub current_turn: PlayerTurn,
}

#[account]
pub struct BetAccount {
    pub bettor: Pubkey,
    pub match_id: u64,
    pub bet_amount: u64,
    pub bet_type: BetType,
    pub odds: u64, // Stored as basis points (10000 = 1.0)
    pub status: BetStatus,
    pub placed_at: i64,
    pub settled_at: Option<i64>,
    pub payout_amount: Option<u64>,
}

#[account]
pub struct AiAgentNft {
    pub owner: Pubkey,
    pub mint_address: Pubkey,
    pub agent_name: String,
    pub personality_traits: PersonalityTraits,
    pub performance_metrics: PerformanceMetrics,
    pub created_at: i64,
    pub experience_points: u32,
    pub level: u8,
    pub matches_played: u32,
    pub wins: u32,
    pub is_training: bool,
}

#[account]
pub struct TrainingSession {
    pub session_id: [u8; 16],
    pub owner: Pubkey,
    pub agent_mint: Pubkey,
    pub status: TrainingStatus,
    pub replay_commitments: Vec<[u8; 32]>,
    pub params: TrainingParams,
    pub created_at: i64,
    pub updated_at: i64,
}

impl TrainingSession {
    pub const MAX_REPLAYS: usize = 50;
    // Discriminator (8) handled by Anchor; we provide inner size via MAX_SIZE
    // session_id (16) + owner (32) + agent_mint (32) + status (1) + vec len (4) + commitments (50*32)
    // params (~16) + created_at (8) + updated_at (8)
    pub const MAX_SIZE: usize = 16 + 32 + 32 + 1 + 4 + (Self::MAX_REPLAYS * 32) + TrainingParams::SIZE + 8 + 8;
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum TrainingStatus {
    Initiated,
    InProgress,
    Completed,
    Cancelled,
    Failed,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct TrainingParams {
    pub focus_area: u8,   // 0=openings,1=midgame,2=endgame,3=all
    pub intensity: u8,    // 0=low,1=medium,2=high
    pub max_matches: u16, // 1..=50
    pub learning_rate_bp: u16, // basis points of 1.0 (optional)
    pub epochs: u16,      // 0 if unused
    pub batch_size: u16,  // 0 if unused
}

impl TrainingParams {
    pub const SIZE: usize = 1 + 1 + 2 + 2 + 2 + 2; // 10 bytes
}

// ==========================================
// ENUMS AND STRUCTS
// ==========================================

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum MatchType {
    AiVsHuman,
    AiVsAi,
    Tournament,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum MatchStatus {
    Created,
    InProgress,
    Completed,
    Cancelled,
    Disputed,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum PlayerTurn {
    Human,
    AI,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub enum BetType {
    PlayerWins,
    AiWins,
    Draw,
    TotalMoves { over: u32 },
    GameDuration { over_seconds: u32 },
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum BetStatus {
    Pending,
    Won,
    Lost,
    Refunded,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct PersonalityTraits {
    pub aggression: u8,      // 0-100
    pub patience: u8,        // 0-100
    pub risk_tolerance: u8,  // 0-100
    pub creativity: u8,      // 0-100
    pub analytical: u8,      // 0-100
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct PerformanceMetrics {
    pub win_rate: u16,           // Basis points (10000 = 100%)
    pub average_moves: u16,
    pub average_game_time: u32,  // Seconds
    pub elo_rating: u16,
    pub learning_rate: u16,      // How quickly AI adapts
}

// ==========================================
// EVENTS
// ==========================================

#[event]
pub struct PlatformInitialized {
    pub admin_authority: Pubkey,
    pub platform_fee_percentage: u16,
    pub timestamp: i64,
}

#[event]
pub struct UserAccountCreated {
    pub user: Pubkey,
    pub kyc_level: u8,
    pub timestamp: i64,
}

#[event]
pub struct EnhancedUserCreated {
    pub user: Pubkey,
    pub username: String,
    pub kyc_level: u8,
    pub region: u8,
    pub timestamp: i64,
}

#[event]
pub struct MatchCreated {
    pub match_id: u64,
    pub player: Pubkey,
    pub bet_amount: u64,
    pub match_type: MatchType,
    pub timestamp: i64,
}

#[event]
pub struct MoveSubmitted {
    pub match_id: u64,
    pub player: Pubkey,
    pub from_x: u8,
    pub from_y: u8,
    pub to_x: u8,
    pub to_y: u8,
    pub piece_type: u8,
    pub moves_count: u32,
    pub timestamp: i64,
}

#[event]
pub struct BetPlaced {
    pub bettor: Pubkey,
    pub match_id: u64,
    pub bet_amount: u64,
    pub bet_type: BetType,
    pub odds: u64,
    pub timestamp: i64,
}

#[event]
pub struct AiAgentNftMinted {
    pub owner: Pubkey,
    pub mint: Pubkey,
    pub agent_name: String,
    pub timestamp: i64,
}

#[event]
pub struct TrainingSessionStarted {
    pub owner: Pubkey,
    pub agent_mint: Pubkey,
    pub session_id: [u8; 16],
    pub replay_count: u32,
    pub timestamp: i64,
}

#[event]
pub struct TrainingSessionEnded {
    pub owner: Pubkey,
    pub agent_mint: Pubkey,
    pub session_id: [u8; 16],
    pub status: TrainingStatus,
    pub timestamp: i64,
}

// ==========================================
// HELPER FUNCTIONS
// ==========================================

fn validate_gungi_move(
    board_state: &[[[u8; 3]; 9]; 9],
    from_x: u8,
    from_y: u8,
    to_x: u8,
    to_y: u8,
    piece_type: u8,
) -> bool {
    // Simplified Gungi move validation
    // In production, this would include complete Gungi rules
    
    // Basic bounds checking
    if from_x >= 9 || from_y >= 9 || to_x >= 9 || to_y >= 9 {
        return false;
    }
    
    // Check if there's a piece at the source position
    let source_stack = &board_state[from_x as usize][from_y as usize];
    if source_stack[0] == 0 && source_stack[1] == 0 && source_stack[2] == 0 {
        return false; // No piece to move
    }
    
    // Basic movement rules (simplified)
    let dx = (to_x as i8 - from_x as i8).abs();
    let dy = (to_y as i8 - from_y as i8).abs();
    
    // Different pieces have different movement patterns
    match piece_type {
        1..=13 => dx <= 2 && dy <= 2, // Basic movement constraint
        _ => false,
    }
}

fn update_board_state(
    board_state: &mut [[[u8; 3]; 9]; 9],
    from_x: u8,
    from_y: u8,
    to_x: u8,
    to_y: u8,
    piece_type: u8,
) {
    // Simplified board state update
    // Remove piece from source
    let source_stack = &mut board_state[from_x as usize][from_y as usize];
    for i in 0..3 {
        if source_stack[i] == piece_type {
            source_stack[i] = 0;
            break;
        }
    }
    
    // Add piece to destination (handle stacking)
    let dest_stack = &mut board_state[to_x as usize][to_y as usize];
    for i in 0..3 {
        if dest_stack[i] == 0 {
            dest_stack[i] = piece_type;
            break;
        }
    }
}

fn calculate_odds(match_account: &MatchAccount, bet_type: &BetType) -> u64 {
    // Simplified odds calculation
    // In production, this would use sophisticated algorithms
    match bet_type {
        BetType::PlayerWins => 15000, // 1.5x
        BetType::AiWins => match match_account.ai_difficulty {
            1..=2 => 12000, // Easy AI: 1.2x
            3 => 18000,     // Medium AI: 1.8x
            4..=5 => 25000, // Hard AI: 2.5x
            _ => 20000,     // Default: 2.0x
        },
        BetType::Draw => 50000, // 5.0x (rare in Gungi)
        BetType::TotalMoves { .. } => 20000,
        BetType::GameDuration { .. } => 18000,
    }
}

fn verify_compliance_signature(signature: &[u8; 64], authority: Pubkey) -> bool {
    // Simplified compliance signature verification
    // In production, this would use proper cryptographic verification
    signature.len() == 64 && authority != Pubkey::default()
}

// ==========================================
// ERROR CODES
// ==========================================

#[error_code]
pub enum ErrorCode {
    #[msg("Invalid fee percentage. Must be <= 1000 (10%)")]
    InvalidFeePercentage,
    #[msg("Invalid KYC level. Must be 0-3")]
    InvalidKycLevel,
    #[msg("Minimum bet amount not met")]
    MinimumBetNotMet,
    #[msg("Maximum bet amount exceeded")]
    MaximumBetExceeded,
    #[msg("Invalid AI difficulty level")]
    InvalidDifficulty,
    #[msg("Invalid time limit")]
    InvalidTimeLimit,
    #[msg("Match is not active")]
    MatchNotActive,
    #[msg("Invalid board position")]
    InvalidPosition,
    #[msg("Invalid piece type")]
    InvalidPieceType,
    #[msg("Suspicious timestamp detected")]
    SuspiciousTimestamp,
    #[msg("Invalid move according to Gungi rules")]
    InvalidMove,
    #[msg("Insufficient KYC level for this operation")]
    InsufficientKyc,
    #[msg("Invalid compliance signature")]
    InvalidComplianceSignature,
    #[msg("Agent name too long")]
    NameTooLong,
    #[msg("Too many replays selected for training session")]
    TooManyReplays,
}
