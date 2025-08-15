#!/usr/bin/env node
/*
  Devnet Create Listing Script
  - Lists an owned AI Agent NFT using nen-marketplace program
  - Transfers NFT to escrow ATA PDA
*/
const { Connection, PublicKey, LAMPORTS_PER_SOL, Transaction, TransactionInstruction, SystemProgram } = require('@solana/web3.js');
const { getAssociatedTokenAddressSync, getAccount, createAssociatedTokenAccountInstruction, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID } = require('@solana/spl-token');
const fs = require('fs');

function sighash(name){
  const crypto = require('crypto');
  return crypto.createHash('sha256').update(Buffer.from(`global:${name}`)).digest().subarray(0,8);
}

function readKeypair(path){
  const arr = JSON.parse(fs.readFileSync(path, 'utf8'));
  const { Keypair } = require('@solana/web3.js');
  return Keypair.fromSecretKey(Uint8Array.from(arr));
}

async function main(){
  const RPC = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.devnet.solana.com';
  const connection = new Connection(RPC, { commitment: 'confirmed' });
  if (!process.env.PAYER_SECRET_KEY_JSON_PATH) throw new Error('Set PAYER_SECRET_KEY_JSON_PATH to a funded devnet keypair');
  if (!process.env.NFT_MINT) throw new Error('Set NFT_MINT to the mint address of your NFT');
  const payer = readKeypair(process.env.PAYER_SECRET_KEY_JSON_PATH);
  const mint = new PublicKey(process.env.NFT_MINT);
  const programId = new PublicKey(process.env.NEXT_PUBLIC_NEN_MARKETPLACE_PROGRAM_ID || '8FbcrTGS9wQCyC99h5jbHx2bzZjYfkGERSMCjmYBDisH');

  const priceSol = Number(process.env.LIST_PRICE_SOL || '0.5');
  const feeBps = Number(process.env.MARKETPLACE_FEE_BPS || '250');
  const listingType = Number(process.env.LISTING_TYPE || '0'); // 0 fixed, 1 auction

  console.log('Seller:', payer.publicKey.toBase58());
  console.log('Mint:', mint.toBase58());
  console.log('Program:', programId.toBase58());

  const sellerAta = getAssociatedTokenAddressSync(mint, payer.publicKey, true);
  try { await getAccount(connection, sellerAta); } catch {
    // If seller ATA missing, cannot proceed because they don't own the NFT
    throw new Error('Seller ATA not found; ensure wallet owns the NFT');
  }
  const [escrowAuthority] = PublicKey.findProgramAddressSync([Buffer.from('escrow_auth'), mint.toBuffer()], programId);
  const escrowAta = getAssociatedTokenAddressSync(mint, escrowAuthority, true);
  const [listingPda] = PublicKey.findProgramAddressSync([Buffer.from('listing'), payer.publicKey.toBuffer(), mint.toBuffer()], programId);

  // Ensure escrow ATA exists
  const preIxs = [];
  try { await getAccount(connection, escrowAta); } catch {
    preIxs.push(createAssociatedTokenAccountInstruction(
      payer.publicKey, escrowAta, escrowAuthority, mint, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID
    ));
  }

  const priceLamports = Math.round(priceSol * LAMPORTS_PER_SOL);
  const data = Buffer.concat([
    sighash('create_listing'),
    Buffer.from(new Uint8Array(new BigUint64Array([BigInt(priceLamports)]).buffer)),
    Buffer.from(new Uint8Array(new Uint16Array([feeBps]).buffer)),
    Buffer.from([listingType]),
  ]);

  const keys = [
    { pubkey: payer.publicKey, isSigner: true, isWritable: true },
    { pubkey: mint, isSigner: false, isWritable: false },
    { pubkey: sellerAta, isSigner: false, isWritable: true },
    { pubkey: escrowAuthority, isSigner: false, isWritable: false },
    { pubkey: escrowAta, isSigner: false, isWritable: true },
    { pubkey: listingPda, isSigner: false, isWritable: true },
    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    { pubkey: ASSOCIATED_TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    { pubkey: new PublicKey('SysvarRent111111111111111111111111111111111'), isSigner: false, isWritable: false },
  ];
  const ix = new TransactionInstruction({ programId, keys, data });
  const tx = new Transaction();
  if (preIxs.length) tx.add(...preIxs);
  tx.add(ix);
  tx.feePayer = payer.publicKey;
  tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
  const sig = await connection.sendTransaction(tx, [payer]);
  console.log('Listing tx:', sig);
  await connection.confirmTransaction(sig, 'confirmed');
  console.log('Confirmed. Listing PDA:', listingPda.toBase58());
  console.log('Explorer:', `https://explorer.solana.com/tx/${sig}?cluster=devnet`);
}

main().catch((e)=>{ console.error(e); process.exit(1); });
