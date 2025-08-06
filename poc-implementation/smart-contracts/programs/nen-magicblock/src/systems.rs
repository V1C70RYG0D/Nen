use anchor_lang::prelude::*;

use crate::components::*;
use crate::errors::*;

/// Create a new MagicBlock session for real-time Gungi gameplay
#[derive(Accounts)]
pub struct CreateSession<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + GameSession::SIZE
    )]
    pub session: Account<'info, GameSession>,

    #[account(
        init,
        payer = authority,
        space = 8 + GameClock::SIZE
    )]
    pub game_clock: Account<'info, GameClock>,

    #[account(
        init,
        payer = authority, 
        space = 8 + MoveHistory::SIZE
    )]
    pub move_history: Account<'info, MoveHistory>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn create_session(
    ctx: Context<CreateSession>,
    player1: Pubkey,
    player2: Option<Pubkey>,
    game_config: crate::GameConfig,
) -> Result<()> {
    let session = &mut ctx.accounts.session;
    let clock = &mut ctx.accounts.game_clock;
    let history = &mut ctx.accounts.move_history;

    let current_time = Clock::get()?.unix_timestamp;

    // Initialize game session
    session.player1 = player1;
    session.player2 = player2;
    session.current_turn = 1; // Player 1 starts
    session.move_number = 0;
    session.status = GameStatus::WaitingForPlayers;
    session.winner = None;
    session.created_at = current_time;
    session.last_move_at = current_time;
    
    // Convert session key to fixed byte array
    let key_bytes = ctx.accounts.session.key().to_bytes();
    let mut session_id = [0u8; 64];
    let copy_len = std::cmp::min(key_bytes.len(), 64);
    session_id[..copy_len].copy_from_slice(&key_bytes[..copy_len]);
    session.session_id = session_id;

    // Initialize game clock
    clock.player1_time = game_config.time_limit * 1000; // Convert to milliseconds
    clock.player2_time = game_config.time_limit * 1000;
    clock.increment = game_config.increment * 1000;
    clock.last_move_time = current_time;

    // Initialize empty move history
    history.move_count = 0;
    history.moves = [GameMove::default(); 50];
    history.board_hashes = [[0u8; 32]; 50];

    msg!("MagicBlock session created successfully");
    Ok(())
}

/// Submit a move during gameplay
#[derive(Accounts)]
pub struct SubmitMove<'info> {
    #[account(mut)]
    pub session: Account<'info, GameSession>,

    #[account(mut)]
    pub game_clock: Account<'info, GameClock>,

    #[account(mut)]
    pub move_history: Account<'info, MoveHistory>,

    #[account(mut)]
    pub piece_position: Account<'info, Position>,

    #[account(mut)]
    pub piece_data: Account<'info, Piece>,

    pub player: Signer<'info>,
}

pub fn submit_move(
    ctx: Context<SubmitMove>,
    from_x: u8,
    from_y: u8,
    from_level: u8,
    to_x: u8,
    to_y: u8,
    to_level: u8,
) -> Result<()> {
    let session = &mut ctx.accounts.session;
    let clock = &mut ctx.accounts.game_clock;
    let history = &mut ctx.accounts.move_history;
    let position = &mut ctx.accounts.piece_position;
    let piece = &mut ctx.accounts.piece_data;

    // Validate it's the player's turn
    let current_player = if session.player1 == ctx.accounts.player.key() {
        1
    } else if session.player2.map_or(false, |p| p == ctx.accounts.player.key()) {
        2
    } else {
        return Err(MagicBlockError::UnauthorizedPlayer.into());
    };

    require!(session.current_turn == current_player, MagicBlockError::NotPlayerTurn);
    require!(session.status == GameStatus::InProgress, MagicBlockError::GameNotInProgress);

    // Validate move bounds
    require!(from_x < 9 && from_y < 9 && from_level < 3, MagicBlockError::InvalidPosition);
    require!(to_x < 9 && to_y < 9 && to_level < 3, MagicBlockError::InvalidPosition);

    // Validate piece ownership
    require!(piece.owner == current_player, MagicBlockError::NotOwnedByPlayer);
    require!(!piece.is_captured, MagicBlockError::PieceAlreadyCaptured);

    // Validate current position matches
    require!(
        position.x == from_x && position.y == from_y && position.level == from_level,
        MagicBlockError::PositionMismatch
    );

    // Basic movement validation (simplified for POC)
    let movement_pattern = piece.piece_type.get_movement_pattern();
    let dx = (to_x as i8) - (from_x as i8);
    let dy = (to_y as i8) - (from_y as i8);
    
    require!(
        movement_pattern.contains(&(dx, dy)) || to_level != from_level,
        MagicBlockError::InvalidMove
    );

    // Update position
    position.x = to_x;
    position.y = to_y;
    position.level = to_level;

    // Update piece move count
    piece.move_count += 1;

    // Record move in history
    // Create move notation as byte array
    let mut move_notation = [0u8; 32];
    let notation_str = format!("{}{}→{}{}", from_x, from_y, to_x, to_y);
    let notation_bytes = notation_str.as_bytes();
    let copy_len = std::cmp::min(notation_bytes.len(), 32);
    move_notation[..copy_len].copy_from_slice(&notation_bytes[..copy_len]);

    // Check if there's a piece at the destination position (capture)
    // For POC, simplified capture detection - in production would check actual board state
    let captured_piece: Option<PieceType> = None;

    let game_move = GameMove {
        player: current_player,
        from_pos: (from_x, from_y, from_level),
        to_pos: (to_x, to_y, to_level),
        piece_type: piece.piece_type.clone(),
        captured: captured_piece,
        timestamp: Clock::get()?.unix_timestamp,
        move_notation,
    };

    history.moves[history.move_count as usize] = game_move;
    history.move_count += 1;

    // Update game state
    session.move_number += 1;
    session.current_turn = if current_player == 1 { 2 } else { 1 };
    session.last_move_at = Clock::get()?.unix_timestamp;

    // Update clock (add increment)
    let current_time_ms = (Clock::get()?.unix_timestamp * 1000) as u64;
    if current_player == 1 {
        clock.player1_time = clock.player1_time.saturating_add(clock.increment);
    } else {
        clock.player2_time = clock.player2_time.saturating_add(clock.increment);
    }
    clock.last_move_time = Clock::get()?.unix_timestamp;

    msg!("Move submitted: {} from ({},{},{}) to ({},{},{})", 
         current_player, from_x, from_y, from_level, to_x, to_y, to_level);

    Ok(())
}

/// Initialize board with starting positions
#[derive(Accounts)]
pub struct InitializeBoard<'info> {
    #[account(mut)]
    pub session: Account<'info, GameSession>,

    pub authority: Signer<'info>,
}

pub fn initialize_board(ctx: Context<InitializeBoard>) -> Result<()> {
    let session = &mut ctx.accounts.session;
    
    // Transition to in-progress when board is initialized
    session.status = GameStatus::InProgress;
    
    msg!("Board initialized for session: {}", session.session_id);
    Ok(())
}

/// Finalize session and prepare for settlement
#[derive(Accounts)]
pub struct FinalizeSession<'info> {
    #[account(mut)]
    pub session: Account<'info, GameSession>,

    #[account(mut)]
    pub move_history: Account<'info, MoveHistory>,

    pub authority: Signer<'info>,
}

pub fn finalize_session(
    ctx: Context<FinalizeSession>,
    winner: Option<Pubkey>,
    final_board_hash: [u8; 32],
) -> Result<()> {
    let session = &mut ctx.accounts.session;
    let history = &mut ctx.accounts.move_history;

    // Set winner
    if let Some(winner_key) = winner {
        if winner_key == session.player1 {
            session.winner = Some(1);
        } else if session.player2.map_or(false, |p| p == winner_key) {
            session.winner = Some(2);
        }
    }

    // Update status
    session.status = GameStatus::Completed;

    // Store final board hash for verification
    if (history.move_count as usize) < history.board_hashes.len() {
        history.board_hashes[history.move_count as usize] = final_board_hash;
    }

    msg!("Session finalized: {} Winner: {:?}", session.session_id, session.winner);
    Ok(())
}

/// Update game clock during gameplay
#[derive(Accounts)]
pub struct UpdateClock<'info> {
    #[account(mut)]
    pub game_clock: Account<'info, GameClock>,

    pub authority: Signer<'info>,
}

pub fn update_clock(
    ctx: Context<UpdateClock>,
    player_time_remaining: [u64; 2],
) -> Result<()> {
    let clock = &mut ctx.accounts.game_clock;

    clock.player1_time = player_time_remaining[0];
    clock.player2_time = player_time_remaining[1];
    clock.last_move_time = Clock::get()?.unix_timestamp;

    Ok(())
}
