import { Connection, PublicKey, SystemProgram, Transaction, TransactionInstruction, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { getAssociatedTokenAddressSync, TOKEN_PROGRAM_ID, getAccount, createAssociatedTokenAccountInstruction, ASSOCIATED_TOKEN_PROGRAM_ID as SPL_ASSOCIATED_TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { sha256 } from '@noble/hashes/sha256';

type WalletLike = {
  publicKey: PublicKey | null;
  signTransaction: (tx: Transaction) => Promise<Transaction>;
  sendTransaction: (tx: Transaction, connection: Connection, options?: { skipPreflight?: boolean; preflightCommitment?: string }) => Promise<string>;
};

const ASSOCIATED_TOKEN_PROGRAM_ID = SPL_ASSOCIATED_TOKEN_PROGRAM_ID;
const RENT_SYSVAR = new PublicKey('SysvarRent111111111111111111111111111111111');

export interface CreateListingParams {
  connection: Connection;
  wallet: WalletLike;
  programId: PublicKey;
  mint: PublicKey;
  priceSol: number;
  type: 'fixed' | 'auction';
}

function leU64(n: bigint): Buffer {
  const b = Buffer.alloc(8);
  b.writeBigUInt64LE(n);
  return b;
}

function leU16(n: number): Buffer {
  const b = Buffer.alloc(2);
  b.writeUInt16LE(n);
  return b;
}

function sighash(name: string): Buffer {
  // Anchor discriminator = first 8 bytes of sha256("global:" + name)
  const pre = Buffer.from(`global:${name}`);
  const h = sha256(pre);
  return Buffer.from(h).subarray(0, 8);
}

export async function createListingTx({ connection, wallet, programId, mint, priceSol, type }: CreateListingParams) {
  if (!wallet.publicKey) throw new Error('Wallet not connected');
  const seller = wallet.publicKey;

  const sellerAta = getAssociatedTokenAddressSync(mint, seller, true);
  const [escrowAuthority] = PublicKey.findProgramAddressSync([Buffer.from('escrow_auth'), mint.toBuffer()], programId);
  const escrowAta = getAssociatedTokenAddressSync(mint, escrowAuthority, true);
  const [listingPda] = PublicKey.findProgramAddressSync([Buffer.from('listing'), seller.toBuffer(), mint.toBuffer()], programId);

  const priceLamports = Math.round(priceSol * LAMPORTS_PER_SOL);
  const feeBps = 250; // 2.5%
  const listingType = type === 'auction' ? 1 : 0;

  const data = Buffer.concat([
    sighash('create_listing'),
    leU64(BigInt(priceLamports)),
    leU16(feeBps),
    Buffer.from([listingType]),
  ]);

  const keys = [
    { pubkey: seller, isSigner: true, isWritable: true },
    { pubkey: mint, isSigner: false, isWritable: false },
    { pubkey: sellerAta, isSigner: false, isWritable: true },
    { pubkey: escrowAuthority, isSigner: false, isWritable: false },
    { pubkey: escrowAta, isSigner: false, isWritable: true },
    { pubkey: listingPda, isSigner: false, isWritable: true },
    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    { pubkey: ASSOCIATED_TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    { pubkey: RENT_SYSVAR, isSigner: false, isWritable: false },
  ];

  // If escrow ATA doesn't exist, prepend an ix to create it
  const preIxs: TransactionInstruction[] = [];
  try {
    await getAccount(connection, escrowAta);
  } catch {
    preIxs.push(
      createAssociatedTokenAccountInstruction(
        seller,
        escrowAta,
        escrowAuthority,
        mint,
        TOKEN_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID
      )
    );
  }

  const ix = new TransactionInstruction({ programId, keys, data });
  const tx = new Transaction();
  if (preIxs.length) tx.add(...preIxs);
  tx.add(ix);
  tx.feePayer = seller;
  tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
  return { tx, listingPda, escrowAta };
}

export async function sendCreateListing(params: CreateListingParams) {
  const { connection, wallet } = params;
  const { tx, listingPda, escrowAta } = await createListingTx(params);
  const sig = await wallet.sendTransaction(tx, connection, { skipPreflight: false, preflightCommitment: 'confirmed' });
  await connection.confirmTransaction(sig, 'confirmed');
  return { signature: sig, listing: listingPda.toBase58(), escrowAta: escrowAta.toBase58() };
}

export function calcMarketplaceFee(priceSol: number) {
  const fee = priceSol * 0.025;
  const sellerReceives = Math.max(priceSol - fee, 0);
  return { fee, sellerReceives };
}

export async function sendBuyNow(
  connection: Connection,
  wallet: WalletLike,
  programId: PublicKey,
  args: { listingPda: PublicKey; mint: PublicKey; seller: PublicKey; treasury: PublicKey; creator?: PublicKey }
) {
  if (!wallet.publicKey) throw new Error('Wallet not connected');
  const buyer = wallet.publicKey;

  // PDAs and ATAs
  const [escrowAuthority] = PublicKey.findProgramAddressSync([Buffer.from('escrow_auth'), args.mint.toBuffer()], programId);
  const escrowAta = getAssociatedTokenAddressSync(args.mint, escrowAuthority, true);
  const buyerAta = getAssociatedTokenAddressSync(args.mint, buyer, true);

  // Ensure buyer ATA exists
  try { await getAccount(connection, buyerAta); } catch {
    const createIx = createAssociatedTokenAccountInstruction(
      buyer,
      buyerAta,
      buyer,
      args.mint,
      TOKEN_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID,
    );
    const t = new Transaction().add(createIx);
    const preSig = await wallet.sendTransaction(t, connection, { preflightCommitment: 'confirmed' });
    await connection.confirmTransaction(preSig, 'confirmed');
  }

  // Discriminator for buy_listing
  const data = sighash('buy_listing');
  const creator = args.creator ?? buyer; // fallback
  const keys = [
    { pubkey: buyer, isSigner: true, isWritable: true },
    { pubkey: args.mint, isSigner: false, isWritable: false },
    { pubkey: args.listingPda, isSigner: false, isWritable: true },
    { pubkey: escrowAuthority, isSigner: false, isWritable: false },
    { pubkey: escrowAta, isSigner: false, isWritable: true },
    { pubkey: buyerAta, isSigner: false, isWritable: true },
    { pubkey: args.treasury, isSigner: false, isWritable: true },
    { pubkey: creator, isSigner: false, isWritable: true },
    { pubkey: args.seller, isSigner: false, isWritable: true },
  ];
  // NOTE: We can't easily fetch listing data here for seller pubkey without parsing; page should provide seller or we resolve via RPC before constructing keys. Safer: require seller passed or decode listing prior.

  // Minimal instruction requires proper seller account; to avoid client re-impl, prefer server-side buy via backend. This export is optional and not wired by default.
  const ix = new TransactionInstruction({ programId, keys, data });
  const tx = new Transaction().add(ix);
  const sig = await wallet.sendTransaction(tx, connection, { preflightCommitment: 'confirmed' });
  await connection.confirmTransaction(sig, 'confirmed');
  return { signature: sig };
}
