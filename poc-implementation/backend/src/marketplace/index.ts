import { Connection, PublicKey, SystemProgram, Transaction, LAMPORTS_PER_SOL, TransactionInstruction } from '@solana/web3.js';
import { getAssociatedTokenAddressSync, getAccount, createAssociatedTokenAccountInstruction, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { Wallet } from '../utils/wallet';
import { logger } from '../utils/logger';
import { Metaplex, keypairIdentity, toPublicKey } from '@metaplex-foundation/js';

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
  treasury: string; // platform treasury
  creator?: string; // optional override; if not provided, will resolve from metadata
}

export interface BuyListingResult {
  signature: string;
  buyerAta: string;
  escrowAta: string;
  seller: string;
  priceLamports: number;
}

export class MarketplaceClient {
  constructor(
    private connection: Connection,
    private wallet: Wallet,
    private programId: PublicKey,
  ) {}

  async createListing(input: CreateListingInput): Promise<CreateListingResult> {
    const mint = new PublicKey(input.mint);
    const seller = this.wallet.publicKey;

    const [escrowAuthority] = PublicKey.findProgramAddressSync(
      [Buffer.from('escrow_auth'), mint.toBuffer()],
      this.programId,
    );
    const escrowAta = getAssociatedTokenAddressSync(mint, escrowAuthority, true);

    const [listingPda] = PublicKey.findProgramAddressSync(
      [Buffer.from('listing'), seller.toBuffer(), mint.toBuffer()],
      this.programId,
    );

    const priceLamports = Math.round(input.priceSol * LAMPORTS_PER_SOL);
    const feeBps = 250; // 2.5%
    const listingType = input.type === 'auction' ? 1 : 0;

    // Ensure escrow ATA exists
    try { await getAccount(this.connection, escrowAta); } catch {
      const createAtaIx = createAssociatedTokenAccountInstruction(
        this.wallet.publicKey,
        escrowAta,
        escrowAuthority,
        mint,
        TOKEN_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID
      );
      const tmpTx = new Transaction().add(createAtaIx);
      await this.wallet.sendAndConfirm(tmpTx);
    }

    // Anchor discriminator for method name "create_listing"
    const method = 'create_listing';
    const discriminator = Buffer.from(require('@coral-xyz/anchor/dist/cjs/idl').idlDiscriminator(method));
    const data = Buffer.concat([
      discriminator,
      Buffer.from(Uint8Array.of(
        ...require('bn.js')
          .BN
          ? new (require('bn.js'))(priceLamports).toArray('le', 8)
          : (() => { throw new Error('bn.js missing'); })()
      )),
      Buffer.from(Uint8Array.of(feeBps & 0xff, (feeBps >> 8) & 0xff)),
      Buffer.from([listingType]),
    ]);

    const keys = [
      { pubkey: seller, isSigner: true, isWritable: true },
      { pubkey: mint, isSigner: false, isWritable: false },
      { pubkey: await this.wallet.getAta(mint), isSigner: false, isWritable: true },
      { pubkey: escrowAuthority, isSigner: false, isWritable: false },
      { pubkey: escrowAta, isSigner: false, isWritable: true },
      { pubkey: listingPda, isSigner: false, isWritable: true },
  { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
  { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    ];

    const ix = { programId: this.programId, keys, data } as any;
    const tx = new Transaction().add(ix);
    const sig = await this.wallet.sendAndConfirm(tx);

    logger.info(`Listing created: ${listingPda.toBase58()} tx=${sig}`);
    return { listingPda: listingPda.toBase58(), escrowAta: escrowAta.toBase58(), tx: sig };
  }

  private async getListingAccount(listingPda: PublicKey): Promise<{
    seller: PublicKey;
    mint: PublicKey;
    priceLamports: number;
    feeBps: number;
    expiresAt: number;
    status: number;
  }> {
    const acc = await this.connection.getAccountInfo(listingPda, { commitment: 'confirmed' });
    if (!acc) throw new Error('Listing account not found');
    const data = Buffer.from(acc.data);
    if (data.length < 8 + 156) throw new Error('Listing data too short');
    const off = 8; // anchor discriminator
    const seller = new PublicKey(data.slice(off + 0, off + 32));
    const mint = new PublicKey(data.slice(off + 32, off + 64));
    const priceLamports = Number(data.readBigUInt64LE(off + 128));
    const feeBps = data.readUInt16LE(off + 136);
    const expiresAt = Number(data.readBigInt64LE(off + 146));
    const status = data.readUInt8(off + 154);
    return { seller, mint, priceLamports, feeBps, expiresAt, status };
  }

  private sighash(name: string): Buffer {
    const crypto = require('crypto');
    const pre = Buffer.from(`global:${name}`);
    const h = crypto.createHash('sha256').update(pre).digest();
    return h.subarray(0, 8);
  }

  async buyListing(input: BuyListingInput): Promise<BuyListingResult> {
    const buyer = this.wallet.publicKey;
    const listingPda = new PublicKey(input.listingPda);
    const mint = new PublicKey(input.mint);

    // Parse listing to get seller, price, status
    const listing = await this.getListingAccount(listingPda);
    if (!listing.mint.equals(mint)) throw new Error('Mint mismatch');
    if (listing.status !== 0) throw new Error('Listing not active');

    // Buyer balance check on client for nicer error
    const bal = await this.connection.getBalance(buyer, 'confirmed');
    if (bal < listing.priceLamports) throw new Error('Insufficient funds');

    // Resolve creator address for royalty
    let creatorPk: PublicKey | null = null;
    if (input.creator) {
      creatorPk = new PublicKey(input.creator);
    } else {
      try {
        const mx = Metaplex.make(this.connection).use(keypairIdentity(this.wallet.keypair));
        const nft = await mx.nfts().findByMint({ mintAddress: mint }).run();
        if (nft.creators && nft.creators.length > 0) {
          // pick creator with highest share
          const sorted = [...nft.creators].sort((a, b) => (b.share ?? 0) - (a.share ?? 0));
          creatorPk = toPublicKey(sorted[0].address);
        } else {
          creatorPk = toPublicKey(nft.updateAuthorityAddress);
        }
      } catch (e) {
        logger.warn('Failed to resolve creator from metadata; falling back to seller as creator');
        creatorPk = listing.seller; // fallback
      }
    }
    const treasury = new PublicKey(input.treasury);

    // PDAs and ATAs
    const [escrowAuthority] = PublicKey.findProgramAddressSync(
      [Buffer.from('escrow_auth'), mint.toBuffer()],
      this.programId,
    );
    const escrowAta = getAssociatedTokenAddressSync(mint, escrowAuthority, true);
    const buyerAta = getAssociatedTokenAddressSync(mint, buyer, true);

    // Ensure buyer ATA exists
    try { await getAccount(this.connection, buyerAta); } catch {
      const createAtaIx = createAssociatedTokenAccountInstruction(
        this.wallet.publicKey,
        buyerAta,
        this.wallet.publicKey,
        mint,
        TOKEN_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID
      );
      const tmpTx = new Transaction().add(createAtaIx);
      await this.wallet.sendAndConfirm(tmpTx);
    }

    // Build buy instruction (no args)
    const data = this.sighash('buy_listing');
    const keys = [
      { pubkey: buyer, isSigner: true, isWritable: true },
      { pubkey: mint, isSigner: false, isWritable: false },
      { pubkey: listingPda, isSigner: false, isWritable: true },
      { pubkey: escrowAuthority, isSigner: false, isWritable: false },
      { pubkey: escrowAta, isSigner: false, isWritable: true },
      { pubkey: buyerAta, isSigner: false, isWritable: true },
      { pubkey: treasury, isSigner: false, isWritable: true },
      { pubkey: creatorPk!, isSigner: false, isWritable: true },
      { pubkey: listing.seller, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    ];
    const ix = new TransactionInstruction({ programId: this.programId, keys, data });
    const tx = new Transaction().add(ix);
    const sig = await this.wallet.sendAndConfirm(tx);

    logger.info(`Listing purchased: ${listingPda.toBase58()} tx=${sig}`);
    return {
      signature: sig,
      buyerAta: buyerAta.toBase58(),
      escrowAta: escrowAta.toBase58(),
      seller: listing.seller.toBase58(),
      priceLamports: listing.priceLamports,
    };
  }
}
