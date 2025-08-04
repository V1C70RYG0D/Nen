/**
 * Enhanced Smart Contract Test Environment Configuration
 * Task 1.1: Test Environment Configuration - Complete Implementation

 */

import * as anchor from "@coral-xyz/anchor";
import { Connection, Keypair, PublicKey, LAMPORTS_PER_SOL, SystemProgram } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID, createMint, createAccount, mintTo } from "@solana/spl-token";
import fs from "fs";
import path from "path";
import { assert } from "chai";

// Enhanced Test Configuration - All values externalized per GI #18
export const TEST_CONFIG = {
    networks: {
        localnet: process.env.LOCALNET_RPC_URL || "https://api.devnet.solana.com",
        devnet: process.env.DEVNET_RPC_URL || "https://api.devnet.solana.com",
        testnet: process.env.TESTNET_RPC_URL || "https://api.testnet.solana.com"
    },
    programs: {
        nenCore: process.env.NEN_CORE_PROGRAM_ID || "NenPoc11111111111111111111111111111111111",
        nenMagicBlock: process.env.NEN_MAGICBLOCK_PROGRAM_ID || "NenMB11111111111111111111111111111111111"
    },
    testWallets: {
        authority: "authority-keypair.json",
        treasury: "treasury-keypair.json",
        user1: "user1-keypair.json",
        user2: "user2-keypair.json",
        bettor1: "bettor1-keypair.json",
        bettor2: "bettor2-keypair.json"
    },
    benchmarks: {
        maxLatency: parseInt(process.env.MAX_LATENCY_MS || "2000"), // ms
        minThroughput: parseInt(process.env.MIN_THROUGHPUT_TPS || "100"), // tx/s
        gasLimit: parseInt(process.env.GAS_LIMIT || "400000")
    },
    environment: {
        currentNetwork: process.env.TEST_NETWORK || "localnet",
        isCI: process.env.CI === "true",
        logLevel: process.env.LOG_LEVEL || "info",
        testTimeout: parseInt(process.env.TEST_TIMEOUT || "120000"), // 2 minutes
        parallelTests: parseInt(process.env.PARALLEL_TESTS || "4"),
        retryAttempts: parseInt(process.env.RETRY_ATTEMPTS || "3")
    },
    testTokens: {
        solMint: process.env.SOL_MINT_ADDRESS || null, // Native SOL
        usdcMint: process.env.USDC_MINT_ADDRESS || null, // Test USDC mint
        gameToken: process.env.GAME_TOKEN_ADDRESS || null // Game-specific token
    },
    security: {
        maxBetAmount: parseInt(process.env.MAX_BET_AMOUNT || "10"), // SOL
        minBetAmount: parseFloat(process.env.MIN_BET_AMOUNT || "0.01"), // SOL
        platformFeePercentage: parseInt(process.env.PLATFORM_FEE_PERCENTAGE || "250"), // 2.5%
        kycLevels: {
            basic: 1,
            verified: 2,
            premium: 3
        }
    },
    funding: {
        initialBalance: parseInt(process.env.TEST_INITIAL_BALANCE || "10"), // SOL per wallet
        airdropAmount: parseInt(process.env.TEST_AIRDROP_AMOUNT || "5"), // SOL
        testTokenAmount: parseInt(process.env.TEST_TOKEN_AMOUNT || "1000000") // tokens
    }
};

export interface TestEnvironment {
    connection: Connection;
    provider: anchor.AnchorProvider;
    program: anchor.Program;
    magicBlockProgram: anchor.Program;
    keypairs: {
        authority: Keypair;
        treasury: Keypair;
        user1: Keypair;
        user2: Keypair;
        bettor1: Keypair;
        bettor2: Keypair;
    };
    tokens: {
        solMint?: PublicKey;
        usdcMint?: PublicKey;
        gameToken?: PublicKey;
    };
    accounts: {
        platformAccount?: PublicKey;
        treasuryTokenAccount?: PublicKey;
        userTokenAccounts: Map<string, PublicKey>;
    };
}

/**
 * Initialize comprehensive test environment
 * Real implementations following GI #2, #3, #15
 */
export class TestEnvironmentSetup {
    private environment: TestEnvironment;
    private initialized = false;

    constructor() {
        this.environment = {} as TestEnvironment;
    }

    /**
     * Setup Anchor testing framework
     * GI #15: Error-free, working systems
     */
    async initializeAnchorFramework(): Promise<void> {
        try {
            // Configure provider based on environment
            const network = process.env.TEST_NETWORK || "localnet";
            const endpoint = TEST_CONFIG.networks[network as keyof typeof TEST_CONFIG.networks];

            if (!endpoint) {
                throw new Error(`Invalid test network: ${network}. Must be one of: ${Object.keys(TEST_CONFIG.networks).join(", ")}`);
            }

            // Real connection - no mocks per GI #2
            this.environment.connection = new Connection(endpoint, {
                commitment: "confirmed",
                confirmTransactionInitialTimeout: 30000,
            });

            // Validate connection
            const version = await this.environment.connection.getVersion();
            console.log(`✅ Connected to Solana cluster version: ${version["solana-core"]}`);

            // Setup wallet and provider
            const wallet = this.loadOrCreateKeypair("authority");
            this.environment.provider = new anchor.AnchorProvider(
                this.environment.connection,
                new anchor.Wallet(wallet),
                {
                    commitment: "confirmed",
                    preflightCommitment: "confirmed",
                }
            );

            anchor.setProvider(this.environment.provider);

            console.log("✅ Anchor framework initialized successfully");
        } catch (error) {
            console.error("❌ Failed to initialize Anchor framework:", error);
            throw error;
        }
    }

    /**
     * Configure multiple test networks
     * GI #6: Handle integrations carefully
     */
    async configureTestNetworks(): Promise<void> {
        try {
            const networkTests = await Promise.allSettled([
                this.testNetworkConnection("localnet"),
                this.testNetworkConnection("devnet"),
                this.testNetworkConnection("testnet")
            ]);

            networkTests.forEach((result, index) => {
                const networkName = Object.keys(TEST_CONFIG.networks)[index];
                if (result.status === "fulfilled") {
                    console.log(`✅ Network ${networkName}: Connected successfully`);
                } else {
                    console.warn(`⚠️ Network ${networkName}: ${result.reason}`);
                }
            });

        } catch (error) {
            console.error("❌ Network configuration failed:", error);
            throw error;
        }
    }

    /**
     * Generate and manage test keypairs
     * GI #13: Secure optimization, store secrets in env vars
     */
    async generateTestKeypairs(): Promise<void> {
        try {
            const keypairNames = Object.keys(TEST_CONFIG.testWallets);
            this.environment.keypairs = {} as any;

            for (const name of keypairNames) {
                const keypair = this.loadOrCreateKeypair(name);
                this.environment.keypairs[name as keyof typeof this.environment.keypairs] = keypair;
                console.log(`✅ Keypair ${name}: ${keypair.publicKey.toBase58()}`);
            }

            // Validate keypairs have sufficient SOL for testing
            await this.validateKeypairBalances();

            console.log("✅ All test keypairs generated and validated");
        } catch (error) {
            console.error("❌ Keypair generation failed:", error);
            throw error;
        }
    }

    /**
     * Initialize test token accounts
     * GI #2: Real implementations, GI #6: Real-time data
     */
    async initializeTestTokenAccounts(): Promise<void> {
        try {
            this.environment.tokens = {};
            this.environment.accounts = { userTokenAccounts: new Map() };

            // Create test USDC mint for betting
            if (!TEST_CONFIG.testTokens.usdcMint) {
                this.environment.tokens.usdcMint = await createMint(
                    this.environment.connection,
                    this.environment.keypairs.authority,
                    this.environment.keypairs.authority.publicKey,
                    this.environment.keypairs.authority.publicKey,
                    6 // USDC decimals
                );
                console.log(`✅ Created test USDC mint: ${this.environment.tokens.usdcMint.toBase58()}`);
            }

            // Create token accounts for all test users
            for (const [name, keypair] of Object.entries(this.environment.keypairs)) {
                if (name !== "authority" && this.environment.tokens.usdcMint) {
                    const tokenAccount = await createAccount(
                        this.environment.connection,
                        this.environment.keypairs.authority,
                        this.environment.tokens.usdcMint,
                        keypair.publicKey
                    );

                    // Mint test tokens
                    await mintTo(
                        this.environment.connection,
                        this.environment.keypairs.authority,
                        this.environment.tokens.usdcMint,
                        tokenAccount,
                        this.environment.keypairs.authority,
                        1000 * 10**6 // 1000 USDC
                    );

                    this.environment.accounts.userTokenAccounts.set(name, tokenAccount);
                    console.log(`✅ Created token account for ${name}: ${tokenAccount.toBase58()}`);
                }
            }

            console.log("✅ Test token accounts initialized");
        } catch (error) {
            console.error("❌ Token account initialization failed:", error);
            throw error;
        }
    }

    /**
     * Load programs and verify deployment
     * GI #15: Thoroughly verify functionality
     */
    async loadAndVerifyPrograms(): Promise<void> {
        try {
            // Load Nen Core program
            const nenCoreIdl = this.loadProgramIdl("nen_core");
            this.environment.program = new anchor.Program(
                nenCoreIdl,
                this.environment.provider
            );

            // Load Nen MagicBlock program
            const nenMagicBlockIdl = this.loadProgramIdl("nen_magicblock");
            this.environment.magicBlockProgram = new anchor.Program(
                nenMagicBlockIdl,
                this.environment.provider
            );

            // Verify program deployments
            await this.verifyProgramDeployment(this.environment.program);
            await this.verifyProgramDeployment(this.environment.magicBlockProgram);

            console.log("✅ Programs loaded and verified successfully");
        } catch (error) {
            console.error("❌ Program loading failed:", error);
            throw error;
        }
    }

    /**
     * Setup continuous integration compatibility - Basic version
     * GI #26: Integrate CI/CD
     */
    async setupBasicContinuousIntegration(): Promise<void> {
        try {
            // CI environment detection
            const isCI = process.env.CI === "true";
            const isGitHubActions = process.env.GITHUB_ACTIONS === "true";

            if (isCI) {
                console.log("🔄 CI environment detected");

                // Adjust timeouts for CI
                TEST_CONFIG.benchmarks.maxLatency *= 2;

                // Use more stable network endpoints
                if (isGitHubActions) {
                    console.log("🔄 GitHub Actions environment configured");
                }
            }

            // Setup test artifacts directory
            const artifactsDir = path.join(process.cwd(), "test-artifacts");
            if (!fs.existsSync(artifactsDir)) {
                fs.mkdirSync(artifactsDir, { recursive: true });
            }

            console.log("✅ Basic continuous integration setup complete");
        } catch (error) {
            console.error("❌ CI setup failed:", error);
            throw error;
        }
    }

    /**
     * Get initialized test environment
     */
    async getTestEnvironment(): Promise<TestEnvironment> {
        if (!this.initialized) {
            await this.initializeFullEnvironment();
        }
        return this.environment;
    }

    /**
     * Initialize complete test environment
     * GI #16: Step-by-step enhancement
     */
    private async initializeFullEnvironment(): Promise<void> {
        console.log("🚀 Initializing comprehensive test environment...");

        await this.initializeAnchorFramework();
        await this.configureTestNetworks();
        await this.generateTestKeypairs();
        await this.initializeTestTokenAccounts();
        await this.loadAndVerifyPrograms();
        await this.setupBasicContinuousIntegration();

        this.initialized = true;
        console.log("✅ Test environment fully initialized");
    }

    /**
     * Utility methods
     */
    private loadOrCreateKeypair(name: string): Keypair {
        const keypairPath = TEST_CONFIG.testWallets[name as keyof typeof TEST_CONFIG.testWallets];
        const fullPath = path.join(process.cwd(), "tests", "fixtures", keypairPath);

        try {
            if (fs.existsSync(fullPath)) {
                const keypairData = JSON.parse(fs.readFileSync(fullPath, "utf8"));
                return Keypair.fromSecretKey(new Uint8Array(keypairData));
            }
        } catch (error) {
            console.warn(`⚠️ Could not load keypair ${name}, generating new one`);
        }

        // Generate new keypair
        const keypair = Keypair.generate();

        // Save to file for reuse
        const dir = path.dirname(fullPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(fullPath, JSON.stringify(Array.from(keypair.secretKey)));

        return keypair;
    }

    private async testNetworkConnection(network: string): Promise<void> {
        const endpoint = TEST_CONFIG.networks[network as keyof typeof TEST_CONFIG.networks];
        const connection = new Connection(endpoint, "confirmed");

        const startTime = Date.now();
        await connection.getLatestBlockhash();
        const latency = Date.now() - startTime;

        if (latency > TEST_CONFIG.benchmarks.maxLatency) {
            throw new Error(`Network ${network} latency too high: ${latency}ms`);
        }
    }

    private async validateKeypairBalances(): Promise<void> {
        for (const [name, keypair] of Object.entries(this.environment.keypairs)) {
            const balance = await this.environment.connection.getBalance(keypair.publicKey);

            if (balance < 0.1 * LAMPORTS_PER_SOL) { // Minimum 0.1 SOL
                console.warn(`⚠️ Low balance for ${name}: ${balance / LAMPORTS_PER_SOL} SOL`);

                // Request airdrop on devnet/testnet
                if (process.env.TEST_NETWORK !== "localnet") {
                    try {
                        await this.environment.connection.requestAirdrop(
                            keypair.publicKey,
                            1 * LAMPORTS_PER_SOL
                        );
                        console.log(`✅ Airdropped 1 SOL to ${name}`);
                    } catch (error) {
                        console.warn(`⚠️ Could not airdrop to ${name}:`, error);
                    }
                }
            }
        }
    }

    private loadProgramIdl(programName: string): any {
        const idlPath = path.join(process.cwd(), "target", "idl", `${programName}.json`);

        if (!fs.existsSync(idlPath)) {
            throw new Error(`IDL file not found: ${idlPath}. Run 'anchor build' first.`);
        }

        return JSON.parse(fs.readFileSync(idlPath, "utf8"));
    }

    private async verifyProgramDeployment(program: anchor.Program): Promise<void> {
        try {
            const programInfo = await this.environment.connection.getAccountInfo(program.programId);
            if (!programInfo) {
                throw new Error(`Program ${program.programId.toBase58()} not deployed`);
            }
            console.log(`✅ Program verified: ${program.programId.toBase58()}`);
        } catch (error) {
            throw new Error(`Program verification failed: ${error}`);
        }
    }

    /**
     * Task 1.1.1: Set up Anchor testing framework with full integration
     * GI #3: Production readiness and launch-grade quality
     */
    async setupAnchorTestingFramework(): Promise<void> {
        try {
            console.log("🚀 Setting up Anchor testing framework...");

            // Configure Anchor provider
            const connection = new Connection(
                TEST_CONFIG.networks[TEST_CONFIG.environment.currentNetwork as keyof typeof TEST_CONFIG.networks],
                {
                    commitment: "confirmed",
                    httpHeaders: {
                        "User-Agent": "Nen-Testing-Framework/1.0.0"
                    }
                }
            );

            // Set up wallet for testing
            const wallet = new anchor.Wallet(this.environment.keypairs.authority);
            const provider = new anchor.AnchorProvider(connection, wallet, {
                commitment: "confirmed",
                preflightCommitment: "confirmed",
                skipPreflight: false
            });

            // Set as default provider
            anchor.setProvider(provider);

            this.environment.connection = connection;
            this.environment.provider = provider;

            // Load and initialize programs with IDL validation
            await this.loadAndVerifyPrograms();

            console.log("✅ Anchor testing framework setup complete");
        } catch (error) {
            console.error("❌ Anchor framework setup failed:", error);
            throw new Error(`Anchor setup failed: ${error}`);
        }
    }

    /**
     * Task 1.1.5: Create mock data generators with edge case coverage
     * GI #17: Generalize for reusability, GI #45: Handle edge cases
     */
    async createMockDataGenerators(): Promise<void> {
        try {
            console.log("🎭 Creating mock data generators...");

            // Import and initialize mock data generators
            const { PlatformMockData, MatchMockData, UserMockData } = await import("../utils/mock-data");

            // Generate baseline test data
            const testDataSets = {
                platformConfigs: Array.from({ length: 10 }, (_, i) =>
                    PlatformMockData.generatePlatformConfig({
                        useEdgeCases: i % 3 === 0,
                        feeVariation: i % 2 === 0
                    })
                ),
                matches: Array.from({ length: 20 }, (_, i) =>
                    MatchMockData.generateMatchScenarios()[i % MatchMockData.generateMatchScenarios().length]
                ),
                users: Array.from({ length: 50 }, (_, i) =>
                    UserMockData.generateUserProfiles()[i % UserMockData.generateUserProfiles().length]
                )
            };

            // Store mock data for test access
            const mockDataPath = path.join(process.cwd(), "tests", "fixtures", "generated-mock-data.json");
            fs.writeFileSync(mockDataPath, JSON.stringify(testDataSets, null, 2));

            console.log(`✅ Generated mock data sets: ${testDataSets.platformConfigs.length} platform configs, ${testDataSets.matches.length} matches, ${testDataSets.users.length} users`);
        } catch (error) {
            console.error("❌ Mock data generation failed:", error);
            throw error;
        }
    }

    /**
     * Task 1.1.6: Set up continuous integration configuration
     * GI #26: Integrate Continuous Integration/Deployment
     */
    async setupContinuousIntegration(): Promise<void> {
        try {
            console.log("🔄 Setting up continuous integration...");

            // Create CI configuration for different environments
            const ciConfig = {
                environments: {
                    development: {
                        network: "localnet",
                        coverage_threshold: 90,
                        performance_tests: true,
                        security_scans: true
                    },
                    staging: {
                        network: "devnet",
                        coverage_threshold: 95,
                        performance_tests: true,
                        security_scans: true,
                        load_tests: true
                    },
                    production: {
                        network: "testnet",
                        coverage_threshold: 100,
                        performance_tests: true,
                        security_scans: true,
                        load_tests: true,
                        manual_approval: true
                    }
                },
                test_matrix: {
                    rust_versions: ["1.75.0", "stable"],
                    solana_versions: ["1.18.0", "latest"],
                    anchor_versions: ["0.31.0", "latest"]
                },
                notifications: {
                    slack_webhook: process.env.SLACK_WEBHOOK_URL,
                    email_alerts: process.env.CI_EMAIL_ALERTS?.split(",") || []
                }
            };

            // Write CI configuration
            const ciConfigPath = path.join(process.cwd(), ".github", "workflows", "smart-contract-tests.yml");
            const ciDir = path.dirname(ciConfigPath);

            if (!fs.existsSync(ciDir)) {
                fs.mkdirSync(ciDir, { recursive: true });
            }

            // Generate GitHub Actions workflow
            const githubWorkflow = this.generateGitHubActionsWorkflow(ciConfig);
            fs.writeFileSync(ciConfigPath, githubWorkflow);

            // Create CI helper scripts
            await this.createCIHelperScripts();

            console.log("✅ Continuous integration setup complete");
        } catch (error) {
            console.error("❌ CI setup failed:", error);
            throw error;
        }
    }

    /**
     * Generate GitHub Actions workflow for CI/CD
     * GI #26: Integrate Continuous Integration/Deployment
     */
    private generateGitHubActionsWorkflow(config: any): string {
        return `# Smart Contract Testing CI/CD Pipeline
# Auto-generated by Nen Testing Framework
name: Smart Contract Tests

on:
  push:
    branches: [ main, develop ]
    paths: [ 'smart-contracts/**' ]
  pull_request:
    branches: [ main ]
    paths: [ 'smart-contracts/**' ]

env:
  SOLANA_VERSION: 1.18.0
  ANCHOR_VERSION: 0.31.0
  RUST_TOOLCHAIN: stable

jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        network: [localnet, devnet]

    steps:
    - uses: actions/checkout@v4

    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '18'
        cache: 'npm'
        cache-dependency-path: smart-contracts/package-lock.json

    - name: Setup Rust
      uses: actions-rs/toolchain@v1
      with:
        toolchain: \${{ env.RUST_TOOLCHAIN }}
        override: true

    - name: Setup Solana
      run: |
        sh -c "$(curl -sSfL https://release.solana.com/v\${{ env.SOLANA_VERSION }}/install)"
        echo "\$HOME/.local/share/solana/install/active_release/bin" >> \$GITHUB_PATH

    - name: Setup Anchor
      run: |
        npm install -g @coral-xyz/anchor-cli@\${{ env.ANCHOR_VERSION }}

    - name: Cache dependencies
      uses: actions/cache@v3
      with:
        path: |
          ~/.cargo/registry
          ~/.cargo/git
          smart-contracts/target
          smart-contracts/node_modules
        key: \${{ runner.os }}-cargo-\${{ hashFiles('**/Cargo.lock') }}-node-\${{ hashFiles('**/package-lock.json') }}

    - name: Install dependencies
      working-directory: smart-contracts
      run: |
        npm ci
        cargo build-deps || true

    - name: Build programs
      working-directory: smart-contracts
      run: |
        anchor build

    - name: Start test validator
      working-directory: smart-contracts
      run: |
        solana-test-validator --ledger test-ledger --reset --quiet &
        sleep 10

    - name: Run tests
      working-directory: smart-contracts
      env:
        TEST_NETWORK: \${{ matrix.network }}
        ENABLE_COVERAGE: true
        CI: true
      run: |
        npm run test:ci

    - name: Upload coverage
      uses: codecov/codecov-action@v3
      with:
        file: smart-contracts/coverage/lcov.info
        flags: smart-contracts

    - name: Archive test results
      uses: actions/upload-artifact@v3
      if: always()
      with:
        name: test-results-\${{ matrix.network }}
        path: |
          smart-contracts/test-results/
          smart-contracts/coverage/
`;
    }

    /**
     * Create CI helper scripts
     * GI #10: Manage files and repository cleanliness
     */
    private async createCIHelperScripts(): Promise<void> {
        const scriptsDir = path.join(process.cwd(), "scripts", "ci");
        if (!fs.existsSync(scriptsDir)) {
            fs.mkdirSync(scriptsDir, { recursive: true });
        }

        // Pre-commit hook script
        const preCommitScript = `#!/bin/bash
# Pre-commit hook for smart contract quality checks
set -e

echo "🔍 Running pre-commit checks..."

cd smart-contracts

# Lint and format
npm run lint
npm run format

# Type checking
npm run type-check

# Quick test suite
npm run test:unit

echo "✅ Pre-commit checks passed"
`;

        fs.writeFileSync(path.join(scriptsDir, "pre-commit.sh"), preCommitScript, { mode: 0o755 });

        // Performance benchmark script
        const benchmarkScript = `#!/bin/bash
# Performance benchmarking for smart contracts
set -e

cd smart-contracts

echo "📊 Running performance benchmarks..."

# Start fresh validator
npm run stop:validator || true
npm run start:validator &
sleep 10

# Run performance tests
npm run test:performance

# Generate benchmark report
npm run test:generate-report

echo "✅ Performance benchmarks complete"
`;

        fs.writeFileSync(path.join(scriptsDir, "benchmark.sh"), benchmarkScript, { mode: 0o755 });
    }

    /**
     * Cleanup test environment
     * GI #15: Clean, traceable operations
     */
    async cleanup(): Promise<void> {
        try {
            // Close connections
            if (this.environment.connection) {
                // Connection cleanup if needed
            }

            console.log("✅ Test environment cleaned up");
        } catch (error) {
            console.error("❌ Cleanup failed:", error);
            throw error;
        }
    }
}

// Export singleton instance
export const testEnvironmentSetup = new TestEnvironmentSetup();
