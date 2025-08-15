-- Migration for match replay storage
-- This creates tables to store match replays from MagicBlock rollups

-- Match replays table
CREATE TABLE IF NOT EXISTS match_replays (
    id VARCHAR(255) PRIMARY KEY,
    session_id VARCHAR(255) NOT NULL,
    match_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    player_white VARCHAR(255) NOT NULL,
    player_black VARCHAR(255) NOT NULL,
    player_white_agent_id VARCHAR(255),
    player_black_agent_id VARCHAR(255),
    result VARCHAR(50) NOT NULL CHECK (result IN ('white_wins', 'black_wins', 'draw')),
    total_moves INTEGER NOT NULL DEFAULT 0,
    game_length_seconds INTEGER NOT NULL DEFAULT 0,
    opening_name VARCHAR(255),
    opening_moves TEXT, -- JSON array of opening moves
    merkle_root VARCHAR(255),
    rollup_address VARCHAR(255),
    devnet_tx_hash VARCHAR(255),
    average_think_time DECIMAL(10, 3) DEFAULT 0,
    complexity_score INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign key constraints
    FOREIGN KEY (player_white_agent_id) REFERENCES ai_agents(id) ON DELETE SET NULL,
    FOREIGN KEY (player_black_agent_id) REFERENCES ai_agents(id) ON DELETE SET NULL,
    
    -- Indexes for performance
    INDEX idx_match_replays_date (match_date),
    INDEX idx_match_replays_agent_white (player_white_agent_id),
    INDEX idx_match_replays_agent_black (player_black_agent_id),
    INDEX idx_match_replays_result (result),
    INDEX idx_match_replays_opening (opening_name),
    INDEX idx_match_replays_session (session_id)
);

-- Match moves table for detailed move storage
CREATE TABLE IF NOT EXISTS match_moves (
    id VARCHAR(255) PRIMARY KEY,
    replay_id VARCHAR(255) NOT NULL,
    move_number INTEGER NOT NULL,
    player VARCHAR(10) NOT NULL CHECK (player IN ('white', 'black')),
    notation VARCHAR(50) NOT NULL,
    from_position TEXT NOT NULL, -- JSON: {x, y, level}
    to_position TEXT NOT NULL,   -- JSON: {x, y, level}
    piece_type VARCHAR(50) NOT NULL,
    timestamp BIGINT NOT NULL,
    think_time DECIMAL(10, 3) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign key constraints
    FOREIGN KEY (replay_id) REFERENCES match_replays(id) ON DELETE CASCADE,
    
    -- Indexes for performance
    INDEX idx_match_moves_replay (replay_id),
    INDEX idx_match_moves_number (move_number),
    INDEX idx_match_moves_player (player),
    
    -- Ensure unique move numbers per replay per player
    UNIQUE KEY unique_move_per_replay (replay_id, move_number, player)
);

-- Training sessions enhanced table (if not exists, modify existing)
CREATE TABLE IF NOT EXISTS training_sessions_enhanced (
    id VARCHAR(255) PRIMARY KEY,
    ai_agent_id VARCHAR(255) NOT NULL,
    user_id VARCHAR(255) NOT NULL,
    training_type VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'queued',
    
    -- Replay-based training fields
    selected_replays TEXT, -- JSON array of replay IDs
    focus_area VARCHAR(50) CHECK (focus_area IN ('openings', 'midgame', 'endgame', 'all')),
    intensity VARCHAR(20) CHECK (intensity IN ('low', 'medium', 'high')),
    max_matches INTEGER DEFAULT 100,
    
    -- Training parameters
    learning_rate DECIMAL(10, 8) DEFAULT 0.001,
    batch_size INTEGER DEFAULT 32,
    epochs INTEGER DEFAULT 10,
    
    -- Progress tracking
    processed_moves INTEGER DEFAULT 0,
    total_moves INTEGER DEFAULT 0,
    estimated_duration INTEGER DEFAULT 0, -- in minutes
    
    -- Costs and timing
    training_cost_sol DECIMAL(18, 9) DEFAULT 0,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign key constraints
    FOREIGN KEY (ai_agent_id) REFERENCES ai_agents(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    
    -- Indexes
    INDEX idx_training_sessions_agent (ai_agent_id),
    INDEX idx_training_sessions_user (user_id),
    INDEX idx_training_sessions_status (status),
    INDEX idx_training_sessions_type (training_type)
);

-- Sample data for development/testing on devnet
INSERT INTO match_replays (
    id, session_id, match_date, player_white, player_black,
    player_white_agent_id, result, total_moves, game_length_seconds,
    opening_name, opening_moves, merkle_root, rollup_address, devnet_tx_hash
) VALUES 
(
    'replay_netero_vs_meruem_001',
    'session_magicblock_001',
    '2024-01-15 14:30:00',
    'NeteroAI_Agent_001',
    'MeruemAI_Agent_002', 
    'AGENTmint1111111111111111111111111111111111',
    'white_wins',
    67,
    2340,
    'Hunter Opening',
    '["e2-e4", "d7-d6", "Nf3", "Nf6"]',
    'a1b2c3d4e5f67890abcdef1234567890abcdef12',
    'rollup_devnet_001',
    '3xY4Z5A6B7C8D9E0F1G2H3I4J5K6L7M8N9O0P1Q2'
),
(
    'replay_netero_vs_gon_001', 
    'session_magicblock_002',
    '2024-01-16 09:15:00',
    'NeteroAI_Agent_001',
    'GonAI_Agent_003',
    'AGENTmint1111111111111111111111111111111111',
    'black_wins',
    89,
    3120,
    'Nen Master Defense',
    '["d2-d4", "f7-f5", "c2-c4", "Nf6"]',
    'b2c3d4e5f67890abcdef1234567890abcdef12a1',
    'rollup_devnet_002', 
    '4xY5Z6A7B8C9D0E1F2G3H4I5J6K7L8M9N0O1P2Q3'
),
(
    'replay_meruem_vs_killua_001',
    'session_magicblock_003',
    '2024-01-17 16:45:00',
    'MeruemAI_Agent_002',
    'KilluaAI_Agent_004',
    'AGENTmint2222222222222222222222222222222222',
    'white_wins',
    45,
    1890,
    'Lightning Strike Opening',
    '["f2-f4", "e7-e6", "Nf3", "d7-d5"]',
    'c3d4e5f67890abcdef1234567890abcdef12a1b2',
    'rollup_devnet_003',
    '5xY6Z7A8B9C0D1E2F3G4H5I6J7K8L9M0N1O2P3Q4'
) ON DUPLICATE KEY UPDATE updated_at = CURRENT_TIMESTAMP;

-- Sample moves for the first replay
INSERT INTO match_moves (
    id, replay_id, move_number, player, notation,
    from_position, to_position, piece_type, timestamp, think_time
) VALUES
('move_001_001', 'replay_netero_vs_meruem_001', 1, 'white', 'Marshal-e2', '{"x":4,"y":1,"level":0}', '{"x":4,"y":3,"level":0}', 'marshal', 1705321800, 2.5),
('move_001_002', 'replay_netero_vs_meruem_001', 1, 'black', 'Pawn-d6', '{"x":3,"y":6,"level":0}', '{"x":3,"y":5,"level":0}', 'pawn', 1705321803, 1.8),
('move_001_003', 'replay_netero_vs_meruem_001', 2, 'white', 'Knight-f3', '{"x":6,"y":0,"level":0}', '{"x":5,"y":2,"level":0}', 'knight', 1705321810, 3.2),
('move_001_004', 'replay_netero_vs_meruem_001', 2, 'black', 'Knight-f6', '{"x":6,"y":7,"level":0}', '{"x":5,"y":5,"level":0}', 'knight', 1705321815, 2.1)
ON DUPLICATE KEY UPDATE updated_at = CURRENT_TIMESTAMP;
