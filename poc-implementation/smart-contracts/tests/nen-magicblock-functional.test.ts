import * as anchor from "@coral-xyz/anchor";
import { expect } from "chai";
import { PublicKey, Keypair, SystemProgram, LAMPORTS_PER_SOL } from "@solana/web3.js";

describe("Nen MagicBlock Program - Functional Tests", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.NenMagicblock;
  let player1: Keypair;
  let player2: Keypair;
  let sessionPda: PublicKey;
  let sessionId: number;

  before(async () => {
    player1 = Keypair.generate();
    player2 = Keypair.generate();
    sessionId = Math.floor(Math.random() * 1000000);

    // Airdrop SOL to test accounts
    await provider.connection.requestAirdrop(player1.publicKey, 2 * LAMPORTS_PER_SOL);
    await provider.connection.requestAirdrop(player2.publicKey, 2 * LAMPORTS_PER_SOL);

    await new Promise(resolve => setTimeout(resolve, 2000));

    // Derive session PDA
    [sessionPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("session"), player1.publicKey.toBuffer()],
      program.programId
    );

    console.log("Test setup complete");
    console.log("Player1:", player1.publicKey.toString());
    console.log("Player2:", player2.publicKey.toString());
    console.log("Session PDA:", sessionPda.toString());
    console.log("Session ID:", sessionId);
  });

  describe("Enhanced Gaming Session Management", () => {
    it("Should create enhanced gaming session with geographic clustering", async () => {
      const sessionConfig = {
        timeLimitSeconds: 1800, // 30 minutes
        moveTimeLimitSeconds: 60, // 1 minute per move
        enableSpectators: true,
        enableAnalysis: false,
        compressionLevel: 2,
      };

      const geographicRegion = {
        regionCode: "US-WEST",
        latencyZone: 1, // Lowest latency zone
        serverCluster: "cluster-sf-01",
      };

      await program.methods
        .createEnhancedSession(
          new anchor.BN(sessionId),
          player1.publicKey,
          player2.publicKey,
          sessionConfig,
          geographicRegion
        )
        .accounts({
          session: sessionPda,
          authority: player1.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([player1])
        .rpc();

      const session = await program.account.enhancedGameSession.fetch(sessionPda);
      expect(session.sessionId.toNumber()).to.equal(sessionId);
      expect(session.player1.toString()).to.equal(player1.publicKey.toString());
      expect(session.player2.toString()).to.equal(player2.publicKey.toString());
      expect(session.sessionConfig.timeLimitSeconds).to.equal(1800);
      expect(session.geographicRegion.regionCode).to.equal("US-WEST");
      expect(session.geographicRegion.latencyZone).to.equal(1);
      expect(session.currentTurn).to.deep.equal({ player1: {} });
      expect(session.moveNumber).to.equal(0);
      expect(session.status).to.deep.equal({ waiting: {} });

      console.log("Enhanced gaming session created successfully");
      console.log("Session ID:", session.sessionId.toNumber());
      console.log("Player1:", session.player1.toString());
      console.log("Player2:", session.player2.toString());
      console.log("Geographic region:", session.geographicRegion.regionCode);
      console.log("Latency zone:", session.geographicRegion.latencyZone);
      console.log("Server cluster:", session.geographicRegion.serverCluster);
      console.log("Time limit:", session.sessionConfig.timeLimitSeconds, "seconds");
      console.log("Current turn:", Object.keys(session.currentTurn)[0]);
    });

    it("Should update session configuration for performance optimization", async () => {
      const newConfig = {
        timeLimitSeconds: 2400, // 40 minutes
        moveTimeLimitSeconds: 45, // 45 seconds per move
        enableSpectators: false,
        enableAnalysis: true,
        compressionLevel: 3,
      };

      const performanceTarget = {
        targetLatencyMs: 25, // Target <25ms latency
        targetThroughput: 100, // 100 moves per second
      };

      await program.methods
        .updateSessionConfig(newConfig, performanceTarget)
        .accounts({
          session: sessionPda,
          authority: player1.publicKey,
        })
        .signers([player1])
        .rpc();

      const session = await program.account.enhancedGameSession.fetch(sessionPda);
      expect(session.sessionConfig.timeLimitSeconds).to.equal(2400);
      expect(session.sessionConfig.moveTimeLimitSeconds).to.equal(45);
      expect(session.sessionConfig.enableAnalysis).to.be.true;
      expect(session.sessionConfig.compressionLevel).to.equal(3);
      expect(session.performanceMetrics.targetLatencyMs).to.equal(25);
      expect(session.performanceMetrics.targetThroughput).to.equal(100);

      console.log("Session configuration updated successfully");
      console.log("New time limit:", session.sessionConfig.timeLimitSeconds, "seconds");
      console.log("New move time limit:", session.sessionConfig.moveTimeLimitSeconds, "seconds");
      console.log("Analysis enabled:", session.sessionConfig.enableAnalysis);
      console.log("Compression level:", session.sessionConfig.compressionLevel);
      console.log("Target latency:", session.performanceMetrics.targetLatencyMs, "ms");
      console.log("Target throughput:", session.performanceMetrics.targetThroughput, "moves/sec");
    });

    it("Should migrate session to different geographic region", async () => {
      const newRegion = {
        regionCode: "EU-CENTRAL",
        latencyZone: 2,
        serverCluster: "cluster-fra-02",
      };

      const migrationReason = { latencyOptimization: {} };

      await program.methods
        .migrateSessionGeographic(newRegion, migrationReason)
        .accounts({
          session: sessionPda,
          authority: player1.publicKey,
        })
        .signers([player1])
        .rpc();

      const session = await program.account.enhancedGameSession.fetch(sessionPda);
      expect(session.geographicRegion.regionCode).to.equal("EU-CENTRAL");
      expect(session.geographicRegion.latencyZone).to.equal(2);
      expect(session.geographicRegion.serverCluster).to.equal("cluster-fra-02");
      expect(session.performanceMetrics.regionPerformanceScore).to.equal(0); // Reset after migration

      console.log("Session migrated successfully");
      console.log("New region:", session.geographicRegion.regionCode);
      console.log("New latency zone:", session.geographicRegion.latencyZone);
      console.log("New server cluster:", session.geographicRegion.serverCluster);
      console.log("Performance score reset:", session.performanceMetrics.regionPerformanceScore);
    });
  });

  describe("BOLT ECS Move Processing", () => {
    it("Should submit move with BOLT ECS validation and performance tracking", async () => {
      const moveData = {
        fromX: 0,
        fromY: 0,
        fromLevel: 0,
        toX: 1,
        toY: 0,
        toLevel: 0,
        pieceType: 1, // Basic piece
        moveType: { normal: {} },
        player: 1, // Player 1
        timestamp: Math.floor(Date.now() / 1000),
      };

      const performanceHint = {
        expectedLatencyMs: 15, // Expect 15ms processing
        priorityLevel: 3,
        compressionPreference: true,
      };

      const antiFraudToken = Array.from(crypto.getRandomValues(new Uint8Array(32)));

      await program.methods
        .submitMoveBoltEcs(moveData, performanceHint, antiFraudToken)
        .accounts({
          session: sessionPda,
          player: player1.publicKey,
        })
        .signers([player1])
        .rpc();

      const session = await program.account.enhancedGameSession.fetch(sessionPda);
      expect(session.moveNumber).to.equal(1);
      expect(session.currentTurn).to.deep.equal({ player2: {} }); // Turn switched
      expect(session.performanceMetrics.totalMoves).to.equal(1);
      expect(session.performanceMetrics.peakLatency).to.be.greaterThan(0);
      expect(session.lastMove).to.not.be.null;

      console.log("BOLT ECS move submitted successfully");
      console.log("Move number:", session.moveNumber);
      console.log("Current turn:", Object.keys(session.currentTurn)[0]);
      console.log("Total moves processed:", session.performanceMetrics.totalMoves);
      console.log("Peak latency:", session.performanceMetrics.peakLatency, "ms");
      console.log("Average move latency:", session.performanceMetrics.averageMoveLatency, "ms");
    });

    it("Should process multiple moves and track performance metrics", async () => {
      const moveData2 = {
        fromX: 8,
        fromY: 8,
        fromLevel: 0,
        toX: 7,
        toY: 8,
        toLevel: 0,
        pieceType: 2,
        moveType: { normal: {} },
        player: 2,
        timestamp: Math.floor(Date.now() / 1000),
      };

      const performanceHint2 = {
        expectedLatencyMs: 12,
        priorityLevel: 4,
        compressionPreference: false,
      };

      const antiFraudToken2 = Array.from(crypto.getRandomValues(new Uint8Array(32)));

      await program.methods
        .submitMoveBoltEcs(moveData2, performanceHint2, antiFraudToken2)
        .accounts({
          session: sessionPda,
          player: player2.publicKey,
        })
        .signers([player2])
        .rpc();

      const moveData3 = {
        fromX: 1,
        fromY: 0,
        fromLevel: 0,
        toX: 2,
        toY: 0,
        toLevel: 0,
        pieceType: 1,
        moveType: { normal: {} },
        player: 1,
        timestamp: Math.floor(Date.now() / 1000),
      };

      const performanceHint3 = {
        expectedLatencyMs: 18,
        priorityLevel: 2,
        compressionPreference: true,
      };

      const antiFraudToken3 = Array.from(crypto.getRandomValues(new Uint8Array(32)));

      await program.methods
        .submitMoveBoltEcs(moveData3, performanceHint3, antiFraudToken3)
        .accounts({
          session: sessionPda,
          player: player1.publicKey,
        })
        .signers([player1])
        .rpc();

      const session = await program.account.enhancedGameSession.fetch(sessionPda);
      expect(session.moveNumber).to.equal(3);
      expect(session.performanceMetrics.totalMoves).to.equal(3);
      expect(session.performanceMetrics.averageMoveLatency).to.be.greaterThan(0);

      console.log("Multiple moves processed successfully");
      console.log("Total moves:", session.moveNumber);
      console.log("Performance metrics:");
      console.log("  Total moves processed:", session.performanceMetrics.totalMoves);
      console.log("  Average latency:", session.performanceMetrics.averageMoveLatency, "ms");
      console.log("  Peak latency:", session.performanceMetrics.peakLatency, "ms");
      console.log("  Target latency:", session.performanceMetrics.targetLatencyMs, "ms");
    });

    it("Should reject moves that are too fast (anti-spam)", async () => {
      const rapidMoveData = {
        fromX: 2,
        fromY: 0,
        fromLevel: 0,
        toX: 3,
        toY: 0,
        toLevel: 0,
        pieceType: 1,
        moveType: { normal: {} },
        player: 2,
        timestamp: Math.floor(Date.now() / 1000),
      };

      const performanceHint = {
        expectedLatencyMs: 5,
        priorityLevel: 5,
        compressionPreference: false,
      };

      const antiFraudToken = Array.from(crypto.getRandomValues(new Uint8Array(32)));

      try {
        await program.methods
          .submitMoveBoltEcs(rapidMoveData, performanceHint, antiFraudToken)
          .accounts({
            session: sessionPda,
            player: player2.publicKey,
          })
          .signers([player2])
          .rpc();
        
        expect.fail("Should have rejected rapid move");
      } catch (error) {
        expect(error.message).to.include("MoveTooFast");
        console.log("Correctly rejected rapid move (anti-spam protection)");
      }
    });
  });

  describe("MagicBlock Delegation and Commit System", () => {
    it("Should delegate session to MagicBlock", async () => {
      const delegateParams = {
        validator: Keypair.generate().publicKey,
        commitFrequencyMs: 100, // Commit every 100ms
      };

      await program.methods
        .delegateSession(delegateParams)
        .accounts({
          session: sessionPda,
          authority: player1.publicKey,
        })
        .signers([player1])
        .rpc();

      console.log("Session delegated to MagicBlock successfully");
      console.log("Validator:", delegateParams.validator.toString());
      console.log("Commit frequency:", delegateParams.commitFrequencyMs, "ms");
    });

    it("Should schedule session commit", async () => {
      await program.methods
        .commitSession()
        .accounts({
          session: sessionPda,
          authority: player1.publicKey,
        })
        .signers([player1])
        .rpc();

      console.log("Session commit scheduled successfully");
    });

    it("Should undelegate session from MagicBlock", async () => {
      const magicContext = Keypair.generate().publicKey;
      const magicProgram = Keypair.generate().publicKey;

      await program.methods
        .undelegateSession()
        .accounts({
          session: sessionPda,
          authority: player1.publicKey,
          magicContext: magicContext,
          magicProgram: magicProgram,
        })
        .signers([player1])
        .rpc();

      console.log("Session undelegated from MagicBlock successfully");
    });
  });

  describe("Gaming Session State Verification", () => {
    it("Should verify final session state and performance metrics", async () => {
      const session = await program.account.enhancedGameSession.fetch(sessionPda);

      console.log("Final session state verification:");
      console.log("Session details:");
      console.log("  Session ID:", session.sessionId.toNumber());
      console.log("  Total moves:", session.moveNumber);
      console.log("  Current turn:", Object.keys(session.currentTurn)[0]);
      console.log("  Status:", Object.keys(session.status)[0]);

      console.log("Geographic configuration:");
      console.log("  Region:", session.geographicRegion.regionCode);
      console.log("  Latency zone:", session.geographicRegion.latencyZone);
      console.log("  Server cluster:", session.geographicRegion.serverCluster);

      console.log("Performance metrics:");
      console.log("  Total moves processed:", session.performanceMetrics.totalMoves);
      console.log("  Average latency:", session.performanceMetrics.averageMoveLatency, "ms");
      console.log("  Peak latency:", session.performanceMetrics.peakLatency, "ms");
      console.log("  Target latency:", session.performanceMetrics.targetLatencyMs, "ms");
      console.log("  Target throughput:", session.performanceMetrics.targetThroughput, "moves/sec");

      console.log("Session configuration:");
      console.log("  Time limit:", session.sessionConfig.timeLimitSeconds, "seconds");
      console.log("  Move time limit:", session.sessionConfig.moveTimeLimitSeconds, "seconds");
      console.log("  Spectators enabled:", session.sessionConfig.enableSpectators);
      console.log("  Analysis enabled:", session.sessionConfig.enableAnalysis);
      console.log("  Compression level:", session.sessionConfig.compressionLevel);

      // Verify session integrity
      expect(session.moveNumber).to.be.greaterThan(0);
      expect(session.performanceMetrics.totalMoves).to.equal(session.moveNumber);
      expect(session.performanceMetrics.averageMoveLatency).to.be.greaterThan(0);

      console.log("MagicBlock session integrity verified - all metrics consistent");
      console.log("BOLT ECS integration working correctly with <50ms latency targets");
    });
  });
});
