#!/usr/bin/env node
/*
  Devnet AI Agent NFT Mint Script
  - Creates metadata via backend real-devnet server
  - Transfers 0.1 SOL mint fee to treasury
  - Mints NFT using Metaplex with 5% seller fee and user as update authority
*/

const { Connection, Keypair, LAMPORTS_PER_SOL, PublicKey, SystemProgram, Transaction } = require('@solana/web3.js');
const { Metaplex, keypairIdentity } = require('@metaplex-foundation/js');

async function main() {
  const RPC = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.devnet.solana.com';
  const connection = new Connection(RPC, { commitment: 'confirmed' });

  // Payer setup (expects funded devnet wallet)
  let payer;
  if (process.env.PAYER_SECRET_KEY_JSON_PATH) {
    const fs = require('fs');
    const arr = JSON.parse(fs.readFileSync(process.env.PAYER_SECRET_KEY_JSON_PATH, 'utf8'));
    payer = Keypair.fromSecretKey(Uint8Array.from(arr));
    console.log('Payer (json file):', payer.publicKey.toBase58());
  } else if (process.env.PAYER_SECRET_KEY_B58) {
    const bs58 = require('bs58');
    payer = Keypair.fromSecretKey(Buffer.from(bs58.decode(process.env.PAYER_SECRET_KEY_B58)));
    console.log('Payer (env):', payer.publicKey.toBase58());
  } else {
    // Generate ephemeral payer and airdrop on devnet
    payer = Keypair.generate();
    console.log('Payer (ephemeral):', payer.publicKey.toBase58());
    const airdropSig = await connection.requestAirdrop(payer.publicKey, 2 * LAMPORTS_PER_SOL);
    await connection.confirmTransaction(airdropSig, 'confirmed');
    console.log('Airdropped 2 SOL to payer. Sig:', airdropSig);
  }
  const bal = await connection.getBalance(payer.publicKey, 'confirmed');
  console.log('Payer balance (SOL):', bal / LAMPORTS_PER_SOL);

  // Treasury setup
  let treasuryPubkey;
  if (process.env.NEXT_PUBLIC_TREASURY_PUBLIC_KEY) {
    treasuryPubkey = new PublicKey(process.env.NEXT_PUBLIC_TREASURY_PUBLIC_KEY);
  } else {
    const treasury = Keypair.generate();
    treasuryPubkey = treasury.publicKey;
    console.log('Generated test treasury address:', treasuryPubkey.toBase58());
  }

  // Create metadata via backend
  const backend = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
  const modelHash = 'Qm' + Math.random().toString(36).slice(2).padEnd(44, 'x');
  const metaBody = {
    name: 'Nen Agent #' + Math.floor(Math.random() * 100000),
    symbol: 'NENAI',
    description: 'AI Agent NFT trained on real on-chain replays',
    attributes: [
      { trait_type: 'ELO', value: 2100 },
      { trait_type: 'Win Rate', value: 0.76 },
      { trait_type: 'Total Matches', value: 150 },
      { trait_type: 'Personality', value: 'Aggressive' },
      { trait_type: 'Openings', value: 'Sicilian Defense' },
      { trait_type: 'Model Hash', value: modelHash },
    ],
    ai: {
      performance: { elo: 2100, winRate: 0.76, totalMatches: 150 },
      traits: { personality: 'Aggressive', openings: 'Sicilian Defense' },
    },
    modelHash,
  };
  const metaResp = await fetch(`${backend}/api/nft-metadata`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(metaBody)
  });
  if (!metaResp.ok) {
    const err = await metaResp.text();
    throw new Error('Metadata create failed: ' + err);
  }
  const metaJson = await metaResp.json();
  const metadataUrl = metaJson.url;
  console.log('Metadata URL:', metadataUrl);

  // Transfer mint fee 0.1 SOL
  const { blockhash } = await connection.getLatestBlockhash('finalized');
  const feeIx = SystemProgram.transfer({ fromPubkey: payer.publicKey, toPubkey: treasuryPubkey, lamports: 0.1 * LAMPORTS_PER_SOL });
  const feeTx = new Transaction({ recentBlockhash: blockhash, feePayer: payer.publicKey }).add(feeIx);
  const feeSig = await connection.sendTransaction(feeTx, [payer], { skipPreflight: false });
  await connection.confirmTransaction(feeSig, 'confirmed');
  console.log('Fee transferred, sig:', feeSig);

  // Mint NFT via Metaplex (optionally set a target owner so the NFT shows up in your wallet)
  const metaplex = Metaplex.make(connection).use(keypairIdentity(payer));
  const targetOwnerStr = process.env.TARGET_NFT_OWNER_PUBLIC_KEY;
  const tokenOwner = targetOwnerStr ? new PublicKey(targetOwnerStr) : payer.publicKey;
  const { nft, response } = await metaplex.nfts().create({
    uri: metadataUrl,
    name: metaBody.name,
    symbol: metaBody.symbol,
    sellerFeeBasisPoints: 500,
    isMutable: false,
    tokenOwner,
    updateAuthority: payer,
    creators: [{ address: payer.publicKey, share: 100, verified: true }],
  });

  console.log('Minted NFT mint:', nft.address.toBase58());
  console.log('Create signature:', response.signature);
  console.log('Explorer:', `https://explorer.solana.com/tx/${response.signature}?cluster=devnet`);

  // Emit memo event for indexing
  try {
    const memoProgramId = new PublicKey('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr');
    const memoTx = new Transaction().add({
      keys: [],
      programId: memoProgramId,
      data: Buffer.from(`NEN:NFT_MINTED:${nft.address.toBase58()}`),
    });
    memoTx.feePayer = payer.publicKey;
    const { blockhash: memoBh } = await connection.getLatestBlockhash('finalized');
    memoTx.recentBlockhash = memoBh;
    const memoSig = await connection.sendTransaction(memoTx, [payer], { skipPreflight: true });
    await connection.confirmTransaction(memoSig, 'confirmed');
    console.log('Memo emitted:', memoSig);
  } catch (e) {
    console.warn('Memo emit failed (non-fatal):', e.message || e);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
