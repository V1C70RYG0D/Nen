import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Connection, PublicKey, Keypair, SystemProgram, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { expect } from "chai";
import BN from "bn.js";

// Type definitions based on the Rust program
interface Platform {
  adminAuthority: PublicKey;
  platformFeePercentage: number;
  totalMatches: BN;
  totalBets: BN;
  totalVolume: BN;
  createdAt: BN;
  isPaused: boolean;
}

interface UserAccount {
  authority: PublicKey;
  kycLevel: number;
  complianceFlags: number;
  totalMatches: number;
  totalWinnings: BN;
  totalLosses: BN;
  reputationScore: number;
  createdAt: BN;
  lastActivity: BN;
  isActive: boolean;
}

interface MatchAccount {
  matchId: BN;
  player: PublicKey;
  matchType: any;
  betAmount: BN;
  timeLimitSeconds: number;
  aiDifficulty: number;
  status: any;
  createdAt: BN;
  lastMoveAt: BN;
  movesCount: number;
  winner: PublicKey | null;
  boardState: number[][][]; // 9x9x3 array
  currentTurn: any;
}

describe("Nen Core Program - Comprehensive Tests", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = new Program(
    require("../target/idl/nen_core.json"),
    "Xs4PKxWNyY1C7i5bdqMh5tNhwPbDbxMXf4YcJAreJcF",
    provider
  );

  let admin: Keypair;
  let user1: Keypair;
  let user2: Keypair;
  let player1: Keypair;
  let platformPda: PublicKey;
  let platformBump: number;

  before(async () => {
    admin = Keypair.generate();
    user1 = Keypair.generate();
    user2 = Keypair.generate();
    player1 = Keypair.generate();

    // Airdrop SOL to test accounts
    await Promise.all([
      provider.connection.requestAirdrop(admin.publicKey, 5 * LAMPORTS_PER_SOL),
      provider.connection.requestAirdrop(user1.publicKey, 2 * LAMPORTS_PER_SOL),
      provider.connection.requestAirdrop(user2.publicKey, 2 * LAMPORTS_PER_SOL),
      provider.connection.requestAirdrop(player1.publicKey, 2 * LAMPORTS_PER_SOL),
    ]);

    // Wait for confirmations
    await new Promise(resolve => setTimeout(resolve, 2000));

    [platformPda, platformBump] = PublicKey.findProgramAddressSync(
      [Buffer.from("platform")],
      program.programId
    );

    console.log("Test setup complete");
    console.log("Program ID:", program.programId.toString());
    console.log("Platform PDA:", platformPda.toString());
  });

  describe("Platform Initialization", () => {
    it("Should initialize the platform with correct parameters", async () => {
      const platformFeePercentage = 500; // 5%

      const tx = await program.methods
        .initializePlatform(admin.publicKey, platformFeePercentage)
        .accounts({
          platform: platformPda,
          admin: admin.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([admin])
        .rpc();

      console.log("Platform initialization transaction:", tx);

      // Verify platform account
      const platformAccount = await program.account.platform.fetch(platformPda) as Platform;
      
      expect(platformAccount.adminAuthority.toString()).to.equal(admin.publicKey.toString());
      expect(platformAccount.platformFeePercentage).to.equal(platformFeePercentage);
      expect(platformAccount.totalMatches.toNumber()).to.equal(0);
      expect(platformAccount.totalBets.toNumber()).to.equal(0);
      expect(platformAccount.totalVolume.toNumber()).to.equal(0);
      expect(platformAccount.isPaused).to.be.false;
      expect(platformAccount.createdAt.toNumber()).to.be.greaterThan(0);
    });

    it("Should reject platform initialization with invalid fee percentage", async () => {
      const invalidFeePercentage = 1500; // 15% (too high)
      
      const [invalidPlatformPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("platform"), Buffer.from("invalid")],
        program.programId
      );

      try {
        await program.methods
          .initializePlatform(admin.publicKey, invalidFeePercentage)
          .accounts({
            platform: invalidPlatformPda,
            admin: admin.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .signers([admin])
          .rpc();
        
        expect.fail("Should have failed with invalid fee percentage");
      } catch (error) {
        expect(error.message).to.include("InvalidFeePercentage");
      }
    });
  });

  describe("User Account Management", () => {
    let user1Pda: PublicKey;
    let user2Pda: PublicKey;

    before(async () => {
      [user1Pda] = PublicKey.findProgramAddressSync(
        [Buffer.from("user"), user1.publicKey.toBuffer()],
        program.programId
      );

      [user2Pda] = PublicKey.findProgramAddressSync(
        [Buffer.from("user"), user2.publicKey.toBuffer()],
        program.programId
      );
    });

    it("Should create user account with basic KYC", async () => {
      const kycLevel = 1;
      const complianceFlags = 0;

      const tx = await program.methods
        .createUserAccount(kycLevel, complianceFlags)
        .accounts({
          userAccount: user1Pda,
          user: user1.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([user1])
        .rpc();

      console.log("User account creation transaction:", tx);

      // Verify user account
      const userAccount = await program.account.userAccount.fetch(user1Pda) as UserAccount;
      
      expect(userAccount.authority.toString()).to.equal(user1.publicKey.toString());
      expect(userAccount.kycLevel).to.equal(kycLevel);
      expect(userAccount.complianceFlags).to.equal(complianceFlags);
      expect(userAccount.totalMatches).to.equal(0);
      expect(userAccount.totalWinnings.toNumber()).to.equal(0);
      expect(userAccount.totalLosses.toNumber()).to.equal(0);
      expect(userAccount.reputationScore).to.equal(1000);
      expect(userAccount.isActive).to.be.true;
      expect(userAccount.createdAt.toNumber()).to.be.greaterThan(0);
    });

    it("Should create enhanced user with username and region", async () => {
      const username = "TestUser2";
      const kycLevel = 2;
      const region = 1; // North America

      const tx = await program.methods
        .createEnhancedUser(username, kycLevel, region)
        .accounts({
          userAccount: user2Pda,
          user: user2.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([user2])
        .rpc();

      console.log("Enhanced user creation transaction:", tx);

      // Verify user account
      const userAccount = await program.account.userAccount.fetch(user2Pda) as UserAccount;
      
      expect(userAccount.authority.toString()).to.equal(user2.publicKey.toString());
      expect(userAccount.kycLevel).to.equal(kycLevel);
      expect(userAccount.complianceFlags).to.equal(region);
      expect(userAccount.reputationScore).to.equal(1000);
      expect(userAccount.isActive).to.be.true;
    });

    it("Should reject user creation with invalid KYC level", async () => {
      const invalidKycLevel = 5; // Too high
      const complianceFlags = 0;

      const [invalidUserPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("user"), Keypair.generate().publicKey.toBuffer()],
        program.programId
      );

      try {
        await program.methods
          .createUserAccount(invalidKycLevel, complianceFlags)
          .accounts({
            userAccount: invalidUserPda,
            user: Keypair.generate().publicKey,
            systemProgram: SystemProgram.programId,
          })
          .rpc();
        
        expect.fail("Should have failed with invalid KYC level");
      } catch (error) {
        expect(error.message).to.include("InvalidKycLevel");
      }
    });

    it("Should reject enhanced user with invalid username", async () => {
      const invalidUsername = ""; // Too short
      const kycLevel = 1;
      const region = 0;

      try {
        await program.methods
          .createEnhancedUser(invalidUsername, kycLevel, region)
          .accounts({
            userAccount: Keypair.generate().publicKey,
            user: Keypair.generate().publicKey,
            systemProgram: SystemProgram.programId,
          })
          .rpc();
        
        expect.fail("Should have failed with invalid username");
      } catch (error) {
        expect(error.message).to.include("UsernameTooShort");
      }
    });
  });

  describe("Match Creation and Management", () => {
    let matchPda: PublicKey;
    let player1Pda: PublicKey;

    before(async () => {
      [player1Pda] = PublicKey.findProgramAddressSync(
        [Buffer.from("user"), player1.publicKey.toBuffer()],
        program.programId
      );

      // Create player1 user account first
      await program.methods
        .createUserAccount(1, 0)
        .accounts({
          userAccount: player1Pda,
          user: player1.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([player1])
        .rpc();
    });

    it("Should create a Gungi match", async () => {
      // Get current platform state to determine match ID
      const platformAccount = await program.account.platform.fetch(platformPda) as Platform;
      const matchId = platformAccount.totalMatches.toNumber();

      [matchPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("match"), new BN(matchId).toArrayLike(Buffer, "le", 8)],
        program.programId
      );

      const matchType = { aiVsHuman: {} };
      const betAmount = new BN(10_000_000); // 0.01 SOL
      const timeLimitSeconds = 3600; // 1 hour
      const aiDifficulty = 3; // Medium

      const tx = await program.methods
        .createMatch(matchType, betAmount, timeLimitSeconds, aiDifficulty)
        .accounts({
          matchAccount: matchPda,
          platform: platformPda,
          player: player1.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([player1])
        .rpc();

      console.log("Match creation transaction:", tx);

      // Verify match account
      const matchAccount = await program.account.matchAccount.fetch(matchPda) as MatchAccount;
      
      expect(matchAccount.matchId.toNumber()).to.equal(matchId);
      expect(matchAccount.player.toString()).to.equal(player1.publicKey.toString());
      expect(matchAccount.betAmount.toString()).to.equal(betAmount.toString());
      expect(matchAccount.timeLimitSeconds).to.equal(timeLimitSeconds);
      expect(matchAccount.aiDifficulty).to.equal(aiDifficulty);
      expect(matchAccount.movesCount).to.equal(0);
      expect(matchAccount.winner).to.be.null;
      expect(matchAccount.createdAt.toNumber()).to.be.greaterThan(0);

      // Verify platform stats updated
      const updatedPlatform = await program.account.platform.fetch(platformPda) as Platform;
      expect(updatedPlatform.totalMatches.toNumber()).to.equal(matchId + 1);
    });

    it("Should reject match creation with insufficient bet amount", async () => {
      const platformAccount = await program.account.platform.fetch(platformPda) as Platform;
      const matchId = platformAccount.totalMatches.toNumber();

      const [invalidMatchPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("match"), new BN(matchId).toArrayLike(Buffer, "le", 8)],
        program.programId
      );

      const matchType = { aiVsHuman: {} };
      const betAmount = new BN(500_000); // 0.0005 SOL (too low)
      const timeLimitSeconds = 3600;
      const aiDifficulty = 1;

      try {
        await program.methods
          .createMatch(matchType, betAmount, timeLimitSeconds, aiDifficulty)
          .accounts({
            matchAccount: invalidMatchPda,
            platform: platformPda,
            player: player1.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .signers([player1])
          .rpc();
        
        expect.fail("Should have failed with minimum bet not met");
      } catch (error) {
        expect(error.message).to.include("MinimumBetNotMet");
      }
    });

    it("Should submit a valid move", async () => {
      const fromX = 0;
      const fromY = 0;
      const toX = 1;
      const toY = 0;
      const pieceType = 1; // Marshal
      const moveTimestamp = Math.floor(Date.now() / 1000);

      const tx = await program.methods
        .submitMove(fromX, fromY, toX, toY, pieceType, new BN(moveTimestamp))
        .accounts({
          matchAccount: matchPda,
          player: player1.publicKey,
        })
        .signers([player1])
        .rpc();

      console.log("Move submission transaction:", tx);

      // Verify match state updated
      const matchAccount = await program.account.matchAccount.fetch(matchPda) as MatchAccount;
      expect(matchAccount.movesCount).to.equal(1);
      expect(matchAccount.lastMoveAt.toNumber()).to.be.greaterThan(0);
    });

    it("Should reject invalid move positions", async () => {
      const fromX = 10; // Invalid position (out of bounds)
      const fromY = 0;
      const toX = 1;
      const toY = 0;
      const pieceType = 1;
      const moveTimestamp = Math.floor(Date.now() / 1000);

      try {
        await program.methods
          .submitMove(fromX, fromY, toX, toY, pieceType, new BN(moveTimestamp))
          .accounts({
            matchAccount: matchPda,
            player: player1.publicKey,
          })
          .signers([player1])
          .rpc();
        
        expect.fail("Should have failed with invalid position");
      } catch (error) {
        expect(error.message).to.include("InvalidPosition");
      }
    });
  });

  describe("AI Agent NFT System", () => {
    let nftMint: Keypair;
    let nftPda: PublicKey;
    let agentOwner: Keypair;

    before(async () => {
      nftMint = Keypair.generate();
      agentOwner = Keypair.generate();
      
      // Airdrop SOL to agent owner
      await provider.connection.requestAirdrop(agentOwner.publicKey, 2 * LAMPORTS_PER_SOL);
      await new Promise(resolve => setTimeout(resolve, 1000));

      [nftPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("agent_nft"), nftMint.publicKey.toBuffer()],
        program.programId
      );
    });

    it("Should mint AI agent NFT with personality traits", async () => {
      const agentName = "TestAI";
      const personalityTraits = {
        aggression: 75,
        patience: 60,
        riskTolerance: 80,
        creativity: 70,
        analytical: 85,
      };
      const performanceMetrics = {
        winRate: 6500, // 65%
        averageMoves: 45,
        averageGameTime: 1200, // 20 minutes
        eloRating: 1500,
        learningRate: 750,
      };

      const tx = await program.methods
        .mintAiAgentNft(agentName, personalityTraits, performanceMetrics)
        .accounts({
          nftAccount: nftPda,
          mint: nftMint.publicKey,
          tokenAccount: nftMint.publicKey, // Simplified for test
          owner: agentOwner.publicKey,
          mintAuthority: agentOwner.publicKey,
          tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .signers([agentOwner, nftMint])
        .rpc();

      console.log("AI Agent NFT minting transaction:", tx);

      // Note: Since we're not actually creating token accounts in this test,
      // we're just verifying the transaction succeeds
      expect(tx).to.be.a("string");
    });
  });

  describe("Training Session Management", () => {
    let trainingPda: PublicKey;
    let agentMint: Keypair;
    let sessionOwner: Keypair;

    before(async () => {
      agentMint = Keypair.generate();
      sessionOwner = Keypair.generate();
      
      // Airdrop SOL to session owner
      await provider.connection.requestAirdrop(sessionOwner.publicKey, 2 * LAMPORTS_PER_SOL);
      await new Promise(resolve => setTimeout(resolve, 1000));

      [trainingPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("training"), sessionOwner.publicKey.toBuffer(), agentMint.publicKey.toBuffer()],
        program.programId
      );
    });

    it("Should start training session light", async () => {
      const sessionId = Array.from({ length: 16 }, () => Math.floor(Math.random() * 256));
      const replayCommitments = [
        Array.from({ length: 32 }, () => Math.floor(Math.random() * 256))
      ];
      const params = {
        focusArea: 1, // Midgame
        intensity: 2, // High
        maxMatches: 25,
        learningRateBp: 500,
        epochs: 10,
        batchSize: 4,
      };

      const tx = await program.methods
        .startTrainingSessionLight(sessionId, replayCommitments, params)
        .accounts({
          trainingSession: trainingPda,
          mint: agentMint.publicKey,
          owner: sessionOwner.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([sessionOwner])
        .rpc();

      console.log("Training session start transaction:", tx);

      // Verify training session
      const sessionAccount = await program.account.trainingSession.fetch(trainingPda);
      expect(sessionAccount.owner.toString()).to.equal(sessionOwner.publicKey.toString());
      expect(sessionAccount.agentMint.toString()).to.equal(agentMint.publicKey.toString());
      expect(sessionAccount.status).to.deep.equal({ initiated: {} });
      expect(sessionAccount.replayCommitments).to.have.lengthOf(1);
    });

    it("Should reject training session with too many replays", async () => {
      const sessionId = Array.from({ length: 16 }, () => Math.floor(Math.random() * 256));
      const tooManyReplays = Array.from({ length: 60 }, () => 
        Array.from({ length: 32 }, () => Math.floor(Math.random() * 256))
      );
      const params = {
        focusArea: 0,
        intensity: 1,
        maxMatches: 10,
        learningRateBp: 300,
        epochs: 5,
        batchSize: 2,
      };

      const [invalidTrainingPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("training"), sessionOwner.publicKey.toBuffer(), Keypair.generate().publicKey.toBuffer()],
        program.programId
      );

      try {
        await program.methods
          .startTrainingSessionLight(sessionId, tooManyReplays, params)
          .accounts({
            trainingSession: invalidTrainingPda,
            mint: Keypair.generate().publicKey,
            owner: sessionOwner.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .signers([sessionOwner])
          .rpc();
        
        expect.fail("Should have failed with too many replays");
      } catch (error) {
        expect(error.message).to.include("TooManyReplays");
      }
    });
  });

  describe("Error Handling and Edge Cases", () => {
    it("Should handle program account not found gracefully", async () => {
      const nonExistentPda = Keypair.generate().publicKey;
      
      try {
        await program.account.platform.fetch(nonExistentPda);
        expect.fail("Should have failed with account not found");
      } catch (error) {
        expect(error.message).to.include("Account does not exist");
      }
    });

    it("Should validate PDA derivation consistency", async () => {
      const testUser = Keypair.generate();
      
      const [pda1] = PublicKey.findProgramAddressSync(
        [Buffer.from("user"), testUser.publicKey.toBuffer()],
        program.programId
      );
      
      const [pda2] = PublicKey.findProgramAddressSync(
        [Buffer.from("user"), testUser.publicKey.toBuffer()],
        program.programId
      );
      
      expect(pda1.toString()).to.equal(pda2.toString());
    });
  });

  describe("Performance and Gas Optimization", () => {
    it("Should track transaction costs for optimization", async () => {
      const initialBalance = await provider.connection.getBalance(user1.publicKey);
      
      // Perform a simple user account creation
      const [testUserPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("user"), Keypair.generate().publicKey.toBuffer()],
        program.programId
      );

      const testUser = Keypair.generate();
      await provider.connection.requestAirdrop(testUser.publicKey, LAMPORTS_PER_SOL);
      await new Promise(resolve => setTimeout(resolve, 1000));

      const preBalance = await provider.connection.getBalance(testUser.publicKey);
      
      await program.methods
        .createUserAccount(1, 0)
        .accounts({
          userAccount: testUserPda,
          user: testUser.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([testUser])
        .rpc();

      const postBalance = await provider.connection.getBalance(testUser.publicKey);
      const gasCost = preBalance - postBalance;
      
      console.log(`User account creation cost: ${gasCost / LAMPORTS_PER_SOL} SOL`);
      expect(gasCost).to.be.lessThan(0.01 * LAMPORTS_PER_SOL); // Should cost less than 0.01 SOL
    });
  });
});
