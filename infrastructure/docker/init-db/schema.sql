-- Nen Platform POC Database Schema
-- PostgreSQL 18 Beta implementation
-- Phase 1: Foundation - Step 1.2: Data Layer

-- ==========================================
-- EXTENSIONS
-- ==========================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==========================================
-- USERS & AUTHENTICATION
-- ==========================================
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    wallet_address VARCHAR(44) UNIQUE NOT NULL, -- Solana address (base58, 32-44 chars)
    username VARCHAR(50) UNIQUE,
    email VARCHAR(255),
    profile_image_url TEXT,
    sol_balance DECIMAL(20, 9) DEFAULT 0, -- SOL has 9 decimal places
    betting_balance DECIMAL(20, 9) DEFAULT 0,
    total_winnings DECIMAL(20, 9) DEFAULT 0,
    total_losses DECIMAL(20, 9) DEFAULT 0,
    games_played INTEGER DEFAULT 0,
    games_won INTEGER DEFAULT 0,
    elo_rating INTEGER DEFAULT 1200,
    is_active BOOLEAN DEFAULT true,
    preferences JSONB DEFAULT '{}', -- User preferences for AI training, UI settings
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- AI AGENTS & NFTs
-- ==========================================
CREATE TABLE ai_agents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID REFERENCES users(id) ON DELETE SET NULL,
    nft_mint_address VARCHAR(44), -- Solana NFT mint address
    name VARCHAR(100) NOT NULL,
    description TEXT,
    personality_traits JSONB DEFAULT '{}', -- Customizable: aggression, defensiveness, etc.
    playing_style JSONB DEFAULT '{}', -- User-defined: openings, strategies, risk tolerance
    skill_level INTEGER DEFAULT 1, -- 1-10 scale
    elo_rating INTEGER DEFAULT 1200,
    games_played INTEGER DEFAULT 0,
    wins INTEGER DEFAULT 0,
    losses INTEGER DEFAULT 0,
    draws INTEGER DEFAULT 0,
    training_data_count INTEGER DEFAULT 0,
    model_version VARCHAR(20) DEFAULT 'v1.0',
    model_hash VARCHAR(64), -- Hash of the AI model file
    is_public BOOLEAN DEFAULT false, -- Available for others to challenge
    is_tradeable BOOLEAN DEFAULT true, -- Can be sold as NFT
    market_price DECIMAL(20, 9), -- Current market price in SOL
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- MATCHES & GAMES
-- ==========================================
CREATE TYPE match_status AS ENUM ('pending', 'active', 'completed', 'cancelled');
CREATE TYPE match_type AS ENUM ('ai_vs_ai', 'human_vs_ai', 'human_vs_human', 'training');

CREATE TABLE matches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    match_type match_type NOT NULL,
    status match_status DEFAULT 'pending',
    player1_id UUID REFERENCES users(id), -- NULL for AI-only matches
    player2_id UUID REFERENCES users(id),
    ai_agent1_id UUID REFERENCES ai_agents(id),
    ai_agent2_id UUID REFERENCES ai_agents(id),
    winner_id UUID, -- References users or ai_agents
    winner_type VARCHAR(10), -- 'user' or 'ai'
    
    -- MagicBlock integration
    magicblock_session_id VARCHAR(100), -- MagicBlock session identifier
    rollup_address VARCHAR(44), -- Ephemeral rollup address
    session_start_time TIMESTAMP WITH TIME ZONE,
    session_end_time TIMESTAMP WITH TIME ZONE,
    
    -- Game state
    board_state JSONB, -- Current/final board position
    move_history JSONB DEFAULT '[]', -- Array of moves
    game_duration_seconds INTEGER,
    total_moves INTEGER DEFAULT 0,
    
    -- Betting information
    betting_pool_sol DECIMAL(20, 9) DEFAULT 0,
    betting_deadline TIMESTAMP WITH TIME ZONE,
    is_betting_active BOOLEAN DEFAULT false,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- BETTING SYSTEM
-- ==========================================
CREATE TYPE bet_status AS ENUM ('placed', 'won', 'lost', 'refunded');

CREATE TABLE bets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
    
    -- Bet details
    amount_sol DECIMAL(20, 9) NOT NULL CHECK (amount_sol > 0),
    predicted_winner_id UUID, -- References users or ai_agents
    predicted_winner_type VARCHAR(10) NOT NULL, -- 'user' or 'ai'
    odds DECIMAL(10, 4) NOT NULL, -- Decimal odds (e.g., 2.50 for 2.5x)
    potential_payout DECIMAL(20, 9) NOT NULL,
    
    -- Settlement
    status bet_status DEFAULT 'placed',
    actual_payout DECIMAL(20, 9) DEFAULT 0,
    settled_at TIMESTAMP WITH TIME ZONE,
    
    -- Blockchain tracking
    placement_tx_signature VARCHAR(88), -- Solana transaction signature
    settlement_tx_signature VARCHAR(88),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- AI TRAINING DATA
-- ==========================================
CREATE TABLE training_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ai_agent_id UUID NOT NULL REFERENCES ai_agents(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id),
    
    -- Training configuration
    training_type VARCHAR(50) NOT NULL, -- 'self_play', 'supervised', 'user_games'
    episodes_count INTEGER DEFAULT 0,
    games_trained_on INTEGER DEFAULT 0,
    training_parameters JSONB DEFAULT '{}', -- Learning rate, batch size, etc.
    
    -- Customization parameters (user-defined)
    personality_modifications JSONB DEFAULT '{}', -- Changes to aggression, style, etc.
    opening_preferences JSONB DEFAULT '{}', -- Preferred openings to train on
    strategic_focus JSONB DEFAULT '{}', -- Attack/defense/tactical focus areas
    
    -- Results
    initial_elo INTEGER,
    final_elo INTEGER,
    improvement_metrics JSONB DEFAULT '{}',
    training_cost_sol DECIMAL(20, 9) DEFAULT 0,
    
    -- Status
    status VARCHAR(20) DEFAULT 'pending', -- pending, running, completed, failed
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- MARKETPLACE & NFT TRADING
-- ==========================================
CREATE TYPE listing_status AS ENUM ('active', 'sold', 'cancelled', 'expired');

CREATE TABLE nft_listings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ai_agent_id UUID NOT NULL REFERENCES ai_agents(id) ON DELETE CASCADE,
    seller_id UUID NOT NULL REFERENCES users(id),
    
    -- Listing details
    price_sol DECIMAL(20, 9) NOT NULL CHECK (price_sol > 0),
    status listing_status DEFAULT 'active',
    expires_at TIMESTAMP WITH TIME ZONE,
    
    -- Sale information
    buyer_id UUID REFERENCES users(id),
    sale_price_sol DECIMAL(20, 9),
    platform_fee_sol DECIMAL(20, 9),
    creator_royalty_sol DECIMAL(20, 9),
    
    -- Blockchain tracking
    listing_tx_signature VARCHAR(88),
    sale_tx_signature VARCHAR(88),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- SYSTEM CONFIGURATION
-- ==========================================
CREATE TABLE system_config (
    key VARCHAR(100) PRIMARY KEY,
    value JSONB NOT NULL,
    description TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default configuration
INSERT INTO system_config (key, value, description) VALUES
('betting_limits', '{"min_bet_sol": 0.1, "max_bet_sol": 100.0}', 'Minimum and maximum betting amounts'),
('platform_fees', '{"betting_fee": 0.025, "marketplace_fee": 0.025, "creator_royalty": 0.05}', 'Platform fee percentages'),
('ai_training', '{"max_concurrent_sessions": 10, "base_cost_per_hour": 0.1}', 'AI training configuration'),
('game_rules', '{"max_game_duration_minutes": 60, "ai_move_timeout_seconds": 30}', 'Game timing rules');

-- ==========================================
-- INDEXES FOR PERFORMANCE
-- ==========================================
CREATE INDEX idx_users_wallet_address ON users(wallet_address);
CREATE INDEX idx_users_elo_rating ON users(elo_rating DESC);
CREATE INDEX idx_ai_agents_owner ON ai_agents(owner_id);
CREATE INDEX idx_ai_agents_elo ON ai_agents(elo_rating DESC);
CREATE INDEX idx_ai_agents_public ON ai_agents(is_public) WHERE is_public = true;
CREATE INDEX idx_matches_status ON matches(status);
CREATE INDEX idx_matches_type ON matches(match_type);
CREATE INDEX idx_matches_created ON matches(created_at DESC);
CREATE INDEX idx_bets_user ON bets(user_id);
CREATE INDEX idx_bets_match ON bets(match_id);
CREATE INDEX idx_bets_status ON bets(status);
CREATE INDEX idx_training_sessions_agent ON training_sessions(ai_agent_id);
CREATE INDEX idx_nft_listings_status ON nft_listings(status) WHERE status = 'active';

-- ==========================================
-- UPDATED_AT TRIGGER FUNCTION
-- ==========================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers to all tables with updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_ai_agents_updated_at BEFORE UPDATE ON ai_agents FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_matches_updated_at BEFORE UPDATE ON matches FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_bets_updated_at BEFORE UPDATE ON bets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_training_sessions_updated_at BEFORE UPDATE ON training_sessions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_nft_listings_updated_at BEFORE UPDATE ON nft_listings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
