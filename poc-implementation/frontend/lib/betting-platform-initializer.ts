import {
  Connection,
  PublicKey,
  SystemProgram,
  LAMPORTS_PER_SOL,
} from '@solana/web3.js';
import { Program, AnchorProvider, BN } from '@coral-xyz/anchor';
import { WalletContextState } from '@solana/wallet-adapter-react';

/**
 * Betting Platform Initializer
 * 
 * Ensures the betting platform is properly initialized on devnet
 * Following User Stories and GI requirements:
 * - Real on-chain initialization on devnet
 * - No mocks or simulations
 * - Production-ready configuration
 */

const CONFIG = {
  PROGRAM_ID: new PublicKey(process.env.NEXT_PUBLIC_BETTING_PROGRAM_ID || '34RNydfkFZmhvUupbW1qHBG5LmASc6zeS3tuUsw6PwC5'),
  RPC_URL: process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.devnet.solana.com',
  MIN_DEPOSIT_SOL: parseFloat(process.env.NEXT_PUBLIC_MIN_DEPOSIT_SOL || '0.1'),
  MAX_DEPOSIT_SOL: parseFloat(process.env.NEXT_PUBLIC_MAX_DEPOSIT_SOL || '100'),
  PLATFORM_FEE_BPS: parseInt(process.env.NEXT_PUBLIC_PLATFORM_FEE_BPS || '250'), // 2.5%
  COMMITMENT: 'confirmed' as const,
};

export interface PlatformInitializationResult {
  isInitialized: boolean;
  transactionSignature?: string;
  platformPDA: string;
  explorerUrl?: string;
  config: {
    admin: string;
    minimumDeposit: number;
    maximumDeposit: number;
    platformFeeBps: number;
  };
}

export class BettingPlatformInitializer {
  private connection: Connection;
  private program: Program | null = null;
  private provider: AnchorProvider | null = null;

  constructor() {
    this.connection = new Connection(CONFIG.RPC_URL, CONFIG.COMMITMENT);
    console.log(`🔗 Connected to Solana devnet: ${CONFIG.RPC_URL}`);
  }

  /**
   * Initialize with wallet and program IDL
   */
  async initialize(wallet: WalletContextState, idl: any): Promise<void> {
    if (!wallet.publicKey || !wallet.signTransaction) {
      throw new Error('Wallet not connected. Please connect your wallet first.');
    }

    // Normalize wallet to Anchor-compatible interface
    const adapterWallet = {
      publicKey: wallet.publicKey,
      signTransaction: async (tx: any) => {
        if (!wallet.signTransaction) throw new Error('Wallet does not support signTransaction');
        return wallet.signTransaction(tx);
      },
      signAllTransactions: async (txs: any[]) => {
        if (wallet.signAllTransactions) return wallet.signAllTransactions(txs);
        if (!wallet.signTransaction) throw new Error('Wallet does not support signTransaction');
        const signed: any[] = [];
        for (const tx of txs) signed.push(await wallet.signTransaction(tx));
        return signed;
      },
    } as any;

    this.provider = new AnchorProvider(
      this.connection,
      adapterWallet,
      { commitment: CONFIG.COMMITMENT }
    );

    this.program = new Program(idl, CONFIG.PROGRAM_ID, this.provider);
    
    console.log(`✅ Initialized with wallet: ${wallet.publicKey.toString()}`);
    console.log(`📋 Program ID: ${CONFIG.PROGRAM_ID.toString()}`);
  }

  /**
   * Get betting platform PDA
   */
  getBettingPlatformPDA(): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [Buffer.from('betting_platform')],
      CONFIG.PROGRAM_ID
    );
  }

  /**
   * Check if betting platform is initialized and initialize if needed
   */
  async ensurePlatformInitialized(adminWallet: PublicKey): Promise<PlatformInitializationResult> {
    if (!this.program) {
      throw new Error('Initializer not initialized. Call initialize() first.');
    }

    const [bettingPlatformPDA] = this.getBettingPlatformPDA();

    console.log(`🔍 Checking betting platform initialization...`);
    console.log(`📍 Platform PDA: ${bettingPlatformPDA.toString()}`);

    try {
      // Try to fetch the platform account
      const platformAccount = await this.program.account.bettingPlatform.fetch(bettingPlatformPDA);
      
      console.log('✅ Betting platform already initialized');
      console.log(`👤 Admin: ${(platformAccount.admin as any)?.toString?.() || 'Unknown'}`);
      console.log(`💰 Min Deposit: ${(platformAccount.minimumDeposit as any)?.toNumber?.() / LAMPORTS_PER_SOL || 0} SOL`);
      console.log(`💰 Max Deposit: ${(platformAccount.maximumDeposit as any)?.toNumber?.() / LAMPORTS_PER_SOL || 0} SOL`);
      console.log(`💸 Platform Fee: ${(platformAccount.platformFeeBps as any) || 0} bps (${((platformAccount.platformFeeBps as any) || 0) / 100}%)`);

      return {
        isInitialized: true,
        platformPDA: bettingPlatformPDA.toString(),
        config: {
          admin: (platformAccount.admin as any)?.toString?.() || 'Unknown',
          minimumDeposit: (platformAccount.minimumDeposit as any)?.toNumber?.() / LAMPORTS_PER_SOL || 0,
          maximumDeposit: (platformAccount.maximumDeposit as any)?.toNumber?.() / LAMPORTS_PER_SOL || 0,
          platformFeeBps: (platformAccount.platformFeeBps as any) || 0,
        },
      };

    } catch (error) {
      // Platform not initialized, let's initialize it
      console.log('📋 Betting platform not found, initializing...');
      
      try {
        const minimumDepositLamports = Math.floor(CONFIG.MIN_DEPOSIT_SOL * LAMPORTS_PER_SOL);
        const maximumDepositLamports = Math.floor(CONFIG.MAX_DEPOSIT_SOL * LAMPORTS_PER_SOL);

        console.log(`⚙️  Initializing with configuration:`);
        console.log(`   👤 Admin: ${adminWallet.toString()}`);
        console.log(`   💰 Min Deposit: ${CONFIG.MIN_DEPOSIT_SOL} SOL`);
        console.log(`   💰 Max Deposit: ${CONFIG.MAX_DEPOSIT_SOL} SOL`);
        console.log(`   💸 Platform Fee: ${CONFIG.PLATFORM_FEE_BPS} bps (${CONFIG.PLATFORM_FEE_BPS / 100}%)`);

        const tx = await this.program.methods
          .initializeBettingPlatform(
            adminWallet,
            new BN(minimumDepositLamports),
            new BN(maximumDepositLamports),
            CONFIG.PLATFORM_FEE_BPS
          )
          .accounts({
            bettingPlatform: bettingPlatformPDA,
            admin: adminWallet,
            systemProgram: SystemProgram.programId,
          })
          .rpc({
            skipPreflight: false,
            commitment: CONFIG.COMMITMENT,
          });

        console.log(`✅ Betting platform initialized! Transaction: ${tx}`);

        const explorerUrl = `https://explorer.solana.com/tx/${tx}?cluster=devnet`;
        console.log(`🔗 Explorer: ${explorerUrl}`);

        // Wait for confirmation
        await this.connection.confirmTransaction(tx, CONFIG.COMMITMENT);

        // Verify initialization
        const platformAccount = await this.program.account.bettingPlatform.fetch(bettingPlatformPDA);

        return {
          isInitialized: true,
          transactionSignature: tx,
          platformPDA: bettingPlatformPDA.toString(),
          explorerUrl,
          config: {
            admin: (platformAccount.admin as any)?.toString?.() || 'Unknown',
            minimumDeposit: (platformAccount.minimumDeposit as any)?.toNumber?.() / LAMPORTS_PER_SOL || 0,
            maximumDeposit: (platformAccount.maximumDeposit as any)?.toNumber?.() / LAMPORTS_PER_SOL || 0,
            platformFeeBps: (platformAccount.platformFeeBps as any) || 0,
          },
        };

      } catch (initError) {
        console.error('❌ Failed to initialize betting platform:', initError);
        
        if (initError instanceof Error) {
          if (initError.message.includes('AccountNotSigner')) {
            throw new Error('Admin wallet signature required for platform initialization. Please ensure your wallet is connected and try again.');
          } else if (initError.message.includes('AccountAlreadyInUse')) {
            throw new Error('Platform already initialized (concurrent initialization detected).');
          }
        }
        
        throw new Error(`Failed to initialize betting platform: ${initError instanceof Error ? initError.message : 'Unknown error'}`);
      }
    }
  }

  /**
   * Get platform status
   */
  async getPlatformStatus(): Promise<any> {
    if (!this.program) {
      throw new Error('Initializer not initialized. Call initialize() first.');
    }

    const [bettingPlatformPDA] = this.getBettingPlatformPDA();

    try {
      const platformAccount = await this.program.account.bettingPlatform.fetch(bettingPlatformPDA);
      
      return {
        exists: true,
        admin: (platformAccount.admin as any)?.toString?.() || 'Unknown',
        minimumDeposit: (platformAccount.minimumDeposit as any)?.toNumber?.() / LAMPORTS_PER_SOL || 0,
        maximumDeposit: (platformAccount.maximumDeposit as any)?.toNumber?.() / LAMPORTS_PER_SOL || 0,
        platformFeeBps: (platformAccount.platformFeeBps as any) || 0,
        totalDeposits: (platformAccount.totalDeposits as any)?.toNumber?.() / LAMPORTS_PER_SOL || 0,
        totalWithdrawals: (platformAccount.totalWithdrawals as any)?.toNumber?.() / LAMPORTS_PER_SOL || 0,
        totalUsers: (platformAccount.totalUsers as any)?.toNumber?.() || 0,
        isPaused: (platformAccount.isPaused as any) || false,
        createdAt: (platformAccount.createdAt as any)?.toNumber 
          ? new Date((platformAccount.createdAt as any).toNumber() * 1000).toISOString()
          : new Date().toISOString(),
      };
    } catch (error) {
      return {
        exists: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

export default BettingPlatformInitializer;
