/**
 * Core Initialization Test Configuration
 * Following GI.md Guidelines: Externalized configuration, No hardcoding
 */

import { Connection, Keypair, PublicKey } from '@solana/web3.js';

// Core Initialization Test Configuration - All externalized per GI #18
export const CORE_INIT_TEST_CONFIG = {
    // Network Configuration
    networks: {
        localnet: process.env.LOCALNET_RPC_URL || (() => {

        })(),
        devnet: process.env.DEVNET_RPC_URL || 'https://api.devnet.solana.com',
        testnet: process.env.TESTNET_RPC_URL || 'https://api.testnet.solana.com'
    },

    // Test Environment Settings
    environment: {
        currentNetwork: process.env.TEST_NETWORK || 'localnet',
        isCI: process.env.CI === 'true',
        logLevel: process.env.LOG_LEVEL || 'info',
        testTimeout: parseInt(process.env.TEST_TIMEOUT || '30000'), // 30 seconds per test
        retryAttempts: parseInt(process.env.RETRY_ATTEMPTS || '3')
    },

    // Platform Initialization Parameters
    platformConfig: {
        defaultFeePercentage: parseInt(process.env.DEFAULT_FEE_PERCENTAGE || '250'), // 2.5%
        minFeePercentage: parseInt(process.env.MIN_FEE_PERCENTAGE || '0'), // 0%
        maxFeePercentage: parseInt(process.env.MAX_FEE_PERCENTAGE || '10000'), // 100%
        validFeeRanges: [0, 100, 250, 500, 1000], // Test cases
        invalidFeeValues: [-1, 10001, 999999] // Should fail
    },

    // Performance Benchmarks
    performance: {
        maxInitLatency: parseInt(process.env.MAX_INIT_LATENCY_MS || '5000'), // 5s
        maxComputeUnits: parseInt(process.env.MAX_COMPUTE_UNITS || '200000'), // 200k CU
        concurrentOperations: parseInt(process.env.CONCURRENT_OPS || '10'),
        stressTestCount: parseInt(process.env.STRESS_TEST_COUNT || '10')
    },

    // Security Test Settings
    security: {
        enableUnauthorizedAccessTests: process.env.ENABLE_UNAUTHORIZED_TESTS !== 'false',
        enableInputValidationTests: process.env.ENABLE_INPUT_VALIDATION !== 'false',
        enableDoubleInitTests: process.env.ENABLE_DOUBLE_INIT_TESTS !== 'false',
        testRetryCount: parseInt(process.env.SECURITY_TEST_RETRIES || '3')
    },

    // Coverage Requirements
    coverage: {
        enabled: process.env.COVERAGE_ENABLED === 'true',
        threshold: {
            statements: parseInt(process.env.COVERAGE_STATEMENTS || '95'),
            branches: parseInt(process.env.COVERAGE_BRANCHES || '90'),
            functions: parseInt(process.env.COVERAGE_FUNCTIONS || '95'),
            lines: parseInt(process.env.COVERAGE_LINES || '95')
        }
    },

    // Test Data Configuration
    testData: {
        generateMockData: process.env.GENERATE_MOCK_DATA !== 'false',
        mockDataSeed: process.env.MOCK_DATA_SEED || 'core-init-test-2024',
        edgeCaseTesting: process.env.EDGE_CASE_TESTING !== 'false'
    },

    // Error Handling
    errorHandling: {
        expectSpecificErrors: true,
        logErrorDetails: process.env.LOG_ERROR_DETAILS !== 'false',
        failFast: process.env.FAIL_FAST === 'true'
    }
};

/**
 * Test Scenarios Configuration
 * GI #45: Handle edge cases and robust testing
 */
export const CORE_INIT_TEST_SCENARIOS = {
    successPath: {
        name: 'Platform Initialization Success Path',
        tests: [
            {
                description: 'Initialize platform with correct parameters',
                feePercentage: CORE_INIT_TEST_CONFIG.platformConfig.defaultFeePercentage,
                expectSuccess: true
            },
            {
                description: 'Initialize platform with zero fee',
                feePercentage: 0,
                expectSuccess: true
            },
            {
                description: 'Initialize platform with maximum valid fee',
                feePercentage: 1000, // 10%
                expectSuccess: true
            }
        ]
    },

    parameterValidation: {
        name: 'Parameter Validation Tests',
        tests: [
            {
                description: 'Reject excessive fee percentage',
                feePercentage: 10001,
                expectSuccess: false,
                expectedError: 'InvalidFeePercentage'
            },
            {
                description: 'Reject negative fee percentage',
                feePercentage: -1,
                expectSuccess: false,
                expectedError: 'Invalid'
            },
            {
                description: 'Reject zero treasury address',
                usesZeroTreasury: true,
                expectSuccess: false,
                expectedError: 'Invalid'
            }
        ]
    },

    authorityVerification: {
        name: 'Authority Verification Tests',
        tests: [
            {
                description: 'Reject unauthorized signer',
                useUnauthorizedSigner: true,
                expectSuccess: false
            },
            {
                description: 'Verify admin authority matches signer',
                useMismatchedAuthority: true,
                expectSuccess: false
            }
        ]
    },

    edgeCases: {
        name: 'Edge Cases and Boundary Testing',
        tests: [
            {
                description: 'Handle double initialization prevention',
                testDoubleInit: true,
                expectSuccess: false,
                expectedError: 'already in use'
            },
            {
                description: 'Handle concurrent initialization attempts',
                testConcurrent: true,
                concurrentCount: CORE_INIT_TEST_CONFIG.performance.concurrentOperations,
                expectSuccess: true
            },
            {
                description: 'Handle stress testing',
                testStress: true,
                stressCount: CORE_INIT_TEST_CONFIG.performance.stressTestCount,
                expectSuccess: true
            }
        ]
    },

    performance: {
        name: 'Performance Benchmarks',
        tests: [
            {
                description: 'Meet latency requirements',
                measureLatency: true,
                maxLatency: CORE_INIT_TEST_CONFIG.performance.maxInitLatency
            },
            {
                description: 'Optimize compute usage',
                measureComputeUnits: true,
                maxComputeUnits: CORE_INIT_TEST_CONFIG.performance.maxComputeUnits
            }
        ]
    }
};

/**
 * PDA Configuration for Core Initialization
 * GI #15: Error-free, working systems
 */
export const PDA_CONFIG = {
    platform: {
        seeds: ['platform'],
        programId: process.env.NEN_CORE_PROGRAM_ID || 'NenPoc11111111111111111111111111111111111'
    }
};

/**
 * Expected Account States for Validation
 * GI #8: Test extensively at every stage
 */
export const EXPECTED_ACCOUNT_STATES = {
    platform: {
        initialState: {
            isPaused: false,
            totalMatches: 0,
            totalBets: 0,
            totalVolume: 0
        }
    }
};

export default CORE_INIT_TEST_CONFIG;
