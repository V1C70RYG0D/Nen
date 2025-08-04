/**
 * Betting System Test Configuration

 */

import { PublicKey } from "@solana/web3.js";
import BN from "bn.js";

// Betting System Specific Test Configuration
export const BETTING_TEST_CONFIG = {
    // Bet Amount Boundaries (GI #18: No hardcoding)
    betAmounts: {
        minimum: process.env.MIN_BET_AMOUNT ?
            parseFloat(process.env.MIN_BET_AMOUNT) : 0.01, // SOL
        maximum: process.env.MAX_BET_AMOUNT ?
            parseFloat(process.env.MAX_BET_AMOUNT) : 100, // SOL
        testRanges: [
            0.1,   // Minimum test amount
            0.5,   // Small bet
            1.0,   // Standard bet
            5.0,   // Medium bet
            10.0,  // Large bet
            50.0,  // Very large bet
            100.0  // Maximum test amount
        ]
    },

    // Agent Choice Configuration
    agentChoices: {
        valid: [1, 2],
        invalid: [0, 3, 4, -1, 999]
    },

    // Pool Management Settings
    pools: {
        initialBalance: 0,
        feePercentage: process.env.PLATFORM_FEE_PERCENTAGE ?
            parseInt(process.env.PLATFORM_FEE_PERCENTAGE) : 250, // 2.5%
        distributionRatio: {
            agent1Default: 0.5,
            agent2Default: 0.5
        }
    },

    // Performance Benchmarks (GI #21: Performance optimization)
    performance: {
        maxLatencyMs: parseInt(process.env.MAX_BET_LATENCY || "2000"),
        minThroughputTPS: parseInt(process.env.MIN_BET_THROUGHPUT || "100"),
        maxComputeUnits: parseInt(process.env.MAX_COMPUTE_UNITS || "200000"),
        concurrentBetLimit: parseInt(process.env.CONCURRENT_BET_LIMIT || "20"),
        loadTestScenarios: {
            light: {
                userCount: 5,
                betsPerUser: 2,
                duration: 30000, // 30 seconds
                expectedLatency: 1000 // ms
            },
            moderate: {
                userCount: 10,
                betsPerUser: 3,
                duration: 60000, // 60 seconds
                expectedLatency: 1500 // ms
            },
            heavy: {
                userCount: 20,
                betsPerUser: 5,
                duration: 120000, // 120 seconds
                expectedLatency: 2000 // ms
            }
        }
    },

    // Security Test Configuration (GI #13: Security measures)
    security: {
        attackVectors: {
            integerOverflow: {
                enabled: true,
                testValues: [
                    new BN(2).pow(new BN(64)), // u64 overflow
                    new BN(2).pow(new BN(128)), // u128 overflow
                    new BN(-1) // Negative value
                ]
            },
            unauthorizedAccess: {
                enabled: true,
                testScenarios: [
                    "wrong_signer",
                    "invalid_authority",
                    "missing_permissions"
                ]
            },
            reentrancy: {
                enabled: true,
                maxRecursionDepth: 10
            },
            kycBypass: {
                enabled: true,
                testLevels: [
                    { level: 1, maxBet: 1.0 },
                    { level: 2, maxBet: 10.0 },
                    { level: 3, maxBet: 100.0 }
                ]
            }
        },
        inputValidation: {
            fuzzing: true,
            boundaryTesting: true,
            malformedDataTesting: true
        }
    },

    // Test Data Generation (GI #17: Generalize for reusability)
    dataGeneration: {
        userCount: parseInt(process.env.TEST_USER_COUNT || "10"),
        matchCount: parseInt(process.env.TEST_MATCH_COUNT || "5"),
        betCount: parseInt(process.env.TEST_BET_COUNT || "50"),
        kycLevels: [1, 2, 3],
        matchStates: [
            "pending",
            "active",
            "completed",
            "cancelled"
        ],
        betStates: [
            "active",
            "won",
            "lost",
            "cancelled"
        ]
    },

    // Error Handling Configuration (GI #20: Robust error handling)
    errorHandling: {
        expectedErrors: {
            belowMinimum: ["minimum", "amount", "invalid"],
            aboveMaximum: ["maximum", "amount", "limit"],
            invalidChoice: ["choice", "invalid", "range"],
            closedMatch: ["closed", "ended", "expired"],
            insufficientFunds: ["insufficient", "balance", "funds"],
            unauthorizedAccess: ["unauthorized", "access", "permission"]
        },
        retryConfiguration: {
            maxRetries: parseInt(process.env.TEST_MAX_RETRIES || "3"),
            retryDelay: parseInt(process.env.TEST_RETRY_DELAY || "1000"), // ms
            backoffMultiplier: parseFloat(process.env.TEST_BACKOFF_MULTIPLIER || "2.0")
        },
        timeouts: {
            transactionTimeout: parseInt(process.env.TEST_TX_TIMEOUT || "30000"), // ms
            testSuiteTimeout: parseInt(process.env.TEST_SUITE_TIMEOUT || "600000"), // ms
            setupTimeout: parseInt(process.env.TEST_SETUP_TIMEOUT || "120000") // ms
        }
    },

    // Test Environment Configuration
    environment: {
        network: process.env.TEST_NETWORK || "localnet",
        fundingAmount: parseFloat(process.env.TEST_FUNDING_AMOUNT || "10.0"), // SOL
        cleanupAfterTests: process.env.TEST_CLEANUP === "true",
        verbose: process.env.TEST_VERBOSE === "true",
        saveArtifacts: process.env.TEST_SAVE_ARTIFACTS === "true",
        artifactPath: process.env.TEST_ARTIFACT_PATH || "./test-artifacts"
    },

    // Coverage Requirements (GI #8: Test extensively)
    coverage: {
        statements: 100,
        branches: 100,
        functions: 100,
        lines: 100,
        excludePatterns: [
            "node_modules/**",
            "test/**",
            "coverage/**"
        ]
    },

    // Test Categories for Selective Running
    testCategories: {
        unit: {
            enabled: true,
            patterns: ["placement", "validation", "pools", "multiple_bets"]
        },
        integration: {
            enabled: true,
            patterns: ["workflow", "end_to_end"]
        },
        security: {
            enabled: true,
            patterns: ["attack_vectors", "edge_cases", "access_control"]
        },
        performance: {
            enabled: true,
            patterns: ["load_testing", "latency", "throughput"]
        }
    },

    // Logging Configuration (GI #20: Detailed logging)
    logging: {
        level: process.env.TEST_LOG_LEVEL || "info",
        outputFormat: process.env.TEST_LOG_FORMAT || "detailed",
        saveToFile: process.env.TEST_LOG_TO_FILE === "true",
        logPath: process.env.TEST_LOG_PATH || "./test-logs",
        categories: {
            transactions: true,
            performance: true,
            security: true,
            errors: true,
            warnings: true
        }
    },

    // Assertion Configuration
    assertions: {
        strict: true,
        timeoutMultiplier: parseFloat(process.env.TEST_TIMEOUT_MULTIPLIER || "1.0"),
        balanceThreshold: parseFloat(process.env.TEST_BALANCE_THRESHOLD || "0.001"), // SOL
        performanceThreshold: parseFloat(process.env.TEST_PERF_THRESHOLD || "0.1") // 10% variance
    },

    // Mock Data Configuration (GI #2: Real implementations over simulations)
    mockData: {
        useRealAccounts: true,
        useRealTransactions: true,
        useRealTimestamps: true,
        seedForReproducibility: process.env.TEST_SEED || "nen-betting-test-2025",
        generateFreshData: process.env.TEST_FRESH_DATA === "true"
    }
};

// Validation function for configuration
export function validateBettingTestConfig(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Validate bet amounts
    if (BETTING_TEST_CONFIG.betAmounts.minimum >= BETTING_TEST_CONFIG.betAmounts.maximum) {
        errors.push("Minimum bet amount must be less than maximum bet amount");
    }

    // Validate performance benchmarks
    if (BETTING_TEST_CONFIG.performance.maxLatencyMs <= 0) {
        errors.push("Maximum latency must be positive");
    }

    if (BETTING_TEST_CONFIG.performance.minThroughputTPS <= 0) {
        errors.push("Minimum throughput must be positive");
    }

    // Validate user counts
    if (BETTING_TEST_CONFIG.dataGeneration.userCount <= 0) {
        errors.push("User count must be positive");
    }

    // Validate coverage requirements
    const coverage = BETTING_TEST_CONFIG.coverage;
    if (coverage.statements < 0 || coverage.statements > 100) {
        errors.push("Statement coverage must be between 0 and 100");
    }

    return {
        valid: errors.length === 0,
        errors
    };
}

// Helper function to get test configuration summary
export function getBettingTestConfigSummary(): object {
    return {
        betAmountRange: `${BETTING_TEST_CONFIG.betAmounts.minimum} - ${BETTING_TEST_CONFIG.betAmounts.maximum} SOL`,
        performanceTargets: {
            maxLatency: `${BETTING_TEST_CONFIG.performance.maxLatencyMs}ms`,
            minThroughput: `${BETTING_TEST_CONFIG.performance.minThroughputTPS} TPS`,
            maxComputeUnits: BETTING_TEST_CONFIG.performance.maxComputeUnits
        },
        testCounts: {
            users: BETTING_TEST_CONFIG.dataGeneration.userCount,
            matches: BETTING_TEST_CONFIG.dataGeneration.matchCount,
            bets: BETTING_TEST_CONFIG.dataGeneration.betCount
        },
        securityFeatures: Object.keys(BETTING_TEST_CONFIG.security.attackVectors).filter(
            key => BETTING_TEST_CONFIG.security.attackVectors[key as keyof typeof BETTING_TEST_CONFIG.security.attackVectors].enabled
        ),
        coverage: `${BETTING_TEST_CONFIG.coverage.statements}% target`,
        environment: BETTING_TEST_CONFIG.environment.network
    };
}

// Export individual config sections for convenience
export const BET_AMOUNTS = BETTING_TEST_CONFIG.betAmounts;
export const PERFORMANCE_CONFIG = BETTING_TEST_CONFIG.performance;
export const SECURITY_CONFIG = BETTING_TEST_CONFIG.security;
export const DATA_GENERATION_CONFIG = BETTING_TEST_CONFIG.dataGeneration;
export const ERROR_HANDLING_CONFIG = BETTING_TEST_CONFIG.errorHandling;
