"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BlockchainService = void 0;
// Blockchain Service for interaction with Solana
const web3_js_1 = require("@solana/web3.js");
const logger_1 = require("../utils/logger");
class BlockchainService {
    constructor() {
        this.connection = new web3_js_1.Connection(process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com', 'confirmed');
    }
    /**
     * Get the balance of a given wallet
     */
    async getBalance(publicKey) {
        try {
            const balance = await this.connection.getBalance(new web3_js_1.PublicKey(publicKey));
            logger_1.logger.info('Balance fetched successfully', { publicKey, balance });
            return balance / web3_js_1.LAMPORTS_PER_SOL;
        }
        catch (error) {
            logger_1.logger.error('Failed to fetch balance', { publicKey, error });
            throw error;
        }
    }
    /**
     * Transfer SOL between two wallets
     */
    async transferSol(from, to, amount) {
        try {
            const transaction = new web3_js_1.Transaction().add(web3_js_1.SystemProgram.transfer({
                fromPubkey: new web3_js_1.PublicKey(from),
                toPubkey: new web3_js_1.PublicKey(to),
                lamports: amount * web3_js_1.LAMPORTS_PER_SOL
            }));
            const signature = await this.connection.sendTransaction(transaction, []);
            logger_1.logger.info('Transfer completed', { from, to, amount, signature });
            return signature;
        }
        catch (error) {
            logger_1.logger.error('Failed to transfer SOL', { from, to, amount, error });
            throw error;
        }
    }
}
exports.BlockchainService = BlockchainService;
//# sourceMappingURL=blockchain.js.map