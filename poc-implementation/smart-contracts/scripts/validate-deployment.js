#!/usr/bin/env node

/**
 * Deployment Validation Script

 */

const { Connection, PublicKey } = require('@solana/web3.js');
const fs = require('fs');
const path = require('path');

// Validation Configuration - GI-3 & GI-18 Compliant: All values externalized
const VALIDATION_CONFIG = {
    networks: {
        localnet: process.env.LOCALNET_RPC_URL || process.env.DEFAULT_LOCALNET_RPC_URL || 'http://localhost:8899',
        devnet: process.env.DEVNET_RPC_URL || process.env.DEFAULT_DEVNET_RPC_URL || 'https://api.devnet.solana.com',
        testnet: process.env.TESTNET_RPC_URL || process.env.DEFAULT_TESTNET_RPC_URL || 'https://api.testnet.solana.com'
    },
    programs: {
        nenCore: process.env.NEN_CORE_PROGRAM_ID || 'Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS',
        nenMagicBlock: process.env.NEN_MAGICBLOCK_PROGRAM_ID || '389fjKeMujUy73oPg75ByLpoPA5caj5YTn84XT6zNBpe'
    },
    validationTests: [
        'program_deployment',
        'account_creation',
        'instruction_execution',
        'state_validation',
        'security_checks'
    ]
};

class DeploymentValidator {
    constructor() {
        this.network = process.env.TEST_NETWORK || 'localnet';
        this.connection = new Connection(VALIDATION_CONFIG.networks[this.network], 'confirmed');
        this.results = {
            network: this.network,
            timestamp: new Date().toISOString(),
            tests: [],
            overall: 'unknown'
        };
    }

    /**
     * Run comprehensive deployment validation
     * GI #15: Thoroughly verify functionality
     */
    async validateDeployment() {
        console.log('🔍 Smart Contract Deployment Validation');
        console.log('=' * 50);
        console.log(`🌐 Network: ${this.network}`);
        console.log(`🔗 Endpoint: ${VALIDATION_CONFIG.networks[this.network]}`);
        console.log('=' * 50);

        try {
            // Test network connectivity
            await this.testNetworkConnectivity();

            // Validate program deployments
            await this.validateProgramDeployments();

            // Test IDL availability
            await this.validateIDLFiles();

            // Validate account creation capability
            await this.validateAccountCreation();

            // Security validation
            await this.validateSecurity();

            // Generate final report
            await this.generateValidationReport();

        } catch (error) {
            console.error('❌ Validation failed:', error);
            this.results.overall = 'failed';
            await this.generateValidationReport();
            process.exit(1);
        }
    }

    /**
     * Test network connectivity and health
     * GI #6: Handle integrations carefully
     */
    async testNetworkConnectivity() {
        console.log('\n🌐 Testing Network Connectivity...');

        const test = {
            name: 'network_connectivity',
            status: 'unknown',
            details: {},
            timestamp: new Date().toISOString()
        };

        try {
            // Test basic connectivity
            const startTime = Date.now();
            const version = await this.connection.getVersion();
            const latency = Date.now() - startTime;

            // Test slot information
            const slot = await this.connection.getSlot();

            // Test block height
            const blockHeight = await this.connection.getBlockHeight();

            test.status = 'passed';
            test.details = {
                version: version['solana-core'],
                latency: `${latency}ms`,
                currentSlot: slot,
                blockHeight: blockHeight
            };

            console.log('✅ Network connectivity: OK');
            console.log(`   Version: ${version['solana-core']}`);
            console.log(`   Latency: ${latency}ms`);
            console.log(`   Current Slot: ${slot}`);
            console.log(`   Block Height: ${blockHeight}`);

        } catch (error) {
            test.status = 'failed';
            test.details = { error: error.message };

            console.log('❌ Network connectivity: FAILED');
            console.log(`   Error: ${error.message}`);
            throw error;
        }

        this.results.tests.push(test);
    }

    /**
     * Validate program deployments
     * GI #2: Real implementations over simulations
     */
    async validateProgramDeployments() {
        console.log('\n📦 Validating Program Deployments...');

        for (const [programName, programId] of Object.entries(VALIDATION_CONFIG.programs)) {
            const test = {
                name: `program_deployment_${programName}`,
                status: 'unknown',
                details: {},
                timestamp: new Date().toISOString()
            };

            try {
                const publicKey = new PublicKey(programId);
                const accountInfo = await this.connection.getAccountInfo(publicKey);

                if (accountInfo === null) {
                    throw new Error(`Program ${programName} not found at ${programId}`);
                }

                // Validate it's actually a program account
                if (!accountInfo.executable) {
                    throw new Error(`Account ${programId} is not executable`);
                }

                test.status = 'passed';
                test.details = {
                    programId: programId,
                    owner: accountInfo.owner.toBase58(),
                    dataLength: accountInfo.data.length,
                    lamports: accountInfo.lamports,
                    executable: accountInfo.executable
                };

                console.log(`✅ Program ${programName}: Deployed successfully`);
                console.log(`   Program ID: ${programId}`);
                console.log(`   Owner: ${accountInfo.owner.toBase58()}`);
                console.log(`   Data Length: ${accountInfo.data.length} bytes`);

            } catch (error) {
                test.status = 'failed';
                test.details = {
                    programId: programId,
                    error: error.message
                };

                console.log(`❌ Program ${programName}: Deployment validation failed`);
                console.log(`   Error: ${error.message}`);
            }

            this.results.tests.push(test);
        }
    }

    /**
     * Validate IDL files exist and are valid
     * GI #11: Update and refer to documentation
     */
    async validateIDLFiles() {
        console.log('\n📄 Validating IDL Files...');

        const test = {
            name: 'idl_validation',
            status: 'unknown',
            details: {},
            timestamp: new Date().toISOString()
        };

        try {
            const idlDir = path.join(process.cwd(), 'target', 'idl');

            if (!fs.existsSync(idlDir)) {
                throw new Error('IDL directory not found. Run "anchor build" first.');
            }

            const idlFiles = fs.readdirSync(idlDir).filter(f => f.endsWith('.json'));

            if (idlFiles.length === 0) {
                throw new Error('No IDL files found in target/idl directory.');
            }

            const validatedIDLs = [];

            for (const idlFile of idlFiles) {
                const idlPath = path.join(idlDir, idlFile);

                try {
                    const idlContent = JSON.parse(fs.readFileSync(idlPath, 'utf8'));

                    // Basic IDL validation
                    if (!idlContent.name || !idlContent.version || !idlContent.instructions) {
                        throw new Error(`Invalid IDL structure in ${idlFile}`);
                    }

                    validatedIDLs.push({
                        file: idlFile,
                        name: idlContent.name,
                        version: idlContent.version,
                        instructions: idlContent.instructions.length,
                        accounts: idlContent.accounts?.length || 0
                    });

                } catch (error) {
                    throw new Error(`IDL validation failed for ${idlFile}: ${error.message}`);
                }
            }

            test.status = 'passed';
            test.details = {
                idlDirectory: idlDir,
                validatedFiles: validatedIDLs
            };

            console.log(`✅ IDL validation: ${idlFiles.length} files validated`);
            validatedIDLs.forEach(idl => {
                console.log(`   ${idl.file}: ${idl.instructions} instructions, ${idl.accounts} accounts`);
            });

        } catch (error) {
            test.status = 'failed';
            test.details = { error: error.message };

            console.log('❌ IDL validation: FAILED');
            console.log(`   Error: ${error.message}`);
        }

        this.results.tests.push(test);
    }

    /**
     * Validate account creation capabilities
     * GI #3: Production readiness
     */
    async validateAccountCreation() {
        console.log('\n🏗️ Validating Account Creation...');

        const test = {
            name: 'account_creation',
            status: 'unknown',
            details: {},
            timestamp: new Date().toISOString()
        };

        try {
            // Check if we can get rent for different account sizes
            const rentSizes = [0, 165, 1000, 10000]; // Different account sizes
            const rentCalculations = [];

            for (const size of rentSizes) {
                const rentExemption = await this.connection.getMinimumBalanceForRentExemption(size);
                rentCalculations.push({
                    size: size,
                    rentExemption: rentExemption,
                    rentExemptionSOL: rentExemption / 1e9
                });
            }

            // Test recent blockhash retrieval (needed for transactions)
            const { blockhash, lastValidBlockHeight } = await this.connection.getLatestBlockhash();

            test.status = 'passed';
            test.details = {
                rentCalculations: rentCalculations,
                latestBlockhash: blockhash,
                lastValidBlockHeight: lastValidBlockHeight
            };

            console.log('✅ Account creation validation: OK');
            console.log(`   Latest blockhash: ${blockhash.substring(0, 16)}...`);
            console.log(`   Last valid block height: ${lastValidBlockHeight}`);
            rentCalculations.forEach(calc => {
                console.log(`   Rent for ${calc.size} bytes: ${calc.rentExemptionSOL.toFixed(9)} SOL`);
            });

        } catch (error) {
            test.status = 'failed';
            test.details = { error: error.message };

            console.log('❌ Account creation validation: FAILED');
            console.log(`   Error: ${error.message}`);
        }

        this.results.tests.push(test);
    }

    /**
     * Validate security configurations
     * GI #13: Security measures
     */
    async validateSecurity() {
        console.log('\n🔒 Validating Security Configuration...');

        const test = {
            name: 'security_validation',
            status: 'unknown',
            details: {},
            timestamp: new Date().toISOString()
        };

        try {
            const securityChecks = [];

            // Check if we're on a secure network
            const networkSecurity = this.network === 'mainnet' ? 'production' : 'test';
            securityChecks.push({
                check: 'network_environment',
                status: 'info',
                value: networkSecurity
            });

            // Validate program IDs are not default/placeholder values
            for (const [programName, programId] of Object.entries(VALIDATION_CONFIG.programs)) {
                const isPlaceholder = programId === 'Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS' ||
                                    programId === '389fjKeMujUy73oPg75ByLpoPA5caj5YTn84XT6zNBpe';

                securityChecks.push({
                    check: `program_id_${programName}`,
                    status: isPlaceholder ? 'warning' : 'ok',
                    value: programId,
                    note: isPlaceholder ? 'Using placeholder program ID' : 'Custom program ID'
                });
            }

            // Check environment variables are set appropriately
            const envVars = ['TEST_NETWORK', 'SOLANA_RPC_URL'];
            for (const envVar of envVars) {
                const value = process.env[envVar];
                securityChecks.push({
                    check: `env_${envVar}`,
                    status: value ? 'ok' : 'warning',
                    value: value || 'not_set'
                });
            }

            test.status = 'passed';
            test.details = { securityChecks: securityChecks };

            console.log('✅ Security validation: Completed');
            securityChecks.forEach(check => {
                const icon = check.status === 'ok' ? '✅' : check.status === 'warning' ? '⚠️' : 'ℹ️';
                console.log(`   ${icon} ${check.check}: ${check.value} ${check.note || ''}`);
            });

        } catch (error) {
            test.status = 'failed';
            test.details = { error: error.message };

            console.log('❌ Security validation: FAILED');
            console.log(`   Error: ${error.message}`);
        }

        this.results.tests.push(test);
    }

    /**
     * Generate comprehensive validation report
     * GI #33: Maintain comprehensive documentation
     */
    async generateValidationReport() {
        const passedTests = this.results.tests.filter(t => t.status === 'passed').length;
        const failedTests = this.results.tests.filter(t => t.status === 'failed').length;
        const totalTests = this.results.tests.length;

        this.results.overall = failedTests === 0 ? 'passed' : 'failed';
        this.results.summary = {
            total: totalTests,
            passed: passedTests,
            failed: failedTests,
            coverage: totalTests > 0 ? (passedTests / totalTests * 100).toFixed(1) : 0
        };

        console.log('\n📋 DEPLOYMENT VALIDATION REPORT');
        console.log('=' * 50);
        console.log(`🌐 Network: ${this.network}`);
        console.log(`📅 Timestamp: ${this.results.timestamp}`);
        console.log(`🎯 Overall Status: ${this.results.overall === 'passed' ? '✅ PASSED' : '❌ FAILED'}`);
        console.log('');
        console.log('📊 Test Summary:');
        console.log(`   Total Tests: ${totalTests}`);
        console.log(`   Passed: ${passedTests}`);
        console.log(`   Failed: ${failedTests}`);
        console.log(`   Success Rate: ${this.results.summary.coverage}%`);

        if (failedTests > 0) {
            console.log('\n❌ Failed Tests:');
            this.results.tests
                .filter(t => t.status === 'failed')
                .forEach(test => {
                    console.log(`   - ${test.name}: ${test.details.error}`);
                });
        }

        // Save detailed report
        const reportPath = path.join(process.cwd(), 'test-artifacts', 'deployment-validation.json');

        // Ensure directory exists
        const reportDir = path.dirname(reportPath);
        if (!fs.existsSync(reportDir)) {
            fs.mkdirSync(reportDir, { recursive: true });
        }

        fs.writeFileSync(reportPath, JSON.stringify(this.results, null, 2));
        console.log(`\n📄 Detailed report saved: ${reportPath}`);

        console.log('\n' + '=' * 50);

        if (this.results.overall === 'failed') {
            console.log('💡 Recommendations:');
            console.log('   1. Check program deployment status');
            console.log('   2. Verify network connectivity');
            console.log("   3. Run 'anchor build' to generate IDL files");
            console.log('   4. Review error details in the report');
        } else {
            console.log('🎉 Deployment validation successful!');
            console.log('   Ready for comprehensive testing');
        }
    }
}

// Main execution
if (require.main === module) {
    const validator = new DeploymentValidator();
    validator.validateDeployment().catch(console.error);
}

module.exports = DeploymentValidator;
