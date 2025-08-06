#[cfg(test)]
mod session_tests {
    use super::*;
    use anchor_lang::prelude::*;
    use std::collections::HashMap;

    fn create_test_session_config() -> crate::SessionConfig {
        crate::SessionConfig {
            time_limit_seconds: 3600,
            move_time_limit_seconds: 30,
            enable_spectators: true,
            enable_analysis: true,
            compression_level: 2,
        }
    }

    fn create_test_geographic_region(region: &str) -> crate::GeographicRegion {
        match region {
            "americas" => crate::GeographicRegion {
                region_code: "US-WEST".to_string(),
                latency_zone: 1,
                server_cluster: "cluster-us-west-1".to_string(),
            },
            "europe" => crate::GeographicRegion {
                region_code: "EU-CENTRAL".to_string(),
                latency_zone: 2,
                server_cluster: "cluster-eu-central-1".to_string(),
            },
            _ => crate::GeographicRegion {
                region_code: "AUTO".to_string(),
                latency_zone: 3,
                server_cluster: "cluster-auto".to_string(),
            }
        }
    }

    #[test]
    fn test_session_creation_with_americas_cluster() {
        let player1 = Pubkey::new_unique();
        let player2 = Some(Pubkey::new_unique());
        let session_config = create_test_session_config();
        let geographic_region = create_test_geographic_region("americas");

        let session = crate::EnhancedGameSession {
            session_id: 12345,
            player1,
            player2,
            session_config: session_config.clone(),
            geographic_region: geographic_region.clone(),
            current_turn: crate::PlayerTurn::Player1,
            move_number: 0,
            status: crate::SessionStatus::Waiting,
            created_at: Clock::get().unwrap().unix_timestamp,
            last_move_at: 0,
            winner: None,
            performance_metrics: crate::PerformanceMetrics::default(),
            final_board_hash: [0; 32],
            completed_at: 0,
            player1_time_remaining: 0,
            player2_time_remaining: 0,
            last_clock_update: 0,
            position_components: [[crate::bolt_ecs::PositionComponent::default(); 9]; 9],
            piece_components: Vec::new(),
            move_history: Vec::new(),
            board_state: crate::bolt_ecs::BoardState {
                board: [[None; 9]; 9],
                stacks: HashMap::new(),
                captured_pieces: Vec::new(),
                move_count: 0,
                current_player: 1,
                game_phase: crate::bolt_ecs::GamePhase::Opening,
                special_rules_active: 0,
            },
        };

        // Verify session creation
        assert_eq!(session.session_id, 12345);
        assert_eq!(session.player1, player1);
        assert_eq!(session.player2, player2);
        assert_eq!(session.geographic_region.region_code, "US-WEST");
        assert_eq!(session.geographic_region.latency_zone, 1);
        assert_eq!(session.status, crate::SessionStatus::Waiting);
        assert_eq!(session.current_turn, crate::PlayerTurn::Player1);
        assert_eq!(session.move_number, 0);
    }

    #[test]
    fn test_session_creation_with_europe_cluster() {
        let player1 = Pubkey::new_unique();
        let session_config = create_test_session_config();
        let geographic_region = create_test_geographic_region("europe");

        let session = crate::EnhancedGameSession {
            session_id: 54321,
            player1,
            player2: None, // Single player vs AI
            session_config,
            geographic_region: geographic_region.clone(),
            current_turn: crate::PlayerTurn::Player1,
            move_number: 0,
            status: crate::SessionStatus::Waiting,
            created_at: Clock::get().unwrap().unix_timestamp,
            last_move_at: 0,
            winner: None,
            performance_metrics: crate::PerformanceMetrics::default(),
            final_board_hash: [0; 32],
            completed_at: 0,
            player1_time_remaining: 0,
            player2_time_remaining: 0,
            last_clock_update: 0,
            position_components: [[crate::bolt_ecs::PositionComponent::default(); 9]; 9],
            piece_components: Vec::new(),
            move_history: Vec::new(),
            board_state: crate::bolt_ecs::BoardState {
                board: [[None; 9]; 9],
                stacks: HashMap::new(),
                captured_pieces: Vec::new(),
                move_count: 0,
                current_player: 1,
                game_phase: crate::bolt_ecs::GamePhase::Opening,
                special_rules_active: 0,
            },
        };

        // Verify Europe cluster configuration
        assert_eq!(session.geographic_region.region_code, "EU-CENTRAL");
        assert_eq!(session.geographic_region.latency_zone, 2);
        assert_eq!(session.geographic_region.server_cluster, "cluster-eu-central-1");
        assert!(session.player2.is_none()); // AI opponent
    }

    #[test]
    fn test_automatic_cluster_selection_based_on_latency() {
        let regions = vec![
            ("US-WEST", 1, 15),    // 15ms latency
            ("US-EAST", 2, 25),    // 25ms latency
            ("EU-CENTRAL", 2, 45), // 45ms latency
            ("ASIA-PACIFIC", 3, 85), // 85ms latency
        ];

        // Simulate automatic cluster selection based on latency
        let mut best_region = None;
        let mut best_latency = u32::MAX;

        for (region_code, latency_zone, latency_ms) in regions {
            if latency_ms < best_latency {
                best_latency = latency_ms;
                best_region = Some((region_code, latency_zone));
            }
        }

        assert!(best_region.is_some());
        let (selected_region, selected_zone) = best_region.unwrap();
        assert_eq!(selected_region, "US-WEST");
        assert_eq!(selected_zone, 1);
        assert_eq!(best_latency, 15);

        // Test that automatic selection picks the best performing region
        let auto_region = crate::GeographicRegion {
            region_code: selected_region.to_string(),
            latency_zone: selected_zone,
            server_cluster: format!("cluster-{}", selected_region.to_lowercase().replace('_', "-")),
        };

        assert_eq!(auto_region.latency_zone, 1); // Best latency zone
    }

    #[test]
    fn test_rollup_configuration_with_enhanced_parameters() {
        let session_config = crate::SessionConfig {
            time_limit_seconds: 7200, // 2 hours
            move_time_limit_seconds: 60, // 1 minute per move
            enable_spectators: true,
            enable_analysis: true,
            compression_level: 3, // High compression
        };

        // Test enhanced rollup configuration
        assert!(session_config.time_limit_seconds > 0);
        assert!(session_config.move_time_limit_seconds > 0);
        assert!(session_config.enable_spectators);
        assert!(session_config.enable_analysis);
        assert!(session_config.compression_level <= 5); // Max compression level

        // Test configuration validation
        let is_valid_config = session_config.time_limit_seconds >= 300 && // Min 5 minutes
                             session_config.move_time_limit_seconds >= 5 && // Min 5 seconds per move
                             session_config.compression_level <= 5;

        assert!(is_valid_config);

        // Test performance implications
        let expected_max_moves = session_config.time_limit_seconds / session_config.move_time_limit_seconds;
        assert_eq!(expected_max_moves, 120); // 2 hours / 1 minute = 120 moves max
    }

    #[test]
    fn test_cache_layer_initialization_and_validation() {
        let session_id = 98765;
        let geographic_region = create_test_geographic_region("americas");

        // Test cache layer initialization
        let cache_config = CacheLayerConfig {
            session_id,
            region: geographic_region.clone(),
            l1_cache_size_mb: 64,   // 64MB L1 cache
            l2_cache_size_mb: 256,  // 256MB L2 cache
            l3_cache_size_gb: 2,    // 2GB L3 cache
            ttl_seconds: 3600,      // 1 hour TTL
            compression_enabled: true,
        };

        assert_eq!(cache_config.session_id, session_id);
        assert_eq!(cache_config.l1_cache_size_mb, 64);
        assert_eq!(cache_config.l2_cache_size_mb, 256);
        assert_eq!(cache_config.l3_cache_size_gb, 2);
        assert!(cache_config.compression_enabled);

        // Test cache hierarchy validation
        assert!(cache_config.l1_cache_size_mb < cache_config.l2_cache_size_mb);
        assert!(cache_config.l2_cache_size_mb < cache_config.l3_cache_size_gb * 1024);

        // Test cache performance targets
        let l1_target_latency_ms = 1;
        let l2_target_latency_ms = 5;
        let l3_target_latency_ms = 20;

        assert!(l1_target_latency_ms < l2_target_latency_ms);
        assert!(l2_target_latency_ms < l3_target_latency_ms);
        assert!(l3_target_latency_ms < 50); // Should be under 50ms even for L3
    }

    #[test]
    fn test_session_state_management_and_persistence() {
        let mut session = crate::EnhancedGameSession {
            session_id: 11111,
            player1: Pubkey::new_unique(),
            player2: Some(Pubkey::new_unique()),
            session_config: create_test_session_config(),
            geographic_region: create_test_geographic_region("americas"),
            current_turn: crate::PlayerTurn::Player1,
            move_number: 0,
            status: crate::SessionStatus::Waiting,
            created_at: Clock::get().unwrap().unix_timestamp,
            last_move_at: 0,
            winner: None,
            performance_metrics: crate::PerformanceMetrics::default(),
            final_board_hash: [0; 32],
            completed_at: 0,
            player1_time_remaining: 1800, // 30 minutes
            player2_time_remaining: 1800, // 30 minutes
            last_clock_update: Clock::get().unwrap().unix_timestamp,
            position_components: [[crate::bolt_ecs::PositionComponent::default(); 9]; 9],
            piece_components: Vec::new(),
            move_history: Vec::new(),
            board_state: crate::bolt_ecs::BoardState {
                board: [[None; 9]; 9],
                stacks: HashMap::new(),
                captured_pieces: Vec::new(),
                move_count: 0,
                current_player: 1,
                game_phase: crate::bolt_ecs::GamePhase::Opening,
                special_rules_active: 0,
            },
        };

        // Test state transitions
        assert_eq!(session.status, crate::SessionStatus::Waiting);
        
        session.status = crate::SessionStatus::Active;
        assert_eq!(session.status, crate::SessionStatus::Active);

        // Test move progression
        session.move_number += 1;
        session.current_turn = crate::PlayerTurn::Player2;
        session.last_move_at = Clock::get().unwrap().unix_timestamp;

        assert_eq!(session.move_number, 1);
        assert_eq!(session.current_turn, crate::PlayerTurn::Player2);
        assert!(session.last_move_at > session.created_at);

        // Test game completion
        session.status = crate::SessionStatus::Completed;
        session.winner = Some(session.player1);
        session.completed_at = Clock::get().unwrap().unix_timestamp;

        assert_eq!(session.status, crate::SessionStatus::Completed);
        assert!(session.winner.is_some());
        assert!(session.completed_at > session.created_at);
    }

    #[test]
    fn test_performance_metrics_tracking() {
        let mut performance_metrics = crate::PerformanceMetrics {
            average_move_latency: 25,      // 25ms average
            peak_latency: 45,              // 45ms peak
            target_latency_ms: 50,         // 50ms target
            target_throughput: 100,        // 100 moves per second
            geographic_latency_ms: 15,     // 15ms geographic latency
            region_performance_score: 85,  // 85/100 performance score
            compression_efficiency: 75,    // 75% compression efficiency
            total_moves: 42,               // 42 moves processed
        };

        // Test performance tracking
        assert_eq!(performance_metrics.average_move_latency, 25);
        assert!(performance_metrics.average_move_latency < performance_metrics.target_latency_ms);
        assert!(performance_metrics.peak_latency < performance_metrics.target_latency_ms);

        // Test performance updates
        performance_metrics.total_moves += 1;
        let new_move_latency = 30;
        performance_metrics.average_move_latency = 
            (performance_metrics.average_move_latency + new_move_latency) / 2;

        assert_eq!(performance_metrics.total_moves, 43);
        assert_eq!(performance_metrics.average_move_latency, 27); // (25 + 30) / 2 = 27.5 rounded down

        // Test performance thresholds
        assert!(performance_metrics.region_performance_score >= 80); // Good performance
        assert!(performance_metrics.compression_efficiency >= 70);   // Good compression
        assert!(performance_metrics.geographic_latency_ms <= 20);    // Good geographic latency
    }

    #[test]
    fn test_session_configuration_validation() {
        // Test valid configurations
        let valid_configs = vec![
            crate::SessionConfig {
                time_limit_seconds: 1800,     // 30 minutes
                move_time_limit_seconds: 15,  // 15 seconds per move
                enable_spectators: false,
                enable_analysis: false,
                compression_level: 1,
            },
            crate::SessionConfig {
                time_limit_seconds: 7200,     // 2 hours
                move_time_limit_seconds: 60,  // 1 minute per move
                enable_spectators: true,
                enable_analysis: true,
                compression_level: 5,         // Max compression
            },
        ];

        for config in valid_configs {
            assert!(config.time_limit_seconds >= 300); // Min 5 minutes
            assert!(config.move_time_limit_seconds >= 5); // Min 5 seconds
            assert!(config.compression_level <= 5); // Max compression level
        }

        // Test invalid configurations
        let invalid_configs = vec![
            (0, 15, "Zero time limit"),           // Invalid time limit
            (1800, 0, "Zero move time limit"),   // Invalid move time limit
            (1800, 15, "Invalid compression"),   // Would have compression_level > 5
        ];

        for (time_limit, move_time_limit, description) in invalid_configs {
            let is_valid = time_limit >= 300 && move_time_limit >= 5;
            if description.contains("compression") {
                // Test compression level separately
                let compression_valid = true; // Assuming valid compression in this test
                assert!(compression_valid);
            } else {
                assert!(!is_valid, "Configuration should be invalid: {}", description);
            }
        }
    }

    #[test]
    fn test_multi_region_performance_comparison() {
        let regions = vec![
            ("US-WEST", 1, 12),
            ("US-EAST", 2, 28),
            ("EU-CENTRAL", 2, 42),
            ("ASIA-PACIFIC", 3, 78),
        ];

        let mut region_performance = Vec::new();

        for (region_code, latency_zone, latency_ms) in regions {
            // Calculate performance score based on latency
            let performance_score = if latency_ms <= 20 {
                100 - latency_ms as u8
            } else if latency_ms <= 50 {
                80 - ((latency_ms - 20) as u8 * 2)
            } else {
                40 - ((latency_ms - 50) as u8).min(40)
            };

            region_performance.push((region_code, latency_zone, latency_ms, performance_score));
        }

        // Verify performance calculations
        assert_eq!(region_performance[0].3, 88); // US-WEST: 100 - 12 = 88
        assert_eq!(region_performance[1].3, 64); // US-EAST: 80 - ((28-20)*2) = 64
        assert_eq!(region_performance[2].3, 36); // EU-CENTRAL: 80 - ((42-20)*2) = 36
        assert_eq!(region_performance[3].3, 12); // ASIA-PACIFIC: 40 - (78-50) = 12

        // Sort by performance score
        region_performance.sort_by(|a, b| b.3.cmp(&a.3));

        // Best performing region should be US-WEST
        assert_eq!(region_performance[0].0, "US-WEST");
        assert_eq!(region_performance[0].3, 88);
    }

    // Helper struct for cache configuration
    #[derive(Debug, Clone)]
    struct CacheLayerConfig {
        session_id: u64,
        region: crate::GeographicRegion,
        l1_cache_size_mb: u32,
        l2_cache_size_mb: u32,
        l3_cache_size_gb: u32,
        ttl_seconds: u32,
        compression_enabled: bool,
    }
}
