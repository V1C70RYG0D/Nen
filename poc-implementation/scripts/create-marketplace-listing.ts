import { Connection, PublicKey } from '@solana/web3.js';
import { MarketplaceClient } from '../backend/src/marketplace/index';
import { Wallet } from '../backend/src/utils/wallet';

async function main() {
  const rpc = process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com';
  const programIdStr = process.env.NEN_MARKETPLACE_PROGRAM_ID;
  const keypairPath = process.env.SOLANA_KEYPAIR || './backend-wallet-devnet.json';
  const mint = process.env.NEN_TEST_NFT_MINT;
  const priceSol = parseFloat(process.env.NEN_LIST_PRICE_SOL || '0.5');
  const type = (process.env.NEN_LIST_TYPE || 'fixed') as 'fixed' | 'auction';

  if (!programIdStr) throw new Error('NEN_MARKETPLACE_PROGRAM_ID not set');
  if (!mint) throw new Error('NEN_TEST_NFT_MINT not set');

  const connection = new Connection(rpc, 'confirmed');
  const wallet = new Wallet(connection, keypairPath);
  const programId = new PublicKey(programIdStr);

  const client = new MarketplaceClient(connection, wallet, programId);
  const res = await client.createListing({ mint, priceSol, type });
  console.log(JSON.stringify(res, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
