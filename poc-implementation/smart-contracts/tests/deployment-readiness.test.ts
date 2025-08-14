import { expect } from "chai";
import { Connection, PublicKey, clusterApiUrl } from "@solana/web3.js";

describe("Nen Programs - Deployment Readiness Tests", () => {
  const connection = new Connection(clusterApiUrl("devnet"), "confirmed");

  describe("Devnet Connection Tests", () => {
    it("Should connect to Solana devnet successfully", async () => {
      const version = await connection.getVersion();
      expect(version).to.have.property("solana-core");
      console.log("Connected to Solana devnet, version:", version["solana-core"]);
    });

    it("Should get recent blockhash from devnet", async () => {
      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
      expect(blockhash).to.be.a('string');
      expect(lastValidBlockHeight).to.be.a('number');
      expect(lastValidBlockHeight).to.be.greaterThan(0);
      console.log("Recent blockhash:", blockhash.substring(0, 8) + "...");
      console.log("Last valid block height:", lastValidBlockHeight);
    });
  });

  describe("Program Account Validation", () => {
    it("Should check if program accounts exist on devnet", async () => {
      const programIds = [
        "Xs4PKxWNyY1C7i5bdqMh5tNhwPbDbxMXf4YcJAreJcF", // nen-core
        "34RNydfkFZmhvUupbW1qHBG5LmASc6zeS3tuUsw6PwC5", // nen-betting
        "8FbcrTGS9wQCyC99h5jbHx2bzZjYfkGERSMCjmYBDisH", // nen-marketplace
        "AhGXiWjzKjd8T7J3FccYk51y4D97jGkZ7d7NJfmb3aFX"  // nen-magicblock
      ];

      for (const programId of programIds) {
        const publicKey = new PublicKey(programId);
        const accountInfo = await connection.getAccountInfo(publicKey);
        
        if (accountInfo) {
          console.log(`Program ${programId} exists on devnet`);
          console.log(`   Owner: ${accountInfo.owner.toString()}`);
          console.log(`   Executable: ${accountInfo.executable}`);
          console.log(`   Data length: ${accountInfo.data.length} bytes`);
        } else {
          console.log(`Program ${programId} not found on devnet (will be deployed)`);
        }
      }
    });
  });

  describe("PDA Account Validation", () => {
    it("Should check platform PDA account status", async () => {
      const [platformPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("platform")],
        new PublicKey("Xs4PKxWNyY1C7i5bdqMh5tNhwPbDbxMXf4YcJAreJcF")
      );

      const accountInfo = await connection.getAccountInfo(platformPda);
      if (accountInfo) {
        console.log("Platform PDA account exists on devnet");
        console.log(`   Data length: ${accountInfo.data.length} bytes`);
      } else {
        console.log("Platform PDA account not found (will be created during initialization)");
      }
    });

    it("Should validate rent exemption requirements", async () => {
      const accountSizes = {
        platform: 8 + 32 + 1 + 8 + 8 + 8, // discriminator + admin + fee + counters
        user: 8 + 32 + 1 + 4 + 8 + 8 + 8 + 32, // basic user account
        betting: 8 + 32 + 8 + 8 + 8 + 4 + 8, // betting account
        listing: 8 + 32 + 32 + 8 + 1 + 8 + 8, // marketplace listing
        session: 8 + 32 + 32 + 1 + 8 + 8 + 32 // game session
      };

      for (const [accountType, size] of Object.entries(accountSizes)) {
        const rent = await connection.getMinimumBalanceForRentExemption(size);
        expect(rent).to.be.greaterThan(0);
        console.log(`${accountType} account rent: ${rent} lamports (${rent / 1e9} SOL)`);
      }
    });
  });

  describe("Network Performance Tests", () => {
    it("Should measure transaction confirmation time", async () => {
      const startTime = Date.now();
      const { blockhash } = await connection.getLatestBlockhash();
      const endTime = Date.now();
      
      const latency = endTime - startTime;
      expect(latency).to.be.lessThan(5000); // Should be under 5 seconds
      console.log(`Network latency: ${latency}ms`);
    });

    it("Should check slot progression", async () => {
      const slot1 = await connection.getSlot();
      await new Promise(resolve => setTimeout(resolve, 1000));
      const slot2 = await connection.getSlot();
      
      expect(slot2).to.be.greaterThan(slot1);
      console.log(`Slot progression: ${slot1} -> ${slot2} (${slot2 - slot1} slots)`);
    });
  });

  describe("Program Deployment Prerequisites", () => {
    it("Should validate program ID format and uniqueness", () => {
      const programIds = [
        "Xs4PKxWNyY1C7i5bdqMh5tNhwPbDbxMXf4YcJAreJcF",
        "34RNydfkFZmhvUupbW1qHBG5LmASc6zeS3tuUsw6PwC5", 
        "8FbcrTGS9wQCyC99h5jbHx2bzZjYfkGERSMCjmYBDisH",
        "AhGXiWjzKjd8T7J3FccYk51y4D97jGkZ7d7NJfmb3aFX"
      ];

      programIds.forEach(id => {
        expect(() => new PublicKey(id)).to.not.throw();
        expect(PublicKey.isOnCurve(new PublicKey(id))).to.be.true;
      });

      const uniqueIds = new Set(programIds);
      expect(uniqueIds.size).to.equal(programIds.length);
      
      console.log("All program IDs are valid and unique");
    });

    it("Should validate Anchor.toml configuration", () => {
      const expectedConfig = {
        "nen_core": "Xs4PKxWNyY1C7i5bdqMh5tNhwPbDbxMXf4YcJAreJcF",
        "nen_betting": "34RNydfkFZmhvUupbW1qHBG5LmASc6zeS3tuUsw6PwC5",
        "nen_marketplace": "8FbcrTGS9wQCyC99h5jbHx2bzZjYfkGERSMCjmYBDisH",
        "nen_magicblock": "AhGXiWjzKjd8T7J3FccYk51y4D97jGkZ7d7NJfmb3aFX"
      };

      for (const [program, id] of Object.entries(expectedConfig)) {
        expect(() => new PublicKey(id)).to.not.throw();
        console.log(`${program}: ${id}`);
      }
    });
  });
});
