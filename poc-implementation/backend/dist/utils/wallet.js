"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Wallet = void 0;
const web3_js_1 = require("@solana/web3.js");
const spl_token_1 = require("@solana/spl-token");
const fs_1 = __importDefault(require("fs"));
class Wallet {
    constructor(connection, keypairPath) {
        this.connection = connection;
        const raw = fs_1.default.readFileSync(keypairPath, 'utf8');
        const arr = JSON.parse(raw);
        const secret = Uint8Array.from(arr);
        this.keypair = web3_js_1.Keypair.fromSecretKey(secret);
    }
    get publicKey() {
        return this.keypair.publicKey;
    }
    async sendAndConfirm(tx, opts) {
        tx.feePayer = this.publicKey;
        tx.recentBlockhash = (await this.connection.getLatestBlockhash()).blockhash;
        tx.sign(this.keypair);
        const sig = await this.connection.sendRawTransaction(tx.serialize(), opts);
        await this.connection.confirmTransaction(sig, 'confirmed');
        return sig;
    }
    async getAta(mint) {
        return (0, spl_token_1.getAssociatedTokenAddressSync)(mint, this.publicKey, true);
    }
}
exports.Wallet = Wallet;
//# sourceMappingURL=wallet.js.map