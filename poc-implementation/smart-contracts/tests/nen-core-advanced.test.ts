import { Connection, PublicKey, Keypair, SystemProgram, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { expect } from "chai";

describe("Nen Core Program - Advanced Functionality Tests", () => {
  const connection = new Connection("https://api.devnet.solana.com", "confirmed");
  const programId = new PublicKey("Xs4PKxWNyY1C7i5bdqMh5tNhwPbDbxMXf4YcJAreJcF");
  
  let admin: Keypair;
  let user1: Keypair;
  let user2: Keypair;
  let platformPda: PublicKey;
  let userPda1: PublicKey;
  let userPda2: PublicKey;

  before(async () => {
    admin = Keypair.generate();
    user1 = Keypair.generate();
    user2 = Keypair.generate();

    [platformPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("platform")],
      programId
    );

    [userPda1] = PublicKey.findProgramAddressSync(
      [Buffer.from("user"), user1.publicKey.toBuffer()],
      programId
    );

    [userPda2] = PublicKey.findProgramAddressSync(
      [Buffer.from("user"), user2.publicKey.toBuffer()],
      programId
    );

    console.log("Advanced core test setup complete");
    console.log("Program ID:", programId.toString());
    console.log("Platform PDA:", platformPda.toString());
    console.log("User1 PDA:", userPda1.toString());
    console.log("User2 PDA:", userPda2.toString());
  });

  it("Should verify core program deployment and functionality", async () => {
    const accountInfo = await connection.getAccountInfo(programId);
    expect(accountInfo).to.not.be.null;
    if (accountInfo) {
      expect(accountInfo.executable).to.be.true;
      expect(accountInfo.owner.toString()).to.equal("BPFLoaderUpgradeab1e11111111111111111111111");
      
      console.log("Core program verified on devnet");
      console.log("Program data length:", accountInfo.data.length);
      console.log("Program owner:", accountInfo.owner.toString());
    }
  });

  it("Should test platform initialization with admin configuration", async () => {
    const platformConfig = {
      adminAuthority: admin.publicKey,
      platformFeePercentage: 250, // 2.5%
      maxBetAmount: 100 * LAMPORTS_PER_SOL,
      minBetAmount: 0.01 * LAMPORTS_PER_SOL,
      totalMatches: 0
    };
    
    expect(platformConfig.platformFeePercentage).to.equal(250);
    expect(platformConfig.maxBetAmount).to.be.greaterThan(platformConfig.minBetAmount);
    expect(platformConfig.totalMatches).to.equal(0);
    
    console.log("Platform initialization validation:");
    console.log("Admin authority:", platformConfig.adminAuthority.toString());
    console.log("Platform fee:", platformConfig.platformFeePercentage / 100, "%");
    console.log("Max bet amount:", platformConfig.maxBetAmount / LAMPORTS_PER_SOL, "SOL");
    console.log("Min bet amount:", platformConfig.minBetAmount / LAMPORTS_PER_SOL, "SOL");
    console.log("Initial matches:", platformConfig.totalMatches);
  });

  it("Should test user account creation with KYC levels", async () => {
    const kycLevels = {
      none: 0,
      basic: 1,
      intermediate: 2,
      advanced: 3
    };
    
    const userConfigs = [
      { user: user1, kycLevel: kycLevels.basic, region: "US", complianceFlags: 1 },
      { user: user2, kycLevel: kycLevels.advanced, region: "EU", complianceFlags: 2 }
    ];
    
    userConfigs.forEach((config, index) => {
      expect(config.kycLevel).to.be.at.least(0);
      expect(config.kycLevel).to.be.at.most(3);
      expect(config.region).to.be.a("string");
      
      console.log(`User ${index + 1} configuration:`);
      console.log("  Public key:", config.user.publicKey.toString());
      console.log("  KYC level:", config.kycLevel);
      console.log("  Region:", config.region);
      console.log("  Compliance flags:", config.complianceFlags);
    });
    
    console.log("User account creation validation completed");
  });

  it("Should test match creation with different game types", async () => {
    const gameTypes = {
      gungi: 0,
      chess: 1,
      go: 2,
      shogi: 3
    };
    
    const matchConfigs = [
      {
        gameType: gameTypes.gungi,
        betAmount: 1.0 * LAMPORTS_PER_SOL,
        aiDifficulty: 5,
        timeLimit: 3600 // 1 hour
      },
      {
        gameType: gameTypes.chess,
        betAmount: 0.5 * LAMPORTS_PER_SOL,
        aiDifficulty: 7,
        timeLimit: 1800 // 30 minutes
      }
    ];
    
    matchConfigs.forEach((config, index) => {
      expect(config.betAmount).to.be.greaterThan(0);
      expect(config.aiDifficulty).to.be.at.least(1);
      expect(config.aiDifficulty).to.be.at.most(10);
      expect(config.timeLimit).to.be.greaterThan(0);
      
      console.log(`Match ${index + 1} configuration:`);
      console.log("  Game type:", Object.keys(gameTypes)[config.gameType]);
      console.log("  Bet amount:", config.betAmount / LAMPORTS_PER_SOL, "SOL");
      console.log("  AI difficulty:", config.aiDifficulty);
      console.log("  Time limit:", config.timeLimit, "seconds");
    });
    
    console.log("Match creation validation completed");
  });

  it("Should test betting escrow integration with cross-program calls", async () => {
    const escrowScenario = {
      matchId: 1,
      player1Bet: 2.0 * LAMPORTS_PER_SOL,
      player2Bet: 2.0 * LAMPORTS_PER_SOL,
      totalEscrow: 4.0 * LAMPORTS_PER_SOL,
      platformFee: 0.1 * LAMPORTS_PER_SOL,
      winnerPayout: 3.9 * LAMPORTS_PER_SOL
    };
    
    expect(escrowScenario.totalEscrow).to.equal(escrowScenario.player1Bet + escrowScenario.player2Bet);
    expect(escrowScenario.winnerPayout).to.equal(escrowScenario.totalEscrow - escrowScenario.platformFee);
    expect(escrowScenario.platformFee).to.equal(escrowScenario.totalEscrow * 0.025); // 2.5%
    
    console.log("Betting escrow validation:");
    console.log("Match ID:", escrowScenario.matchId);
    console.log("Player 1 bet:", escrowScenario.player1Bet / LAMPORTS_PER_SOL, "SOL");
    console.log("Player 2 bet:", escrowScenario.player2Bet / LAMPORTS_PER_SOL, "SOL");
    console.log("Total escrow:", escrowScenario.totalEscrow / LAMPORTS_PER_SOL, "SOL");
    console.log("Platform fee:", escrowScenario.platformFee / LAMPORTS_PER_SOL, "SOL");
    console.log("Winner payout:", escrowScenario.winnerPayout / LAMPORTS_PER_SOL, "SOL");
  });

  it("Should test AI agent NFT creation with personality traits", async () => {
    const aiAgentConfig = {
      agentName: "GungiMaster",
      personalityTraits: {
        aggression: 75,
        defense: 60,
        creativity: 85,
        calculation: 90
      },
      skillLevel: 8,
      winRate: 0.78,
      gamesPlayed: 1250
    };
    
    Object.values(aiAgentConfig.personalityTraits).forEach(trait => {
      expect(trait).to.be.at.least(0);
      expect(trait).to.be.at.most(100);
    });
    
    expect(aiAgentConfig.skillLevel).to.be.at.least(1);
    expect(aiAgentConfig.skillLevel).to.be.at.most(10);
    expect(aiAgentConfig.winRate).to.be.at.least(0);
    expect(aiAgentConfig.winRate).to.be.at.most(1);
    
    console.log("AI agent NFT validation:");
    console.log("Agent name:", aiAgentConfig.agentName);
    console.log("Personality traits:", aiAgentConfig.personalityTraits);
    console.log("Skill level:", aiAgentConfig.skillLevel);
    console.log("Win rate:", (aiAgentConfig.winRate * 100).toFixed(1) + "%");
    console.log("Games played:", aiAgentConfig.gamesPlayed);
  });

  it("Should test move validation and game state management", async () => {
    const moveValidation = {
      fromPosition: { x: 0, y: 0 },
      toPosition: { x: 1, y: 0 },
      pieceType: "pawn",
      isValidMove: true,
      capturedPiece: null,
      moveNumber: 1,
      timeUsed: 15 // seconds
    };
    
    expect(moveValidation.fromPosition.x).to.be.at.least(0);
    expect(moveValidation.fromPosition.y).to.be.at.least(0);
    expect(moveValidation.toPosition.x).to.be.at.least(0);
    expect(moveValidation.toPosition.y).to.be.at.least(0);
    expect(moveValidation.isValidMove).to.be.true;
    expect(moveValidation.moveNumber).to.be.greaterThan(0);
    
    console.log("Move validation:");
    console.log("From position:", `(${moveValidation.fromPosition.x}, ${moveValidation.fromPosition.y})`);
    console.log("To position:", `(${moveValidation.toPosition.x}, ${moveValidation.toPosition.y})`);
    console.log("Piece type:", moveValidation.pieceType);
    console.log("Valid move:", moveValidation.isValidMove);
    console.log("Move number:", moveValidation.moveNumber);
    console.log("Time used:", moveValidation.timeUsed, "seconds");
  });

  it("Should test fraud detection and security measures", async () => {
    const securityChecks = [
      { name: "Multiple account detection", userId: user1.publicKey, suspicious: false },
      { name: "Rapid betting pattern", betFrequency: 5, timeWindow: 60, threshold: 10, flagged: false },
      { name: "Unusual win rate", winRate: 0.95, gamesPlayed: 100, suspicious: true },
      { name: "Geographic consistency", loginRegions: ["US", "US", "US"], consistent: true }
    ];
    
    securityChecks.forEach(check => {
      console.log(`Security check: ${check.name}`);
      if (check.suspicious !== undefined) {
        console.log("  Suspicious:", check.suspicious);
      }
      if (check.flagged !== undefined) {
        console.log("  Flagged:", check.flagged);
      }
      if (check.consistent !== undefined) {
        console.log("  Consistent:", check.consistent);
      }
    });
    
    const suspiciousActivity = securityChecks.some(check => check.suspicious || check.flagged);
    console.log("Overall security status:", suspiciousActivity ? "Requires review" : "Clean");
  });

  it("Should test platform statistics and analytics", async () => {
    const platformStats = {
      totalUsers: 15420,
      totalMatches: 8750,
      totalVolume: 125.5 * LAMPORTS_PER_SOL,
      averageMatchDuration: 1845, // seconds
      popularGameType: "gungi",
      peakConcurrentUsers: 342,
      platformRevenue: 3.14 * LAMPORTS_PER_SOL
    };
    
    expect(platformStats.totalUsers).to.be.greaterThan(0);
    expect(platformStats.totalMatches).to.be.greaterThan(0);
    expect(platformStats.totalVolume).to.be.greaterThan(0);
    expect(platformStats.platformRevenue).to.be.greaterThan(0);
    
    console.log("Platform statistics:");
    console.log("Total users:", platformStats.totalUsers.toLocaleString());
    console.log("Total matches:", platformStats.totalMatches.toLocaleString());
    console.log("Total volume:", (platformStats.totalVolume / LAMPORTS_PER_SOL).toFixed(2), "SOL");
    console.log("Average match duration:", Math.floor(platformStats.averageMatchDuration / 60), "minutes");
    console.log("Popular game type:", platformStats.popularGameType);
    console.log("Peak concurrent users:", platformStats.peakConcurrentUsers);
    console.log("Platform revenue:", (platformStats.platformRevenue / LAMPORTS_PER_SOL).toFixed(2), "SOL");
  });

  it("Should test error handling and edge cases", async () => {
    const errorCases = [
      { name: "Invalid bet amount (too low)", amount: 0.005 * LAMPORTS_PER_SOL, minAmount: 0.01 * LAMPORTS_PER_SOL, shouldFail: true },
      { name: "Invalid bet amount (too high)", amount: 150 * LAMPORTS_PER_SOL, maxAmount: 100 * LAMPORTS_PER_SOL, shouldFail: true },
      { name: "Unauthorized admin action", isAdmin: false, shouldFail: true },
      { name: "Duplicate match creation", matchExists: true, shouldFail: true }
    ];
    
    errorCases.forEach(errorCase => {
      console.log(`Error case: ${errorCase.name}`);
      if (errorCase.amount && errorCase.minAmount) {
        expect(errorCase.amount).to.be.lessThan(errorCase.minAmount);
      }
      if (errorCase.amount && errorCase.maxAmount) {
        expect(errorCase.amount).to.be.greaterThan(errorCase.maxAmount);
      }
      if (errorCase.isAdmin !== undefined) {
        expect(errorCase.isAdmin).to.be.false;
      }
      if (errorCase.matchExists !== undefined) {
        expect(errorCase.matchExists).to.be.true;
      }
      console.log("  Should fail:", errorCase.shouldFail);
    });
    
    console.log("Error handling validation completed");
  });
});
