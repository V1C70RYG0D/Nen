import * as anchor from "@coral-xyz/anchor";
import { expect } from "chai";
import { PublicKey, Keypair, SystemProgram, LAMPORTS_PER_SOL } from "@solana/web3.js";

describe("Nen Core Program - Functional Tests", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.NenCore;
  let platformPda: PublicKey;
  let platformBump: number;
  let admin: Keypair;
  let user1: Keypair;
  let user2: Keypair;

  before(async () => {
    admin = Keypair.generate();
    user1 = Keypair.generate();
    user2 = Keypair.generate();

    // Airdrop SOL to test accounts
    await provider.connection.requestAirdrop(admin.publicKey, 2 * LAMPORTS_PER_SOL);
    await provider.connection.requestAirdrop(user1.publicKey, 2 * LAMPORTS_PER_SOL);
    await provider.connection.requestAirdrop(user2.publicKey, 2 * LAMPORTS_PER_SOL);

    // Derive platform PDA
    [platformPda, platformBump] = PublicKey.findProgramAddressSync(
      [Buffer.from("platform")],
      program.programId
    );

    console.log("Test setup complete");
    console.log("Platform PDA:", platformPda.toString());
    console.log("Admin:", admin.publicKey.toString());
  });

  describe("Platform Management", () => {
    it("Should initialize platform with admin authority", async () => {
      const platformFeePercentage = 250; // 2.5%

      await program.methods
        .initializePlatform(admin.publicKey, platformFeePercentage)
        .accounts({
          platform: platformPda,
          admin: admin.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([admin])
        .rpc();

      const platformAccount = await program.account.platform.fetch(platformPda);
      expect(platformAccount.adminAuthority.toString()).to.equal(admin.publicKey.toString());
      expect(platformAccount.platformFeePercentage).to.equal(platformFeePercentage);
      expect(platformAccount.totalMatches).to.equal(0);
      expect(platformAccount.isPaused).to.be.false;

      console.log("Platform initialized successfully");
      console.log("Admin authority:", platformAccount.adminAuthority.toString());
      console.log("Platform fee:", platformAccount.platformFeePercentage, "bps");
    });
  });

  describe("User Account Management", () => {
    it("Should create user account with KYC level", async () => {
      const [userPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("user"), user1.publicKey.toBuffer()],
        program.programId
      );

      const kycLevel = 1; // Basic KYC
      const complianceFlags = 0;

      await program.methods
        .createUserAccount(kycLevel, complianceFlags)
        .accounts({
          userAccount: userPda,
          user: user1.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([user1])
        .rpc();

      const userAccount = await program.account.userAccount.fetch(userPda);
      expect(userAccount.authority.toString()).to.equal(user1.publicKey.toString());
      expect(userAccount.kycLevel).to.equal(kycLevel);
      expect(userAccount.totalMatches).to.equal(0);
      expect(userAccount.reputationScore).to.equal(1000);
      expect(userAccount.isActive).to.be.true;

      console.log("User account created successfully");
      console.log("User authority:", userAccount.authority.toString());
      console.log("KYC level:", userAccount.kycLevel);
      console.log("Reputation score:", userAccount.reputationScore);
    });

    it("Should create enhanced user with username and region", async () => {
      const [userPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("user"), user2.publicKey.toBuffer()],
        program.programId
      );

      const username = "testuser123";
      const kycLevel = 2; // Enhanced KYC
      const region = 1; // North America

      await program.methods
        .createEnhancedUser(username, kycLevel, region)
        .accounts({
          userAccount: userPda,
          user: user2.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([user2])
        .rpc();

      const userAccount = await program.account.userAccount.fetch(userPda);
      expect(userAccount.authority.toString()).to.equal(user2.publicKey.toString());
      expect(userAccount.kycLevel).to.equal(kycLevel);
      expect(userAccount.complianceFlags).to.equal(region);

      console.log("Enhanced user created successfully");
      console.log("Username:", username);
      console.log("KYC level:", userAccount.kycLevel);
      console.log("Region:", userAccount.complianceFlags);
    });
  });

  describe("Match Creation and Management", () => {
    it("Should create Gungi match with betting", async () => {
      const platformAccount = await program.account.platform.fetch(platformPda);
      const matchId = platformAccount.totalMatches;

      const [matchPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("match"), matchId.toArrayLike(Buffer, "le", 8)],
        program.programId
      );

      const matchType = { pvp: {} }; // Player vs Player
      const betAmount = 0.1 * LAMPORTS_PER_SOL; // 0.1 SOL
      const timeLimitSeconds = 1800; // 30 minutes
      const aiDifficulty = 3;

      await program.methods
        .createMatch(matchType, new anchor.BN(betAmount), timeLimitSeconds, aiDifficulty)
        .accounts({
          matchAccount: matchPda,
          platform: platformPda,
          player: user1.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([user1])
        .rpc();

      const matchAccount = await program.account.matchAccount.fetch(matchPda);
      expect(matchAccount.matchId).to.equal(matchId);
      expect(matchAccount.player.toString()).to.equal(user1.publicKey.toString());
      expect(matchAccount.betAmount.toNumber()).to.equal(betAmount);
      expect(matchAccount.timeLimitSeconds).to.equal(timeLimitSeconds);
      expect(matchAccount.aiDifficulty).to.equal(aiDifficulty);
      expect(matchAccount.movesCount).to.equal(0);

      const updatedPlatform = await program.account.platform.fetch(platformPda);
      expect(updatedPlatform.totalMatches).to.equal(1);

      console.log("Match created successfully");
      console.log("Match ID:", matchAccount.matchId);
      console.log("Player:", matchAccount.player.toString());
      console.log("Bet amount:", matchAccount.betAmount.toNumber() / LAMPORTS_PER_SOL, "SOL");
      console.log("Time limit:", matchAccount.timeLimitSeconds, "seconds");
    });

    it("Should submit move with fraud detection", async () => {
      const matchId = 0;
      const [matchPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("match"), new anchor.BN(matchId).toArrayLike(Buffer, "le", 8)],
        program.programId
      );

      const matchAccount = await program.account.matchAccount.fetch(matchPda);
      
      const fromX = 0;
      const fromY = 0;
      const toX = 1;
      const toY = 0;
      const pieceType = 1; // Basic piece
      const moveTimestamp = Math.floor(Date.now() / 1000);

      await program.methods
        .submitMove(fromX, fromY, toX, toY, pieceType, new anchor.BN(moveTimestamp))
        .accounts({
          matchAccount: matchPda,
          player: user1.publicKey,
        })
        .signers([user1])
        .rpc();

      const updatedMatch = await program.account.matchAccount.fetch(matchPda);
      expect(updatedMatch.movesCount).to.equal(1);

      console.log("Move submitted successfully");
      console.log("Moves count:", updatedMatch.movesCount);
      console.log("From position:", fromX, fromY);
      console.log("To position:", toX, toY);
    });
  });

  describe("AI Agent NFT System", () => {
    it("Should mint AI agent NFT with traits", async () => {
      const mint = Keypair.generate();
      const [nftPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("ai_agent"), mint.publicKey.toBuffer()],
        program.programId
      );

      const agentName = "GungiMaster";
      const personalityTraits = {
        aggression: 75,
        patience: 60,
        creativity: 85,
        analytical: 90,
      };
      const performanceMetrics = {
        winRate: 0,
        averageGameLength: 0,
        totalGames: 0,
        rating: 1200,
      };

      await program.methods
        .mintAiAgentNft(agentName, personalityTraits, performanceMetrics)
        .accounts({
          nftAccount: nftPda,
          mint: mint.publicKey,
          owner: user1.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([user1, mint])
        .rpc();

      const nftAccount = await program.account.aiAgentNft.fetch(nftPda);
      expect(nftAccount.owner.toString()).to.equal(user1.publicKey.toString());
      expect(nftAccount.agentName).to.equal(agentName);
      expect(nftAccount.personalityTraits.aggression).to.equal(75);
      expect(nftAccount.performanceMetrics.rating).to.equal(1200);

      console.log("AI Agent NFT minted successfully");
      console.log("Agent name:", nftAccount.agentName);
      console.log("Owner:", nftAccount.owner.toString());
      console.log("Aggression trait:", nftAccount.personalityTraits.aggression);
      console.log("Initial rating:", nftAccount.performanceMetrics.rating);
    });
  });

  describe("Training Session Management", () => {
    it("Should start training session for AI agent", async () => {
      const mint = Keypair.generate();
      const sessionId = Array.from(crypto.getRandomValues(new Uint8Array(16)));
      
      const [trainingPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("training"), user1.publicKey.toBuffer(), mint.publicKey.toBuffer()],
        program.programId
      );

      const replayCommitments = [
        Array.from(crypto.getRandomValues(new Uint8Array(32))),
        Array.from(crypto.getRandomValues(new Uint8Array(32))),
      ];

      const trainingParams = {
        learningRate: 0.001,
        batchSize: 32,
        epochs: 100,
        validationSplit: 0.2,
      };

      await program.methods
        .startTrainingSessionLight(sessionId, replayCommitments, trainingParams)
        .accounts({
          trainingSession: trainingPda,
          mint: mint.publicKey,
          owner: user1.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([user1])
        .rpc();

      const sessionAccount = await program.account.trainingSession.fetch(trainingPda);
      expect(sessionAccount.owner.toString()).to.equal(user1.publicKey.toString());
      expect(sessionAccount.agentMint.toString()).to.equal(mint.publicKey.toString());
      expect(sessionAccount.replayCommitments.length).to.equal(2);
      expect(sessionAccount.params.epochs).to.equal(100);

      console.log("Training session started successfully");
      console.log("Session owner:", sessionAccount.owner.toString());
      console.log("Agent mint:", sessionAccount.agentMint.toString());
      console.log("Replay commitments:", sessionAccount.replayCommitments.length);
      console.log("Training epochs:", sessionAccount.params.epochs);
    });
  });
});
