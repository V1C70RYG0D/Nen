import { Connection, PublicKey } from '@solana/web3.js';
import { Metaplex } from '@metaplex-foundation/js';

export type AgentAttribute = { trait_type?: string; value?: any };
export interface AgentNftSummary {
  mint: string;
  name: string;
  symbol: string;
  uri: string;
  image?: string | null;
  attributes?: AgentAttribute[];
  sellerFeeBasisPoints?: number;
  updateAuthority?: string;
  performance?: { elo?: number; winRate?: number; totalMatches?: number };
  traits?: { personality?: string; openings?: string };
  modelHash?: string | null;
}

function parseAttributes(attrs: AgentAttribute[] | undefined) {
  if (!attrs) return {} as any;
  const get = (key: string) => attrs.find(a => (a?.trait_type || '').toLowerCase() === key.toLowerCase())?.value;
  const elo = Number(get('ELO')) || Number(get('elo')) || undefined;
  const winRate = Number(get('Win Rate')) || Number(get('win_rate')) || undefined;
  const totalMatches = Number(get('Total Matches')) || Number(get('matches')) || undefined;
  const personality = (get('Personality') || get('personality')) as string | undefined;
  const openings = (get('Openings') || get('openings')) as string | undefined;
  const modelHash = (get('Model Hash') || get('model_hash')) as string | undefined;
  return { performance: { elo, winRate, totalMatches }, traits: { personality, openings }, modelHash };
}

export async function fetchUserAgentNfts(connection: Connection, owner: PublicKey): Promise<AgentNftSummary[]> {
  const symbolFilter = process.env.NEXT_PUBLIC_AGENT_NFT_SYMBOL || 'NENAI';
  const mx = Metaplex.make(connection);
  const metadataAccounts = await mx.nfts().findAllByOwner({ owner });
  const nfts = await Promise.all(
    metadataAccounts.map(async (md) => {
      try {
        // Load full NFT regardless of whether findAllByOwner returned Metadata or an already-loaded Nft/Sft model
        const nft = await (async () => {
          const anyMd = md as any;
          // If it's already an Nft/Sft model, resolve by mint address
          if (anyMd && typeof anyMd === 'object' && 'model' in anyMd && anyMd.model !== 'metadata') {
            const mintAddress = (anyMd.address ?? anyMd.mintAddress) as PublicKey;
            return await mx.nfts().findByMint({ mintAddress });
          }
          // Otherwise treat it as Metadata
          return await mx.nfts().load({ metadata: md as any });
        })();
        if (!nft || typeof nft.symbol !== 'string') return null;
        // Filter by configured symbol
        if (nft.symbol !== symbolFilter) return null;
        // Attempt to fetch JSON metadata
        let json: any = undefined;
        try {
          const r = await fetch(nft.uri);
          if (r.ok) json = await r.json();
        } catch (_) {}
        const attributes: AgentAttribute[] | undefined = json?.attributes || undefined;
        const parsed = parseAttributes(attributes);
        const image = json?.image || undefined;
        return {
          mint: nft.address.toBase58(),
          name: nft.name,
          symbol: nft.symbol,
          uri: nft.uri,
          image: image ?? null,
          attributes,
          sellerFeeBasisPoints: nft.sellerFeeBasisPoints,
          updateAuthority: nft.updateAuthorityAddress?.toBase58(),
          ...parsed,
        } as AgentNftSummary;
      } catch {
        return null;
      }
    })
  );
  return nfts.filter(Boolean) as AgentNftSummary[];
}
