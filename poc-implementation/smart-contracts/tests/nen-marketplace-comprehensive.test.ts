import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Connection, PublicKey, Keypair, SystemProgram, LAMPORTS_PER_SOL, Transaction } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID, createInitializeMintInstruction, createMint, createAccount, createAssociatedTokenAccount, mintTo, getAccount } from "@solana/spl-token";
import { expect } from "chai";
import BN from "bn.js";

// Type definitions based on the Rust program
interface Listing {
  seller: PublicKey;
  mint: PublicKey;
  escrowAuthority: PublicKey;
  escrowAta: PublicKey;
  price: BN;
  feeBps: number;
  createdAt: BN;
  expiresAt: BN;
  status: any;
  listingType: any;
  bump: number;
  escrowBump: number;
}

describe("Nen Marketplace Program - Comprehensive Tests", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = new Program(
    require("../target/idl/nen_marketplace.json"),
    "8FbcrTGS9wQCyC99h5jbHx2bzZjYfkGERSMCjmYBDisH",
    provider
  );

  let seller1: Keypair;
  let seller2: Keypair;
  let buyer1: Keypair;
  let nftMint1: PublicKey;
  let nftMint2: PublicKey;
  let seller1TokenAccount: PublicKey;
  let seller2TokenAccount: PublicKey;
  let escrowAuthority1: PublicKey;
  let escrowAuthority2: PublicKey;
  let escrowTokenAccount1: PublicKey;
  let escrowTokenAccount2: PublicKey;
  let listing1Pda: PublicKey;
  let listing2Pda: PublicKey;

  before(async () => {
    seller1 = Keypair.generate();
    seller2 = Keypair.generate();
    buyer1 = Keypair.generate();

    // Airdrop SOL to test accounts
    await Promise.all([
      provider.connection.requestAirdrop(seller1.publicKey, 5 * LAMPORTS_PER_SOL),
      provider.connection.requestAirdrop(seller2.publicKey, 5 * LAMPORTS_PER_SOL),
      provider.connection.requestAirdrop(buyer1.publicKey, 5 * LAMPORTS_PER_SOL),
    ]);

    // Wait for confirmations
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Create NFT mints
    nftMint1 = await createMint(
      provider.connection,
      seller1,
      seller1.publicKey,
      null,
      0, // 0 decimals for NFT
      undefined,
      undefined,
      TOKEN_PROGRAM_ID
    );

    nftMint2 = await createMint(
      provider.connection,
      seller2,
      seller2.publicKey,
      null,
      0, // 0 decimals for NFT
      undefined,
      undefined,
      TOKEN_PROGRAM_ID
    );

    // Create associated token accounts for sellers
    seller1TokenAccount = await createAssociatedTokenAccount(
      provider.connection,
      seller1,
      nftMint1,
      seller1.publicKey
    );

    seller2TokenAccount = await createAssociatedTokenAccount(
      provider.connection,
      seller2,
      nftMint2,
      seller2.publicKey
    );

    // Mint NFTs to sellers
    await mintTo(
      provider.connection,
      seller1,
      nftMint1,
      seller1TokenAccount,
      seller1,
      1
    );

    await mintTo(
      provider.connection,
      seller2,
      nftMint2,
      seller2TokenAccount,
      seller2,
      1
    );

    // Derive escrow authorities and token accounts
    [escrowAuthority1] = PublicKey.findProgramAddressSync(
      [Buffer.from("escrow_auth"), nftMint1.toBuffer()],
      program.programId
    );

    [escrowAuthority2] = PublicKey.findProgramAddressSync(
      [Buffer.from("escrow_auth"), nftMint2.toBuffer()],
      program.programId
    );

    [escrowTokenAccount1] = PublicKey.findProgramAddressSync(
      [escrowAuthority1.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), nftMint1.toBuffer()],
      ASSOCIATED_TOKEN_PROGRAM_ID
    );

    [escrowTokenAccount2] = PublicKey.findProgramAddressSync(
      [escrowAuthority2.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), nftMint2.toBuffer()],
      ASSOCIATED_TOKEN_PROGRAM_ID
    );

    // Derive listing PDAs
    [listing1Pda] = PublicKey.findProgramAddressSync(
      [Buffer.from("listing"), seller1.publicKey.toBuffer(), nftMint1.toBuffer()],
      program.programId
    );

    [listing2Pda] = PublicKey.findProgramAddressSync(
      [Buffer.from("listing"), seller2.publicKey.toBuffer(), nftMint2.toBuffer()],
      program.programId
    );

    console.log("Test setup complete");
    console.log("Program ID:", program.programId.toString());
    console.log("NFT Mint 1:", nftMint1.toString());
    console.log("NFT Mint 2:", nftMint2.toString());
    console.log("Listing 1 PDA:", listing1Pda.toString());
    console.log("Listing 2 PDA:", listing2Pda.toString());
  });

  describe("Listing Creation", () => {
    it("Should create a fixed-price listing", async () => {
      const price = new BN(500_000_000); // 0.5 SOL
      const feeBps = 250; // 2.5%
      const listingType = { fixedPrice: {} };

      const tx = await program.methods
        .createListing(price, feeBps, listingType)
        .accounts({
          seller: seller1.publicKey,
          mint: nftMint1,
          sellerTokenAccount: seller1TokenAccount,
          escrowAuthority: escrowAuthority1,
          escrowTokenAccount: escrowTokenAccount1,
          listing: listing1Pda,
          systemProgram: SystemProgram.programId,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          rent: anchor.web3.SYSVAR_RENT_PUBKEY,
        })
        .signers([seller1])
        .rpc();

      console.log("Create listing transaction:", tx);

      // Verify listing account
      const listing = await program.account.listing.fetch(listing1Pda) as Listing;
      
      expect(listing.seller.toString()).to.equal(seller1.publicKey.toString());
      expect(listing.mint.toString()).to.equal(nftMint1.toString());
      expect(listing.price.toString()).to.equal(price.toString());
      expect(listing.feeBps).to.equal(feeBps);
      expect(listing.createdAt.toNumber()).to.be.greaterThan(0);
      expect(listing.expiresAt.toNumber()).to.be.greaterThan(listing.createdAt.toNumber());
      expect(listing.status).to.deep.equal({ active: {} });
      expect(listing.listingType).to.deep.equal(listingType);

      // Verify NFT transferred to escrow
      const escrowTokenAccountInfo = await getAccount(provider.connection, escrowTokenAccount1);
      expect(escrowTokenAccountInfo.amount.toString()).to.equal("1");

      // Verify seller token account is empty
      const sellerTokenAccountInfo = await getAccount(provider.connection, seller1TokenAccount);
      expect(sellerTokenAccountInfo.amount.toString()).to.equal("0");
    });

    it("Should create an auction listing", async () => {
      const price = new BN(1_000_000_000); // 1 SOL starting price
      const feeBps = 500; // 5%
      const listingType = { auction: {} };

      const tx = await program.methods
        .createListing(price, feeBps, listingType)
        .accounts({
          seller: seller2.publicKey,
          mint: nftMint2,
          sellerTokenAccount: seller2TokenAccount,
          escrowAuthority: escrowAuthority2,
          escrowTokenAccount: escrowTokenAccount2,
          listing: listing2Pda,
          systemProgram: SystemProgram.programId,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          rent: anchor.web3.SYSVAR_RENT_PUBKEY,
        })
        .signers([seller2])
        .rpc();

      console.log("Create auction listing transaction:", tx);

      // Verify listing account
      const listing = await program.account.listing.fetch(listing2Pda) as Listing;
      
      expect(listing.seller.toString()).to.equal(seller2.publicKey.toString());
      expect(listing.mint.toString()).to.equal(nftMint2.toString());
      expect(listing.price.toString()).to.equal(price.toString());
      expect(listing.feeBps).to.equal(feeBps);
      expect(listing.status).to.deep.equal({ active: {} });
      expect(listing.listingType).to.deep.equal(listingType);
    });

    it("Should reject listing with invalid fee percentage", async () => {
      const invalidFeeBps = 1500; // 15% (too high)
      const price = new BN(100_000_000);
      const listingType = { fixedPrice: {} };

      // Create a new NFT for this test
      const testMint = await createMint(
        provider.connection,
        seller1,
        seller1.publicKey,
        null,
        0,
        undefined,
        undefined,
        TOKEN_PROGRAM_ID
      );

      const testTokenAccount = await createAssociatedTokenAccount(
        provider.connection,
        seller1,
        testMint,
        seller1.publicKey
      );

      await mintTo(
        provider.connection,
        seller1,
        testMint,
        testTokenAccount,
        seller1,
        1
      );

      const [testEscrowAuthority] = PublicKey.findProgramAddressSync(
        [Buffer.from("escrow_auth"), testMint.toBuffer()],
        program.programId
      );

      const [testEscrowTokenAccount] = PublicKey.findProgramAddressSync(
        [testEscrowAuthority.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), testMint.toBuffer()],
        ASSOCIATED_TOKEN_PROGRAM_ID
      );

      const [testListingPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("listing"), seller1.publicKey.toBuffer(), testMint.toBuffer()],
        program.programId
      );

      try {
        await program.methods
          .createListing(price, invalidFeeBps, listingType)
          .accounts({
            seller: seller1.publicKey,
            mint: testMint,
            sellerTokenAccount: testTokenAccount,
            escrowAuthority: testEscrowAuthority,
            escrowTokenAccount: testEscrowTokenAccount,
            listing: testListingPda,
            systemProgram: SystemProgram.programId,
            tokenProgram: TOKEN_PROGRAM_ID,
            associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
            rent: anchor.web3.SYSVAR_RENT_PUBKEY,
          })
          .signers([seller1])
          .rpc();
        
        expect.fail("Should have failed with invalid fee BPS");
      } catch (error) {
        expect(error.message).to.include("InvalidFeeBps");
      }
    });

    it("Should reject listing with zero price", async () => {
      const zeroPrice = new BN(0);
      const feeBps = 250;
      const listingType = { fixedPrice: {} };

      // Create a new NFT for this test
      const testMint = await createMint(
        provider.connection,
        seller1,
        seller1.publicKey,
        null,
        0,
        undefined,
        undefined,
        TOKEN_PROGRAM_ID
      );

      const testTokenAccount = await createAssociatedTokenAccount(
        provider.connection,
        seller1,
        testMint,
        seller1.publicKey
      );

      await mintTo(
        provider.connection,
        seller1,
        testMint,
        testTokenAccount,
        seller1,
        1
      );

      const [testEscrowAuthority] = PublicKey.findProgramAddressSync(
        [Buffer.from("escrow_auth"), testMint.toBuffer()],
        program.programId
      );

      const [testEscrowTokenAccount] = PublicKey.findProgramAddressSync(
        [testEscrowAuthority.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), testMint.toBuffer()],
        ASSOCIATED_TOKEN_PROGRAM_ID
      );

      const [testListingPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("listing"), seller1.publicKey.toBuffer(), testMint.toBuffer()],
        program.programId
      );

      try {
        await program.methods
          .createListing(zeroPrice, feeBps, listingType)
          .accounts({
            seller: seller1.publicKey,
            mint: testMint,
            sellerTokenAccount: testTokenAccount,
            escrowAuthority: testEscrowAuthority,
            escrowTokenAccount: testEscrowTokenAccount,
            listing: testListingPda,
            systemProgram: SystemProgram.programId,
            tokenProgram: TOKEN_PROGRAM_ID,
            associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
            rent: anchor.web3.SYSVAR_RENT_PUBKEY,
          })
          .signers([seller1])
          .rpc();
        
        expect.fail("Should have failed with invalid price");
      } catch (error) {
        expect(error.message).to.include("InvalidPrice");
      }
    });

    it("Should reject duplicate listing for same NFT", async () => {
      const price = new BN(200_000_000);
      const feeBps = 250;
      const listingType = { fixedPrice: {} };

      try {
        await program.methods
          .createListing(price, feeBps, listingType)
          .accounts({
            seller: seller1.publicKey,
            mint: nftMint1,
            sellerTokenAccount: seller1TokenAccount,
            escrowAuthority: escrowAuthority1,
            escrowTokenAccount: escrowTokenAccount1,
            listing: listing1Pda,
            systemProgram: SystemProgram.programId,
            tokenProgram: TOKEN_PROGRAM_ID,
            associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
            rent: anchor.web3.SYSVAR_RENT_PUBKEY,
          })
          .signers([seller1])
          .rpc();
        
        expect.fail("Should have failed with duplicate listing");
      } catch (error) {
        expect(error.message).to.include("already in use");
      }
    });
  });

  describe("Listing Cancellation", () => {
    let cancelTestMint: PublicKey;
    let cancelTestTokenAccount: PublicKey;
    let cancelTestEscrowAuthority: PublicKey;
    let cancelTestEscrowTokenAccount: PublicKey;
    let cancelTestListingPda: PublicKey;

    before(async () => {
      // Create a new NFT for cancellation test
      cancelTestMint = await createMint(
        provider.connection,
        seller1,
        seller1.publicKey,
        null,
        0,
        undefined,
        undefined,
        TOKEN_PROGRAM_ID
      );

      cancelTestTokenAccount = await createAssociatedTokenAccount(
        provider.connection,
        seller1,
        cancelTestMint,
        seller1.publicKey
      );

      await mintTo(
        provider.connection,
        seller1,
        cancelTestMint,
        cancelTestTokenAccount,
        seller1,
        1
      );

      [cancelTestEscrowAuthority] = PublicKey.findProgramAddressSync(
        [Buffer.from("escrow_auth"), cancelTestMint.toBuffer()],
        program.programId
      );

      [cancelTestEscrowTokenAccount] = PublicKey.findProgramAddressSync(
        [cancelTestEscrowAuthority.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), cancelTestMint.toBuffer()],
        ASSOCIATED_TOKEN_PROGRAM_ID
      );

      [cancelTestListingPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("listing"), seller1.publicKey.toBuffer(), cancelTestMint.toBuffer()],
        program.programId
      );

      // Create the listing
      await program.methods
        .createListing(new BN(300_000_000), 250, { fixedPrice: {} })
        .accounts({
          seller: seller1.publicKey,
          mint: cancelTestMint,
          sellerTokenAccount: cancelTestTokenAccount,
          escrowAuthority: cancelTestEscrowAuthority,
          escrowTokenAccount: cancelTestEscrowTokenAccount,
          listing: cancelTestListingPda,
          systemProgram: SystemProgram.programId,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          rent: anchor.web3.SYSVAR_RENT_PUBKEY,
        })
        .signers([seller1])
        .rpc();
    });

    it("Should cancel listing and return NFT to seller", async () => {
      const tx = await program.methods
        .cancelListing()
        .accounts({
          seller: seller1.publicKey,
          mint: cancelTestMint,
          listing: cancelTestListingPda,
          escrowAuthority: cancelTestEscrowAuthority,
          escrowTokenAccount: cancelTestEscrowTokenAccount,
          sellerTokenAccount: cancelTestTokenAccount,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .signers([seller1])
        .rpc();

      console.log("Cancel listing transaction:", tx);

      // Verify listing status updated
      const listing = await program.account.listing.fetch(cancelTestListingPda) as Listing;
      expect(listing.status).to.deep.equal({ cancelled: {} });

      // Verify NFT returned to seller
      const sellerTokenAccountInfo = await getAccount(provider.connection, cancelTestTokenAccount);
      expect(sellerTokenAccountInfo.amount.toString()).to.equal("1");

      // Verify escrow account is empty
      const escrowTokenAccountInfo = await getAccount(provider.connection, cancelTestEscrowTokenAccount);
      expect(escrowTokenAccountInfo.amount.toString()).to.equal("0");
    });

    it("Should reject cancellation by non-seller", async () => {
      // Create another listing for this test
      const testMint = await createMint(
        provider.connection,
        seller2,
        seller2.publicKey,
        null,
        0,
        undefined,
        undefined,
        TOKEN_PROGRAM_ID
      );

      const testTokenAccount = await createAssociatedTokenAccount(
        provider.connection,
        seller2,
        testMint,
        seller2.publicKey
      );

      await mintTo(
        provider.connection,
        seller2,
        testMint,
        testTokenAccount,
        seller2,
        1
      );

      const [testEscrowAuthority] = PublicKey.findProgramAddressSync(
        [Buffer.from("escrow_auth"), testMint.toBuffer()],
        program.programId
      );

      const [testEscrowTokenAccount] = PublicKey.findProgramAddressSync(
        [testEscrowAuthority.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), testMint.toBuffer()],
        ASSOCIATED_TOKEN_PROGRAM_ID
      );

      const [testListingPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("listing"), seller2.publicKey.toBuffer(), testMint.toBuffer()],
        program.programId
      );

      // Create the listing
      await program.methods
        .createListing(new BN(400_000_000), 300, { fixedPrice: {} })
        .accounts({
          seller: seller2.publicKey,
          mint: testMint,
          sellerTokenAccount: testTokenAccount,
          escrowAuthority: testEscrowAuthority,
          escrowTokenAccount: testEscrowTokenAccount,
          listing: testListingPda,
          systemProgram: SystemProgram.programId,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          rent: anchor.web3.SYSVAR_RENT_PUBKEY,
        })
        .signers([seller2])
        .rpc();

      try {
        await program.methods
          .cancelListing()
          .accounts({
            seller: seller1.publicKey, // Wrong seller
            mint: testMint,
            listing: testListingPda,
            escrowAuthority: testEscrowAuthority,
            escrowTokenAccount: testEscrowTokenAccount,
            sellerTokenAccount: testTokenAccount,
            tokenProgram: TOKEN_PROGRAM_ID,
          })
          .signers([seller1])
          .rpc();
        
        expect.fail("Should have failed with unauthorized cancellation");
      } catch (error) {
        expect(error.message).to.include("Unauthorized");
      }
    });

    it("Should reject cancellation of already cancelled listing", async () => {
      try {
        await program.methods
          .cancelListing()
          .accounts({
            seller: seller1.publicKey,
            mint: cancelTestMint,
            listing: cancelTestListingPda,
            escrowAuthority: cancelTestEscrowAuthority,
            escrowTokenAccount: cancelTestEscrowTokenAccount,
            sellerTokenAccount: cancelTestTokenAccount,
            tokenProgram: TOKEN_PROGRAM_ID,
          })
          .signers([seller1])
          .rpc();
        
        expect.fail("Should have failed with listing not active");
      } catch (error) {
        expect(error.message).to.include("ListingNotActive");
      }
    });
  });

  describe("Multiple Listing Scenarios", () => {
    it("Should handle multiple active listings", async () => {
      // Verify both original listings are still active
      const listing1 = await program.account.listing.fetch(listing1Pda) as Listing;
      const listing2 = await program.account.listing.fetch(listing2Pda) as Listing;

      expect(listing1.status).to.deep.equal({ active: {} });
      expect(listing2.status).to.deep.equal({ active: {} });

      // Verify they have different properties
      expect(listing1.seller.toString()).to.not.equal(listing2.seller.toString());
      expect(listing1.mint.toString()).to.not.equal(listing2.mint.toString());
      expect(listing1.price.toString()).to.not.equal(listing2.price.toString());
    });

    it("Should handle concurrent listing operations", async () => {
      // Create two new NFTs for concurrent operations
      const [testMint1, testMint2] = await Promise.all([
        createMint(
          provider.connection,
          seller1,
          seller1.publicKey,
          null,
          0,
          undefined,
          undefined,
          TOKEN_PROGRAM_ID
        ),
        createMint(
          provider.connection,
          seller2,
          seller2.publicKey,
          null,
          0,
          undefined,
          undefined,
          TOKEN_PROGRAM_ID
        )
      ]);

      const [testTokenAccount1, testTokenAccount2] = await Promise.all([
        createAssociatedTokenAccount(
          provider.connection,
          seller1,
          testMint1,
          seller1.publicKey
        ),
        createAssociatedTokenAccount(
          provider.connection,
          seller2,
          testMint2,
          seller2.publicKey
        )
      ]);

      await Promise.all([
        mintTo(
          provider.connection,
          seller1,
          testMint1,
          testTokenAccount1,
          seller1,
          1
        ),
        mintTo(
          provider.connection,
          seller2,
          testMint2,
          testTokenAccount2,
          seller2,
          1
        )
      ]);

      const [testEscrowAuthority1] = PublicKey.findProgramAddressSync(
        [Buffer.from("escrow_auth"), testMint1.toBuffer()],
        program.programId
      );

      const [testEscrowAuthority2] = PublicKey.findProgramAddressSync(
        [Buffer.from("escrow_auth"), testMint2.toBuffer()],
        program.programId
      );

      const [testEscrowTokenAccount1] = PublicKey.findProgramAddressSync(
        [testEscrowAuthority1.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), testMint1.toBuffer()],
        ASSOCIATED_TOKEN_PROGRAM_ID
      );

      const [testEscrowTokenAccount2] = PublicKey.findProgramAddressSync(
        [testEscrowAuthority2.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), testMint2.toBuffer()],
        ASSOCIATED_TOKEN_PROGRAM_ID
      );

      const [testListingPda1] = PublicKey.findProgramAddressSync(
        [Buffer.from("listing"), seller1.publicKey.toBuffer(), testMint1.toBuffer()],
        program.programId
      );

      const [testListingPda2] = PublicKey.findProgramAddressSync(
        [Buffer.from("listing"), seller2.publicKey.toBuffer(), testMint2.toBuffer()],
        program.programId
      );

      // Create listings concurrently
      const [tx1, tx2] = await Promise.all([
        program.methods
          .createListing(new BN(150_000_000), 200, { fixedPrice: {} })
          .accounts({
            seller: seller1.publicKey,
            mint: testMint1,
            sellerTokenAccount: testTokenAccount1,
            escrowAuthority: testEscrowAuthority1,
            escrowTokenAccount: testEscrowTokenAccount1,
            listing: testListingPda1,
            systemProgram: SystemProgram.programId,
            tokenProgram: TOKEN_PROGRAM_ID,
            associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
            rent: anchor.web3.SYSVAR_RENT_PUBKEY,
          })
          .signers([seller1])
          .rpc(),

        program.methods
          .createListing(new BN(250_000_000), 300, { auction: {} })
          .accounts({
            seller: seller2.publicKey,
            mint: testMint2,
            sellerTokenAccount: testTokenAccount2,
            escrowAuthority: testEscrowAuthority2,
            escrowTokenAccount: testEscrowTokenAccount2,
            listing: testListingPda2,
            systemProgram: SystemProgram.programId,
            tokenProgram: TOKEN_PROGRAM_ID,
            associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
            rent: anchor.web3.SYSVAR_RENT_PUBKEY,
          })
          .signers([seller2])
          .rpc()
      ]);

      console.log("Concurrent listing transactions:", tx1, tx2);

      // Verify both listings created successfully
      const [listing1, listing2] = await Promise.all([
        program.account.listing.fetch(testListingPda1),
        program.account.listing.fetch(testListingPda2)
      ]);

      expect(listing1.status).to.deep.equal({ active: {} });
      expect(listing2.status).to.deep.equal({ active: {} });
    });
  });

  describe("Error Handling and Security", () => {
    it("Should handle account not found gracefully", async () => {
      const nonExistentPda = Keypair.generate().publicKey;
      
      try {
        await program.account.listing.fetch(nonExistentPda);
        expect.fail("Should have failed with account not found");
      } catch (error) {
        expect(error.message).to.include("Account does not exist");
      }
    });

    it("Should validate PDA derivation consistency", async () => {
      const testSeller = Keypair.generate();
      const testMint = Keypair.generate();
      
      const [pda1] = PublicKey.findProgramAddressSync(
        [Buffer.from("listing"), testSeller.publicKey.toBuffer(), testMint.publicKey.toBuffer()],
        program.programId
      );
      
      const [pda2] = PublicKey.findProgramAddressSync(
        [Buffer.from("listing"), testSeller.publicKey.toBuffer(), testMint.publicKey.toBuffer()],
        program.programId
      );
      
      expect(pda1.toString()).to.equal(pda2.toString());
    });

    it("Should validate escrow authority derivation", async () => {
      const testMint = Keypair.generate();
      
      const [escrowAuth1] = PublicKey.findProgramAddressSync(
        [Buffer.from("escrow_auth"), testMint.publicKey.toBuffer()],
        program.programId
      );
      
      const [escrowAuth2] = PublicKey.findProgramAddressSync(
        [Buffer.from("escrow_auth"), testMint.publicKey.toBuffer()],
        program.programId
      );
      
      expect(escrowAuth1.toString()).to.equal(escrowAuth2.toString());
      expect(PublicKey.isOnCurve(escrowAuth1.toBuffer())).to.be.false; // Should be off-curve
    });
  });

  describe("Performance and Gas Optimization", () => {
    it("Should track transaction costs for listing operations", async () => {
      const testMint = await createMint(
        provider.connection,
        seller1,
        seller1.publicKey,
        null,
        0,
        undefined,
        undefined,
        TOKEN_PROGRAM_ID
      );

      const testTokenAccount = await createAssociatedTokenAccount(
        provider.connection,
        seller1,
        testMint,
        seller1.publicKey
      );

      await mintTo(
        provider.connection,
        seller1,
        testMint,
        testTokenAccount,
        seller1,
        1
      );

      const [testEscrowAuthority] = PublicKey.findProgramAddressSync(
        [Buffer.from("escrow_auth"), testMint.toBuffer()],
        program.programId
      );

      const [testEscrowTokenAccount] = PublicKey.findProgramAddressSync(
        [testEscrowAuthority.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), testMint.toBuffer()],
        ASSOCIATED_TOKEN_PROGRAM_ID
      );

      const [testListingPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("listing"), seller1.publicKey.toBuffer(), testMint.toBuffer()],
        program.programId
      );

      // Track listing creation cost
      const preBalance = await provider.connection.getBalance(seller1.publicKey);
      
      await program.methods
        .createListing(new BN(100_000_000), 250, { fixedPrice: {} })
        .accounts({
          seller: seller1.publicKey,
          mint: testMint,
          sellerTokenAccount: testTokenAccount,
          escrowAuthority: testEscrowAuthority,
          escrowTokenAccount: testEscrowTokenAccount,
          listing: testListingPda,
          systemProgram: SystemProgram.programId,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          rent: anchor.web3.SYSVAR_RENT_PUBKEY,
        })
        .signers([seller1])
        .rpc();

      const postCreateBalance = await provider.connection.getBalance(seller1.publicKey);
      const createCost = preBalance - postCreateBalance;

      // Track cancellation cost
      const preCancelBalance = await provider.connection.getBalance(seller1.publicKey);
      
      await program.methods
        .cancelListing()
        .accounts({
          seller: seller1.publicKey,
          mint: testMint,
          listing: testListingPda,
          escrowAuthority: testEscrowAuthority,
          escrowTokenAccount: testEscrowTokenAccount,
          sellerTokenAccount: testTokenAccount,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .signers([seller1])
        .rpc();

      const postCancelBalance = await provider.connection.getBalance(seller1.publicKey);
      const cancelCost = preCancelBalance - postCancelBalance;

      console.log(`Listing creation cost: ${createCost / LAMPORTS_PER_SOL} SOL`);
      console.log(`Listing cancellation cost: ${cancelCost / LAMPORTS_PER_SOL} SOL`);
      
      expect(createCost).to.be.lessThan(0.02 * LAMPORTS_PER_SOL); // Should cost less than 0.02 SOL
      expect(cancelCost).to.be.lessThan(0.001 * LAMPORTS_PER_SOL); // Should cost less than 0.001 SOL
    });
  });

  describe("Integration Test Scenarios", () => {
    it("Should handle complete marketplace lifecycle", async () => {
      // Create a new NFT for lifecycle test
      const lifecycleMint = await createMint(
        provider.connection,
        seller1,
        seller1.publicKey,
        null,
        0,
        undefined,
        undefined,
        TOKEN_PROGRAM_ID
      );

      const lifecycleTokenAccount = await createAssociatedTokenAccount(
        provider.connection,
        seller1,
        lifecycleMint,
        seller1.publicKey
      );

      await mintTo(
        provider.connection,
        seller1,
        lifecycleMint,
        lifecycleTokenAccount,
        seller1,
        1
      );

      const [lifecycleEscrowAuthority] = PublicKey.findProgramAddressSync(
        [Buffer.from("escrow_auth"), lifecycleMint.toBuffer()],
        program.programId
      );

      const [lifecycleEscrowTokenAccount] = PublicKey.findProgramAddressSync(
        [lifecycleEscrowAuthority.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), lifecycleMint.toBuffer()],
        ASSOCIATED_TOKEN_PROGRAM_ID
      );

      const [lifecycleListingPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("listing"), seller1.publicKey.toBuffer(), lifecycleMint.toBuffer()],
        program.programId
      );

      // 1. Create listing
      await program.methods
        .createListing(new BN(800_000_000), 400, { fixedPrice: {} })
        .accounts({
          seller: seller1.publicKey,
          mint: lifecycleMint,
          sellerTokenAccount: lifecycleTokenAccount,
          escrowAuthority: lifecycleEscrowAuthority,
          escrowTokenAccount: lifecycleEscrowTokenAccount,
          listing: lifecycleListingPda,
          systemProgram: SystemProgram.programId,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          rent: anchor.web3.SYSVAR_RENT_PUBKEY,
        })
        .signers([seller1])
        .rpc();

      // 2. Verify listing is active
      let listing = await program.account.listing.fetch(lifecycleListingPda) as Listing;
      expect(listing.status).to.deep.equal({ active: {} });

      // 3. Cancel listing
      await program.methods
        .cancelListing()
        .accounts({
          seller: seller1.publicKey,
          mint: lifecycleMint,
          listing: lifecycleListingPda,
          escrowAuthority: lifecycleEscrowAuthority,
          escrowTokenAccount: lifecycleEscrowTokenAccount,
          sellerTokenAccount: lifecycleTokenAccount,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .signers([seller1])
        .rpc();

      // 4. Verify listing is cancelled and NFT returned
      listing = await program.account.listing.fetch(lifecycleListingPda) as Listing;
      expect(listing.status).to.deep.equal({ cancelled: {} });

      const finalTokenAccountInfo = await getAccount(provider.connection, lifecycleTokenAccount);
      expect(finalTokenAccountInfo.amount.toString()).to.equal("1");
    });
  });
});
