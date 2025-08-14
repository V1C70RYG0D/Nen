import { expect } from "chai";
import { PublicKey } from "@solana/web3.js";

describe("Nen Programs - Validation Tests", () => {
  describe("Program ID Validation", () => {
    it("Should validate nen-core program ID", () => {
      const programId = "Xs4PKxWNyY1C7i5bdqMh5tNhwPbDbxMXf4YcJAreJcF";
      const publicKey = new PublicKey(programId);
      expect(PublicKey.isOnCurve(publicKey)).to.be.true;
      console.log("Nen Core program ID is valid:", programId);
    });

    it("Should validate nen-betting program ID", () => {
      const programId = "34RNydfkFZmhvUupbW1qHBG5LmASc6zeS3tuUsw6PwC5";
      const publicKey = new PublicKey(programId);
      expect(PublicKey.isOnCurve(publicKey)).to.be.true;
      console.log("Nen Betting program ID is valid:", programId);
    });

    it("Should validate nen-marketplace program ID", () => {
      const programId = "8FbcrTGS9wQCyC99h5jbHx2bzZjYfkGERSMCjmYBDisH";
      const publicKey = new PublicKey(programId);
      expect(PublicKey.isOnCurve(publicKey)).to.be.true;
      console.log("Nen Marketplace program ID is valid:", programId);
    });

    it("Should validate nen-magicblock program ID", () => {
      const programId = "AhGXiWjzKjd8T7J3FccYk51y4D97jGkZ7d7NJfmb3aFX";
      const publicKey = new PublicKey(programId);
      expect(PublicKey.isOnCurve(publicKey)).to.be.true;
      console.log("Nen MagicBlock program ID is valid:", programId);
    });
  });

  describe("PDA Derivation Validation", () => {
    it("Should derive platform PDA correctly", () => {
      const [platformPda, bump] = PublicKey.findProgramAddressSync(
        [Buffer.from("platform")],
        new PublicKey("Xs4PKxWNyY1C7i5bdqMh5tNhwPbDbxMXf4YcJAreJcF")
      );
      
      expect(platformPda).to.be.instanceOf(PublicKey);
      expect(bump).to.be.a('number');
      expect(bump).to.be.at.least(0).and.at.most(255);
      console.log("Platform PDA:", platformPda.toString(), "bump:", bump);
    });

    it("Should derive user account PDAs with different seeds", () => {
      const user1 = new PublicKey("11111111111111111111111111111112");
      const user2 = new PublicKey("11111111111111111111111111111113");
      
      const [userPda1] = PublicKey.findProgramAddressSync(
        [Buffer.from("user"), user1.toBuffer()],
        new PublicKey("Xs4PKxWNyY1C7i5bdqMh5tNhwPbDbxMXf4YcJAreJcF")
      );

      const [userPda2] = PublicKey.findProgramAddressSync(
        [Buffer.from("user"), user2.toBuffer()],
        new PublicKey("Xs4PKxWNyY1C7i5bdqMh5tNhwPbDbxMXf4YcJAreJcF")
      );

      expect(userPda1.toString()).to.not.equal(userPda2.toString());
      console.log("User PDAs are unique:", userPda1.toString(), userPda2.toString());
    });

    it("Should derive betting account PDAs correctly", () => {
      const user = new PublicKey("11111111111111111111111111111112");
      const [bettingPda, bump] = PublicKey.findProgramAddressSync(
        [Buffer.from("betting_account"), user.toBuffer()],
        new PublicKey("34RNydfkFZmhvUupbW1qHBG5LmASc6zeS3tuUsw6PwC5")
      );

      expect(bettingPda).to.be.instanceOf(PublicKey);
      expect(bump).to.be.a('number');
      console.log("Betting PDA:", bettingPda.toString());
    });

    it("Should derive marketplace listing PDAs correctly", () => {
      const seller = new PublicKey("11111111111111111111111111111112");
      const mint = new PublicKey("11111111111111111111111111111113");
      
      const [listingPda, bump] = PublicKey.findProgramAddressSync(
        [Buffer.from("listing"), seller.toBuffer(), mint.toBuffer()],
        new PublicKey("8FbcrTGS9wQCyC99h5jbHx2bzZjYfkGERSMCjmYBDisH")
      );

      expect(listingPda).to.be.instanceOf(PublicKey);
      expect(bump).to.be.a('number');
      console.log("Marketplace listing PDA:", listingPda.toString());
    });

    it("Should derive magicblock session PDAs correctly", () => {
      const authority = new PublicKey("11111111111111111111111111111112");
      const [sessionPda, bump] = PublicKey.findProgramAddressSync(
        [Buffer.from("session"), authority.toBuffer()],
        new PublicKey("AhGXiWjzKjd8T7J3FccYk51y4D97jGkZ7d7NJfmb3aFX")
      );

      expect(sessionPda).to.be.instanceOf(PublicKey);
      expect(bump).to.be.a('number');
      console.log("MagicBlock session PDA:", sessionPda.toString());
    });
  });

  describe("Program Structure Validation", () => {
    it("Should validate all program IDs are different", () => {
      const programIds = [
        "Xs4PKxWNyY1C7i5bdqMh5tNhwPbDbxMXf4YcJAreJcF", // nen-core
        "34RNydfkFZmhvUupbW1qHBG5LmASc6zeS3tuUsw6PwC5", // nen-betting
        "8FbcrTGS9wQCyC99h5jbHx2bzZjYfkGERSMCjmYBDisH", // nen-marketplace
        "AhGXiWjzKjd8T7J3FccYk51y4D97jGkZ7d7NJfmb3aFX"  // nen-magicblock
      ];

      const uniqueIds = new Set(programIds);
      expect(uniqueIds.size).to.equal(programIds.length);
      console.log("All program IDs are unique");
    });

    it("Should validate PDA seeds are consistent", () => {
      const seeds = {
        platform: "platform",
        user: "user", 
        bettingAccount: "betting_account",
        listing: "listing",
        session: "session"
      };

      for (const [name, seed] of Object.entries(seeds)) {
        expect(seed).to.be.a('string');
        expect(seed.length).to.be.greaterThan(0);
        console.log(`${name} seed is valid:`, seed);
      }
    });
  });
});
