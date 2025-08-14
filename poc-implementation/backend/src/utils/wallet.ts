import { Connection, Keypair, PublicKey, SendOptions, Transaction } from '@solana/web3.js';
import { getAssociatedTokenAddressSync } from '@solana/spl-token';
import fs from 'fs';

export class Wallet {
  readonly keypair: Keypair;
  constructor(private connection: Connection, keypairPath: string) {
    const raw = fs.readFileSync(keypairPath, 'utf8');
    const arr = JSON.parse(raw);
    const secret = Uint8Array.from(arr);
    this.keypair = Keypair.fromSecretKey(secret);
  }

  get publicKey(): PublicKey {
    return this.keypair.publicKey;
  }

  async sendAndConfirm(tx: Transaction, opts?: SendOptions): Promise<string> {
    tx.feePayer = this.publicKey;
    tx.recentBlockhash = (await this.connection.getLatestBlockhash()).blockhash;
    tx.sign(this.keypair);
    const sig = await this.connection.sendRawTransaction(tx.serialize(), opts);
    await this.connection.confirmTransaction(sig, 'confirmed');
    return sig;
  }

  async getAta(mint: PublicKey): Promise<PublicKey> {
    return getAssociatedTokenAddressSync(mint, this.publicKey, true);
  }
}
