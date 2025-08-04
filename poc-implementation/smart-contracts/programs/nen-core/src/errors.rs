use anchor_lang::prelude::*;

#[error_code]
pub enum NenPlatformError {
    #[msg("Invalid platform authority")]
    InvalidAuthority,
    
    #[msg("Platform fee cannot exceed 10% (1000 basis points)")]
    PlatformFeeTooHigh,
    
    #[msg("Bet amount below minimum")]
    BetAmountTooLow,
    
    #[msg("Bet amount above maximum")]
    BetAmountTooHigh,
    
    #[msg("Betting deadline has passed")]
    BettingClosed,
    
    #[msg("Match is not in correct status for this operation")]
    InvalidMatchStatus,
    
    #[msg("Username too long (max 32 characters)")]
    UsernameTooLong,
    
    #[msg("Username too short (min 3 characters)")]
    UsernameTooShort,
    
    #[msg("Username contains invalid characters")]
    InvalidUsernameCharacters,
    
    #[msg("Invalid region (must be 0-4)")]
    InvalidRegion,
    
    #[msg("Preferences string too long (max 256 characters)")]
    PreferencesTooLong,
    
    #[msg("Invalid match type")]
    InvalidMatchType,
    
    #[msg("Invalid winner type")]
    InvalidWinnerType,
    
    #[msg("AI agent name too long (max 64 characters)")]
    AgentNameTooLong,
    
    #[msg("AI agent description too long (max 256 characters)")]
    AgentDescriptionTooLong,
    
    #[msg("Personality traits string too long (max 512 characters)")]
    PersonalityTraitsTooLong,
    
    #[msg("Invalid skill level (must be 1-10)")]
    InvalidSkillLevel,
    
    #[msg("Bet has already been settled")]
    BetAlreadySettled,
    
    #[msg("Cannot bet on your own match")]
    CannotBetOnOwnMatch,
    
    #[msg("Insufficient funds")]
    InsufficientFunds,
    
    #[msg("Match has not been completed yet")]
    MatchNotCompleted,
    
    #[msg("No winnings to claim")]
    NoWinningsToClaim,
    
    #[msg("MagicBlock session ID too long (max 64 characters)")]
    SessionIdTooLong,
    
    #[msg("Board state too large (max 2KB)")]
    BoardStateTooLarge,
    
    #[msg("Model hash too long (max 64 characters)")]
    ModelHashTooLong,
    
    #[msg("Model version too long (max 16 characters)")]
    ModelVersionTooLong,
    
    #[msg("Mathematical overflow")]
    MathematicalOverflow,
    
    #[msg("Division by zero")]
    DivisionByZero,
    
    #[msg("Invalid timestamp")]
    InvalidTimestamp,
    
    #[msg("Unauthorized operation")]
    Unauthorized,
}
