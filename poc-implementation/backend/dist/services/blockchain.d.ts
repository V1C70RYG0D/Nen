export declare class BlockchainService {
    private connection;
    constructor();
    /**
     * Get the balance of a given wallet
     */
    getBalance(publicKey: string): Promise<number>;
    /**
     * Transfer SOL between two wallets
     */
    transferSol(from: string, to: string, amount: number): Promise<string>;
}
//# sourceMappingURL=blockchain.d.ts.map