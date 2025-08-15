import { Connection, PublicKey } from '@solana/web3.js';
import { Wallet } from '../utils/wallet';
export type ListingType = 'fixed' | 'auction';
export interface CreateListingInput {
    mint: string;
    priceSol: number;
    type: ListingType;
}
export interface CreateListingResult {
    listingPda: string;
    escrowAta: string;
    tx: string;
}
export interface BuyListingInput {
    listingPda: string;
    mint: string;
    treasury: string;
    creator?: string;
}
export interface BuyListingResult {
    signature: string;
    buyerAta: string;
    escrowAta: string;
    seller: string;
    priceLamports: number;
}
export declare class MarketplaceClient {
    private connection;
    private wallet;
    private programId;
    constructor(connection: Connection, wallet: Wallet, programId: PublicKey);
    createListing(input: CreateListingInput): Promise<CreateListingResult>;
    private getListingAccount;
    private sighash;
    buyListing(input: BuyListingInput): Promise<BuyListingResult>;
}
//# sourceMappingURL=index.d.ts.map