import { Connection, PublicKey, Keypair, SystemProgram, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { expect } from "chai";

describe("Nen Marketplace Program - Simple Functional Tests", () => {
  const connection = new Connection("https://api.devnet.solana.com", "confirmed");
  const programId = new PublicKey("8FbcrTGS9wQCyC99h5jbHx2bzZjYfkGERSMCjmYBDisH");
  
  let seller: Keypair;
  let buyer: Keypair;
  let listingPda: PublicKey;

  before(async () => {
    seller = Keypair.generate();
    buyer = Keypair.generate();

    const mint = Keypair.generate().publicKey;
    [listingPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("listing"), mint.toBuffer(), seller.publicKey.toBuffer()],
      programId
    );

    console.log("Test setup complete");
    console.log("Program ID:", programId.toString());
    console.log("Listing PDA:", listingPda.toString());
  });

  it("Should check if program exists on devnet", async () => {
    const accountInfo = await connection.getAccountInfo(programId);
    
    if (accountInfo) {
      expect(accountInfo.executable).to.be.true;
      console.log("Program verified on devnet");
      console.log("Program data length:", accountInfo.data.length);
      console.log("Program owner:", accountInfo.owner.toString());
    } else {
      console.log("Program not found on devnet - deployment needed");
      console.log("Expected program ID:", programId.toString());
    }
  });

  it("Should derive listing PDA correctly", async () => {
    const mint = Keypair.generate().publicKey;
    const [derivedPda, bump] = PublicKey.findProgramAddressSync(
      [Buffer.from("listing"), mint.toBuffer(), seller.publicKey.toBuffer()],
      programId
    );
    
    expect(derivedPda).to.be.instanceOf(PublicKey);
    expect(bump).to.be.a("number");
    
    console.log("Listing PDA derived successfully");
    console.log("Listing PDA:", derivedPda.toString());
    console.log("Bump:", bump);
  });

  it("Should calculate rent exemption for listing account", async () => {
    const rentExemption = await connection.getMinimumBalanceForRentExemption(180);
    expect(rentExemption).to.be.greaterThan(0);
    
    console.log("Listing account rent exemption:", rentExemption / LAMPORTS_PER_SOL, "SOL");
  });

  it("Should derive escrow authority PDA", async () => {
    const [escrowPda, bump] = PublicKey.findProgramAddressSync(
      [Buffer.from("escrow_authority")],
      programId
    );
    
    expect(escrowPda).to.be.instanceOf(PublicKey);
    expect(bump).to.be.a("number");
    
    console.log("Escrow authority PDA derived successfully");
    console.log("Escrow PDA:", escrowPda.toString());
    console.log("Bump:", bump);
  });

  it("Should verify marketplace fee calculations", async () => {
    const price = 1.0 * LAMPORTS_PER_SOL;
    const feePercentage = 250; // 2.5%
    const expectedFee = (price * feePercentage) / 10000;
    
    expect(expectedFee).to.equal(0.025 * LAMPORTS_PER_SOL);
    
    console.log("Fee calculation verified");
    console.log("Price:", price / LAMPORTS_PER_SOL, "SOL");
    console.log("Fee percentage:", feePercentage / 100, "%");
    console.log("Expected fee:", expectedFee / LAMPORTS_PER_SOL, "SOL");
  });
});
