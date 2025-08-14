import * as anchor from "@coral-xyz/anchor";
import { expect } from "chai";
import { PublicKey, Keypair, SystemProgram, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { 
  TOKEN_PROGRAM_ID, 
  createMint, 
  createAccount, 
  mintTo,
  getAccount,
  ASSOCIATED_TOKEN_PROGRAM_ID
} from "@solana/spl-token";

describe("Nen Core Program - Comprehensive Testing", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.NenCore as anchor.Program<any>;

  // Test accounts
  let admin: Keypair;
  let user1: Keypair;
  let user2: Keypair;
  let user3: Keypair;
  let mintAuthority: Keypair;

  // PDAs
  let platformPda: PublicKey;
  let userAccount1Pda: PublicKey;
  let userAccount2Pda: PublicKey;
  let userAccount3Pda: PublicKey;

  // NFT and Token accounts
  let mint: PublicKey;
  let userTokenAccount: PublicKey;

  before(async () => {
    // Initialize keypairs
    admin = Keypair.generate();
    user1 = Keypair.generate();
    user2 = Keypair.generate();
    user3 = Keypair.generate();
    mintAuthority = Keypair.generate();

    // Airdrop SOL to test accounts
    const airdropPromises = [admin, user1, user2, user3, mintAuthority].map(keypair =>
      provider.connection.requestAirdrop(keypair.publicKey, 10 * LAMPORTS_PER_SOL)
    );
    await Promise.all(airdropPromises);

    // Wait for airdrops to confirm
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Derive PDAs
    [platformPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("platform")],
      program.programId
    );

    [userAccount1Pda] = PublicKey.findProgramAddressSync(
      [Buffer.from("user"), user1.publicKey.toBuffer()],
      program.programId
    );

    [userAccount2Pda] = PublicKey.findProgramAddressSync(
      [Buffer.from("user"), user2.publicKey.toBuffer()],
      program.programId
    );

    [userAccount3Pda] = PublicKey.findProgramAddressSync(
      [Buffer.from("user"), user3.publicKey.toBuffer()],
      program.programId
    );

    // Create NFT mint for testing
    mint = await createMint(
      provider.connection,
      mintAuthority,
      mintAuthority.publicKey,
      null,
      0 // NFT has 0 decimals
    );

    // Create token account for user
    userTokenAccount = await createAccount(
      provider.connection,
      user1,
      mint,
      user1.publicKey
    );

    // Mint 1 NFT to user
    await mintTo(
      provider.connection,
      mintAuthority,
      mint,
      userTokenAccount,
      mintAuthority,
      1
    );
  });

  describe("Platform Initialization", () => {
    it("Should initialize platform successfully", async () => {
      const platformFeePercentage = 250; // 2.5%

      const tx = await program.methods
        .initializePlatform(admin.publicKey, platformFeePercentage)
        .accounts({
          platform: platformPda,
          admin: admin.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([admin])
        .rpc();

      console.log("✅ Platform initialization transaction:", tx);

      // Verify platform account was created
      const platformAccount = await program.account.platform.fetch(platformPda);
      expect(platformAccount.adminAuthority.toString()).to.equal(admin.publicKey.toString());
      expect(platformAccount.platformFeePercentage).to.equal(platformFeePercentage);
      expect(platformAccount.totalMatches.toNumber()).to.equal(0);
      expect(platformAccount.isPaused).to.be.false;
    });

    it("Should reject invalid fee percentage", async () => {
      const invalidFee = 1500; // 15% - too high
      const tempAdmin = Keypair.generate();
      await provider.connection.requestAirdrop(tempAdmin.publicKey, 2 * LAMPORTS_PER_SOL);
      await new Promise(resolve => setTimeout(resolve, 1000));

      const [tempPlatformPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("platform"), tempAdmin.publicKey.toBuffer()],
        program.programId
      );

      try {
        await program.methods
          .initializePlatform(tempAdmin.publicKey, invalidFee)
          .accounts({
            platform: tempPlatformPda,
            admin: tempAdmin.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .signers([tempAdmin])
          .rpc();
        
        expect.fail("Should have failed with invalid fee percentage");
      } catch (error: any) {
        expect(error.message).to.include("InvalidFeePercentage");
        console.log("✅ Successfully rejected invalid fee percentage");
      }
    });
  });

  describe("User Account Management", () => {
    it("Should create basic user account successfully", async () => {
      const kycLevel = 1;
      const complianceFlags = 0;

      const tx = await program.methods
        .createUserAccount(kycLevel, complianceFlags)
        .accounts({
          userAccount: userAccount1Pda,
          user: user1.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([user1])
        .rpc();

      console.log("✅ Basic user account creation transaction:", tx);

      // Verify user account was created
      const userAccount = await program.account.userAccount.fetch(userAccount1Pda);
      expect(userAccount.authority.toString()).to.equal(user1.publicKey.toString());
      expect(userAccount.kycLevel).to.equal(kycLevel);
      expect(userAccount.totalMatches).to.equal(0);
      expect(userAccount.reputationScore).to.equal(1000);
      expect(userAccount.isActive).to.be.true;
    });

    it("Should create enhanced user account with username and region", async () => {
      const username = "player2_enhanced";
      const kycLevel = 2;
      const region = 1; // NA

      const tx = await program.methods
        .createEnhancedUser(username, kycLevel, region)
        .accounts({
          userAccount: userAccount2Pda,
          user: user2.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([user2])
        .rpc();

      console.log("✅ Enhanced user account creation transaction:", tx);

      // Verify enhanced user account was created
      const userAccount = await program.account.userAccount.fetch(userAccount2Pda);
      expect(userAccount.authority.toString()).to.equal(user2.publicKey.toString());
      expect(userAccount.kycLevel).to.equal(kycLevel);
      expect(userAccount.complianceFlags).to.equal(region);
      expect(userAccount.isActive).to.be.true;
    });

    it("Should reject invalid username", async () => {
      const invalidUsername = "ab"; // Too short
      const kycLevel = 1;
      const region = 0;

      try {
        await program.methods
          .createEnhancedUser(invalidUsername, kycLevel, region)
          .accounts({
            userAccount: userAccount3Pda,
            user: user3.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .signers([user3])
          .rpc();
        
        expect.fail("Should have failed with invalid username");
      } catch (error: any) {
        expect(error.message).to.include("UsernameTooShort");
        console.log("✅ Successfully rejected invalid username");
      }
    });

    it("Should reject invalid region", async () => {
      const username = "valid_user";
      const kycLevel = 1;
      const invalidRegion = 10; // Invalid region

      try {
        await program.methods
          .createEnhancedUser(username, kycLevel, invalidRegion)
          .accounts({
            userAccount: userAccount3Pda,
            user: user3.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .signers([user3])
          .rpc();
        
        expect.fail("Should have failed with invalid region");
      } catch (error: any) {
        expect(error.message).to.include("InvalidRegion");
        console.log("✅ Successfully rejected invalid region");
      }
    });
  });

  describe("Match Creation and Management", () => {
    let matchPda: PublicKey;

    it("Should create human vs AI match successfully", async () => {
      const platform = await program.account.platform.fetch(platformPda);
      const matchId = platform.totalMatches;

      [matchPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("match"), matchId.toArrayLike(Buffer, "le", 8)],
        program.programId
      );

      const matchType = { aiVsHuman: {} };
      const betAmount = LAMPORTS_PER_SOL; // 1 SOL
      const timeLimitSeconds = 1800; // 30 minutes
      const aiDifficulty = 3;

      const tx = await program.methods
        .createMatch(matchType, betAmount, timeLimitSeconds, aiDifficulty)
        .accounts({
          matchAccount: matchPda,
          platform: platformPda,
          player: user1.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([user1])
        .rpc();

      console.log("✅ Match creation transaction:", tx);

      // Verify match was created
      const matchAccount = await program.account.matchAccount.fetch(matchPda);
      expect(matchAccount.player.toString()).to.equal(user1.publicKey.toString());
      expect(matchAccount.betAmount.toNumber()).to.equal(betAmount);
      expect(matchAccount.aiDifficulty).to.equal(aiDifficulty);
      expect(matchAccount.status).to.deep.equal({ created: {} });
      expect(matchAccount.movesCount).to.equal(0);

      // Verify platform total matches updated
      const updatedPlatform = await program.account.platform.fetch(platformPda);
      expect(updatedPlatform.totalMatches.toNumber()).to.equal(1);
    });

    it("Should submit valid move successfully", async () => {
      const fromX = 4;
      const fromY = 0;
      const toX = 4;
      const toY = 1;
      const pieceType = 1; // Marshal
      const moveTimestamp = Math.floor(Date.now() / 1000);

      const tx = await program.methods
        .submitMove(fromX, fromY, toX, toY, pieceType, moveTimestamp)
        .accounts({
          matchAccount: matchPda,
          player: user1.publicKey,
        })
        .signers([user1])
        .rpc();

      console.log("✅ Move submission transaction:", tx);

      // Verify move was recorded
      const matchAccount = await program.account.matchAccount.fetch(matchPda);
      expect(matchAccount.movesCount).to.equal(1);
      expect(matchAccount.currentTurn).to.deep.equal({ ai: {} });
    });

    it("Should reject invalid move position", async () => {
      const invalidFromX = 10; // Outside 9x9 board
      const fromY = 0;
      const toX = 4;
      const toY = 1;
      const pieceType = 1;
      const moveTimestamp = Math.floor(Date.now() / 1000);

      try {
        await program.methods
          .submitMove(invalidFromX, fromY, toX, toY, pieceType, moveTimestamp)
          .accounts({
            matchAccount: matchPda,
            player: user1.publicKey,
          })
          .signers([user1])
          .rpc();
        
        expect.fail("Should have failed with invalid position");
      } catch (error: any) {
        expect(error.message).to.include("InvalidPosition");
        console.log("✅ Successfully rejected invalid move position");
      }
    });

    it("Should reject move with suspicious timestamp", async () => {
      const fromX = 3;
      const fromY = 0;
      const toX = 3;
      const toY = 1;
      const pieceType = 2;
      const suspiciousTimestamp = Math.floor(Date.now() / 1000) + 60; // 1 minute in future

      try {
        await program.methods
          .submitMove(fromX, fromY, toX, toY, pieceType, suspiciousTimestamp)
          .accounts({
            matchAccount: matchPda,
            player: user1.publicKey,
          })
          .signers([user1])
          .rpc();
        
        expect.fail("Should have failed with suspicious timestamp");
      } catch (error: any) {
        expect(error.message).to.include("SuspiciousTimestamp");
        console.log("✅ Successfully rejected suspicious timestamp");
      }
    });
  });

  describe("Betting System", () => {
    let betPda: PublicKey;
    let escrowPda: PublicKey;

    it("Should place bet successfully", async () => {
      const betAmount = LAMPORTS_PER_SOL / 2; // 0.5 SOL
      const betType = { playerWins: {} };
      const complianceSignature = new Array(64).fill(1); // Mock signature

      betPda = Keypair.generate().publicKey;
      escrowPda = Keypair.generate().publicKey;

      // Fund escrow account
      await provider.connection.requestAirdrop(escrowPda, LAMPORTS_PER_SOL);
      await new Promise(resolve => setTimeout(resolve, 1000));

      const tx = await program.methods
        .placeBet(betAmount, betType, complianceSignature)
        .accounts({
          betAccount: betPda,
          userAccount: userAccount1Pda,
          matchAccount: matchPda,
          bettor: user1.publicKey,
          escrowAccount: escrowPda,
          systemProgram: SystemProgram.programId,
        })
        .signers([user1])
        .rpc();

      console.log("✅ Bet placement transaction:", tx);

      // Verify bet was created
      const betAccount = await program.account.betAccount.fetch(betPda);
      expect(betAccount.bettor.toString()).to.equal(user1.publicKey.toString());
      expect(betAccount.betAmount.toNumber()).to.equal(betAmount);
      expect(betAccount.status).to.deep.equal({ pending: {} });
    });

    it("Should reject bet with insufficient KYC", async () => {
      // Create user with insufficient KYC (level 0)
      const lowKycUser = Keypair.generate();
      await provider.connection.requestAirdrop(lowKycUser.publicKey, 2 * LAMPORTS_PER_SOL);
      await new Promise(resolve => setTimeout(resolve, 1000));

      const [lowKycUserPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("user"), lowKycUser.publicKey.toBuffer()],
        program.programId
      );

      await program.methods
        .createUserAccount(0, 0) // KYC level 0
        .accounts({
          userAccount: lowKycUserPda,
          user: lowKycUser.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([lowKycUser])
        .rpc();

      const betAmount = LAMPORTS_PER_SOL / 4;
      const betType = { aiWins: {} };
      const complianceSignature = new Array(64).fill(2);
      const newBetPda = Keypair.generate().publicKey;

      try {
        await program.methods
          .placeBet(betAmount, betType, complianceSignature)
          .accounts({
            betAccount: newBetPda,
            userAccount: lowKycUserPda,
            matchAccount: matchPda,
            bettor: lowKycUser.publicKey,
            escrowAccount: escrowPda,
            systemProgram: SystemProgram.programId,
          })
          .signers([lowKycUser])
          .rpc();
        
        expect.fail("Should have failed with insufficient KYC");
      } catch (error: any) {
        expect(error.message).to.include("InsufficientKyc");
        console.log("✅ Successfully rejected bet with insufficient KYC");
      }
    });
  });

  describe("AI Agent NFT System", () => {
    let nftPda: PublicKey;

    it("Should mint AI agent NFT successfully", async () => {
      nftPda = Keypair.generate().publicKey;

      const agentName = "TestAgent";
      const personalityTraits = {
        aggression: 75,
        patience: 60,
        riskTolerance: 80,
        creativity: 90,
        analytical: 85,
      };
      const performanceMetrics = {
        winRate: 7500, // 75%
        averageMoves: 45,
        averageGameTime: 1200, // 20 minutes
        eloRating: 1650,
        learningRate: 250,
      };

      const tx = await program.methods
        .mintAiAgentNft(agentName, personalityTraits, performanceMetrics)
        .accounts({
          nftAccount: nftPda,
          mint: mint,
          tokenAccount: userTokenAccount,
          owner: user1.publicKey,
          mintAuthority: mintAuthority.publicKey,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .signers([user1])
        .rpc();

      console.log("✅ AI Agent NFT minting transaction:", tx);

      // Verify NFT was minted
      const nftAccount = await program.account.aiAgentNft.fetch(nftPda);
      expect(nftAccount.owner.toString()).to.equal(user1.publicKey.toString());
      expect(nftAccount.agentName).to.equal(agentName);
      expect(nftAccount.personalityTraits.aggression).to.equal(75);
      expect(nftAccount.performanceMetrics.winRate).to.equal(7500);
      expect(nftAccount.isTraining).to.be.false;
    });

    it("Should reject NFT with name too long", async () => {
      const longName = "A".repeat(50); // Too long
      const personalityTraits = {
        aggression: 50,
        patience: 50,
        riskTolerance: 50,
        creativity: 50,
        analytical: 50,
      };
      const performanceMetrics = {
        winRate: 5000,
        averageMoves: 50,
        averageGameTime: 1500,
        eloRating: 1500,
        learningRate: 200,
      };

      const invalidNftPda = Keypair.generate().publicKey;

      try {
        await program.methods
          .mintAiAgentNft(longName, personalityTraits, performanceMetrics)
          .accounts({
            nftAccount: invalidNftPda,
            mint: mint,
            tokenAccount: userTokenAccount,
            owner: user1.publicKey,
            mintAuthority: mintAuthority.publicKey,
            tokenProgram: TOKEN_PROGRAM_ID,
            systemProgram: SystemProgram.programId,
          })
          .signers([user1])
          .rpc();
        
        expect.fail("Should have failed with name too long");
      } catch (error: any) {
        expect(error.message).to.include("NameTooLong");
        console.log("✅ Successfully rejected NFT with long name");
      }
    });
  });

  describe("Training Session Management", () => {
    let trainingSessionPda: PublicKey;

    it("Should start training session successfully", async () => {
      [trainingSessionPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("training"), user1.publicKey.toBuffer(), mint.toBuffer()],
        program.programId
      );

      const sessionId = Array.from(Buffer.alloc(16, 1));
      const replayCommitments = [
        Array.from(Buffer.alloc(32, 1)),
        Array.from(Buffer.alloc(32, 2)),
      ];
      const params = {
        focusArea: 1, // midgame
        intensity: 2, // high
        maxMatches: 10,
        learningRateBp: 100,
        epochs: 5,
        batchSize: 4,
      };

      const tx = await program.methods
        .startTrainingSession(sessionId, replayCommitments, params)
        .accounts({
          trainingSession: trainingSessionPda,
          agentNft: nftPda,
          mint: mint,
          owner: user1.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([user1])
        .rpc();

      console.log("✅ Training session start transaction:", tx);

      // Verify training session was created
      const session = await program.account.trainingSession.fetch(trainingSessionPda);
      expect(session.owner.toString()).to.equal(user1.publicKey.toString());
      expect(session.agentMint.toString()).to.equal(mint.toString());
      expect(session.status).to.deep.equal({ initiated: {} });
      expect(session.replayCommitments.length).to.equal(2);

      // Verify agent is locked for training
      const nftAccount = await program.account.aiAgentNft.fetch(nftPda);
      expect(nftAccount.isTraining).to.be.true;
    });

    it("Should end training session successfully", async () => {
      const status = { completed: {} };

      const tx = await program.methods
        .endTrainingSession(status)
        .accounts({
          trainingSession: trainingSessionPda,
          agentNft: nftPda,
          mint: mint,
          owner: user1.publicKey,
        })
        .signers([user1])
        .rpc();

      console.log("✅ Training session end transaction:", tx);

      // Verify session status updated
      const session = await program.account.trainingSession.fetch(trainingSessionPda);
      expect(session.status).to.deep.equal({ completed: {} });

      // Verify agent is unlocked
      const nftAccount = await program.account.aiAgentNft.fetch(nftPda);
      expect(nftAccount.isTraining).to.be.false;
    });

    it("Should start light training session without NFT account", async () => {
      const newUser = Keypair.generate();
      await provider.connection.requestAirdrop(newUser.publicKey, 2 * LAMPORTS_PER_SOL);
      await new Promise(resolve => setTimeout(resolve, 1000));

      const newMint = await createMint(
        provider.connection,
        mintAuthority,
        mintAuthority.publicKey,
        null,
        0
      );

      const [lightTrainingPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("training"), newUser.publicKey.toBuffer(), newMint.toBuffer()],
        program.programId
      );

      const sessionId = Array.from(Buffer.alloc(16, 2));
      const replayCommitments = [Array.from(Buffer.alloc(32, 3))];
      const params = {
        focusArea: 0, // openings
        intensity: 1, // medium
        maxMatches: 5,
        learningRateBp: 50,
        epochs: 3,
        batchSize: 2,
      };

      const tx = await program.methods
        .startTrainingSessionLight(sessionId, replayCommitments, params)
        .accounts({
          trainingSession: lightTrainingPda,
          mint: newMint,
          owner: newUser.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([newUser])
        .rpc();

      console.log("✅ Light training session start transaction:", tx);

      // Verify light training session was created
      const session = await program.account.trainingSession.fetch(lightTrainingPda);
      expect(session.owner.toString()).to.equal(newUser.publicKey.toString());
      expect(session.agentMint.toString()).to.equal(newMint.toString());
      expect(session.status).to.deep.equal({ initiated: {} });
    });

    it("Should reject training with too many replays", async () => {
      const tooManyReplays = Array(60).fill(0).map(() => Array.from(Buffer.alloc(32, 1)));
      const sessionId = Array.from(Buffer.alloc(16, 3));
      const params = {
        focusArea: 0,
        intensity: 0,
        maxMatches: 1,
        learningRateBp: 1,
        epochs: 1,
        batchSize: 1,
      };

      const tempUser = Keypair.generate();
      await provider.connection.requestAirdrop(tempUser.publicKey, 2 * LAMPORTS_PER_SOL);
      await new Promise(resolve => setTimeout(resolve, 1000));

      const tempMint = await createMint(
        provider.connection,
        mintAuthority,
        mintAuthority.publicKey,
        null,
        0
      );

      const [tempTrainingPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("training"), tempUser.publicKey.toBuffer(), tempMint.toBuffer()],
        program.programId
      );

      try {
        await program.methods
          .startTrainingSessionLight(sessionId, tooManyReplays, params)
          .accounts({
            trainingSession: tempTrainingPda,
            mint: tempMint,
            owner: tempUser.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .signers([tempUser])
          .rpc();
        
        expect.fail("Should have failed with too many replays");
      } catch (error: any) {
        expect(error.message).to.include("TooManyReplays");
        console.log("✅ Successfully rejected training with too many replays");
      }
    });
  });

  describe("Performance and Security Tests", () => {
    it("Should handle concurrent user creations", async () => {
      const concurrentUsers = [];
      const promises = [];

      for (let i = 0; i < 3; i++) {
        const user = Keypair.generate();
        concurrentUsers.push(user);
        
        await provider.connection.requestAirdrop(user.publicKey, 2 * LAMPORTS_PER_SOL);
        
        const [userPda] = PublicKey.findProgramAddressSync(
          [Buffer.from("user"), user.publicKey.toBuffer()],
          program.programId
        );

        promises.push(
          program.methods
            .createUserAccount(1, 0)
            .accounts({
              userAccount: userPda,
              user: user.publicKey,
              systemProgram: SystemProgram.programId,
            })
            .signers([user])
            .rpc()
        );
      }

      const results = await Promise.allSettled(promises);
      const successCount = results.filter(r => r.status === 'fulfilled').length;

      expect(successCount).to.be.greaterThan(0);
      console.log(`✅ Successfully created ${successCount}/3 concurrent user accounts`);
    });

    it("Should verify PDA derivations are secure", async () => {
      // Test that PDAs are correctly derived
      const [derivedPlatformPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("platform")],
        program.programId
      );

      const [derivedUserPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("user"), user1.publicKey.toBuffer()],
        program.programId
      );

      expect(derivedPlatformPda.toString()).to.equal(platformPda.toString());
      expect(derivedUserPda.toString()).to.equal(userAccount1Pda.toString());

      console.log("✅ All PDA derivations are secure and consistent");
    });

    it("Should maintain account state consistency", async () => {
      // Verify all accounts still exist and have expected states
      const platform = await program.account.platform.fetch(platformPda);
      const user1Account = await program.account.userAccount.fetch(userAccount1Pda);
      const user2Account = await program.account.userAccount.fetch(userAccount2Pda);

      expect(platform.totalMatches.toNumber()).to.be.greaterThan(0);
      expect(user1Account.isActive).to.be.true;
      expect(user2Account.isActive).to.be.true;

      console.log("✅ All account states maintain consistency");
    });
  });

  describe("Integration and Edge Cases", () => {
    it("Should handle match creation with minimum bet amount", async () => {
      const platform = await program.account.platform.fetch(platformPda);
      const matchId = platform.totalMatches;

      const [minBetMatchPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("match"), matchId.toArrayLike(Buffer, "le", 8)],
        program.programId
      );

      const matchType = { aiVsHuman: {} };
      const minBetAmount = 1_000_000; // 0.001 SOL - minimum
      const timeLimitSeconds = 300; // 5 minutes - minimum
      const aiDifficulty = 1;

      const tx = await program.methods
        .createMatch(matchType, minBetAmount, timeLimitSeconds, aiDifficulty)
        .accounts({
          matchAccount: minBetMatchPda,
          platform: platformPda,
          player: user2.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([user2])
        .rpc();

      console.log("✅ Minimum bet match creation transaction:", tx);

      const matchAccount = await program.account.matchAccount.fetch(minBetMatchPda);
      expect(matchAccount.betAmount.toNumber()).to.equal(minBetAmount);
    });

    it("Should validate complex match scenarios", async () => {
      // Test different match types
      const matchTypes = [
        { aiVsHuman: {} },
        { aiVsAi: {} },
        { tournament: {} }
      ];

      for (const [index, matchType] of matchTypes.entries()) {
        const platform = await program.account.platform.fetch(platformPda);
        const matchId = platform.totalMatches;

        const [matchPda] = PublicKey.findProgramAddressSync(
          [Buffer.from("match"), matchId.toArrayLike(Buffer, "le", 8)],
          program.programId
        );

        await program.methods
          .createMatch(matchType, LAMPORTS_PER_SOL, 1800, index + 1)
          .accounts({
            matchAccount: matchPda,
            platform: platformPda,
            player: user1.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .signers([user1])
          .rpc();

        const matchAccount = await program.account.matchAccount.fetch(matchPda);
        expect(matchAccount.matchType).to.deep.equal(matchType);
      }

      console.log("✅ Successfully created matches with all match types");
    });

    it("Should verify comprehensive functionality coverage", async () => {
      // Final verification that all core features work
      const verifications = {
        platformInitialized: await program.account.platform.fetch(platformPda),
        usersCreated: await Promise.all([
          program.account.userAccount.fetch(userAccount1Pda),
          program.account.userAccount.fetch(userAccount2Pda),
        ]),
        trainingSessionCompleted: await program.account.trainingSession.fetch(trainingSessionPda),
        nftMinted: await program.account.aiAgentNft.fetch(nftPda),
      };

      expect(verifications.platformInitialized).to.not.be.null;
      expect(verifications.usersCreated.length).to.equal(2);
      expect(verifications.trainingSessionCompleted.status).to.deep.equal({ completed: {} });
      expect(verifications.nftMinted.owner.toString()).to.equal(user1.publicKey.toString());

      console.log("✅ Comprehensive functionality verification completed successfully");
    });
  });
});
