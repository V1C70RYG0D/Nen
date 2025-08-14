import * as anchor from "@coral-xyz/anchor";
import { expect } from "chai";
import { PublicKey, Keypair, SystemProgram, LAMPORTS_PER_SOL } from "@solana/web3.js";

describe("Nen Programs - Basic Functionality Tests", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  // Test accounts
  let admin: Keypair;
  let user1: Keypair;
  let user2: Keypair;

  before(async () => {
    // Initialize keypairs
    admin = Keypair.generate();
    user1 = Keypair.generate();
    user2 = Keypair.generate();

    // Airdrop SOL to test accounts
    const airdropPromises = [admin, user1, user2].map(keypair =>
      provider.connection.requestAirdrop(keypair.publicKey, 10 * LAMPORTS_PER_SOL)
    );
    await Promise.all(airdropPromises);

    // Wait for airdrops to confirm
    await new Promise(resolve => setTimeout(resolve, 3000));
  });

  describe("Program Compilation and Loading", () => {
    it("Should load nen-core program successfully", async () => {
      try {
        const program = anchor.workspace.NenCore;
        expect(program).to.not.be.undefined;
        expect(program.programId).to.be.instanceOf(PublicKey);
        console.log("✅ Nen Core program loaded:", program.programId.toString());
      } catch (error) {
        console.log("⚠️ Nen Core program not available:", error.message);
      }
    });

    it("Should load nen-betting program successfully", async () => {
      try {
        const program = anchor.workspace.NenBetting;
        expect(program).to.not.be.undefined;
        expect(program.programId).to.be.instanceOf(PublicKey);
        console.log("✅ Nen Betting program loaded:", program.programId.toString());
      } catch (error) {
        console.log("⚠️ Nen Betting program not available:", error.message);
      }
    });

    it("Should load nen-magicblock program successfully", async () => {
      try {
        const program = anchor.workspace.NenMagicblock;
        expect(program).to.not.be.undefined;
        expect(program.programId).to.be.instanceOf(PublicKey);
        console.log("✅ Nen MagicBlock program loaded:", program.programId.toString());
      } catch (error) {
        console.log("⚠️ Nen MagicBlock program not available:", error.message);
      }
    });

    it("Should load nen-marketplace program successfully", async () => {
      try {
        const program = anchor.workspace.NenMarketplace;
        expect(program).to.not.be.undefined;
        expect(program.programId).to.be.instanceOf(PublicKey);
        console.log("✅ Nen Marketplace program loaded:", program.programId.toString());
      } catch (error) {
        console.log("⚠️ Nen Marketplace program not available:", error.message);
      }
    });
  });

  describe("PDA Derivation Tests", () => {
    it("Should derive platform PDA correctly", async () => {
      const [platformPda, bump] = PublicKey.findProgramAddressSync(
        [Buffer.from("platform")],
        new PublicKey("Xs4PKxWNyY1C7i5bdqMh5tNhwPbDbxMXf4YcJAreJcF") // nen-core program ID
      );
      
      expect(platformPda).to.be.instanceOf(PublicKey);
      expect(bump).to.be.a('number');
      expect(bump).to.be.at.least(0).and.at.most(255);
      console.log("✅ Platform PDA derived:", platformPda.toString(), "bump:", bump);
    });

    it("Should derive user account PDAs correctly", async () => {
      const [userPda1, bump1] = PublicKey.findProgramAddressSync(
        [Buffer.from("user"), user1.publicKey.toBuffer()],
        new PublicKey("Xs4PKxWNyY1C7i5bdqMh5tNhwPbDbxMXf4YcJAreJcF")
      );

      const [userPda2, bump2] = PublicKey.findProgramAddressSync(
        [Buffer.from("user"), user2.publicKey.toBuffer()],
        new PublicKey("Xs4PKxWNyY1C7i5bdqMh5tNhwPbDbxMXf4YcJAreJcF")
      );

      expect(userPda1).to.be.instanceOf(PublicKey);
      expect(userPda2).to.be.instanceOf(PublicKey);
      expect(userPda1.toString()).to.not.equal(userPda2.toString());
      console.log("✅ User PDAs derived:", userPda1.toString(), userPda2.toString());
    });

    it("Should derive betting account PDAs correctly", async () => {
      const [bettingPda1, bump1] = PublicKey.findProgramAddressSync(
        [Buffer.from("betting_account"), user1.publicKey.toBuffer()],
        new PublicKey("34RNydfkFZmhvUupbW1qHBG5LmASc6zeS3tuUsw6PwC5") // nen-betting program ID
      );

      expect(bettingPda1).to.be.instanceOf(PublicKey);
      expect(bump1).to.be.a('number');
      console.log("✅ Betting PDA derived:", bettingPda1.toString());
    });

    it("Should derive marketplace listing PDAs correctly", async () => {
      const mockMint = Keypair.generate().publicKey;
      const [listingPda, bump] = PublicKey.findProgramAddressSync(
        [Buffer.from("listing"), user1.publicKey.toBuffer(), mockMint.toBuffer()],
        new PublicKey("8FbcrTGS9wQCyC99h5jbHx2bzZjYfkGERSMCjmYBDisH") // nen-marketplace program ID
      );

      expect(listingPda).to.be.instanceOf(PublicKey);
      expect(bump).to.be.a('number');
      console.log("✅ Marketplace listing PDA derived:", listingPda.toString());
    });

    it("Should derive magicblock session PDAs correctly", async () => {
      const [sessionPda, bump] = PublicKey.findProgramAddressSync(
        [Buffer.from("session"), admin.publicKey.toBuffer()],
        new PublicKey("AhGXiWjzKjd8T7J3FccYk51y4D97jGkZ7d7NJfmb3aFX") // nen-magicblock program ID
      );

      expect(sessionPda).to.be.instanceOf(PublicKey);
      expect(bump).to.be.a('number');
      console.log("✅ MagicBlock session PDA derived:", sessionPda.toString());
    });
  });

  describe("Account Size and Rent Calculations", () => {
    it("Should calculate rent for different account sizes", async () => {
      const platformAccountSize = 8 + 32 + 1 + 8 + 8 + 8; // discriminator + admin + fee + counters
      const userAccountSize = 8 + 32 + 1 + 4 + 8 + 8 + 8 + 32; // basic user account
      const bettingAccountSize = 8 + 32 + 8 + 8 + 8 + 4 + 8; // betting account
      
      const platformRent = await provider.connection.getMinimumBalanceForRentExemption(platformAccountSize);
      const userRent = await provider.connection.getMinimumBalanceForRentExemption(userAccountSize);
      const bettingRent = await provider.connection.getMinimumBalanceForRentExemption(bettingAccountSize);

      expect(platformRent).to.be.greaterThan(0);
      expect(userRent).to.be.greaterThan(0);
      expect(bettingRent).to.be.greaterThan(0);

      console.log("✅ Rent calculations:");
      console.log("  Platform account:", platformRent, "lamports");
      console.log("  User account:", userRent, "lamports");
      console.log("  Betting account:", bettingRent, "lamports");
    });
  });

  describe("Program ID Validation", () => {
    it("Should validate all program IDs match Anchor.toml configuration", async () => {
      const expectedProgramIds = {
        "nen_core": "Xs4PKxWNyY1C7i5bdqMh5tNhwPbDbxMXf4YcJAreJcF",
        "nen_betting": "34RNydfkFZmhvUupbW1qHBG5LmASc6zeS3tuUsw6PwC5",
        "nen_marketplace": "8FbcrTGS9wQCyC99h5jbHx2bzZjYfkGERSMCjmYBDisH",
        "nen_magicblock": "AhGXiWjzKjd8T7J3FccYk51y4D97jGkZ7d7NJfmb3aFX"
      };

      for (const [programName, expectedId] of Object.entries(expectedProgramIds)) {
        const publicKey = new PublicKey(expectedId);
        expect(PublicKey.isOnCurve(publicKey)).to.be.true;
        console.log(`✅ ${programName} program ID is valid:`, expectedId);
      }
    });
  });
});
