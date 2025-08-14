#!/usr/bin/env node
/*
  Devnet NFT Purchase Script
  - Loads active listings from program accounts
  - Buys first listing using nen-marketplace program
  - Splits: 2.5% treasury, 5% royalty to creator (fallback to update authority), rest to seller
*/
const { Connection, PublicKey, SystemProgram, Transaction, LAMPORTS_PER_SOL, TransactionInstruction } = require('@solana/web3.js');
const { getAssociatedTokenAddressSync, getAccount, createAssociatedTokenAccountInstruction, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID } = require('@solana/spl-token');
const { Metaplex, keypairIdentity } = require('@metaplex-foundation/js');
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
  const payer = readKeypair(process.env.PAYER_SECRET_KEY_JSON_PATH);
  const programIdStr = process.env.NEXT_PUBLIC_NEN_MARKETPLACE_PROGRAM_ID;
  if (!programIdStr) throw new Error('NEXT_PUBLIC_NEN_MARKETPLACE_PROGRAM_ID not set');
  const programId = new PublicKey(programIdStr);
  const treasuryStr = process.env.NEXT_PUBLIC_TREASURY_PUBLIC_KEY;
  if (!treasuryStr) throw new Error('NEXT_PUBLIC_TREASURY_PUBLIC_KEY not set');
  const treasury = new PublicKey(treasuryStr);

  console.log('Buyer:', payer.publicKey.toBase58());
  console.log('Program:', programId.toBase58());
  console.log('Treasury:', treasury.toBase58());

  // Fetch program accounts and parse listings minimally
  const accounts = await connection.getProgramAccounts(programId, { commitment: 'confirmed' });
  const active = [];
  for (const a of accounts){
    const data = Buffer.from(a.account.data);
    if (data.length >= 8 + 156){
      const off = 8;
      const seller = new PublicKey(data.slice(off + 0, off + 32));
      const mint = new PublicKey(data.slice(off + 32, off + 64));
      const escrowAuthority = new PublicKey(data.slice(off + 64, off + 96));
      const escrowAta = new PublicKey(data.slice(off + 96, off + 128));
      const priceLamports = Number(data.readBigUInt64LE(off + 128));
      const status = data.readUInt8(off + 154);
      if (status === 0){
        active.push({ pubkey: a.pubkey, seller, mint, escrowAuthority, escrowAta, priceLamports });
      }
    }
  }
  if (!active.length) throw new Error('No active listings found');
  const row = active[0];
  console.log('Buying listing:', row.pubkey.toBase58(), 'mint:', row.mint.toBase58(), 'price SOL:', row.priceLamports / LAMPORTS_PER_SOL);

  // Resolve creator for royalty
  const mx = Metaplex.make(connection).use(keypairIdentity(payer));
  let creator = row.seller;
  try {
    const nft = await mx.nfts().findByMint({ mintAddress: row.mint }).run();
    if (nft.creators && nft.creators.length){
      const sorted = [...nft.creators].sort((a,b)=> (b.share??0) - (a.share??0));
      creator = new PublicKey(sorted[0].address);
    } else if (nft.updateAuthorityAddress){
      creator = new PublicKey(nft.updateAuthorityAddress);
    }
  } catch(e){ console.warn('Creator resolve failed, fallback to seller'); }

  // Ensure buyer ATA
  const buyerAta = getAssociatedTokenAddressSync(row.mint, payer.publicKey, true);
  try { await getAccount(connection, buyerAta); } catch {
    const createIx = createAssociatedTokenAccountInstruction(
      payer.publicKey, buyerAta, payer.publicKey, row.mint, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID
    );
    const t = new Transaction().add(createIx);
    const sig0 = await connection.sendTransaction(t, [payer]);
    await connection.confirmTransaction(sig0, 'confirmed');
    console.log('Buyer ATA created:', buyerAta.toBase58());
  }

  // Build buy instruction
  const keys = [
    { pubkey: payer.publicKey, isSigner: true, isWritable: true },
    { pubkey: row.mint, isSigner: false, isWritable: false },
    { pubkey: row.pubkey, isSigner: false, isWritable: true },
    { pubkey: row.escrowAuthority, isSigner: false, isWritable: false },
    { pubkey: row.escrowAta, isSigner: false, isWritable: true },
    { pubkey: buyerAta, isSigner: false, isWritable: true },
    { pubkey: treasury, isSigner: false, isWritable: true },
    { pubkey: creator, isSigner: false, isWritable: true },
    { pubkey: row.seller, isSigner: false, isWritable: true },
    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
  ];
  const data = sighash('buy_listing');
  const ix = new TransactionInstruction({ programId, keys, data });
  const tx = new Transaction().add(ix);
  tx.feePayer = payer.publicKey;
  tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
  const sig = await connection.sendTransaction(tx, [payer]);
  console.log('Purchase sent:', sig);
  await connection.confirmTransaction(sig, 'confirmed');
  console.log('Confirmed. Explorer:', `https://explorer.solana.com/tx/${sig}?cluster=devnet`);
}

main().catch((e)=>{ console.error(e); process.exit(1); });
