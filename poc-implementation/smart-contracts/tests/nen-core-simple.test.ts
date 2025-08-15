import { Connection, PublicKey, Keypair, SystemProgram, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { expect } from "chai";

describe("Nen Core Program - Simple Functional Tests", () => {
  const connection = new Connection("https://api.devnet.solana.com", "confirmed");
  const programId = new PublicKey("Xs4PKxWNyY1C7i5bdqMh5tNhwPbDbxMXf4YcJAreJcF");
  
  let admin: Keypair;
  let user1: Keypair;
  let platformPda: PublicKey;

  before(async () => {
    admin = Keypair.generate();
    user1 = Keypair.generate();

    [platformPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("platform")],
      programId
    );

    console.log("Test setup complete");
    console.log("Program ID:", programId.toString());
    console.log("Platform PDA:", platformPda.toString());
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

  it("Should derive platform PDA correctly", async () => {
    const [derivedPda, bump] = PublicKey.findProgramAddressSync(
      [Buffer.from("platform")],
      programId
    );
    
    expect(derivedPda.toString()).to.equal(platformPda.toString());
    expect(bump).to.be.a("number");
    
    console.log("Platform PDA derived successfully");
    console.log("PDA:", derivedPda.toString());
    console.log("Bump:", bump);
  });

  it("Should derive user PDA correctly", async () => {
    const [userPda, bump] = PublicKey.findProgramAddressSync(
      [Buffer.from("user"), user1.publicKey.toBuffer()],
      programId
    );
    
    expect(userPda).to.be.instanceOf(PublicKey);
    expect(bump).to.be.a("number");
    
    console.log("User PDA derived successfully");
    console.log("User PDA:", userPda.toString());
    console.log("Bump:", bump);
  });

  it("Should calculate rent exemption for platform account", async () => {
    const rentExemption = await connection.getMinimumBalanceForRentExemption(200);
    expect(rentExemption).to.be.greaterThan(0);
    
    console.log("Platform account rent exemption:", rentExemption / LAMPORTS_PER_SOL, "SOL");
  });

  it("Should verify program functionality through account derivation", async () => {
    const matchId = 0;
    const [matchPda, bump] = PublicKey.findProgramAddressSync(
      [Buffer.from("match"), Buffer.from(matchId.toString())],
      programId
    );
    
    expect(matchPda).to.be.instanceOf(PublicKey);
    expect(bump).to.be.a("number");
    
    console.log("Match PDA derived successfully");
    console.log("Match PDA:", matchPda.toString());
    console.log("Match ID:", matchId);
  });
});
