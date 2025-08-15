import React, { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import ListNFTForm from '@/components/marketplace/ListNFTForm';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { fetchUserAgentNfts } from '@/lib/nft/fetchUserAgentNfts';
import { PublicKey } from '@solana/web3.js';

const WalletMultiButton = dynamic(
  async () => (await import('@solana/wallet-adapter-react-ui')).WalletMultiButton,
  { ssr: false }
);

export default function Page() {
  const { connection } = useConnection();
  const { publicKey } = useWallet();
  const [nfts, setNfts] = useState<{ mint: string; name?: string }[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        // Prefer real wallet-owned NFTs on devnet
        if (publicKey) {
          const list = await fetchUserAgentNfts(connection, publicKey as PublicKey);
          if (list && list.length) {
            setNfts(list.map((n) => ({ mint: n.mint, name: n.name })));
            return;
          }
        }
        // Fallback: allow preset mint for testing/demo via env
        const presetMint = process.env.NEXT_PUBLIC_NEN_LIST_MINT;
        if (presetMint) setNfts([{ mint: presetMint }]);
      } finally {
        setLoading(false);
      }
    })();
  }, [connection, publicKey]);

  // Submission handled inside ListNFTForm via client lib

  return (
    <div className="max-w-xl mx-auto p-6 space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Marketplace - List NFT</h2>
        <WalletMultiButton />
      </div>
  {loading ? (
    <div>Loading your NFTs…</div>
  ) : (
    <ListNFTForm nfts={nfts} />
  )}
    </div>
  );
}
