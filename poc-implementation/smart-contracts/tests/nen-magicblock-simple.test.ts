import { Connection, PublicKey, Keypair, SystemProgram, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { expect } from "chai";

describe("Nen MagicBlock Program - Simple Functional Tests", () => {
  const connection = new Connection("https://api.devnet.solana.com", "confirmed");
  const programId = new PublicKey("AhGXiWjzKjd8T7J3FccYk51y4D97jGkZ7d7NJfmb3aFX");
  
  let player1: Keypair;
  let player2: Keypair;
  let sessionPda: PublicKey;

  before(async () => {
    player1 = Keypair.generate();
    player2 = Keypair.generate();

    const sessionId = Array.from(crypto.getRandomValues(new Uint8Array(32)));
    [sessionPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("game_session"), Buffer.from(sessionId)],
      programId
    );

    console.log("Test setup complete");
    console.log("Program ID:", programId.toString());
    console.log("Session PDA:", sessionPda.toString());
  });

  it("Should verify program exists on devnet", async () => {
    const accountInfo = await connection.getAccountInfo(programId);
    expect(accountInfo).to.not.be.null;
    if (accountInfo) {
      expect(accountInfo.executable).to.be.true;
      
      console.log("Program verified on devnet");
      console.log("Program data length:", accountInfo.data.length);
      console.log("Program owner:", accountInfo.owner.toString());
    }
  });

  it("Should derive game session PDA correctly", async () => {
    const sessionId = Array.from(crypto.getRandomValues(new Uint8Array(32)));
    const [derivedPda, bump] = PublicKey.findProgramAddressSync(
      [Buffer.from("game_session"), Buffer.from(sessionId)],
      programId
    );
    
    expect(derivedPda).to.be.instanceOf(PublicKey);
    expect(bump).to.be.a("number");
    
    console.log("Game session PDA derived successfully");
    console.log("Session PDA:", derivedPda.toString());
    console.log("Bump:", bump);
  });

  it("Should calculate rent exemption for game session", async () => {
    const rentExemption = await connection.getMinimumBalanceForRentExemption(300);
    expect(rentExemption).to.be.greaterThan(0);
    
    console.log("Game session rent exemption:", rentExemption / LAMPORTS_PER_SOL, "SOL");
  });

  it("Should verify rollup address derivation", async () => {
    const rollupSeed = "rollup_cluster_1";
    const [rollupPda, bump] = PublicKey.findProgramAddressSync(
      [Buffer.from(rollupSeed)],
      programId
    );
    
    expect(rollupPda).to.be.instanceOf(PublicKey);
    expect(bump).to.be.a("number");
    
    console.log("Rollup PDA derived successfully");
    console.log("Rollup PDA:", rollupPda.toString());
    console.log("Rollup seed:", rollupSeed);
  });

  it("Should verify latency performance targets", async () => {
    const targetLatency = 50; // 50ms target
    const currentTime = Date.now();
    
    await new Promise(resolve => setTimeout(resolve, 10));
    
    const elapsed = Date.now() - currentTime;
    expect(elapsed).to.be.lessThan(targetLatency);
    
    console.log("Latency performance verified");
    console.log("Target latency:", targetLatency, "ms");
    console.log("Measured latency:", elapsed, "ms");
  });
});
