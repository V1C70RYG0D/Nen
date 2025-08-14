import { Connection, Keypair, PublicKey, SendOptions, Transaction } from '@solana/web3.js';
export declare class Wallet {
    private connection;
    readonly keypair: Keypair;
    constructor(connection: Connection, keypairPath: string);
    get publicKey(): PublicKey;
    sendAndConfirm(tx: Transaction, opts?: SendOptions): Promise<string>;
    getAta(mint: PublicKey): Promise<PublicKey>;
}
//# sourceMappingURL=wallet.d.ts.map