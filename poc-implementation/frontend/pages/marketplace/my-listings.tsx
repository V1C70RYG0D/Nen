import React, { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';

const WalletMultiButton = dynamic(
  async () => (await import('@solana/wallet-adapter-react-ui')).WalletMultiButton,
  { ssr: false }
);

type Listing = {
  pubkey: string;
  seller: string;
  mint: string;
  price: string;
  status: number;
  expiresAt: number;
};

export default function MyListingsPage() {
  const { connection } = useConnection();
  const { publicKey } = useWallet();
  const [items, setItems] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(false);
  const programId = useMemo(() => {
    const pid = process.env.NEXT_PUBLIC_NEN_MARKETPLACE_PROGRAM_ID || process.env.NEN_MARKETPLACE_PROGRAM_ID;
    return pid ? new PublicKey(pid) : null;
  }, []);

  useEffect(() => {
    if (!publicKey || !programId) return;
    (async () => {
      setLoading(true);
      try {
        const accounts = await connection.getProgramAccounts(programId, {
          commitment: 'confirmed',
        });
        const out: Listing[] = [];
        for (const acc of accounts) {
          const data = acc.account.data as Buffer;
          if (data.length < 8) continue;
          const off = 8; // skip anchor discriminator
          try {
            const seller = new PublicKey(data.slice(off + 0, off + 32));
            const mint = new PublicKey(data.slice(off + 32, off + 64));
            const price = Number(data.readBigUInt64LE(off + 128));
            const expiresAt = Number(data.readBigInt64LE(off + 146));
            const status = data.readUInt8(off + 154);
            if (!seller.equals(publicKey)) continue;
            out.push({
              pubkey: acc.pubkey.toBase58(),
              seller: seller.toBase58(),
              mint: mint.toBase58(),
              price: (price / 1_000_000_000).toFixed(4) + ' SOL',
              status,
              expiresAt,
            });
          } catch (_) {}
        }
        setItems(out);
      } finally {
        setLoading(false);
      }
    })();
  }, [publicKey, programId, connection]);

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">My Listings</h2>
        <WalletMultiButton />
      </div>
      {!programId && <div className="text-red-600">Program ID not set (NEXT_PUBLIC_NEN_MARKETPLACE_PROGRAM_ID)</div>}
      {loading ? <div>Loading…</div> : (
        <div className="space-y-2">
          {items.length === 0 ? <div>No listings found for this wallet.</div> : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b">
                  <th className="py-2">Listing PDA</th>
                  <th>Mint</th>
                  <th>Price</th>
                  <th>Status</th>
                  <th>Expires</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it) => (
                  <tr key={it.pubkey} className="border-b">
                    <td className="py-2">
                      <a className="text-indigo-600 underline" href={`https://explorer.solana.com/address/${it.pubkey}?cluster=devnet`} target="_blank" rel="noreferrer">{it.pubkey.slice(0, 8)}…</a>
                    </td>
                    <td>
                      <a className="text-indigo-600 underline" href={`https://explorer.solana.com/address/${it.mint}?cluster=devnet`} target="_blank" rel="noreferrer">{it.mint.slice(0, 8)}…</a>
                    </td>
                    <td>{it.price}</td>
                    <td>{it.status}</td>
                    <td>{new Date(it.expiresAt * 1000).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
