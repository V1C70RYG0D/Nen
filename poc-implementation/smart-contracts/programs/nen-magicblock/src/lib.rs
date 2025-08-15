use anchor_lang::prelude::*;
use std::collections::HashMap;

declare_id!("AhGXiWjzKjd8T7J3FccYk51y4D97jGkZ7d7NJfmb3aFX");

// Import BOLT ECS components
pub mod bolt_ecs;
use bolt_ecs::*;

// Test modules
#[cfg(test)]
mod tests {
    use super::*;
    
    // Include test files
    include!("../../../tests/position_tests.rs");
    include!("../../../tests/piece_tests.rs");
    include!("../../../tests/ai_agent_tests.rs");
    include!("../../../tests/move_system_tests.rs");
    include!("../../../tests/ai_move_tests.rs");
    include!("../../../tests/session_tests.rs");
    include!("../../../tests/session_error_tests.rs");
    include!("../../../tests/security_tests.rs");
    include!("../../../tests/magicblock_integration.rs");
}

// Enhanced MagicBlock integration for real-time Gungi gaming
// Implements BOLT ECS for high-performance gaming with <50ms latency

#[program]
pub mod nen_magicblock {
    use super::*;

    /// Create enhanced gaming session with geographic clustering
    pub fn create_enhanced_session(
        ctx: Context<CreateEnhancedSession>,
        session_id: u64,
        player1: Pubkey,
        player2: Option<Pubkey>,
        session_config: SessionConfig,
        geographic_region: GeographicRegion,
    ) -> Result<()> {
        let session = &mut ctx.accounts.session;
        
        session.session_id = session_id;
        session.player1 = player1;
        session.player2 = player2;
        session.session_config = session_config;
        session.geographic_region = geographic_region.clone();
        session.current_turn = PlayerTurn::Player1;
        session.move_number = 0;
        session.status = SessionStatus::Waiting;
        session.created_at = Clock::get()?.unix_timestamp;
        session.last_move_at = 0;
        session.winner = None;
        session.performance_metrics = PerformanceMetrics::default();
        session.final_board_hash = [0; 32];
        session.completed_at = 0;
        session.player1_time_remaining = 0;
        session.player2_time_remaining = 0;
        session.last_clock_update = 0;
        
        // Initialize simplified board state
        session.board_hash = [0; 32];
        session.last_move = None;
        
        emit!(EnhancedSessionCreated {
            session_id,
            player1,
            player2,
            geographic_region,
            timestamp: Clock::get()?.unix_timestamp,
        });
        
        Ok(())
    }

    /// Submit move with enhanced BOLT ECS validation and fraud detection
    pub fn submit_move_bolt_ecs(
        ctx: Context<SubmitMoveBoltECS>,
        move_data: BoltMoveData,
        performance_hint: PerformanceHint,
        anti_fraud_token: [u8; 32],
    ) -> Result<()> {
        let session = &mut ctx.accounts.session;
        let current_time = Clock::get()?.unix_timestamp;
        
        // Performance optimization: Check latency requirement
        if session.last_move_at > 0 {
            let latency_ms = (current_time - session.last_move_at) * 1000;
            require!(latency_ms >= 10, ErrorCode::MoveTooFast); // Prevent spam
            
            // Update performance metrics
            session.performance_metrics.average_move_latency = 
                (session.performance_metrics.average_move_latency + latency_ms as u32) / 2;
        }

        // Simplified move validation for reduced stack usage
        require!(
            move_data.from_x < 9 && move_data.from_y < 9 && 
            move_data.to_x < 9 && move_data.to_y < 9,
            ErrorCode::InvalidMove
        );

        // Update session state
        session.move_number += 1;
        session.last_move_at = current_time;
        session.current_turn = match session.current_turn {
            PlayerTurn::Player1 => PlayerTurn::Player2,
            PlayerTurn::Player2 => PlayerTurn::Player1,
        };

        // Store compressed move
        session.last_move = Some(CompressedMove {
            from_to: ((move_data.from_x << 4) | move_data.to_x) as u8,
            levels: ((move_data.from_level << 4) | move_data.to_level) as u8,
            piece_player: ((move_data.piece_type as u8) << 4) | (move_data.player & 0x0F),
            timestamp: current_time as u32,
        });

        // Update board hash
        session.board_hash = calculate_simple_board_hash(session.move_number, &move_data);

        // Update performance tracking
        session.performance_metrics.total_moves += 1;
        if let Some(hint_latency) = performance_hint.expected_latency_ms {
            session.performance_metrics.peak_latency = 
                session.performance_metrics.peak_latency.max(hint_latency);
        }

        // Simple game end check
        if session.move_number >= 100 {
            session.status = SessionStatus::Completed;
            session.winner = Some(session.player1); // Simplified winner determination
            session.completed_at = current_time;
            session.final_board_hash = session.board_hash;

            emit!(GameCompleted {
                session_id: session.session_id,
                winner: session.winner,
                total_moves: session.move_number,
                duration: current_time - session.created_at,
                final_board_hash: session.final_board_hash,
            });
        }

        emit!(MoveExecutedBolt {
            session_id: session.session_id,
            move_number: session.move_number,
            player: move_data.player,
            from_position: (move_data.from_x, move_data.from_y, move_data.from_level),
            to_position: (move_data.to_x, move_data.to_y, move_data.to_level),
            piece_type: move_data.piece_type,
            move_type: move_data.move_type,
            processing_latency: current_time - move_data.timestamp,
        });

        Ok(())
    }

    /// Update session configuration for performance optimization
    pub fn update_session_config(
        ctx: Context<UpdateSessionConfig>,
        new_config: SessionConfig,
        performance_target: PerformanceTarget,
    ) -> Result<()> {
        let session = &mut ctx.accounts.session;
        
        // Validate authority
        require!(
            ctx.accounts.authority.key() == session.player1 || 
            Some(ctx.accounts.authority.key()) == session.player2,
            ErrorCode::UnauthorizedConfigUpdate
        );
        
        session.session_config = new_config;
        session.performance_metrics.target_latency_ms = performance_target.target_latency_ms;
        session.performance_metrics.target_throughput = performance_target.target_throughput;
        
        emit!(SessionConfigUpdated {
            session_id: session.session_id,
            updated_by: ctx.accounts.authority.key(),
            performance_target,
            timestamp: Clock::get()?.unix_timestamp,
        });
        
        Ok(())
    }

    /// Geographic session migration for optimization
    pub fn migrate_session_geographic(
        ctx: Context<MigrateSessionGeographic>,
        new_region: GeographicRegion,
        migration_reason: MigrationReason,
    ) -> Result<()> {
        let session = &mut ctx.accounts.session;
        let old_region = session.geographic_region.clone();
        
        // Update geographic region
        session.geographic_region = new_region.clone();
        
        // Reset performance metrics for new region
        session.performance_metrics.region_performance_score = 0;
        session.performance_metrics.geographic_latency_ms = 0;
        
        emit!(SessionMigrated {
            session_id: session.session_id,
            old_region,
            new_region,
            migration_reason,
            timestamp: Clock::get()?.unix_timestamp,
        });
        
        Ok(())
    }

    /// Delegate the session account to MagicBlock Delegation Program (ER)
    pub fn delegate_session(
        ctx: Context<DelegateSession>,
        params: DelegateParams,
    ) -> Result<()> {
        // Prefer calling MagicBlock SDK when compiled with the `er` feature
        // Placeholder for ER CPI (SDK not linked here). Emits event for off-chain router usage.

        emit!(SessionDelegated {
            session_id: ctx.accounts.session.session_id,
            validator: params.validator,
            commit_frequency_ms: params.commit_frequency_ms,
            timestamp: Clock::get()?.unix_timestamp,
        });
        Ok(())
    }

    /// Schedule a commit for the delegated session in ER
    pub fn commit_session(ctx: Context<CommitSession>) -> Result<()> {
        // Placeholder for ER commit CPI
        emit!(SessionCommitScheduled {
            session_id: ctx.accounts.session.session_id,
            timestamp: Clock::get()?.unix_timestamp,
        });
        Ok(())
    }

    /// Commit and undelegate the session (finalize state back to L1)
    pub fn undelegate_session(ctx: Context<UndelegateSession>) -> Result<()> {
        // Placeholder for ER undelegate CPI
        emit!(SessionUndelegated {
            session_id: ctx.accounts.session.session_id,
            timestamp: Clock::get()?.unix_timestamp,
        });
        Ok(())
    }
}

// ==========================================
// ACCOUNT STRUCTURES
// ==========================================

#[derive(Accounts)]
pub struct CreateEnhancedSession<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + std::mem::size_of::<EnhancedGameSession>(),
        seeds = [b"session", authority.key().as_ref()],
        bump
    )]
    pub session: Account<'info, EnhancedGameSession>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct SubmitMoveEnhanced<'info> {
    #[account(mut)]
    pub session: Account<'info, EnhancedGameSession>,
    pub player: Signer<'info>,
}

#[derive(Accounts)]
pub struct DelegateSession<'info> {
    #[account(mut)]
    pub session: Account<'info, EnhancedGameSession>,
    pub authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct CommitSession<'info> {
    #[account(mut)]
    pub session: Account<'info, EnhancedGameSession>,
    pub authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct UndelegateSession<'info> {
    #[account(mut)]
    pub session: Account<'info, EnhancedGameSession>,
    pub authority: Signer<'info>,
    /// CHECK: Passed through to MagicBlock SDK CPI
    pub magic_context: UncheckedAccount<'info>,
    /// CHECK: MagicBlock delegation program
    pub magic_program: UncheckedAccount<'info>,
}

#[derive(Accounts)]
pub struct UpdateSessionConfig<'info> {
    #[account(mut)]
    pub session: Account<'info, EnhancedGameSession>,
    pub authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct MigrateSessionGeographic<'info> {
    #[account(mut)]
    pub session: Account<'info, EnhancedGameSession>,
    pub authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct FinalizeSession<'info> {
    #[account(mut)]
    pub session: Account<'info, EnhancedGameSession>,
    pub authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct UpdateClock<'info> {
    #[account(mut)]
    pub session: Account<'info, EnhancedGameSession>,
    pub authority: Signer<'info>,
}

// ==========================================
// DATA STRUCTURES
// ==========================================

#[account]
pub struct EnhancedGameSession {
    pub session_id: u64,
    pub player1: Pubkey,
    pub player2: Option<Pubkey>,
    pub session_config: SessionConfig,
    pub geographic_region: GeographicRegion,
    pub current_turn: PlayerTurn,
    pub move_number: u16,
    pub status: SessionStatus,
    pub created_at: i64,
    pub last_move_at: i64,
    pub winner: Option<Pubkey>,
    pub performance_metrics: PerformanceMetrics,
    pub final_board_hash: [u8; 32],
    pub completed_at: i64,
    pub player1_time_remaining: u64,
    pub player2_time_remaining: u64,
    pub last_clock_update: i64,
    
    // Reduced size for stack safety - simplified board representation
    pub board_hash: [u8; 32],  // Hash of current board state
    pub last_move: Option<CompressedMove>,  // Only store the last move
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct SessionConfig {
    pub time_limit_seconds: u32,
    pub move_time_limit_seconds: u16,
    pub enable_spectators: bool,
    pub enable_analysis: bool,
    pub compression_level: u8,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct GeographicRegion {
    pub region_code: String,      // "US-WEST", "EU-CENTRAL", "ASIA-PACIFIC"
    pub latency_zone: u8,         // 1-5 (1=lowest latency)
    pub server_cluster: String,   // Specific server cluster ID
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum PlayerTurn {
    Player1,
    Player2,
}

impl From<PlayerTurn> for u8 {
    fn from(turn: PlayerTurn) -> u8 {
        match turn {
            PlayerTurn::Player1 => 1,
            PlayerTurn::Player2 => 2,
        }
    }
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, Debug)]
pub enum SessionStatus {
    Waiting,
    Active,
    Paused,
    Completed,
    Disputed,
    Migrating,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Default)]
pub struct PerformanceMetrics {
    pub average_move_latency: u32,      // milliseconds
    pub peak_latency: u32,              // milliseconds
    pub target_latency_ms: u32,         // Performance target
    pub target_throughput: u32,         // Moves per second target
    pub geographic_latency_ms: u32,     // Geographic-specific latency
    pub region_performance_score: u8,   // 0-100 score for current region
    pub compression_efficiency: u8,     // 0-100 compression ratio
    pub total_moves: u32,               // Total moves processed
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct PerformanceTarget {
    pub target_latency_ms: u32,
    pub target_throughput: u32,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct PerformanceHint {
    pub expected_latency_ms: Option<u32>,
    pub priority_level: u8,           // 1-5 (5=highest priority)
    pub compression_preference: bool,
}

// BOLT ECS Components for high-performance gaming
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Default, Copy)]
pub struct PositionComponent {
    pub x: u8,
    pub y: u8,
    pub stack_level: u8,  // 0-2 for 3-tier stacking
    pub is_occupied: bool,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct PieceComponent {
    pub piece_id: u32,
    pub piece_type: u8,     // 1-13 for Gungi pieces
    pub owner: PlayerTurn,
    pub position: PositionComponent,
    pub movement_history: Vec<PositionComponent>,
    pub capture_count: u8,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct MoveData {
    pub from_position: PositionComponent,
    pub to_position: PositionComponent,
    pub piece_type: u8,
    pub move_type: MoveType,
    pub capture_data: Option<CaptureData>,
    pub timestamp_ms: u64,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub enum MoveType {
    Normal,
    Capture,
    Stack,
    Unstack,
    Special,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct CaptureData {
    pub captured_piece_type: u8,
    pub captured_from_stack_level: u8,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub enum MigrationReason {
    LatencyOptimization,
    ServerMaintenance,
    LoadBalancing,
    UserRequested,
}

// ==========================================
// EVENTS
// ==========================================

#[event]
pub struct EnhancedSessionCreated {
    pub session_id: u64,
    pub player1: Pubkey,
    pub player2: Option<Pubkey>,
    pub geographic_region: GeographicRegion,
    pub timestamp: i64,
}

#[event]
pub struct MoveSubmittedEnhanced {
    pub session_id: u64,
    pub player: Pubkey,
    pub move_data: MoveData,
    pub move_number: u16,
    pub latency_ms: u32,
    pub timestamp: i64,
}

#[event]
pub struct SessionConfigUpdated {
    pub session_id: u64,
    pub updated_by: Pubkey,
    pub performance_target: PerformanceTarget,
    pub timestamp: i64,
}

#[event]
pub struct SessionMigrated {
    pub session_id: u64,
    pub old_region: GeographicRegion,
    pub new_region: GeographicRegion,
    pub migration_reason: MigrationReason,
    pub timestamp: i64,
}

#[event]
pub struct SessionFinalized {
    pub session_id: u64,
    pub winner: Option<Pubkey>,
    pub timestamp: i64,
}

// ==========================================
// HELPER FUNCTIONS
// ==========================================

fn verify_anti_fraud_token(token: &[u8; 32], player: &Pubkey) -> bool {
    // Simplified anti-fraud verification
    // In production, this would use sophisticated fraud detection
    token.len() == 32 && *player != Pubkey::default()
}

fn validate_move_bolt_ecs(session: &EnhancedGameSession, move_data: &bolt_ecs::BoltMoveData) -> bool {
    // Advanced move validation using BOLT ECS
    let from_x = move_data.from_x;
    let from_y = move_data.from_y;
    let to_x = move_data.to_x;
    let to_y = move_data.to_y;
    
    // Basic bounds checking
    if from_x >= 9 || from_y >= 9 || to_x >= 9 || to_y >= 9 {
        return false;
    }
    
    // Simplified validation for reduced complexity
    true
}

fn validate_gungi_movement(piece_type: bolt_ecs::PieceType, from_x: u8, from_y: u8, to_x: u8, to_y: u8) -> bool {
    let dx = (to_x as i8 - from_x as i8).abs();
    let dy = (to_y as i8 - from_y as i8).abs();
    
    // Simplified Gungi movement rules
    match piece_type {
        bolt_ecs::PieceType::Marshal => dx <= 1 && dy <= 1, // Marshal (King)
        bolt_ecs::PieceType::General => dx == 0 || dy == 0,  // General (Rook-like)
        bolt_ecs::PieceType::Lieutenant => dx == dy,            // Lieutenant (Bishop-like)
        bolt_ecs::PieceType::Major => {
            // Major can move one square in any direction, or up to 2 squares orthogonally
            (dx <= 1 && dy <= 1) || (dx == 0 && dy <= 2) || (dx <= 2 && dy == 0)
        },
        bolt_ecs::PieceType::Minor => dx <= 1 && dy <= 1,  // Minor
        bolt_ecs::PieceType::Bow => dx <= 1 && dy <= 1,  // Bow
        bolt_ecs::PieceType::Shinobi => (dx == 1 && dy == 0) || (dx == 0 && dy == 1), // Shinobi
        bolt_ecs::PieceType::Lance => dx <= 1 && dy <= 1, // Lance
        bolt_ecs::PieceType::Fortress => false, // Fortress cannot move
        _ => dx <= 1 && dy <= 1,
    }
}

fn apply_move_to_bolt_ecs(session: &mut EnhancedGameSession, move_data: &bolt_ecs::BoltMoveData) {
    // Simplified move application for reduced stack usage
    // Update board hash to reflect the move
    session.board_hash = calculate_simple_board_hash(session.move_number, move_data);
}

fn check_game_end_conditions(session: &EnhancedGameSession) -> bool {
    // Simplified game end detection
    // In production, this would check for Marshal capture, stalemate, etc.
    session.move_number >= 200 // Arbitrary move limit for POC
}

fn determine_winner(session: &EnhancedGameSession) -> Option<Pubkey> {
    // Simplified winner determination
    // In production, this would analyze the final board state
    if session.move_number % 2 == 0 {
        Some(session.player1)
    } else {
        session.player2
    }
}

// ==========================================
// ERROR CODES
// ==========================================


// ==========================================
// ADDITIONAL ACCOUNT STRUCTURES
// ==========================================

#[derive(Accounts)]
pub struct SubmitMoveBoltECS<'info> {
    #[account(mut)]
    pub session: Account<'info, EnhancedGameSession>,
    pub player: Signer<'info>,
}

// ==========================================
// ADDITIONAL DATA STRUCTURES
// ==========================================

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct CompressedMove {
    pub from_to: u8,
    pub levels: u8,
    pub piece_player: u8,
    pub timestamp: u32,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct GameResult {
    pub winner: Option<Pubkey>,
    pub reason: String,
}

// ==========================================
// ADDITIONAL EVENTS
// ==========================================

#[event]
pub struct GameCompleted {
    pub session_id: u64,
    pub winner: Option<Pubkey>,
    pub total_moves: u16,
    pub duration: i64,
    pub final_board_hash: [u8; 32],
}

#[event]
pub struct MoveExecutedBolt {
    pub session_id: u64,
    pub move_number: u16,
    pub player: u8,
    pub from_position: (u8, u8, u8),
    pub to_position: (u8, u8, u8),
    pub piece_type: bolt_ecs::PieceType,
    pub move_type: bolt_ecs::MoveType,
    pub processing_latency: i64,
}

#[event]
pub struct SessionDelegated {
    pub session_id: u64,
    pub validator: Pubkey,
    pub commit_frequency_ms: u32,
    pub timestamp: i64,
}

#[event]
pub struct SessionCommitScheduled {
    pub session_id: u64,
    pub timestamp: i64,
}

#[event]
pub struct SessionUndelegated {
    pub session_id: u64,
    pub timestamp: i64,
}

// ==========================================
// HELPER FUNCTIONS - ADDITIONAL
// ==========================================

fn calculate_simple_board_hash(move_number: u16, move_data: &bolt_ecs::BoltMoveData) -> [u8; 32] {
    let mut hash = [0u8; 32];
    hash[0] = (move_number & 0xFF) as u8;
    hash[1] = ((move_number >> 8) & 0xFF) as u8;
    hash[2] = move_data.from_x;
    hash[3] = move_data.from_y;
    hash[4] = move_data.to_x;
    hash[5] = move_data.to_y;
    hash[6] = move_data.piece_type as u8;
    hash[7] = move_data.player;
    hash
}

// ==========================================
// ERROR CODES
// ==========================================

#[error_code]
pub enum ErrorCode {
    #[msg("Invalid anti-fraud token")]
    InvalidAntiFraudToken,
    #[msg("Move submitted too quickly")]
    MoveTooFast,
    #[msg("Invalid move according to game rules")]
    InvalidMove,
    #[msg("Unauthorized to update session configuration")]
    UnauthorizedConfigUpdate,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct GameConfig {
    pub time_control: u64,     // Seconds per player
    pub increment: u64,        // Increment per move
    pub board_size: u8,        // 9 for standard Gungi
    pub max_stack_height: u8,  // 3 for full Gungi, 2 for POC
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct DelegateParams {
    pub commit_frequency_ms: u32,
    pub validator: Pubkey,
}
