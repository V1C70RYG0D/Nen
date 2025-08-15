import anchorPkg from "@coral-xyz/anchor";
const { AnchorProvider, BN } = anchorPkg as any;
const anchor = anchorPkg as any;
import { Keypair, PublicKey, SystemProgram } from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  createMint,
  getAssociatedTokenAddress,
  getOrCreateAssociatedTokenAccount,
  mintTo,
} from "@solana/spl-token";

type AnyProgram = any;

describe("nen_marketplace (program workspace)", () => {
  const provider = AnchorProvider.local();
  anchor.setProvider(provider);

  let marketplace: AnyProgram;

  const seller = (provider.wallet as any).payer as Keypair;
  const buyer = Keypair.generate();

  let mintPk: PublicKey;
  let sellerAta: PublicKey;
  let buyerAta: PublicKey;
  let escrowAuthority: PublicKey;
  let escrowAta: PublicKey;
  let listingPda: PublicKey;

  it("initializes program client", async () => {
    const programId = new PublicKey("8FbcrTGS9wQCyC99h5jbHx2bzZjYfkGERSMCjmYBDisH");
    const idl = await anchor.Program.fetchIdl(programId, provider);
    if (!idl) throw new Error("IDL not found on chain for nen_marketplace");
    marketplace = new anchor.Program(idl as any, programId, provider);
  });

  it("prepares NFT, buyer lamports, and PDAs", async () => {
    // Fund buyer
    const sig = await provider.connection.requestAirdrop(buyer.publicKey, 5_000_000_000);
    await provider.connection.confirmTransaction(sig);

    // Create mint (0 decimals) and mint 1 to seller
    mintPk = await createMint(
      provider.connection,
      seller,
      seller.publicKey,
      null,
      0
    );

    sellerAta = await getAssociatedTokenAddress(mintPk, seller.publicKey);
    await getOrCreateAssociatedTokenAccount(
      provider.connection,
      seller,
      mintPk,
      seller.publicKey
    );
    await mintTo(
      provider.connection,
      seller,
      mintPk,
      sellerAta,
      seller,
      1
    );

    [escrowAuthority] = PublicKey.findProgramAddressSync(
      [Buffer.from("escrow_auth"), mintPk.toBuffer()],
      marketplace.programId
    );
    escrowAta = await getAssociatedTokenAddress(mintPk, escrowAuthority, true);
    await getOrCreateAssociatedTokenAccount(
      provider.connection,
      seller,
      mintPk,
      escrowAuthority,
      true
    );

    [listingPda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("listing"),
        seller.publicKey.toBuffer(),
        mintPk.toBuffer(),
      ],
      marketplace.programId
    );
  });

  it("creates a listing and completes a sale", async () => {
    const price = new BN(1_000_000_000); // 1 SOL
    const feeBps = 250; // 2.5%

    await marketplace.methods
      .createListing(price, feeBps, { fixedPrice: {} })
      .accounts({
        seller: seller.publicKey,
        mint: mintPk,
        sellerTokenAccount: sellerAta,
        escrowAuthority,
        escrowTokenAccount: escrowAta,
        listing: listingPda,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([seller])
      .rpc();

    // Prepare buyer ATA
    buyerAta = await getAssociatedTokenAddress(mintPk, buyer.publicKey);
    await getOrCreateAssociatedTokenAccount(
      provider.connection,
      buyer,
      mintPk,
      buyer.publicKey
    );

    // Pseudo recipients for fee/royalty
    const treasury = Keypair.generate();
    const creator = Keypair.generate();

    // Buy listing
    await marketplace.methods
      .buyListing()
      .accounts({
        buyer: buyer.publicKey,
        mint: mintPk,
        listing: listingPda,
        escrowAuthority,
        escrowTokenAccount: escrowAta,
        buyerTokenAccount: buyerAta,
        treasury: treasury.publicKey,
        creator: creator.publicKey,
        sellerAccount: seller.publicKey,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([buyer])
      .rpc();

    const buyerBal = await provider.connection.getTokenAccountBalance(buyerAta).catch(() => ({ value: { amount: "0" } } as any));
    if (buyerBal?.value?.amount !== "1") {
      throw new Error("Buyer ATA should hold 1 token after purchase");
    }
  });
});


