-- Sample data for Nen Platform POC
-- Supports development and testing

-- ==========================================
-- SAMPLE USERS
-- ==========================================
INSERT INTO users (id, wallet_address, username, email, elo_rating, preferences) VALUES
('550e8400-e29b-41d4-a716-446655440001', '8QpCwFKcNqHQDLpP7M8qJNGKHs4jGjWmNd9QrCN7Vk9P', 'gon_freecss', 'gon@hunterexam.org', 1350, '{"theme": "dark", "notifications": true}'),
('550e8400-e29b-41d4-a716-446655440002', 'DMc6H7R7TnV9MbKj2KqE9Gj8L5N3sXt6Fp4WmRqDhNs7', 'killua_zoldyck', 'killua@zoldyck.family', 1420, '{"theme": "blue", "sound_effects": false}'),
('550e8400-e29b-41d4-a716-446655440003', 'BVm3Q2k8RtN4LpF6XnD5Js9M7Cv2gYw1Hr8TsEqKpWx3', 'kurapika_kurta', 'kurapika@yorknew.city', 1480, '{"theme": "red", "auto_save": true}'),
('550e8400-e29b-41d4-a716-446655440004', 'FHj9L6M3PqE8YnX2Tv5Kw7Rs4Nz1gDc6Bp9QtWsLpFm8', 'leorio_paradinight', 'leorio@medical.school', 1280, '{"theme": "green", "tutorial_completed": true}');

-- ==========================================
-- SAMPLE AI AGENTS WITH HUNTER X HUNTER PERSONALITIES
-- ==========================================
INSERT INTO ai_agents (id, owner_id, name, description, personality_traits, playing_style, skill_level, elo_rating, is_public, is_tradeable) VALUES
('660e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440001', 'Royal Guard Alpha', 'AI agent inspired by the Royal Guards tactical brilliance', 
 '{"aggression": 0.8, "patience": 0.9, "risk_tolerance": 0.6, "adaptability": 0.9}',
 '{"preferred_openings": ["fortress_defense", "center_control"], "strategic_focus": "positional", "endgame_style": "patient"}',
 8, 1600, true, true),

('660e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440002', 'Phantom Striker', 'Swift and unpredictable like the Phantom Troupe',
 '{"aggression": 0.9, "patience": 0.4, "risk_tolerance": 0.8, "adaptability": 0.7}',
 '{"preferred_openings": ["aggressive_rush", "flank_attack"], "strategic_focus": "tactical", "endgame_style": "aggressive"}',
 7, 1550, true, true),

('660e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440003', 'Nen Master', 'Balanced AI with mastery of all aspects',
 '{"aggression": 0.6, "patience": 0.7, "risk_tolerance": 0.5, "adaptability": 0.8}',
 '{"preferred_openings": ["balanced_development", "flexible_setup"], "strategic_focus": "balanced", "endgame_style": "adaptive"}',
 9, 1700, true, true),

('660e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440004', 'Chimera Ant', 'Evolving AI that learns from every game',
 '{"aggression": 0.7, "patience": 0.8, "risk_tolerance": 0.6, "adaptability": 1.0}',
 '{"preferred_openings": ["experimental", "counter_adaptive"], "strategic_focus": "evolutionary", "endgame_style": "learning"}',
 6, 1450, true, true);

-- ==========================================
-- SAMPLE MATCHES (AI vs AI)
-- ==========================================
INSERT INTO matches (id, match_type, status, ai_agent1_id, ai_agent2_id, betting_pool_sol, is_betting_active, created_at) VALUES
('770e8400-e29b-41d4-a716-446655440001', 'ai_vs_ai', 'pending', '660e8400-e29b-41d4-a716-446655440001', '660e8400-e29b-41d4-a716-446655440002', 5.5, true, NOW() + INTERVAL '1 hour'),
('770e8400-e29b-41d4-a716-446655440002', 'ai_vs_ai', 'active', '660e8400-e29b-41d4-a716-446655440003', '660e8400-e29b-41d4-a716-446655440004', 12.3, false, NOW()),
('770e8400-e29b-41d4-a716-446655440003', 'ai_vs_ai', 'completed', '660e8400-e29b-41d4-a716-446655440001', '660e8400-e29b-41d4-a716-446655440003', 8.7, false, NOW() - INTERVAL '2 hours');

-- ==========================================
-- SAMPLE BETS
-- ==========================================
INSERT INTO bets (id, user_id, match_id, amount_sol, predicted_winner_id, predicted_winner_type, odds, potential_payout, status) VALUES
('880e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440001', '770e8400-e29b-41d4-a716-446655440001', 1.0, '660e8400-e29b-41d4-a716-446655440001', 'ai', 2.2, 2.2, 'placed'),
('880e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440002', '770e8400-e29b-41d4-a716-446655440001', 2.5, '660e8400-e29b-41d4-a716-446655440002', 'ai', 1.8, 4.5, 'placed'),
('880e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440003', '770e8400-e29b-41d4-a716-446655440003', 0.5, '660e8400-e29b-41d4-a716-446655440001', 'ai', 1.5, 0.75, 'won');

-- ==========================================
-- SAMPLE TRAINING SESSIONS
-- ==========================================
INSERT INTO training_sessions (id, ai_agent_id, user_id, training_type, episodes_count, personality_modifications, opening_preferences, status) VALUES
('990e8400-e29b-41d4-a716-446655440001', '660e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440001', 'self_play', 1000, 
 '{"increase_patience": 0.1, "reduce_aggression": 0.05}', 
 '{"focus_on": ["fortress_defense", "endgame_precision"]}', 
 'completed'),
('990e8400-e29b-41d4-a716-446655440002', '660e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440002', 'user_games', 500,
 '{"increase_aggression": 0.2, "improve_tactics": 0.15}',
 '{"focus_on": ["blitz_openings", "sacrifice_combos"]}',
 'running');

-- ==========================================
-- SAMPLE NFT LISTINGS
-- ==========================================
INSERT INTO nft_listings (id, ai_agent_id, seller_id, price_sol, status, expires_at) VALUES
('aa0e8400-e29b-41d4-a716-446655440001', '660e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440004', 15.0, 'active', NOW() + INTERVAL '7 days'),
('aa0e8400-e29b-41d4-a716-446655440002', '660e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440003', 25.5, 'active', NOW() + INTERVAL '3 days');

-- ==========================================
-- UPDATE SAMPLE STATISTICS
-- ==========================================
UPDATE users SET 
    games_played = 15, 
    games_won = 9,
    total_winnings = 12.5,
    sol_balance = 25.0,
    betting_balance = 5.0
WHERE username = 'gon_freecss';

UPDATE users SET 
    games_played = 23, 
    games_won = 16,
    total_winnings = 18.7,
    sol_balance = 32.5,
    betting_balance = 8.0
WHERE username = 'killua_zoldyck';

UPDATE ai_agents SET 
    games_played = 45,
    wins = 28,
    losses = 15,
    draws = 2,
    training_data_count = 1000
WHERE name = 'Royal Guard Alpha';

UPDATE ai_agents SET 
    games_played = 38,
    wins = 22,
    losses = 14,
    draws = 2,
    training_data_count = 750
WHERE name = 'Phantom Striker';
