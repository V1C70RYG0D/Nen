import React, { useMemo, useState } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import { calcMarketplaceFee, sendCreateListing } from '@/lib/marketplace/client';

export type ListingType = 'fixed' | 'auction';

export interface Props {
  nfts: { mint: string; name?: string; image?: string }[];
  onSubmit?: (args: { mint: string; price: number; type: ListingType }) => Promise<void>;
}

export default function ListNFTForm({ nfts, onSubmit }: Props) {
  const [mint, setMint] = useState(nfts[0]?.mint || '');
  const [price, setPrice] = useState('0.5');
  const [type, setType] = useState<ListingType>('fixed');
  const [status, setStatus] = useState<string | null>(null);
  const [txSig, setTxSig] = useState<string | null>(null);
  const [listingPda, setListingPda] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { connected, publicKey, sendTransaction, signTransaction } = useWallet();
  const { connection } = useConnection();

  const programId = useMemo(() => {
    const pid = process.env.NEXT_PUBLIC_NEN_MARKETPLACE_PROGRAM_ID || process.env.NEN_MARKETPLACE_PROGRAM_ID;
    return pid ? new PublicKey(pid) : null;
  }, []);

  const priceNum = parseFloat(price || '0');
  const fees = calcMarketplaceFee(isFinite(priceNum) ? priceNum : 0);

  return (
    <div className="p-4 border rounded space-y-4">
      <h3 className="text-lg font-semibold">List NFT for sale</h3>
      {!programId && (
        <div className="text-red-600 text-sm">Marketplace program ID not configured. Set NEXT_PUBLIC_NEN_MARKETPLACE_PROGRAM_ID.</div>
      )}
      <div className="space-y-2">
        <label className="block text-sm">Select NFT</label>
        <select className="w-full border p-2 rounded" value={mint} onChange={(e)=>setMint(e.target.value)}>
          {nfts.map((n) => (
            <option key={n.mint} value={n.mint}>{n.name || n.mint}</option>
          ))}
        </select>
      </div>
      <div className="space-y-2">
        <label className="block text-sm">Sale price (SOL)</label>
        <input className="w-full border p-2 rounded" value={price} onChange={(e)=>setPrice(e.target.value)} type="number" step="0.01" min="0" />
        <div className="text-xs text-gray-600">Marketplace fee (2.5%): {fees.fee.toFixed(4)} SOL • You receive: {fees.sellerReceives.toFixed(4)} SOL</div>
      </div>
      <div className="space-y-2">
        <label className="block text-sm">Format</label>
        <select className="w-full border p-2 rounded" value={type} onChange={(e)=>setType(e.target.value as ListingType)}>
          <option value="fixed">Fixed price</option>
          <option value="auction">Auction</option>
        </select>
      </div>
      <button
        disabled={!connected || !mint || !programId || loading}
        onClick={async ()=>{
          setStatus(null); setTxSig(null); setListingPda(null); setLoading(true);
          try {
            // optional external handler
            if (onSubmit) await onSubmit({ mint, price: priceNum, type });
            const res = await sendCreateListing({
              connection,
              wallet: { publicKey, sendTransaction, signTransaction } as any,
              programId: programId!,
              mint: new PublicKey(mint),
              priceSol: priceNum,
              type
            });
            setTxSig(res.signature);
            setListingPda(res.listing);
            setStatus('Listing created on devnet.');
          } catch (e: any) {
            setStatus(e?.message || 'Failed to create listing');
          } finally {
            setLoading(false);
          }
        }}
        className="bg-indigo-600 disabled:bg-gray-300 text-white px-4 py-2 rounded"
      >
        {loading ? 'Listing…' : connected ? 'List NFT' : 'Connect wallet to list'}
      </button>
      {status && (
        <div className="text-sm">
          <div>{status}</div>
          {txSig && (
            <div className="mt-2">
              <a className="text-indigo-600 underline" target="_blank" href={`https://explorer.solana.com/tx/${txSig}?cluster=devnet`} rel="noreferrer">View transaction</a>
            </div>
          )}
          {listingPda && (
            <div className="mt-1 text-xs text-gray-600">Listing: {listingPda}</div>
          )}
        </div>
      )}
    </div>
  );
}
