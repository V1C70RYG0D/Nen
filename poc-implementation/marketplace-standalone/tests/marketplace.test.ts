import anchorPkg from "@coral-xyz/anchor";
const { AnchorProvider, BN } = anchorPkg as any;
const anchor = anchorPkg as any;
import { Keypair, PublicKey, SystemProgram } from "@solana/web3.js";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  createMint,
  getAssociatedTokenAddress,
  getOrCreateAssociatedTokenAccount,
  mintTo,
} from "@solana/spl-token";

type AnyProgram = any;

describe("nen_marketplace (standalone)", () => {
  const provider = AnchorProvider.local();
  anchor.setProvider(provider);

  let marketplace: AnyProgram;

  const seller = (provider.wallet as any).payer as Keypair;

  let mintPk: PublicKey;
  let sellerAta: PublicKey;
  let escrowAuthority: PublicKey;
  let escrowAta: PublicKey;
  let listingPda: PublicKey;

  it("initializes program client", async () => {
    const programId = new PublicKey("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS");
    const idl = await anchor.Program.fetchIdl(programId, provider);
    if (!idl) throw new Error("IDL not found on chain for nen_marketplace");
    marketplace = new anchor.Program(idl as any, programId, provider);
  });

  it("prepares NFT and PDAs", async () => {
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

    // PDAs
    [escrowAuthority] = PublicKey.findProgramAddressSync(
      [Buffer.from("escrow_auth"), mintPk.toBuffer()],
      marketplace.programId
    );
    escrowAta = await getAssociatedTokenAddress(
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

  it("rejects invalid params", async () => {
    // fee_bps > 1000
    await assertTxFail(
      marketplace.methods
        .createListing(new BN(1), 1001, { fixedPrice: {} })
        .accounts({
          seller: seller.publicKey,
          mint: mintPk,
          sellerTokenAccount: sellerAta,
          escrowAuthority,
          escrowTokenAccount: escrowAta,
          listing: listingPda,
          systemProgram: SystemProgram.programId,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          rent: anchor.web3.SYSVAR_RENT_PUBKEY,
        }),
      "invalid"
    );

    // price == 0
    await assertTxFail(
      marketplace.methods
        .createListing(new BN(0), 100, { fixedPrice: {} })
        .accounts({
          seller: seller.publicKey,
          mint: mintPk,
          sellerTokenAccount: sellerAta,
          escrowAuthority,
          escrowTokenAccount: escrowAta,
          listing: listingPda,
          systemProgram: SystemProgram.programId,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          rent: anchor.web3.SYSVAR_RENT_PUBKEY,
        }),
      "invalid"
    );
  });

  it("creates and cancels a listing (escrow roundtrip)", async () => {
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
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      })
      .signers([seller])
      .rpc();

    const sellerBalAfter = await provider.connection
      .getTokenAccountBalance(sellerAta)
      .catch(() => ({ value: { amount: "0" } } as any));
    const escrowBalAfter = await provider.connection
      .getTokenAccountBalance(escrowAta)
      .catch(() => ({ value: { amount: "0" } } as any));
    if (sellerBalAfter?.value?.amount !== undefined) {
      if (sellerBalAfter.value.amount !== "0") {
        throw new Error("Seller ATA should be empty after listing creation");
      }
    }
    if (escrowBalAfter?.value?.amount !== undefined) {
      if (escrowBalAfter.value.amount !== "1") {
        throw new Error(
          "Escrow ATA should hold 1 token after listing creation"
        );
      }
    }

    await marketplace.methods
      .cancelListing()
      .accounts({
        seller: seller.publicKey,
        mint: mintPk,
        listing: listingPda,
        escrowAuthority,
        escrowTokenAccount: escrowAta,
        sellerTokenAccount: sellerAta,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([seller])
      .rpc();

    const sellerBalFinal = await provider.connection.getTokenAccountBalance(
      sellerAta
    );
    if (sellerBalFinal.value.amount !== "1") {
      throw new Error("Seller ATA should hold 1 token after cancel");
    }
  });
});

async function assertTxFail(builder: any, contains: string) {
  try {
    await builder.rpc();
    throw new Error("Expected transaction to fail but it succeeded");
  } catch (e: any) {
    if (!`${e}`.toLowerCase().includes(contains.toLowerCase())) {
      throw e;
    }
  }
}


