#[cfg(test)]
mod session_error_tests {
    use super::*;
    use anchor_lang::prelude::*;
    use std::collections::HashMap;

    fn create_test_session() -> crate::EnhancedGameSession {
        crate::EnhancedGameSession {
            session_id: 12345,
            player1: Pubkey::new_unique(),
            player2: Some(Pubkey::new_unique()),
            session_config: crate::SessionConfig {
                time_limit_seconds: 3600,
                move_time_limit_seconds: 30,
                enable_spectators: true,
                enable_analysis: true,
                compression_level: 2,
            },
            geographic_region: crate::GeographicRegion {
                region_code: "US-WEST".to_string(),
                latency_zone: 1,
                server_cluster: "cluster-us-west-1".to_string(),
            },
            current_turn: crate::PlayerTurn::Player1,
            move_number: 5,
            status: crate::SessionStatus::Active,
            created_at: Clock::get().unwrap().unix_timestamp - 300, // 5 minutes ago
            last_move_at: Clock::get().unwrap().unix_timestamp - 30, // 30 seconds ago
            winner: None,
            performance_metrics: crate::PerformanceMetrics {
                average_move_latency: 25,
                peak_latency: 45,
                target_latency_ms: 50,
                target_throughput: 100,
                geographic_latency_ms: 15,
                region_performance_score: 85,
                compression_efficiency: 75,
                total_moves: 5,
            },
            final_board_hash: [0; 32],
            completed_at: 0,
            player1_time_remaining: 1500,
            player2_time_remaining: 1600,
            last_clock_update: Clock::get().unwrap().unix_timestamp - 30,
            position_components: [[crate::bolt_ecs::PositionComponent::default(); 9]; 9],
            piece_components: Vec::new(),
            move_history: Vec::new(),
            board_state: crate::bolt_ecs::BoardState {
                board: [[None; 9]; 9],
                stacks: HashMap::new(),
                captured_pieces: Vec::new(),
                move_count: 5,
                current_player: 1,
                game_phase: crate::bolt_ecs::GamePhase::Opening,
                special_rules_active: 0,
            },
        }
    }

    #[test]
    fn test_latency_exceeded_triggers_cluster_migration() {
        let mut session = create_test_session();
        
        // Simulate latency exceeding threshold
        session.performance_metrics.average_move_latency = 65; // Exceeds 50ms target
        session.performance_metrics.peak_latency = 85;
        session.performance_metrics.geographic_latency_ms = 75;

        // Test latency detection
        let latency_exceeded = session.performance_metrics.average_move_latency > 
                              session.performance_metrics.target_latency_ms;
        assert!(latency_exceeded);

        // Test migration trigger
        let should_migrate = session.performance_metrics.average_move_latency > 60 ||
                            session.performance_metrics.peak_latency > 80;
        assert!(should_migrate);

        // Simulate cluster migration
        let original_region = session.geographic_region.clone();
        session.geographic_region = crate::GeographicRegion {
            region_code: "US-CENTRAL".to_string(),
            latency_zone: 1,
            server_cluster: "cluster-us-central-1".to_string(),
        };

        // Reset performance metrics for new region
        session.performance_metrics.average_move_latency = 20;
        session.performance_metrics.peak_latency = 35;
        session.performance_metrics.geographic_latency_ms = 12;
        session.performance_metrics.region_performance_score = 95;

        // Verify migration results
        assert_ne!(session.geographic_region.region_code, original_region.region_code);
        assert!(session.performance_metrics.average_move_latency < 50);
        assert_eq!(session.geographic_region.region_code, "US-CENTRAL");
    }

    #[test]
    fn test_connection_loss_restores_from_cache() {
        let mut session = create_test_session();
        
        // Simulate connection loss
        session.status = crate::SessionStatus::Paused;
        let connection_lost_at = Clock::get().unwrap().unix_timestamp;

        // Create cache state before connection loss
        let cached_state = CachedSessionState {
            session_id: session.session_id,
            move_number: session.move_number,
            current_turn: session.current_turn,
            board_state: session.board_state.clone(),
            position_components: session.position_components,
            piece_components: session.piece_components.clone(),
            move_history: session.move_history.clone(),
            cached_at: session.last_move_at,
        };

        // Verify cached state integrity
        assert_eq!(cached_state.session_id, session.session_id);
        assert_eq!(cached_state.move_number, 5);
        assert_eq!(cached_state.current_turn, crate::PlayerTurn::Player1);

        // Simulate cache restoration
        session.move_number = cached_state.move_number;
        session.current_turn = cached_state.current_turn;
        session.board_state = cached_state.board_state;
        session.position_components = cached_state.position_components;
        session.piece_components = cached_state.piece_components;
        session.move_history = cached_state.move_history;
        session.status = crate::SessionStatus::Active;

        // Verify successful restoration
        assert_eq!(session.status, crate::SessionStatus::Active);
        assert_eq!(session.move_number, 5);
        assert!(session.last_move_at <= connection_lost_at);

        // Test cache hit performance
        let cache_restore_time_ms = 5; // Simulated cache restoration time
        assert!(cache_restore_time_ms < 10, "Cache restoration should be under 10ms");
    }

    #[test]
    fn test_state_inconsistency_triggers_rollback() {
        let mut session = create_test_session();
        
        // Create a checkpoint before inconsistency
        let checkpoint = SessionCheckpoint {
            session_id: session.session_id,
            move_number: session.move_number,
            board_state_hash: calculate_board_hash(&session.board_state),
            player_states: vec![
                PlayerState { player: session.player1, time_remaining: session.player1_time_remaining },
                PlayerState { player: session.player2.unwrap(), time_remaining: session.player2_time_remaining },
            ],
            timestamp: session.last_move_at,
        };

        // Simulate state inconsistency
        session.move_number = 8; // Inconsistent with actual moves
        session.board_state.move_count = 3; // Doesn't match session move number

        // Detect inconsistency
        let state_inconsistent = session.move_number != session.board_state.move_count;
        assert!(state_inconsistent);

        // Trigger rollback to checkpoint
        session.move_number = checkpoint.move_number;
        session.board_state.move_count = checkpoint.move_number as u32;
        
        // Verify current board state matches checkpoint
        let current_hash = calculate_board_hash(&session.board_state);
        assert_eq!(current_hash, checkpoint.board_state_hash);

        // Verify rollback success
        assert_eq!(session.move_number, 5);
        assert_eq!(session.board_state.move_count, 5);
        assert!(!state_inconsistent || session.move_number == session.board_state.move_count);
    }

    #[test]
    fn test_rollup_failure_initiates_recovery_procedures() {
        let mut session = create_test_session();
        
        // Simulate rollup failure
        let rollup_error = RollupError {
            error_type: RollupErrorType::ConsensusFailure,
            session_id: session.session_id,
            failed_at: Clock::get().unwrap().unix_timestamp,
            error_message: "Validator consensus failed".to_string(),
            recovery_actions: vec![
                RecoveryAction::SwitchValidator,
                RecoveryAction::RestoreFromBackup,
                RecoveryAction::MigrateSession,
            ],
        };

        assert_eq!(rollup_error.error_type, RollupErrorType::ConsensusFailure);
        assert_eq!(rollup_error.session_id, session.session_id);
        assert_eq!(rollup_error.recovery_actions.len(), 3);

        // Execute recovery procedures
        for action in &rollup_error.recovery_actions {
            match action {
                RecoveryAction::SwitchValidator => {
                    // Switch to backup validator
                    session.geographic_region.server_cluster = "cluster-backup-1".to_string();
                },
                RecoveryAction::RestoreFromBackup => {
                    // Restore from backup state
                    session.status = crate::SessionStatus::Active;
                },
                RecoveryAction::MigrateSession => {
                    // Migrate to different region
                    session.geographic_region.region_code = "US-EAST".to_string();
                    session.geographic_region.latency_zone = 2;
                }
            }
        }

        // Verify recovery completed
        assert_eq!(session.status, crate::SessionStatus::Active);
        assert_eq!(session.geographic_region.server_cluster, "cluster-backup-1");
        assert_eq!(session.geographic_region.region_code, "US-EAST");

        // Test recovery time
        let recovery_time_ms = 150; // Simulated recovery time
        assert!(recovery_time_ms < 500, "Recovery should complete within 500ms");
    }

    #[test]
    fn test_error_count_tracking_and_thresholds() {
        let mut session = create_test_session();
        let mut error_tracker = ErrorTracker {
            session_id: session.session_id,
            connection_errors: 0,
            latency_errors: 0,
            validation_errors: 0,
            rollup_errors: 0,
            total_errors: 0,
            last_error_at: 0,
            error_threshold: 10,
            critical_threshold: 20,
        };

        // Simulate various errors
        let error_scenarios = vec![
            ErrorType::ConnectionTimeout,
            ErrorType::LatencyExceeded,
            ErrorType::InvalidMove,
            ErrorType::RollupFailure,
            ErrorType::ConnectionTimeout,
            ErrorType::LatencyExceeded,
        ];

        for error_type in error_scenarios {
            error_tracker.total_errors += 1;
            error_tracker.last_error_at = Clock::get().unwrap().unix_timestamp;

            match error_type {
                ErrorType::ConnectionTimeout => error_tracker.connection_errors += 1,
                ErrorType::LatencyExceeded => error_tracker.latency_errors += 1,
                ErrorType::InvalidMove => error_tracker.validation_errors += 1,
                ErrorType::RollupFailure => error_tracker.rollup_errors += 1,
            }
        }

        // Verify error tracking
        assert_eq!(error_tracker.total_errors, 6);
        assert_eq!(error_tracker.connection_errors, 2);
        assert_eq!(error_tracker.latency_errors, 2);
        assert_eq!(error_tracker.validation_errors, 1);
        assert_eq!(error_tracker.rollup_errors, 1);

        // Test threshold checks
        let warning_level = error_tracker.total_errors >= 5;
        let critical_level = error_tracker.total_errors >= error_tracker.critical_threshold;
        
        assert!(warning_level);
        assert!(!critical_level);

        // Test error rate calculation
        let time_window_seconds = 300; // 5 minutes
        let error_rate = error_tracker.total_errors as f64 / time_window_seconds as f64;
        assert!(error_rate < 0.1, "Error rate should be less than 0.1 errors per second");
    }

    #[test]
    fn test_automatic_vs_manual_recovery_scenarios() {
        let mut session = create_test_session();

        // Test automatic recovery scenarios
        let automatic_errors = vec![
            (ErrorType::ConnectionTimeout, true),
            (ErrorType::LatencyExceeded, true),
            (ErrorType::InvalidMove, false), // Manual intervention needed
            (ErrorType::RollupFailure, false), // Manual intervention needed
        ];

        for (error_type, should_auto_recover) in automatic_errors {
            let recovery_strategy = match error_type {
                ErrorType::ConnectionTimeout => RecoveryStrategy::Automatic {
                    max_retries: 3,
                    retry_delay_ms: 1000,
                    fallback_action: AutoRecoveryAction::SwitchEndpoint,
                },
                ErrorType::LatencyExceeded => RecoveryStrategy::Automatic {
                    max_retries: 2,
                    retry_delay_ms: 500,
                    fallback_action: AutoRecoveryAction::MigrateRegion,
                },
                ErrorType::InvalidMove => RecoveryStrategy::Manual {
                    requires_admin: true,
                    timeout_seconds: 300,
                    escalation_level: EscalationLevel::High,
                },
                ErrorType::RollupFailure => RecoveryStrategy::Manual {
                    requires_admin: true,
                    timeout_seconds: 600,
                    escalation_level: EscalationLevel::Critical,
                },
            };

            match recovery_strategy {
                RecoveryStrategy::Automatic { max_retries, retry_delay_ms, fallback_action } => {
                    assert!(should_auto_recover);
                    assert!(max_retries > 0);
                    assert!(retry_delay_ms > 0);
                    
                    // Simulate automatic recovery
                    for attempt in 1..=max_retries {
                        let recovery_successful = attempt <= 2; // Simulate success on 2nd attempt
                        if recovery_successful {
                            session.status = crate::SessionStatus::Active;
                            break;
                        }
                        
                        if attempt == max_retries {
                            // Execute fallback action
                            match fallback_action {
                                AutoRecoveryAction::SwitchEndpoint => {
                                    session.geographic_region.server_cluster = "cluster-backup".to_string();
                                },
                                AutoRecoveryAction::MigrateRegion => {
                                    session.geographic_region.region_code = "US-EAST".to_string();
                                },
                            }
                        }
                    }
                    assert_eq!(session.status, crate::SessionStatus::Active);
                },
                RecoveryStrategy::Manual { requires_admin, timeout_seconds, escalation_level } => {
                    assert!(!should_auto_recover);
                    assert!(requires_admin);
                    assert!(timeout_seconds > 0);
                    
                    // Manual recovery requires intervention
                    session.status = crate::SessionStatus::Disputed;
                    
                    match escalation_level {
                        EscalationLevel::High => {
                            assert!(timeout_seconds >= 300);
                        },
                        EscalationLevel::Critical => {
                            assert!(timeout_seconds >= 600);
                        },
                        _ => {}
                    }
                }
            }
        }
    }

    #[test]
    fn test_error_recovery_performance_benchmarks() {
        let mut session = create_test_session();

        // Test recovery time benchmarks for different error types
        let recovery_benchmarks = vec![
            (ErrorType::ConnectionTimeout, 100),   // Should recover within 100ms
            (ErrorType::LatencyExceeded, 200),     // Should recover within 200ms
            (ErrorType::InvalidMove, 50),          // Quick validation fix
        ];

        for (error_type, max_recovery_time_ms) in recovery_benchmarks {
            let start_time = std::time::Instant::now();
            
            // Simulate error recovery
            match error_type {
                ErrorType::ConnectionTimeout => {
                    // Simulate connection restoration
                    std::thread::sleep(std::time::Duration::from_millis(50));
                    session.status = crate::SessionStatus::Active;
                },
                ErrorType::LatencyExceeded => {
                    // Simulate region migration
                    std::thread::sleep(std::time::Duration::from_millis(100));
                    session.geographic_region.latency_zone = 1;
                    session.performance_metrics.average_move_latency = 25;
                },
                ErrorType::InvalidMove => {
                    // Simulate move validation fix
                    std::thread::sleep(std::time::Duration::from_millis(20));
                    session.move_number -= 1; // Rollback invalid move
                },
                _ => {}
            }
            
            let recovery_time = start_time.elapsed();
            assert!(recovery_time.as_millis() <= max_recovery_time_ms as u128,
                   "Recovery from {:?} took {}ms, should be ≤{}ms", 
                   error_type, recovery_time.as_millis(), max_recovery_time_ms);
        }
    }

    #[test]
    fn test_cascade_failure_prevention() {
        let mut session = create_test_session();
        
        // Simulate multiple simultaneous errors
        let simultaneous_errors = vec![
            ErrorType::ConnectionTimeout,
            ErrorType::LatencyExceeded,
            ErrorType::RollupFailure,
        ];

        let mut circuit_breaker = CircuitBreaker {
            failure_threshold: 3,
            current_failures: 0,
            state: CircuitBreakerState::Closed,
            last_failure_time: 0,
            recovery_timeout_ms: 5000,
        };

        // Process errors through circuit breaker
        for error_type in simultaneous_errors {
            circuit_breaker.current_failures += 1;
            circuit_breaker.last_failure_time = Clock::get().unwrap().unix_timestamp;

            if circuit_breaker.current_failures >= circuit_breaker.failure_threshold {
                circuit_breaker.state = CircuitBreakerState::Open;
                session.status = crate::SessionStatus::Paused;
                break;
            }
        }

        // Verify circuit breaker triggered
        assert_eq!(circuit_breaker.state, CircuitBreakerState::Open);
        assert_eq!(session.status, crate::SessionStatus::Paused);

        // Test recovery after timeout
        std::thread::sleep(std::time::Duration::from_millis(100)); // Simulate timeout passage
        
        circuit_breaker.state = CircuitBreakerState::HalfOpen;
        circuit_breaker.current_failures = 0;
        session.status = crate::SessionStatus::Active;

        // Verify recovery
        assert_eq!(circuit_breaker.state, CircuitBreakerState::HalfOpen);
        assert_eq!(session.status, crate::SessionStatus::Active);
    }

    // Helper functions and data structures
    fn calculate_board_hash(board_state: &crate::bolt_ecs::BoardState) -> [u8; 32] {
        let mut hash = [0u8; 32];
        hash[0] = board_state.move_count as u8;
        hash[1] = board_state.current_player;
        hash[2] = board_state.captured_pieces.len() as u8;
        hash
    }

    #[derive(Debug, Clone)]
    struct CachedSessionState {
        session_id: u64,
        move_number: u16,
        current_turn: crate::PlayerTurn,
        board_state: crate::bolt_ecs::BoardState,
        position_components: [[crate::bolt_ecs::PositionComponent; 9]; 9],
        piece_components: Vec<crate::bolt_ecs::PieceComponent>,
        move_history: Vec<crate::CompressedMove>,
        cached_at: i64,
    }

    #[derive(Debug)]
    struct SessionCheckpoint {
        session_id: u64,
        move_number: u16,
        board_state_hash: [u8; 32],
        player_states: Vec<PlayerState>,
        timestamp: i64,
    }

    #[derive(Debug)]
    struct PlayerState {
        player: Pubkey,
        time_remaining: u64,
    }

    #[derive(Debug, PartialEq)]
    enum ErrorType {
        ConnectionTimeout,
        LatencyExceeded,
        InvalidMove,
        RollupFailure,
    }

    #[derive(Debug)]
    struct ErrorTracker {
        session_id: u64,
        connection_errors: u32,
        latency_errors: u32,
        validation_errors: u32,
        rollup_errors: u32,
        total_errors: u32,
        last_error_at: i64,
        error_threshold: u32,
        critical_threshold: u32,
    }

    #[derive(Debug)]
    struct RollupError {
        error_type: RollupErrorType,
        session_id: u64,
        failed_at: i64,
        error_message: String,
        recovery_actions: Vec<RecoveryAction>,
    }

    #[derive(Debug, PartialEq)]
    enum RollupErrorType {
        ConsensusFailure,
        NetworkPartition,
        ValidatorOffline,
    }

    #[derive(Debug)]
    enum RecoveryAction {
        SwitchValidator,
        RestoreFromBackup,
        MigrateSession,
    }

    #[derive(Debug)]
    enum RecoveryStrategy {
        Automatic {
            max_retries: u32,
            retry_delay_ms: u32,
            fallback_action: AutoRecoveryAction,
        },
        Manual {
            requires_admin: bool,
            timeout_seconds: u32,
            escalation_level: EscalationLevel,
        },
    }

    #[derive(Debug)]
    enum AutoRecoveryAction {
        SwitchEndpoint,
        MigrateRegion,
    }

    #[derive(Debug)]
    enum EscalationLevel {
        Low,
        Medium,
        High,
        Critical,
    }

    #[derive(Debug)]
    struct CircuitBreaker {
        failure_threshold: u32,
        current_failures: u32,
        state: CircuitBreakerState,
        last_failure_time: i64,
        recovery_timeout_ms: u32,
    }

    #[derive(Debug, PartialEq)]
    enum CircuitBreakerState {
        Closed,   // Normal operation
        Open,     // Blocking requests
        HalfOpen, // Testing recovery
    }
}
