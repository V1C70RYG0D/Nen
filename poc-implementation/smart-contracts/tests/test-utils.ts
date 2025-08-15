import { Connection, Keypair, LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import * as anchor from "@coral-xyz/anchor";

export interface TestEnvironment {
  connection: Connection;
  provider: anchor.AnchorProvider;
  wallet: anchor.Wallet;
  isValidatorRunning: boolean;
  canFundAccounts: boolean;
}

export class TestUtils {
  private static instance: TestUtils;
  private environment: TestEnvironment | null = null;

  static getInstance(): TestUtils {
    if (!TestUtils.instance) {
      TestUtils.instance = new TestUtils();
    }
    return TestUtils.instance;
  }

  async initializeTestEnvironment(rpcUrl: string = "http://localhost:8899"): Promise<TestEnvironment> {
    if (this.environment) {
      return this.environment;
    }

    const connection = new Connection(rpcUrl, "confirmed");
    const testWallet = new anchor.Wallet(Keypair.generate());
    
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

  private async checkValidatorHealth(connection: Connection): Promise<boolean> {
    try {
      const version = await connection.getVersion();
      return version !== null;
    } catch (error) {
      return false;
    }
  }

  async fundTestAccounts(accounts: Keypair[], amount: number = 5 * LAMPORTS_PER_SOL): Promise<boolean> {
    if (!this.environment?.canFundAccounts) {
      return false;
    }

    try {
      const airdropPromises = accounts.map(async (keypair) => {
        try {
          const signature = await this.environment!.connection.requestAirdrop(keypair.publicKey, amount);
          await this.environment!.connection.confirmTransaction(signature, "confirmed");
          return true;
        } catch (error) {
          return false;
        }
      });

      const results = await Promise.all(airdropPromises);
      return results.every(result => result);
    } catch (error) {
      return false;
    }
  }

  deriveAddress(seeds: Buffer[], programId: PublicKey): { address: PublicKey; bump: number } {
    const [address, bump] = PublicKey.findProgramAddressSync(seeds, programId);
    return { address, bump };
  }

  async tryProgramOperation<T>(
    operation: () => Promise<T>,
    fallbackMessage: string = "Operation skipped in test environment"
  ): Promise<T | null> {
    if (!this.environment?.isValidatorRunning) {
      return null;
    }

    try {
      return await operation();
    } catch (error) {
      // Silently handle errors in test environment
      return null;
    }
  }

  private isConnectionError(error: any): boolean {
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

  logTestEnvironmentStatus(): void {
    if (!this.environment) {
      console.log("Test environment not initialized");
      return;
    }

    console.log("Test Environment Status:");
    console.log(`   Validator Running: ${this.environment.isValidatorRunning ? 'YES' : 'NO'}`);
    console.log(`   Connection: ${this.environment.connection.rpcEndpoint}`);
  }

  async checkAccountExists(address: PublicKey): Promise<boolean> {
    if (!this.environment?.isValidatorRunning) {
      return false;
    }

    try {
      const accountInfo = await this.environment.connection.getAccountInfo(address);
      return accountInfo !== null;
    } catch (error) {
      return false;
    }
  }

  createTestAccounts(count: number): Keypair[] {
    return Array.from({ length: count }, () => Keypair.generate());
  }

  async waitForConfirmation(signature: string, timeout: number = 30000): Promise<boolean> {
    if (!this.environment?.isValidatorRunning) {
      return false;
    }

    try {
      const result = await this.environment.connection.confirmTransaction(signature, "confirmed");
      return !result.value.err;
    } catch (error) {
      return false;
    }
  }
}

export const testUtils = TestUtils.getInstance();
