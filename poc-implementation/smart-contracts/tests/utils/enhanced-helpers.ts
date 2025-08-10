/**
 * Enhanced Testing Utilities and Helpers

 */

import * as anchor from "@coral-xyz/anchor";
import {
    Connection,
    Keypair,
    PublicKey,
    Transaction,
    SystemProgram,
    LAMPORTS_PER_SOL,
    ComputeBudgetProgram,
    TransactionInstruction,
    SendOptions
} from "@solana/web3.js";
import {
    TOKEN_PROGRAM_ID,
    createMint,
    createAccount,
    mintTo,
    getAccount,
    Account
} from "@solana/spl-token";
import BN from "bn.js";
import { assert } from "chai";
import fs from "fs";
import path from "path";

/**
 * Enhanced Transaction Builder with Performance Monitoring
 * GI #4: Modular and professional design
 * GI #21: Performance optimization
 */
export class EnhancedTransactionHelper {
    private connection: Connection;
    private payer: Keypair;
    private computeUnitLimit: number;
    private computeUnitPrice: number;

    constructor(
        connection: Connection,
        payer: Keypair,
        computeUnitLimit: number = 400000,
        computeUnitPrice: number = 1
    ) {
        this.connection = connection;
        this.payer = payer;
        this.computeUnitLimit = computeUnitLimit;
        this.computeUnitPrice = computeUnitPrice;
    }

    /**
     * Execute transaction with comprehensive monitoring and retry logic
     * GI #20: Robust error handling, GI #21: Performance optimization
     */
    async executeTransaction(
        instructions: TransactionInstruction[],
        signers: Keypair[] = [],
        options: {
            retries?: number;
            skipPreflight?: boolean;
            commitment?: anchor.web3.Commitment;
            enablePriorityFees?: boolean;
            logResults?: boolean;
        } = {}
    ): Promise<{
        signature: string;
        latency: number;
        computeUnitsConsumed?: number;
        priorityFee?: number;
        slotProcessed?: number;
        confirmationTime?: number;
    }> {
        const {
            retries = 3,
            skipPreflight = false,
            commitment = "confirmed",
            enablePriorityFees = true,
            logResults = false
        } = options;

        const startTime = performance.now();
        let lastError: Error | null = null;

        for (let attempt = 1; attempt <= retries; attempt++) {
            try {
                const transaction = new Transaction();

                // Add compute budget instructions if enabled
                if (enablePriorityFees) {
                    transaction.add(
                        ComputeBudgetProgram.setComputeUnitLimit({
                            units: this.computeUnitLimit,
                        }),
                        ComputeBudgetProgram.setComputeUnitPrice({
                            microLamports: this.computeUnitPrice,
                        })
                    );
                }

                // Add main instructions
                transaction.add(...instructions);

                // Get recent blockhash
                const { blockhash, lastValidBlockHeight } = await this.connection.getLatestBlockhash(commitment);
                transaction.recentBlockhash = blockhash;
                transaction.lastValidBlockHeight = lastValidBlockHeight;

                // Sign transaction
                transaction.sign(this.payer, ...signers);

                // Send transaction
                const signature = await this.connection.sendRawTransaction(
                    transaction.serialize(),
                    {
                        skipPreflight,
                        preflightCommitment: commitment,
                        maxRetries: 0, // We handle retries ourselves
                    }
                );

                // Wait for confirmation with timeout
                const confirmationStart = performance.now();
                const confirmation = await this.connection.confirmTransaction(
                    {
                        signature,
                        blockhash,
                        lastValidBlockHeight,
                    },
                    commitment
                );

                if (confirmation.value.err) {
                    throw new Error(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`);
                }

                const latency = performance.now() - startTime;
                const confirmationTime = performance.now() - confirmationStart;

                // Get detailed transaction info
                let computeUnitsConsumed: number | undefined;
                let slotProcessed: number | undefined;
                let priorityFee: number | undefined;

                try {
                    const txDetails = await this.connection.getTransaction(signature, {
                        commitment: "confirmed",
                        maxSupportedTransactionVersion: 0
                    });

                    if (txDetails) {
                        computeUnitsConsumed = txDetails.meta?.computeUnitsConsumed;
                        slotProcessed = txDetails.slot;
                        priorityFee = txDetails.meta?.fee;
                    }
                } catch (error) {
                    // Transaction details not critical for test success
                    if (logResults) {
                        console.warn("Could not fetch transaction details:", error);
                    }
                }

                const result = {
                    signature,
                    latency,
                    computeUnitsConsumed,
                    priorityFee,
                    slotProcessed,
                    confirmationTime
                };

                if (logResults) {
                    console.log("✅ Transaction successful:", {
                        signature: signature.slice(0, 8) + "...",
                        latency: `${latency.toFixed(2)}ms`,
                        computeUnits: computeUnitsConsumed,
                        confirmationTime: `${confirmationTime.toFixed(2)}ms`
                    });
                }

                return result;

            } catch (error) {
                lastError = error as Error;

                if (logResults) {
                    console.warn(`❌ Transaction attempt ${attempt}/${retries} failed:`, error);
                }

                if (attempt < retries) {
                    // Exponential backoff with jitter
                    const baseDelay = Math.pow(2, attempt) * 1000;
                    const jitter = Math.random() * 500;
                    await this.sleep(baseDelay + jitter);
                }
            }
        }

        throw new Error(`Transaction failed after ${retries} attempts: ${lastError?.message}`);
    }

    /**
     * Create and fund test account with validation
     * GI #2: Real implementations, GI #15: Error-free systems
     */
    async createAndFundAccount(
        lamports: number = LAMPORTS_PER_SOL,
        validateBalance: boolean = true
    ): Promise<{
        keypair: Keypair;
        publicKey: PublicKey;
        initialBalance: number;
        transactionSignature: string;
    }> {
        const newAccount = Keypair.generate();

        const instruction = SystemProgram.createAccount({
            fromPubkey: this.payer.publicKey,
            newAccountPubkey: newAccount.publicKey,
            lamports,
            space: 0,
            programId: SystemProgram.programId,
        });

        const { signature } = await this.executeTransaction([instruction], [newAccount]);

        // Validate account creation if requested
        if (validateBalance) {
            const balance = await this.connection.getBalance(newAccount.publicKey);
            assert.equal(balance, lamports, "Account balance does not match expected amount");
        }

        return {
            keypair: newAccount,
            publicKey: newAccount.publicKey,
            initialBalance: lamports,
            transactionSignature: signature
        };
    }

    /**
     * Airdrop SOL with retry logic and validation
     * GI #20: Robust error handling
     */
    async airdropSol(
        publicKey: PublicKey,
        amount: number,
        retries: number = 3
    ): Promise<{
        signature: string;
        finalBalance: number;
        airdropTime: number;
    }> {
        const startTime = performance.now();
        let lastError: Error | null = null;

        for (let attempt = 1; attempt <= retries; attempt++) {
            try {
                const signature = await this.connection.requestAirdrop(
                    publicKey,
                    amount * LAMPORTS_PER_SOL
                );

                // Wait for confirmation
                const latestBlockhash = await this.connection.getLatestBlockhash();
                await this.connection.confirmTransaction({
                    signature,
                    ...latestBlockhash,
                });

                // Verify balance
                const balance = await this.connection.getBalance(publicKey);
                const airdropTime = performance.now() - startTime;

                return {
                    signature,
                    finalBalance: balance / LAMPORTS_PER_SOL,
                    airdropTime
                };

            } catch (error) {
                lastError = error as Error;

                if (attempt < retries) {
                    await this.sleep(Math.pow(2, attempt) * 1000);
                }
            }
        }

        throw new Error(`Airdrop failed after ${retries} attempts: ${lastError?.message}`);
    }

    /**
     * Utility sleep function
     */
    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

/**
 * Token Account Management Utilities
 * GI #6: Handle integrations carefully
 */
export class TokenAccountHelper {
    private connection: Connection;
    private payer: Keypair;

    constructor(connection: Connection, payer: Keypair) {
        this.connection = connection;
        this.payer = payer;
    }

    /**
     * Create test token mint with comprehensive configuration
     */
    async createTestMint(
        decimals: number = 9,
        mintAuthority?: Keypair,
        freezeAuthority?: Keypair
    ): Promise<{
        mint: PublicKey;
        mintAuthority: Keypair;
        freezeAuthority?: Keypair;
        transactionSignature: string;
    }> {
        const authority = mintAuthority || Keypair.generate();
        const freeze = freezeAuthority || undefined;

        const mint = await createMint(
            this.connection,
            this.payer,
            authority.publicKey,
            freeze?.publicKey || null,
            decimals
        );

        // Get the transaction signature (simplified for this example)
        const signature = "mock-signature"; // In real implementation, you'd capture this

        return {
            mint,
            mintAuthority: authority,
            freezeAuthority: freeze,
            transactionSignature: signature
        };
    }

    /**
     * Create token account with validation
     */
    async createTokenAccount(
        mint: PublicKey,
        owner: PublicKey
    ): Promise<{
        tokenAccount: PublicKey;
        accountInfo: Account;
        transactionSignature: string;
    }> {
        const tokenAccount = await createAccount(
            this.connection,
            this.payer,
            mint,
            owner
        );

        // Validate account creation
        const accountInfo = await getAccount(this.connection, tokenAccount);

        return {
            tokenAccount,
            accountInfo,
            transactionSignature: "mock-signature" // In real implementation, capture this
        };
    }

    /**
     * Mint tokens to account with validation
     */
    async mintTokens(
        mint: PublicKey,
        destination: PublicKey,
        authority: Keypair,
        amount: number | BN
    ): Promise<{
        amount: BN;
        finalBalance: BN;
        transactionSignature: string;
    }> {
        const mintAmount = typeof amount === "number" ? new BN(amount) : amount;

        await mintTo(
            this.connection,
            this.payer,
            mint,
            destination,
            authority,
            mintAmount.toNumber()
        );

        // Get final balance
        const accountInfo = await getAccount(this.connection, destination);
        const finalBalance = new BN(accountInfo.amount.toString());

        return {
            amount: mintAmount,
            finalBalance,
            transactionSignature: "mock-signature"
        };
    }
}

/**
 * Account State Validation Utilities
 * GI #8: Test extensively, GI #45: Handle edge cases
 */
export class AccountValidator {
    private connection: Connection;

    constructor(connection: Connection) {
        this.connection = connection;
    }

    /**
     * Validate account exists and has expected properties
     */
    async validateAccountExists(
        publicKey: PublicKey,
        expectedOwner?: PublicKey,
        minimumBalance?: number
    ): Promise<{
        exists: boolean;
        balance: number;
        owner: PublicKey;
        isValid: boolean;
        validationErrors: string[];
    }> {
        const validationErrors: string[] = [];

        try {
            const accountInfo = await this.connection.getAccountInfo(publicKey);

            if (!accountInfo) {
                return {
                    exists: false,
                    balance: 0,
                    owner: SystemProgram.programId,
                    isValid: false,
                    validationErrors: ["Account does not exist"]
                };
            }

            const balance = accountInfo.lamports;
            const owner = accountInfo.owner;

            // Validate owner if specified
            if (expectedOwner && !owner.equals(expectedOwner)) {
                validationErrors.push(`Expected owner ${expectedOwner.toBase58()}, got ${owner.toBase58()}`);
            }

            // Validate minimum balance if specified
            if (minimumBalance !== undefined && balance < minimumBalance) {
                validationErrors.push(`Balance ${balance} is below minimum ${minimumBalance}`);
            }

            return {
                exists: true,
                balance,
                owner,
                isValid: validationErrors.length === 0,
                validationErrors
            };

        } catch (error) {
            return {
                exists: false,
                balance: 0,
                owner: SystemProgram.programId,
                isValid: false,
                validationErrors: [`Validation error: ${error instanceof Error ? error.message : "Unknown error"}`]
            };
        }
    }

    /**
     * Validate token account state
     */
    async validateTokenAccount(
        tokenAccount: PublicKey,
        expectedMint?: PublicKey,
        expectedOwner?: PublicKey,
        minimumBalance?: BN
    ): Promise<{
        isValid: boolean;
        accountInfo?: Account;
        validationErrors: string[];
    }> {
        const validationErrors: string[] = [];

        try {
            const accountInfo = await getAccount(this.connection, tokenAccount);

            // Validate mint if specified
            if (expectedMint && !accountInfo.mint.equals(expectedMint)) {
                validationErrors.push(`Expected mint ${expectedMint.toBase58()}, got ${accountInfo.mint.toBase58()}`);
            }

            // Validate owner if specified
            if (expectedOwner && !accountInfo.owner.equals(expectedOwner)) {
                validationErrors.push(`Expected owner ${expectedOwner.toBase58()}, got ${accountInfo.owner.toBase58()}`);
            }

            // Validate minimum balance if specified
            if (minimumBalance && new BN(accountInfo.amount.toString()).lt(minimumBalance)) {
                validationErrors.push(`Balance ${accountInfo.amount.toString()} is below minimum ${minimumBalance.toString()}`);
            }

            return {
                isValid: validationErrors.length === 0,
                accountInfo,
                validationErrors
            };

        } catch (error) {
            return {
                isValid: false,
                validationErrors: [`Token account validation error: ${error instanceof Error ? error.message : "Unknown error"}`]
            };
        }
    }
}

/**
 * Performance Benchmarking Utilities
 * GI #21: Performance optimization
 */
export class PerformanceBenchmark {
    private measurements: Map<string, number[]> = new Map();

    /**
     * Start timing a named operation
     */
    startTimer(name: string): () => void {
        const startTime = performance.now();

        return () => {
            const duration = performance.now() - startTime;

            if (!this.measurements.has(name)) {
                this.measurements.set(name, []);
            }

            this.measurements.get(name)!.push(duration);
        };
    }

    /**
     * Get statistics for a named operation
     */
    getStats(name: string): {
        count: number;
        min: number;
        max: number;
        average: number;
        median: number;
        p95: number;
        p99: number;
    } | null {
        const measurements = this.measurements.get(name);

        if (!measurements || measurements.length === 0) {
            return null;
        }

        const sorted = [...measurements].sort((a, b) => a - b);
        const count = sorted.length;

        return {
            count,
            min: sorted[0],
            max: sorted[count - 1],
            average: sorted.reduce((a, b) => a + b, 0) / count,
            median: sorted[Math.floor(count / 2)],
            p95: sorted[Math.floor(count * 0.95)],
            p99: sorted[Math.floor(count * 0.99)]
        };
    }

    /**
     * Generate performance report
     */
    generateReport(): string {
        const report = ["Performance Benchmark Report", "=" .repeat(50)];

        for (const [name, _] of this.measurements) {
            const stats = this.getStats(name);
            if (stats) {
                report.push(`\n${name}:`);
                report.push(`  Count: ${stats.count}`);
                report.push(`  Average: ${stats.average.toFixed(2)}ms`);
                report.push(`  Min/Max: ${stats.min.toFixed(2)}ms / ${stats.max.toFixed(2)}ms`);
                report.push(`  Median: ${stats.median.toFixed(2)}ms`);
                report.push(`  P95/P99: ${stats.p95.toFixed(2)}ms / ${stats.p99.toFixed(2)}ms`);
            }
        }

        return report.join("\n");
    }

    /**
     * Clear all measurements
     */
    clear(): void {
        this.measurements.clear();
    }
}

/**
 * Test Data Utilities
 * GI #17: Generalize for reusability
 */
export class TestDataManager {
    private fixturesPath: string;

    constructor(fixturesPath: string = "tests/fixtures") {
        this.fixturesPath = path.resolve(process.cwd(), fixturesPath);
    }

    /**
     * Load keypair from file with validation
     */
    loadKeypair(filename: string): Keypair {
        try {
            const filepath = path.join(this.fixturesPath, filename);

            if (!fs.existsSync(filepath)) {
                throw new Error(`Keypair file not found: ${filepath}`);
            }

            const secretKeyData = JSON.parse(fs.readFileSync(filepath, "utf8"));

            if (!Array.isArray(secretKeyData) || secretKeyData.length !== 64) {
                throw new Error(`Invalid keypair format in ${filename}`);
            }

            return Keypair.fromSecretKey(new Uint8Array(secretKeyData));

        } catch (error) {
            throw new Error(`Failed to load keypair ${filename}: ${error instanceof Error ? error.message : "Unknown error"}`);
        }
    }

    /**
     * Save keypair to file
     */
    saveKeypair(keypair: Keypair, filename: string): void {
        try {
            const filepath = path.join(this.fixturesPath, filename);

            // Ensure directory exists
            fs.mkdirSync(path.dirname(filepath), { recursive: true });

            // Save keypair as JSON array
            fs.writeFileSync(
                filepath,
                JSON.stringify(Array.from(keypair.secretKey)),
                "utf8"
            );

        } catch (error) {
            throw new Error(`Failed to save keypair ${filename}: ${error instanceof Error ? error.message : "Unknown error"}`);
        }
    }

    /**
     * Generate and save test keypairs
     */
    generateTestKeypairs(names: string[]): Map<string, Keypair> {
        const keypairs = new Map<string, Keypair>();

        for (const name of names) {
            const keypair = Keypair.generate();
            const filename = `${name}-keypair.json`;

            this.saveKeypair(keypair, filename);
            keypairs.set(name, keypair);
        }

        return keypairs;
    }

    /**
     * Load test fixture data
     */
    loadFixture<T>(filename: string): T {
        try {
            const filepath = path.join(this.fixturesPath, filename);

            if (!fs.existsSync(filepath)) {
                throw new Error(`Fixture file not found: ${filepath}`);
            }

            const content = fs.readFileSync(filepath, "utf8");
            return JSON.parse(content);

        } catch (error) {
            throw new Error(`Failed to load fixture ${filename}: ${error instanceof Error ? error.message : "Unknown error"}`);
        }
    }
}
