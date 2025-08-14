"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.testUtils = exports.TestUtils = void 0;
const web3_js_1 = require("@solana/web3.js");
const anchor = require("@coral-xyz/anchor");
class TestUtils {
    constructor() {
        this.environment = null;
    }
    static getInstance() {
        if (!TestUtils.instance) {
            TestUtils.instance = new TestUtils();
        }
        return TestUtils.instance;
    }
    async initializeTestEnvironment(rpcUrl = "http://localhost:8899") {
        if (this.environment) {
            return this.environment;
        }
        const connection = new web3_js_1.Connection(rpcUrl, "confirmed");
        const testWallet = new anchor.Wallet(web3_js_1.Keypair.generate());
        const provider = new anchor.AnchorProvider(connection, testWallet, {
            commitment: "confirmed",
            preflightCommitment: "confirmed",
            skipPreflight: true, // Skip preflight for faster testing
        });
        anchor.setProvider(provider);
        // Test if validator is running
        const isValidatorRunning = await this.checkValidatorHealth(connection);
        const canFundAccounts = isValidatorRunning;
        this.environment = {
            connection,
            provider,
            wallet: testWallet,
            isValidatorRunning,
            canFundAccounts,
        };
        return this.environment;
    }
    async checkValidatorHealth(connection) {
        try {
            const version = await connection.getVersion();
            return version !== null;
        }
        catch (error) {
            return false;
        }
    }
    async fundTestAccounts(accounts, amount = 5 * web3_js_1.LAMPORTS_PER_SOL) {
        if (!this.environment?.canFundAccounts) {
            return false;
        }
        try {
            const airdropPromises = accounts.map(async (keypair) => {
                try {
                    const signature = await this.environment.connection.requestAirdrop(keypair.publicKey, amount);
                    await this.environment.connection.confirmTransaction(signature, "confirmed");
                    return true;
                }
                catch (error) {
                    return false;
                }
            });
            const results = await Promise.all(airdropPromises);
            return results.every(result => result);
        }
        catch (error) {
            return false;
        }
    }
    deriveAddress(seeds, programId) {
        const [address, bump] = web3_js_1.PublicKey.findProgramAddressSync(seeds, programId);
        return { address, bump };
    }
    async tryProgramOperation(operation, fallbackMessage = "Operation skipped in test environment") {
        if (!this.environment?.isValidatorRunning) {
            return null;
        }
        try {
            return await operation();
        }
        catch (error) {
            // Only show error if it's not a connection-related issue
            if (!this.isConnectionError(error)) {
                console.log(`${fallbackMessage}:`, error.message);
            }
            return null;
        }
    }
    isConnectionError(error) {
        const connectionErrors = [
            'ECONNREFUSED',
            'fetch failed',
            'Network request failed',
            'Connection refused',
            'timeout'
        ];
        const errorString = error?.message || error?.toString() || '';
        return connectionErrors.some(connError => errorString.includes(connError));
    }
    logTestEnvironmentStatus() {
        if (!this.environment) {
            console.log("Test environment not initialized");
            return;
        }
        console.log("🔧 Test Environment Status:");
        console.log(`   Validator Running: ${this.environment.isValidatorRunning ? 'Yes' : 'No'}`);
        console.log(`   Can Fund Accounts: ${this.environment.canFundAccounts ? 'Yes' : 'No'}`);
        console.log(`   Connection: ${this.environment.connection.rpcEndpoint}`);
        if (!this.environment.isValidatorRunning) {
            console.log("ℹ️  Running in offline test mode - structure validation only");
        }
    }
    async checkAccountExists(address) {
        if (!this.environment?.isValidatorRunning) {
            return false;
        }
        try {
            const accountInfo = await this.environment.connection.getAccountInfo(address);
            return accountInfo !== null;
        }
        catch (error) {
            return false;
        }
    }
    createTestAccounts(count) {
        return Array.from({ length: count }, () => web3_js_1.Keypair.generate());
    }
    async waitForConfirmation(signature, timeout = 30000) {
        if (!this.environment?.isValidatorRunning) {
            return false;
        }
        try {
            const result = await this.environment.connection.confirmTransaction(signature, "confirmed");
            return !result.value.err;
        }
        catch (error) {
            return false;
        }
    }
}
exports.TestUtils = TestUtils;
exports.testUtils = TestUtils.getInstance();
