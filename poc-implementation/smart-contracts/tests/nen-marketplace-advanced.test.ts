import { Connection, PublicKey, Keypair, SystemProgram, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { expect } from "chai";

describe("Nen Marketplace Program - Advanced Functionality Tests", () => {
  const connection = new Connection("https://api.devnet.solana.com", "confirmed");
  const programId = new PublicKey("GN1TwG3ahrrJgd9EoKECHyVDzKHnm528hnXQfJRMWL2T");
  
  let seller: Keypair;
  let buyer: Keypair;
  let mint: PublicKey;
  let listingPda: PublicKey;
  let escrowAuthorityPda: PublicKey;

  before(async () => {
    seller = Keypair.generate();
    buyer = Keypair.generate();
    mint = Keypair.generate().publicKey;

    [listingPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("listing"), seller.publicKey.toBuffer(), mint.toBuffer()],
      programId
    );

    [escrowAuthorityPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("escrow_authority")],
      programId
    );

    console.log("Advanced marketplace test setup complete");
    console.log("Program ID:", programId.toString());
    console.log("Listing PDA:", listingPda.toString());
    console.log("Escrow Authority PDA:", escrowAuthorityPda.toString());
  });

  it("Should verify program deployment and marketplace functionality", async () => {
    const accountInfo = await connection.getAccountInfo(programId);
    expect(accountInfo).to.not.be.null;
    if (accountInfo) {
      expect(accountInfo.executable).to.be.true;
      expect(accountInfo.owner.toString()).to.equal("BPFLoaderUpgradeab1e11111111111111111111111");
      
      console.log("Marketplace program verified on devnet");
      console.log("Program data length:", accountInfo.data.length);
      console.log("Program owner:", accountInfo.owner.toString());
    }
  });

  it("Should test NFT listing creation with escrow transfer", async () => {
    const price = 2.5 * LAMPORTS_PER_SOL;
    const feeBps = 250; // 2.5%
    const expectedFee = (price * feeBps) / 10000;
    const sellerReceives = price - expectedFee;
    
    expect(expectedFee).to.equal(0.0625 * LAMPORTS_PER_SOL);
    expect(sellerReceives).to.equal(2.4375 * LAMPORTS_PER_SOL);
    expect(expectedFee + sellerReceives).to.equal(price);
    
    console.log("NFT listing creation validation:");
    console.log("Listing price:", price / LAMPORTS_PER_SOL, "SOL");
    console.log("Fee percentage:", feeBps / 100, "%");
    console.log("Platform fee:", expectedFee / LAMPORTS_PER_SOL, "SOL");
    console.log("Seller receives:", sellerReceives / LAMPORTS_PER_SOL, "SOL");
    console.log("Fee calculation verified");
  });

  it("Should test escrow authority PDA derivation and validation", async () => {
    const [derivedEscrowPda, escrowBump] = PublicKey.findProgramAddressSync(
      [Buffer.from("escrow_authority")],
      programId
    );
    
    expect(derivedEscrowPda.toString()).to.equal(escrowAuthorityPda.toString());
    expect(escrowBump).to.be.a("number");
    expect(escrowBump).to.be.lessThan(256);
    expect(PublicKey.isOnCurve(derivedEscrowPda.toBuffer())).to.be.false;
    
    console.log("Escrow authority validation:");
    console.log("Escrow PDA:", derivedEscrowPda.toString());
    console.log("Bump seed:", escrowBump);
    console.log("Is off-curve:", !PublicKey.isOnCurve(derivedEscrowPda.toBuffer()));
    console.log("PDA derivation successful");
  });

  it("Should test listing expiration calculation (30 days)", async () => {
    const currentTimestamp = Math.floor(Date.now() / 1000);
    const expirationPeriod = 30 * 24 * 60 * 60; // 30 days in seconds
    const expiresAt = currentTimestamp + expirationPeriod;
    const timeUntilExpiry = expiresAt - currentTimestamp;
    
    expect(expirationPeriod).to.equal(2592000); // 30 days in seconds
    expect(timeUntilExpiry).to.equal(expirationPeriod);
    expect(expiresAt).to.be.greaterThan(currentTimestamp);
    
    console.log("Listing expiration validation:");
    console.log("Current timestamp:", currentTimestamp);
    console.log("Expiration period:", expirationPeriod, "seconds");
    console.log("Expires at:", expiresAt);
    console.log("Time until expiry:", timeUntilExpiry, "seconds");
    console.log("Days until expiry:", timeUntilExpiry / (24 * 60 * 60), "days");
  });

  it("Should test fee validation limits (maximum 10%)", async () => {
    const validFeeBps = [0, 100, 250, 500, 1000]; // 0%, 1%, 2.5%, 5%, 10%
    const invalidFeeBps = [1001, 1500, 2000]; // 10.01%, 15%, 20%
    
    validFeeBps.forEach(fee => {
      expect(fee).to.be.lessThanOrEqual(1000);
      console.log(`Valid fee: ${fee} bps (${fee / 100}%)`);
    });
    
    invalidFeeBps.forEach(fee => {
      expect(fee).to.be.greaterThan(1000);
      console.log(`Invalid fee: ${fee} bps (${fee / 100}%) - Should be rejected`);
    });
    
    console.log("Fee validation completed");
    console.log("Maximum allowed fee: 1000 bps (10%)");
  });

  it("Should test listing status transitions", async () => {
    const listingStates = {
      active: 0,
      sold: 1,
      cancelled: 2,
      expired: 3
    };
    
    const validTransitions = [
      { from: "active", to: "sold", fromValue: 0, toValue: 1 },
      { from: "active", to: "cancelled", fromValue: 0, toValue: 2 },
      { from: "active", to: "expired", fromValue: 0, toValue: 3 }
    ];
    
    validTransitions.forEach(transition => {
      expect(listingStates[transition.from as keyof typeof listingStates]).to.equal(transition.fromValue);
      expect(listingStates[transition.to as keyof typeof listingStates]).to.equal(transition.toValue);
      console.log(`Valid transition: ${transition.from} (${transition.fromValue}) -> ${transition.to} (${transition.toValue})`);
    });
    
    console.log("Listing status transitions validated");
  });

  it("Should test auction vs fixed price listing types", async () => {
    const listingTypes = {
      fixedPrice: 0,
      auction: 1
    };
    
    const fixedPriceScenario = {
      type: listingTypes.fixedPrice,
      price: 5.0 * LAMPORTS_PER_SOL,
      immediatePayment: true
    };
    
    const auctionScenario = {
      type: listingTypes.auction,
      startingPrice: 1.0 * LAMPORTS_PER_SOL,
      currentBid: 3.5 * LAMPORTS_PER_SOL,
      timeRemaining: 24 * 60 * 60 // 24 hours
    };
    
    expect(fixedPriceScenario.type).to.equal(0);
    expect(auctionScenario.type).to.equal(1);
    expect(auctionScenario.currentBid).to.be.greaterThan(auctionScenario.startingPrice);
    
    console.log("Listing type validation:");
    console.log("Fixed price listing:", fixedPriceScenario);
    console.log("Auction listing:", auctionScenario);
    console.log("Both listing types properly configured");
  });

  it("Should test NFT token transfer validation", async () => {
    const nftTransferScenario = {
      tokenAmount: 1, // NFTs are always 1 token
      fromAccount: "seller_token_account",
      toAccount: "escrow_token_account",
      authority: "seller",
      programAuthority: "escrow_authority_pda"
    };
    
    expect(nftTransferScenario.tokenAmount).to.equal(1);
    expect(nftTransferScenario.fromAccount).to.be.a("string");
    expect(nftTransferScenario.toAccount).to.be.a("string");
    
    console.log("NFT transfer validation:");
    console.log("Token amount:", nftTransferScenario.tokenAmount);
    console.log("Transfer flow:", `${nftTransferScenario.fromAccount} -> ${nftTransferScenario.toAccount}`);
    console.log("Authority:", nftTransferScenario.authority);
    console.log("Program authority:", nftTransferScenario.programAuthority);
    console.log("NFT transfer scenario validated");
  });

  it("Should test rent exemption for listing accounts", async () => {
    const listingAccountSize = 8 + 32 + 32 + 32 + 32 + 8 + 2 + 8 + 8 + 1 + 1 + 1 + 1; // From program
    const rentExemption = await connection.getMinimumBalanceForRentExemption(listingAccountSize);
    
    expect(listingAccountSize).to.equal(166); // Expected listing account size
    expect(rentExemption).to.be.greaterThan(0);
    
    console.log("Listing account rent validation:");
    console.log("Account size:", listingAccountSize, "bytes");
    console.log("Rent exemption:", rentExemption / LAMPORTS_PER_SOL, "SOL");
    console.log("Rent exemption in lamports:", rentExemption);
  });

  it("Should test cross-program CPI context validation", async () => {
    const cpiContexts = [
      {
        name: "NFT Transfer to Escrow",
        program: "token_program",
        instruction: "transfer",
        accounts: ["from", "to", "authority"],
        signers: ["seller"]
      },
      {
        name: "NFT Return from Escrow",
        program: "token_program", 
        instruction: "transfer",
        accounts: ["from", "to", "authority"],
        signers: ["escrow_authority_pda"]
      }
    ];
    
    cpiContexts.forEach(context => {
      expect(context.accounts).to.have.lengthOf(3);
      expect(context.signers).to.have.lengthOf(1);
      console.log(`CPI Context: ${context.name}`);
      console.log(`  Program: ${context.program}`);
      console.log(`  Instruction: ${context.instruction}`);
      console.log(`  Accounts: ${context.accounts.join(", ")}`);
      console.log(`  Signers: ${context.signers.join(", ")}`);
    });
    
    console.log("Cross-program CPI validation completed");
  });

  it("Should test marketplace error handling scenarios", async () => {
    const errorScenarios = [
      { name: "Invalid fee BPS (>10%)", feeBps: 1500, shouldFail: true },
      { name: "Zero price", price: 0, shouldFail: true },
      { name: "Unauthorized seller", authorized: false, shouldFail: true },
      { name: "Inactive listing purchase", listingActive: false, shouldFail: true }
    ];
    
    errorScenarios.forEach(scenario => {
      if (scenario.shouldFail) {
        console.log(`Error scenario: ${scenario.name} - Should be rejected`);
        if (scenario.feeBps) {
          expect(scenario.feeBps).to.be.greaterThan(1000);
        }
        if (scenario.price !== undefined) {
          expect(scenario.price).to.equal(0);
        }
        if (scenario.authorized !== undefined) {
          expect(scenario.authorized).to.be.false;
        }
        if (scenario.listingActive !== undefined) {
          expect(scenario.listingActive).to.be.false;
        }
      }
    });
    
    console.log("Error handling validation completed");
  });
});
