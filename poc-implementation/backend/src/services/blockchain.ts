// Blockchain Service for interaction with Solana
import { Connection, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { logger } from '../utils/logger';

export class BlockchainService {
  private connection: Connection;

  constructor() {
    this.connection = new Connection(
      process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com',
      'confirmed'
    );
  }

  /**
   * Get the balance of a given wallet
   */
  async getBalance(publicKey: string): Promise<number> {
    try {
      const balance = await this.connection.getBalance(new PublicKey(publicKey));
      logger.info('Balance fetched successfully', { publicKey, balance });
      return balance / LAMPORTS_PER_SOL;
    } catch (error) {
      logger.error('Failed to fetch balance', { publicKey, error });
      throw error;
    }
  }

  /**
   * Transfer SOL between two wallets
   */
  async transferSol(from: string, to: string, amount: number): Promise<string> {
    try {
      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: new PublicKey(from),
          toPubkey: new PublicKey(to),
          lamports: amount * LAMPORTS_PER_SOL
        })
      );

      const signature = await this.connection.sendTransaction(transaction, []);
      logger.info('Transfer completed', { from, to, amount, signature });
      return signature;
    } catch (error) {
      logger.error('Failed to transfer SOL', { from, to, amount, error });
      throw error;
    }
  }
}
