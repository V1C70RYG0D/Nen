import { Connection, PublicKey, SystemProgram, Transaction, TransactionInstruction } from '@solana/web3.js';
import { Metaplex, walletAdapterIdentity } from '@metaplex-foundation/js';

export interface MintAgentParams {
  connection: Connection;
  walletAdapter: any; // Wallet adapter implementing signTransaction
  owner: PublicKey; // final NFT owner
  metadataUrl: string; // URL returned by backend /api/nft-metadata
  name: string;
  symbol: string;
  sellerFeeBasisPoints?: number; // default 500 (5%)
  creators?: { address: PublicKey; share: number; verified?: boolean }[];
  mintFeeLamports: number; // 0.1 SOL in lamports
  treasury: PublicKey; // fee recipient
}

export async function mintAgentNft(params: MintAgentParams) {
  const {
    connection, walletAdapter, owner, metadataUrl, name, symbol,
    sellerFeeBasisPoints = 500,
    creators = [],
    mintFeeLamports,
    treasury,
  } = params;

  // 1) Transfer mint fee to treasury
  const feeIx = SystemProgram.transfer({
    fromPubkey: owner,
    toPubkey: treasury,
    lamports: mintFeeLamports,
  });
  const { blockhash } = await connection.getLatestBlockhash('finalized');
  const feeTx = new Transaction({ recentBlockhash: blockhash, feePayer: owner }).add(feeIx);
  const signedFee = await walletAdapter.signTransaction(feeTx);
  const feeSig = await connection.sendRawTransaction(signedFee.serialize(), { skipPreflight: false });
  await connection.confirmTransaction(feeSig, 'confirmed');

  // 2) Mint NFT via Metaplex SDK (Metaplex v1 js SDK)
  const metaplex = Metaplex.make(connection).use(walletAdapterIdentity(walletAdapter));

  const { nft, response } = await metaplex.nfts().create({
    uri: metadataUrl,
    name,
    symbol,
    sellerFeeBasisPoints,
    isMutable: false,
    tokenOwner: owner,
    // Ensure the user's wallet is the update authority (mint authority semantics for NFTs)
    updateAuthority: walletAdapter,
    creators: creators.map(c => ({ address: c.address, share: c.share, verified: !!c.verified })),
  });

  // 3) Emit an on-chain memo event to signal NFT minted (devnet event log)
  try {
    const memoProgramId = new PublicKey('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr');
    const memoData = Buffer.from(`NEN:NFT_MINTED:${nft.address.toBase58()}`);
    const memoIx = new TransactionInstruction({ keys: [], programId: memoProgramId, data: memoData });
    const { blockhash: memoBh } = await connection.getLatestBlockhash('finalized');
    const memoTx = new Transaction({ recentBlockhash: memoBh, feePayer: owner }).add(memoIx);
    const signedMemo = await walletAdapter.signTransaction(memoTx);
    const memoSig = await connection.sendRawTransaction(signedMemo.serialize(), { skipPreflight: true });
    await connection.confirmTransaction(memoSig, 'confirmed');
  } catch (e) {
    // Non-fatal if memo fails; continue
    // eslint-disable-next-line no-console
    console.warn('Memo emit failed (non-fatal):', (e as Error)?.message || e);
  }

  return {
    mintAddress: nft.address.toBase58(),
    metadataAddress: nft.metadataAddress.toBase58(),
    editionAddress: nft.edition.address.toBase58(),
    createSig: response.signature,
    feeSig,
  };
}
