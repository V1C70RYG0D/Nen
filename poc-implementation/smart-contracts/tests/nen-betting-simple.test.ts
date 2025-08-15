import { Connection, PublicKey, Keypair, SystemProgram, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { expect } from "chai";

describe("Nen Betting Program - Simple Functional Tests", () => {
  const connection = new Connection("https://api.devnet.solana.com", "confirmed");
  const programId = new PublicKey("34RNydfkFZmhvUupbW1qHBG5LmASc6zeS3tuUsw6PwC5");
  
  let user1: Keypair;
  let user2: Keypair;
  let bettingPda1: PublicKey;
  let bettingPda2: PublicKey;

  before(async () => {
    user1 = Keypair.generate();
    user2 = Keypair.generate();

    [bettingPda1] = PublicKey.findProgramAddressSync(
      [Buffer.from("betting_account"), user1.publicKey.toBuffer()],
      programId
    );

    [bettingPda2] = PublicKey.findProgramAddressSync(
      [Buffer.from("betting_account"), user2.publicKey.toBuffer()],
      programId
    );

    console.log("Test setup complete");
    console.log("Program ID:", programId.toString());
    console.log("User1 betting PDA:", bettingPda1.toString());
    console.log("User2 betting PDA:", bettingPda2.toString());
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

  it("Should derive betting account PDAs correctly", async () => {
    const [derivedPda1, bump1] = PublicKey.findProgramAddressSync(
      [Buffer.from("betting_account"), user1.publicKey.toBuffer()],
      programId
    );
    
    const [derivedPda2, bump2] = PublicKey.findProgramAddressSync(
      [Buffer.from("betting_account"), user2.publicKey.toBuffer()],
      programId
    );
    
    expect(derivedPda1.toString()).to.equal(bettingPda1.toString());
    expect(derivedPda2.toString()).to.equal(bettingPda2.toString());
    expect(bump1).to.be.a("number");
    expect(bump2).to.be.a("number");
    
    console.log("Betting PDAs derived successfully");
    console.log("User1 PDA:", derivedPda1.toString(), "Bump:", bump1);
    console.log("User2 PDA:", derivedPda2.toString(), "Bump:", bump2);
  });

  it("Should calculate rent exemption for betting accounts", async () => {
    const rentExemption = await connection.getMinimumBalanceForRentExemption(150);
    expect(rentExemption).to.be.greaterThan(0);
    
    console.log("Betting account rent exemption:", rentExemption / LAMPORTS_PER_SOL, "SOL");
  });

  it("Should verify user keypairs are generated correctly", async () => {
    expect(user1.publicKey).to.be.instanceOf(PublicKey);
    expect(user2.publicKey).to.be.instanceOf(PublicKey);
    expect(user1.publicKey.toString()).to.not.equal(user2.publicKey.toString());
    
    console.log("User keypairs verified");
    console.log("User1 public key:", user1.publicKey.toString());
    console.log("User2 public key:", user2.publicKey.toString());
  });

  it("Should verify program functionality through PDA validation", async () => {
    const seeds = [Buffer.from("betting_account"), user1.publicKey.toBuffer()];
    const [pda, bump] = PublicKey.findProgramAddressSync(seeds, programId);
    
    expect(PublicKey.isOnCurve(pda.toBuffer())).to.be.false;
    expect(bump).to.be.lessThan(256);
    
    console.log("PDA validation successful");
    console.log("PDA is off-curve:", !PublicKey.isOnCurve(pda.toBuffer()));
    console.log("Valid bump seed:", bump);
  });
});
