use anchor_lang::prelude::*;

/// Program constants
pub const PLATFORM_SEED: &[u8] = b"platform";
pub const TREASURY_SEED: &[u8] = b"treasury";
pub const USER_SEED: &[u8] = b"user";
pub const MATCH_SEED: &[u8] = b"match";
pub const BET_SEED: &[u8] = b"bet";
pub const AI_AGENT_SEED: &[u8] = b"ai_agent";

/// Maximum values
pub const MAX_PLATFORM_FEE_BPS: u16 = 1000; // 10%
pub const MAX_USERNAME_LENGTH: usize = 32;
pub const MAX_PREFERENCES_LENGTH: usize = 256;
pub const MAX_AGENT_NAME_LENGTH: usize = 64;
pub const MAX_AGENT_DESCRIPTION_LENGTH: usize = 256;
pub const MAX_PERSONALITY_TRAITS_LENGTH: usize = 512;
pub const MAX_SESSION_ID_LENGTH: usize = 64;
pub const MAX_BOARD_STATE_LENGTH: usize = 2048;
pub const MAX_MODEL_HASH_LENGTH: usize = 64;
pub const MAX_MODEL_VERSION_LENGTH: usize = 16;

/// Skill level constraints
pub const MIN_SKILL_LEVEL: u8 = 1;
pub const MAX_SKILL_LEVEL: u8 = 10;

/// Default values
pub const DEFAULT_ELO_RATING: u16 = 1200;
pub const DEFAULT_ODDS_MULTIPLIER: u32 = 100; // For fixed-point arithmetic

/// Match types
pub const MATCH_TYPE_AI_VS_AI: u8 = 0;
pub const MATCH_TYPE_HUMAN_VS_AI: u8 = 1;
pub const MATCH_TYPE_HUMAN_VS_HUMAN: u8 = 2;

/// Match status
pub const MATCH_STATUS_PENDING: u8 = 0;
pub const MATCH_STATUS_ACTIVE: u8 = 1;
pub const MATCH_STATUS_COMPLETED: u8 = 2;
pub const MATCH_STATUS_CANCELLED: u8 = 3;

/// Winner types
pub const WINNER_TYPE_USER: u8 = 0;
pub const WINNER_TYPE_AI_AGENT: u8 = 1;

/// Bet status
pub const BET_STATUS_PLACED: u8 = 0;
pub const BET_STATUS_WON: u8 = 1;
pub const BET_STATUS_LOST: u8 = 2;
pub const BET_STATUS_REFUNDED: u8 = 3;
