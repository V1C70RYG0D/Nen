import React, { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import toast from 'react-hot-toast';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { Connection, LAMPORTS_PER_SOL, PublicKey, SystemProgram, Transaction, TransactionInstruction } from '@solana/web3.js';
import { ASSOCIATED_TOKEN_PROGRAM_ID, TOKEN_PROGRAM_ID, createAssociatedTokenAccountInstruction, getAccount, getAssociatedTokenAddressSync } from '@solana/spl-token';
import { Metaplex, walletAdapterIdentity } from '@metaplex-foundation/js';
import { sha256 } from '@noble/hashes/sha256';

const WalletMultiButton = dynamic(async () => (await import('@solana/wallet-adapter-react-ui')).WalletMultiButton, { ssr: false });

type ListingRow = {
  pubkey: PublicKey;
  seller: PublicKey;
  mint: PublicKey;
  escrowAuthority: PublicKey;
  escrowAta: PublicKey;
  priceLamports: number;
  feeBps: number;
  expiresAt: number;
  status: number;
  type: number;
};

function parseListing(acc: { pubkey: PublicKey; data: Buffer }): ListingRow | null {
  const data = acc.data;
  if (data.length < 8 + 156) return null;
  const off = 8;
  const seller = new PublicKey(data.slice(off + 0, off + 32));
  const mint = new PublicKey(data.slice(off + 32, off + 64));
  const escrowAuthority = new PublicKey(data.slice(off + 64, off + 96));
  const escrowAta = new PublicKey(data.slice(off + 96, off + 128));
  const priceLamports = Number(data.readBigUInt64LE(off + 128));
  const feeBps = data.readUInt16LE(off + 136);
  const expiresAt = Number(data.readBigInt64LE(off + 146));
  const status = data.readUInt8(off + 154);
  const type = data.readUInt8(off + 155);
  return { pubkey: acc.pubkey, seller, mint, escrowAuthority, escrowAta, priceLamports, feeBps, expiresAt, status, type };
}

function sighash(name: string): Buffer {
  const pre = Buffer.from(`global:${name}`);
  const h = sha256(pre);
  return Buffer.from(h).subarray(0, 8);
}

async function ensureAta(connection: Connection, owner: PublicKey, mint: PublicKey, payer: PublicKey, signAndSend: (tx: Transaction) => Promise<string>) {
  const ata = getAssociatedTokenAddressSync(mint, owner, true);
  try { await getAccount(connection, ata); } catch {
    const ix = createAssociatedTokenAccountInstruction(payer, ata, owner, mint, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID);
    const tx = new Transaction().add(ix);
    const sig = await signAndSend(tx);
    await connection.confirmTransaction(sig, 'confirmed');
  }
  return ata;
}

export default function MarketplaceListings() {
  const { connection } = useConnection();
  const { publicKey, signTransaction, sendTransaction } = useWallet();
  const [rows, setRows] = useState<ListingRow[]>([]);
  const [loading, setLoading] = useState(false);

  const programId = useMemo(() => {
    const pid = process.env.NEXT_PUBLIC_NEN_MARKETPLACE_PROGRAM_ID || process.env.NEN_MARKETPLACE_PROGRAM_ID;
    try { return pid ? new PublicKey(pid) : null; } catch { return null; }
  }, []);
  const treasury = useMemo(() => {
    const t = process.env.NEXT_PUBLIC_TREASURY_PUBLIC_KEY as string | undefined;
    try { return t ? new PublicKey(t) : null; } catch { return null; }
  }, []);

  useEffect(() => {
    if (!programId) return;
    (async () => {
      setLoading(true);
      try {
        const accts = await connection.getProgramAccounts(programId, { commitment: 'confirmed' });
        const list: ListingRow[] = [];
        for (const a of accts) {
          const row = parseListing({ pubkey: a.pubkey, data: Buffer.from(a.account.data as Buffer) });
          if (row && row.status === 0) list.push(row);
        }
        setRows(list);
      } finally { setLoading(false); }
    })();
  }, [connection, programId]);

  const onBuy = async (row: ListingRow) => {
    try {
      if (!programId) { toast.error('Program ID not set'); return; }
      if (!treasury) { toast.error('Treasury not configured'); return; }
      if (!publicKey || !signTransaction) { toast.error('Connect wallet'); return; }

      // Balance check
      const bal = await connection.getBalance(publicKey, 'confirmed');
      if (bal < row.priceLamports) { toast.error('Insufficient SOL'); return; }

      // Creator resolution via Metaplex metadata
      const mx = Metaplex.make(connection).use(walletAdapterIdentity({ publicKey, signTransaction } as any));
      let creator: PublicKey = row.seller;
      try {
        const nft = await mx.nfts().findByMint({ mintAddress: row.mint });
        if (nft.creators && nft.creators.length > 0) {
          const sorted = [...nft.creators].sort((a, b) => (b.share ?? 0) - (a.share ?? 0));
          creator = new PublicKey(sorted[0].address);
        } else if (nft.updateAuthorityAddress) {
          creator = new PublicKey(nft.updateAuthorityAddress);
        }
      } catch {
        // fallback already set
      }

      // Ensure buyer ATA
      const buyerAta = await ensureAta(connection, publicKey, row.mint, publicKey, async (tx: Transaction) => {
        tx.feePayer = publicKey;
        tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
        const signed = await signTransaction(tx);
        const sig = await connection.sendRawTransaction(signed.serialize());
        return sig;
      });

      // Build buy instruction
      const data = sighash('buy_listing');
      const keys = [
        { pubkey: publicKey, isSigner: true, isWritable: true },
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
      const ix = new TransactionInstruction({ programId, keys, data });
      const tx = new Transaction().add(ix);
      const sig = await sendTransaction(tx, connection, { preflightCommitment: 'confirmed' });
      await connection.confirmTransaction(sig, 'confirmed');

      // Verify transfer
      const buyerToken = await connection.getTokenAccountBalance(buyerAta, 'confirmed').catch(()=>null);
      const bought = buyerToken && Number(buyerToken.value.amount) >= 1;
      if (bought) {
        toast.success('Purchase complete');
        toast.success(`Explorer: https://explorer.solana.com/tx/${sig}?cluster=devnet`);
      } else {
        toast('Transaction sent; awaiting finalization');
      }

      // Refresh listings
      setRows((prev) => prev.filter((r) => r.pubkey.toBase58() !== row.pubkey.toBase58()));
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || 'Purchase failed');
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Marketplace Listings (Devnet)</h1>
        <WalletMultiButton />
      </div>
      {!programId && (
        <div className="p-3 bg-red-900/40 border border-red-700 text-sm">Program ID not configured. Set NEXT_PUBLIC_NEN_MARKETPLACE_PROGRAM_ID.</div>
      )}
      {!treasury && (
        <div className="p-3 bg-yellow-900/40 border border-yellow-700 text-sm">Treasury address not set. Set NEXT_PUBLIC_TREASURY_PUBLIC_KEY.</div>
      )}
      {loading ? (
        <div>Loading…</div>
      ) : rows.length === 0 ? (
        <div>No active listings found.</div>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left border-b">
              <th className="py-2">Listing</th>
              <th>Mint</th>
              <th>Price</th>
              <th>Seller</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.pubkey.toBase58()} className="border-b">
                <td className="py-2">
                  <a className="text-indigo-600 underline" href={`https://explorer.solana.com/address/${r.pubkey.toBase58()}?cluster=devnet`} target="_blank" rel="noreferrer">{r.pubkey.toBase58().slice(0,8)}…</a>
                </td>
                <td>
                  <a className="text-indigo-600 underline" href={`https://explorer.solana.com/address/${r.mint.toBase58()}?cluster=devnet`} target="_blank" rel="noreferrer">{r.mint.toBase58().slice(0,8)}…</a>
                </td>
                <td>{(r.priceLamports / LAMPORTS_PER_SOL).toFixed(4)} SOL</td>
                <td>{r.seller.toBase58().slice(0,8)}…</td>
                <td>
                  <button onClick={() => onBuy(r)} className="px-3 py-1 bg-green-600 text-white hover:bg-green-700">Buy Now</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
