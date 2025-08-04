use anchor_lang::prelude::*;

#[error_code]
pub enum MagicBlockError {
    #[msg("Player is not authorized to make this move")]
    UnauthorizedPlayer,

    #[msg("It's not this player's turn")]
    NotPlayerTurn,

    #[msg("Game is not in progress")]
    GameNotInProgress,

    #[msg("Invalid board position")]
    InvalidPosition,

    #[msg("Piece is not owned by this player")]
    NotOwnedByPlayer,

    #[msg("Piece has already been captured")]
    PieceAlreadyCaptured,

    #[msg("Position mismatch - piece not at expected location")]
    PositionMismatch,

    #[msg("Invalid move for this piece type")]
    InvalidMove,

    #[msg("Cannot stack on this position")]
    InvalidStack,

    #[msg("Time limit exceeded")]
    TimeExpired,

    #[msg("Session not found")]
    SessionNotFound,

    #[msg("Maximum stack height exceeded")]
    StackTooHigh,

    #[msg("Cannot capture your own piece")]
    CannotCaptureSelf,

    #[msg("Invalid session state")]
    InvalidSessionState,
}
