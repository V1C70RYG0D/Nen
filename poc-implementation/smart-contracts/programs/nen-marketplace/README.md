# Nen Marketplace Program (Devnet)

Implements listing NFTs for sale with escrow PDA, 30-day expiry, and listing events.

- create_listing: Moves NFT to escrow ATA, stores price, fee_bps (use 250 for 2.5%), sets expiration 30 days.
- cancel_listing: Returns NFT to seller.

Setup:
- Build: from smart-contracts: anchor build -p nen-marketplace
- Deploy: anchor deploy -p nen-marketplace (update program id in Anchor.toml and lib.rs)

Client E2E:
- Set env vars in project .env
- npm run market:list

Security: Uses associated token account for escrow authority PDA, no hardcoded addresses.
