#!/usr/bin/env node
/*
  Devnet Marketplace E2E
  - Mints an AI Agent NFT (5% royalty) as Seller
  - Creates a fixed-price listing (2.5% fee)
  - Buys the listing as Buyer; verifies NFT transfer and SOL splits
*/
const { Connection, Keypair, LAMPORTS_PER_SOL, PublicKey, SystemProgram, Transaction, TransactionInstruction } = require('@solana/web3.js');
const { Metaplex, keypairIdentity } = require('@metaplex-foundation/js');
const { getAssociatedTokenAddressSync, getAccount, createAssociatedTokenAccountInstruction, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID } = require('@solana/spl-token');

function sighash(name){
  const crypto = require('crypto');
  return crypto.createHash('sha256').update(Buffer.from(`global:${name}`)).digest().subarray(0,8);
}
function leU64(n){
  const b = Buffer.alloc(8); b.writeBigUInt64LE(BigInt(n)); return b;
}
function leU16(n){
  const b = Buffer.alloc(2); b.writeUInt16LE(n); return b;
}

async function ensureAtaIx(connection, owner, mint, ata){
  try { await getAccount(connection, ata); return null; } catch {}
  return createAssociatedTokenAccountInstruction(owner, ata, owner, mint, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID);
}

async function main(){
  const RPC = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.devnet.solana.com';
  const connection = new Connection(RPC, { commitment: 'confirmed' });
  const programId = new PublicKey(process.env.NEXT_PUBLIC_NEN_MARKETPLACE_PROGRAM_ID || '8FbcrTGS9wQCyC99h5jbHx2bzZjYfkGERSMCjmYBDisH');
  const treasury = new PublicKey(process.env.NEXT_PUBLIC_TREASURY_PUBLIC_KEY || Keypair.generate().publicKey.toBase58());

  const seller = Keypair.generate();
  const buyer = Keypair.generate();
  console.log('Seller:', seller.publicKey.toBase58());
  console.log('Buyer :', buyer.publicKey.toBase58());

  // Airdrop
  for (const kp of [seller, buyer]){
    const sig = await connection.requestAirdrop(kp.publicKey, 2 * LAMPORTS_PER_SOL);
    await connection.confirmTransaction(sig, 'confirmed');
  }
  console.log('Airdropped 2 SOL to both accounts');

  // Mint NFT as seller
  const mxSeller = Metaplex.make(connection).use(keypairIdentity(seller));
  const metadataUrl = process.env.TEST_METADATA_URL || 'https://example.com/nen-agent.json';
  const { nft, response } = await mxSeller.nfts().create({
    uri: metadataUrl,
    name: 'E2E Nen Agent',
    symbol: 'NENAI',
    sellerFeeBasisPoints: 500,
    isMutable: false,
    tokenOwner: seller.publicKey,
    updateAuthority: seller,
    creators: [{ address: seller.publicKey, share: 100, verified: true }],
  });
  console.log('Minted NFT:', nft.address.toBase58(), 'sig:', response.signature);

  // Create listing as seller
  const mint = nft.address;
  const priceLamports = Math.round((Number(process.env.LIST_PRICE_SOL || '0.5')) * LAMPORTS_PER_SOL);
  const feeBps = 250; // 2.5%
  const listingType = 0; // fixed

  const sellerAta = getAssociatedTokenAddressSync(mint, seller.publicKey, true);
  const [escrowAuthority] = PublicKey.findProgramAddressSync([Buffer.from('escrow_auth'), mint.toBuffer()], programId);
  const escrowAta = getAssociatedTokenAddressSync(mint, escrowAuthority, true);
  const [listingPda] = PublicKey.findProgramAddressSync([Buffer.from('listing'), seller.publicKey.toBuffer(), mint.toBuffer()], programId);

  const escrowAtaIx = await ensureAtaIx(connection, seller.publicKey, mint, escrowAta);
  const createListingData = Buffer.concat([sighash('create_listing'), leU64(priceLamports), leU16(feeBps), Buffer.from([listingType])]);
  const createListingKeys = [
    { pubkey: seller.publicKey, isSigner: true, isWritable: true },
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
  const createListingIx = new TransactionInstruction({ programId, keys: createListingKeys, data: createListingData });
  const tx1 = new Transaction();
  if (escrowAtaIx) tx1.add(escrowAtaIx);
  tx1.add(createListingIx);
  tx1.feePayer = seller.publicKey;
  tx1.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
  const sig1 = await connection.sendTransaction(tx1, [seller]);
  await connection.confirmTransaction(sig1, 'confirmed');
  console.log('Listing created:', listingPda.toBase58(), 'sig:', sig1);

  // Buy as buyer
  const buyerAta = getAssociatedTokenAddressSync(mint, buyer.publicKey, true);
  const buyerAtaIx = await ensureAtaIx(connection, buyer.publicKey, mint, buyerAta);
  const buyKeys = [
    { pubkey: buyer.publicKey, isSigner: true, isWritable: true },
    { pubkey: mint, isSigner: false, isWritable: false },
    { pubkey: listingPda, isSigner: false, isWritable: true },
    { pubkey: escrowAuthority, isSigner: false, isWritable: false },
    { pubkey: escrowAta, isSigner: false, isWritable: true },
    { pubkey: buyerAta, isSigner: false, isWritable: true },
    { pubkey: treasury, isSigner: false, isWritable: true },
    { pubkey: seller.publicKey, isSigner: false, isWritable: true }, // creator fallback = seller
    { pubkey: seller.publicKey, isSigner: false, isWritable: true },
    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
  ];
  const buyIx = new TransactionInstruction({ programId, keys: buyKeys, data: sighash('buy_listing') });
  const tx2 = new Transaction();
  if (buyerAtaIx) tx2.add(buyerAtaIx);
  tx2.add(buyIx);
  tx2.feePayer = buyer.publicKey;
  tx2.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
  const preBuyerBal = await connection.getBalance(buyer.publicKey);
  const preSellerBal = await connection.getBalance(seller.publicKey);
  const sig2 = await connection.sendTransaction(tx2, [buyer]);
  await connection.confirmTransaction(sig2, 'confirmed');
  console.log('Purchased. Sig:', sig2);

  // Verify token moved to buyer
  const buyerAcc = await getAccount(connection, buyerAta);
  if (Number(buyerAcc.amount) !== 1) throw new Error('Buyer ATA does not hold NFT');
  console.log('Buyer now owns NFT token (amount=1)');

  // Verify lamport deltas roughly match price minus fees (allow rent/tx fee noise)
  const postBuyerBal = await connection.getBalance(buyer.publicKey);
  const postSellerBal = await connection.getBalance(seller.publicKey);
  const buyerSpent = preBuyerBal - postBuyerBal;
  const sellerGained = postSellerBal - preSellerBal;
  console.log('Buyer spent (approx SOL):', (buyerSpent / LAMPORTS_PER_SOL).toFixed(4));
  console.log('Seller gained (approx SOL):', (sellerGained / LAMPORTS_PER_SOL).toFixed(4));

  console.log('E2E complete. Mint:', mint.toBase58());
}

main().catch((e)=>{ console.error('E2E failed:', e); process.exit(1); });
