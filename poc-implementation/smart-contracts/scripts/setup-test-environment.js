#!/usr/bin/env node

/**
 * Test Environment Setup Script

 */

const fs = require('fs');
const path = require('path');
const { Keypair } = require('@solana/web3.js');

// Environment Configuration - Externalized per GI #18
const ENV_CONFIG = {
    keypairs: [
        'authority-keypair.json',
        'treasury-keypair.json',
        'user1-keypair.json',
        'user2-keypair.json',
        'bettor1-keypair.json',
        'bettor2-keypair.json'
    ],
    networks: {
        localnet: process.env.LOCALNET_RPC_URL || (() => {

        })(),
        devnet: 'https://api.devnet.solana.com',
        testnet: 'https://api.testnet.solana.com'
    },
    directories: [
        'tests/fixtures',
        'test-artifacts',
        'coverage'
    ]
};

class TestEnvironmentSetup {
    constructor() {
        this.fixturesDir = path.join(process.cwd(), 'tests', 'fixtures');
    }

    /**
     * Setup complete test environment
     * GI #1: User-centric perspective, GI #10: File management
     */
    async setupEnvironment() {
        console.log('🚀 Setting up Smart Contract Test Environment');
        console.log('=' * 50);

        try {
            // Create required directories
            await this.createDirectories();

            // Generate test keypairs
            await this.generateKeypairs();

            // Validate network connectivity
            await this.validateNetworks();

            // Create environment configuration
            await this.createEnvironmentConfig();

            console.log('\n✅ Test environment setup complete!');
            console.log('🎯 Ready for comprehensive testing');

        } catch (error) {
            console.error('❌ Environment setup failed:', error);
            process.exit(1);
        }
    }

    /**
     * Create required directories
     * GI #10: Manage files and repository cleanliness
     */
    async createDirectories() {
        console.log('\n📁 Creating directories...');

        for (const dir of ENV_CONFIG.directories) {
            const dirPath = path.join(process.cwd(), dir);

            if (!fs.existsSync(dirPath)) {
                fs.mkdirSync(dirPath, { recursive: true });
                console.log(`✅ Created: ${dir}`);
            } else {
                console.log(`✓ Exists: ${dir}`);
            }
        }
    }

    /**
     * Generate test keypairs for all user types
     * GI #13: Secure optimization, store secrets properly
     */
    async generateKeypairs() {
        console.log('\n🔐 Generating test keypairs...');

        for (const keypairName of ENV_CONFIG.keypairs) {
            const keypairPath = path.join(this.fixturesDir, keypairName);

            if (!fs.existsSync(keypairPath)) {
                // Generate new keypair
                const keypair = Keypair.generate();
                const secretKeyArray = Array.from(keypair.secretKey);

                // Save to file
                fs.writeFileSync(keypairPath, JSON.stringify(secretKeyArray));

                console.log(`✅ Generated: ${keypairName}`);
                console.log(`   Public Key: ${keypair.publicKey.toBase58()}`);

            } else {
                // Load existing keypair to show public key
                try {
                    const secretKeyData = JSON.parse(fs.readFileSync(keypairPath, 'utf8'));
                    const keypair = Keypair.fromSecretKey(new Uint8Array(secretKeyData));

                    console.log(`✓ Exists: ${keypairName}`);
                    console.log(`   Public Key: ${keypair.publicKey.toBase58()}`);
                } catch (error) {
                    console.warn(`⚠️ Invalid keypair file: ${keypairName}, regenerating...`);

                    // Regenerate invalid keypair
                    const keypair = Keypair.generate();
                    const secretKeyArray = Array.from(keypair.secretKey);
                    fs.writeFileSync(keypairPath, JSON.stringify(secretKeyArray));

                    console.log(`✅ Regenerated: ${keypairName}`);
                    console.log(`   Public Key: ${keypair.publicKey.toBase58()}`);
                }
            }
        }
    }

    /**
     * Validate network connectivity
     * GI #6: Handle integrations carefully
     */
    async validateNetworks() {
        console.log('\n🌐 Validating network connectivity...');

        for (const [networkName, endpoint] of Object.entries(ENV_CONFIG.networks)) {
            try {
                if (networkName === 'localnet') {
                    console.log(`⚠️ ${networkName}: Skipping validation (local network)`);
                    continue;
                }

                // Simple connectivity check
                const response = await fetch(endpoint, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        jsonrpc: '2.0',
                        id: 1,
                        method: 'getHealth',
                        params: []
                    })
                });

                if (response.ok) {
                    console.log(`✅ ${networkName}: Connected successfully`);
                } else {
                    console.warn(`⚠️ ${networkName}: Connection issues (status: ${response.status})`);
                }

            } catch (error) {
                console.warn(`⚠️ ${networkName}: ${error.message}`);
            }
        }
    }

    /**
     * Create environment configuration file
     * GI #18: No hardcoding, externalize configuration
     */
    async createEnvironmentConfig() {
        console.log('\n⚙️ Creating environment configuration...');

        const envConfig = {
            // Test Environment Variables
            TEST_NETWORK: process.env.TEST_NETWORK || 'localnet',
            LOCALNET_RPC_URL: ENV_CONFIG.networks.localnet,
            DEVNET_RPC_URL: ENV_CONFIG.networks.devnet,
            TESTNET_RPC_URL: ENV_CONFIG.networks.testnet,

            // Test Configuration
            MAX_LATENCY_MS: process.env.MAX_LATENCY_MS || '2000',
            MIN_THROUGHPUT_TPS: process.env.MIN_THROUGHPUT_TPS || '100',
            GAS_LIMIT: process.env.GAS_LIMIT || '400000',

            // Security Configuration
            MAX_BET_AMOUNT: process.env.MAX_BET_AMOUNT || '10',
            MIN_BET_AMOUNT: process.env.MIN_BET_AMOUNT || '0.01',
            PLATFORM_FEE_PERCENTAGE: process.env.PLATFORM_FEE_PERCENTAGE || '250',

            // Keypair Paths
            AUTHORITY_KEYPAIR_PATH: 'authority-keypair.json',
            TREASURY_KEYPAIR_PATH: 'treasury-keypair.json',
            USER1_KEYPAIR_PATH: 'user1-keypair.json',
            USER2_KEYPAIR_PATH: 'user2-keypair.json',
            BETTOR1_KEYPAIR_PATH: 'bettor1-keypair.json',
            BETTOR2_KEYPAIR_PATH: 'bettor2-keypair.json',

            // Program IDs (would be updated after deployment)
            NEN_CORE_PROGRAM_ID: process.env.NEN_CORE_PROGRAM_ID || 'Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS',
            NEN_MAGICBLOCK_PROGRAM_ID: process.env.NEN_MAGICBLOCK_PROGRAM_ID || '389fjKeMujUy73oPg75ByLpoPA5caj5YTn84XT6zNBpe'
        };

        // Save as .env.test file
        const envFile = path.join(process.cwd(), '.env.test');
        const envContent = Object.entries(envConfig)
            .map(([key, value]) => `${key}=${value}`)
            .join('\n');

        fs.writeFileSync(envFile, envContent);
        console.log('✅ Environment config saved: .env.test');

        // Save as JSON for programmatic access
        const jsonFile = path.join(this.fixturesDir, 'test-config.json');
        fs.writeFileSync(jsonFile, JSON.stringify(envConfig, null, 2));
        console.log('✅ JSON config saved: tests/fixtures/test-config.json');
    }

    /**
     * Validate existing environment
     * GI #15: Thoroughly verify functionality
     */
    async validateEnvironment() {
        console.log('\n🔍 Validating existing environment...');

        const issues = [];

        // Check directories exist
        for (const dir of ENV_CONFIG.directories) {
            const dirPath = path.join(process.cwd(), dir);
            if (!fs.existsSync(dirPath)) {
                issues.push(`Missing directory: ${dir}`);
            }
        }

        // Check keypairs exist and are valid
        for (const keypairName of ENV_CONFIG.keypairs) {
            const keypairPath = path.join(this.fixturesDir, keypairName);

            if (!fs.existsSync(keypairPath)) {
                issues.push(`Missing keypair: ${keypairName}`);
            } else {
                try {
                    const secretKeyData = JSON.parse(fs.readFileSync(keypairPath, 'utf8'));
                    Keypair.fromSecretKey(new Uint8Array(secretKeyData));
                } catch (error) {
                    issues.push(`Invalid keypair: ${keypairName}`);
                }
            }
        }

        // Check configuration files
        const configFiles = ['.env.test', 'tests/fixtures/test-config.json'];
        for (const configFile of configFiles) {
            const configPath = path.join(process.cwd(), configFile);
            if (!fs.existsSync(configPath)) {
                issues.push(`Missing config: ${configFile}`);
            }
        }

        if (issues.length > 0) {
            console.log('❌ Environment validation failed:');
            issues.forEach(issue => console.log(`   - ${issue}`));
            console.log("\n💡 Run 'npm run setup-test-env' to fix issues");
            return false;
        } else {
            console.log('✅ Environment validation passed');
            return true;
        }
    }

    /**
     * Clean test environment
     * GI #10: Repository cleanliness
     */
    async cleanEnvironment() {
        console.log('\n🧹 Cleaning test environment...');

        const filesToClean = [
            'test-artifacts',
            'coverage',
            '.env.test'
        ];

        for (const item of filesToClean) {
            const itemPath = path.join(process.cwd(), item);

            if (fs.existsSync(itemPath)) {
                if (fs.lstatSync(itemPath).isDirectory()) {
                    fs.rmSync(itemPath, { recursive: true, force: true });
                } else {
                    fs.unlinkSync(itemPath);
                }
                console.log(`✅ Removed: ${item}`);
            }
        }

        console.log('✅ Environment cleaned');
    }
}

// CLI interface
if (require.main === module) {
    const setup = new TestEnvironmentSetup();

    const command = process.argv[2] || 'setup';

    switch (command) {
        case 'setup':
            setup.setupEnvironment();
            break;
        case 'validate':
            setup.validateEnvironment();
            break;
        case 'clean':
            setup.cleanEnvironment();
            break;
        default:
            console.log('Usage: node setup-test-environment.js [setup|validate|clean]');
            process.exit(1);
    }
}

module.exports = TestEnvironmentSetup;
