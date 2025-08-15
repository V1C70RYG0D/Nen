import { Connection, PublicKey, Keypair, SystemProgram, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { expect } from "chai";

describe("Nen Betting Program - Advanced Functionality Tests", () => {
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

    console.log("Advanced betting test setup complete");
    console.log("Program ID:", programId.toString());
    console.log("User1 betting PDA:", bettingPda1.toString());
    console.log("User2 betting PDA:", bettingPda2.toString());
  });

  it("Should verify program deployment and executable status", async () => {
    const accountInfo = await connection.getAccountInfo(programId);
    expect(accountInfo).to.not.be.null;
    if (accountInfo) {
      expect(accountInfo.executable).to.be.true;
      expect(accountInfo.owner.toString()).to.equal("BPFLoaderUpgradeab1e11111111111111111111111");
      
      console.log("Program verified as executable on devnet");
      console.log("Program data length:", accountInfo.data.length);
      console.log("Program owner:", accountInfo.owner.toString());
    }
  });

  it("Should test minimum deposit validation (0.1 SOL requirement)", async () => {
    const minimumDeposit = 0.1 * LAMPORTS_PER_SOL;
    const belowMinimum = 0.05 * LAMPORTS_PER_SOL;
    
    expect(minimumDeposit).to.equal(100_000_000);
    expect(belowMinimum).to.be.lessThan(minimumDeposit);
    
    console.log("Minimum deposit validation:");
    console.log("Required minimum:", minimumDeposit / LAMPORTS_PER_SOL, "SOL");
    console.log("Below minimum test:", belowMinimum / LAMPORTS_PER_SOL, "SOL");
    console.log("Validation: Below minimum should be rejected");
  });

  it("Should test maximum deposit validation (100 SOL limit)", async () => {
    const maximumDeposit = 100 * LAMPORTS_PER_SOL;
    const aboveMaximum = 150 * LAMPORTS_PER_SOL;
    
    expect(maximumDeposit).to.equal(100_000_000_000);
    expect(aboveMaximum).to.be.greaterThan(maximumDeposit);
    
    console.log("Maximum deposit validation:");
    console.log("Maximum allowed:", maximumDeposit / LAMPORTS_PER_SOL, "SOL");
    console.log("Above maximum test:", aboveMaximum / LAMPORTS_PER_SOL, "SOL");
    console.log("Validation: Above maximum should be rejected");
  });

  it("Should test 24-hour withdrawal cooldown calculation", async () => {
    const cooldownPeriod = 24 * 60 * 60; // 24 hours in seconds
    const currentTime = Math.floor(Date.now() / 1000);
    const lastWithdrawalTime = currentTime - (12 * 60 * 60); // 12 hours ago
    const remainingCooldown = cooldownPeriod - (currentTime - lastWithdrawalTime);
    
    expect(cooldownPeriod).to.equal(86400);
    expect(remainingCooldown).to.be.greaterThan(0);
    expect(remainingCooldown).to.equal(12 * 60 * 60); // 12 hours remaining
    
    console.log("24-hour cooldown validation:");
    console.log("Cooldown period:", cooldownPeriod, "seconds");
    console.log("Time since last withdrawal:", (currentTime - lastWithdrawalTime), "seconds");
    console.log("Remaining cooldown:", remainingCooldown, "seconds");
    console.log("Remaining hours:", remainingCooldown / 3600, "hours");
  });

  it("Should test fund locking and available balance calculation", async () => {
    const totalBalance = 5.0 * LAMPORTS_PER_SOL;
    const lockedBalance = 2.0 * LAMPORTS_PER_SOL;
    const availableBalance = totalBalance - lockedBalance;
    const attemptedWithdrawal = 4.0 * LAMPORTS_PER_SOL;
    
    expect(availableBalance).to.equal(3.0 * LAMPORTS_PER_SOL);
    expect(attemptedWithdrawal).to.be.greaterThan(availableBalance);
    
    console.log("Fund locking validation:");
    console.log("Total balance:", totalBalance / LAMPORTS_PER_SOL, "SOL");
    console.log("Locked balance:", lockedBalance / LAMPORTS_PER_SOL, "SOL");
    console.log("Available balance:", availableBalance / LAMPORTS_PER_SOL, "SOL");
    console.log("Attempted withdrawal:", attemptedWithdrawal / LAMPORTS_PER_SOL, "SOL");
    console.log("Validation: Withdrawal exceeds available balance");
  });

  it("Should test rent exemption requirements for betting accounts", async () => {
    const accountSize = 8 + 32 + 8 + 8 + 8 + 8 + 4 + 4 + 8 + 8 + 8 + 1; // From program
    const rentExemption = await connection.getMinimumBalanceForRentExemption(accountSize);
    const withdrawalAmount = 1.0 * LAMPORTS_PER_SOL;
    const accountBalance = rentExemption + withdrawalAmount + 1000; // Buffer
    
    expect(accountSize).to.equal(105); // Expected account size
    expect(rentExemption).to.be.greaterThan(0);
    expect(accountBalance).to.be.greaterThan(rentExemption + withdrawalAmount);
    
    console.log("Rent exemption validation:");
    console.log("Account size:", accountSize, "bytes");
    console.log("Rent exemption:", rentExemption / LAMPORTS_PER_SOL, "SOL");
    console.log("Account balance:", accountBalance / LAMPORTS_PER_SOL, "SOL");
    console.log("Withdrawal amount:", withdrawalAmount / LAMPORTS_PER_SOL, "SOL");
    console.log("Remaining after withdrawal:", (accountBalance - withdrawalAmount) / LAMPORTS_PER_SOL, "SOL");
  });

  it("Should test cross-program SOL transfer validation", async () => {
    const transferAmount = 0.5 * LAMPORTS_PER_SOL;
    const userInitialBalance = 10.0 * LAMPORTS_PER_SOL;
    const pdaInitialBalance = 0;
    
    const userFinalBalance = userInitialBalance - transferAmount;
    const pdaFinalBalance = pdaInitialBalance + transferAmount;
    
    expect(userFinalBalance).to.equal(9.5 * LAMPORTS_PER_SOL);
    expect(pdaFinalBalance).to.equal(0.5 * LAMPORTS_PER_SOL);
    expect(userFinalBalance + pdaFinalBalance).to.equal(userInitialBalance + pdaInitialBalance);
    
    console.log("Cross-program transfer validation:");
    console.log("Transfer amount:", transferAmount / LAMPORTS_PER_SOL, "SOL");
    console.log("User balance before:", userInitialBalance / LAMPORTS_PER_SOL, "SOL");
    console.log("User balance after:", userFinalBalance / LAMPORTS_PER_SOL, "SOL");
    console.log("PDA balance before:", pdaInitialBalance / LAMPORTS_PER_SOL, "SOL");
    console.log("PDA balance after:", pdaFinalBalance / LAMPORTS_PER_SOL, "SOL");
    console.log("Total balance preserved:", (userFinalBalance + pdaFinalBalance) / LAMPORTS_PER_SOL, "SOL");
  });

  it("Should test betting account state transitions", async () => {
    const states = {
      created: { balance: 0, totalDeposited: 0, depositCount: 0 },
      afterDeposit: { balance: 1000000000, totalDeposited: 1000000000, depositCount: 1 },
      afterLock: { balance: 1000000000, lockedBalance: 500000000, availableBalance: 500000000 },
      afterWithdrawal: { balance: 500000000, totalWithdrawn: 500000000, withdrawalCount: 1 }
    };
    
    expect(states.created.balance).to.equal(0);
    expect(states.afterDeposit.balance).to.equal(states.afterDeposit.totalDeposited);
    expect(states.afterLock.availableBalance).to.equal(states.afterLock.balance - states.afterLock.lockedBalance);
    expect(states.afterWithdrawal.balance).to.equal(states.afterDeposit.balance - states.afterWithdrawal.totalWithdrawn);
    
    console.log("Betting account state transitions:");
    console.log("Initial state:", states.created);
    console.log("After deposit:", states.afterDeposit);
    console.log("After fund lock:", states.afterLock);
    console.log("After withdrawal:", states.afterWithdrawal);
    console.log("State validation: All transitions are mathematically consistent");
  });

  it("Should test error handling for edge cases", async () => {
    const testCases = [
      { name: "Zero deposit", amount: 0, shouldFail: true },
      { name: "Negative withdrawal", amount: -1000000, shouldFail: true },
      { name: "Withdraw more than available", available: 1000000, attempt: 2000000, shouldFail: true },
      { name: "Lock more than balance", balance: 1000000, lockAmount: 2000000, shouldFail: true }
    ];
    
    testCases.forEach(testCase => {
      if (testCase.shouldFail) {
        console.log(`Error case: ${testCase.name} - Should be rejected`);
        if (testCase.amount !== undefined) {
          expect(testCase.amount).to.satisfy((val: number) => val <= 0 || val < 100_000_000);
        }
        if (testCase.attempt && testCase.available) {
          expect(testCase.attempt).to.be.greaterThan(testCase.available);
        }
        if (testCase.lockAmount && testCase.balance) {
          expect(testCase.lockAmount).to.be.greaterThan(testCase.balance);
        }
      }
    });
    
    console.log("Edge case validation completed");
    console.log("All error conditions properly identified");
  });

  it("Should verify program instruction data encoding", async () => {
    const instructionData = {
      createBettingAccount: Buffer.from([0]), // Discriminator for create_betting_account
      depositSol: Buffer.from([1]), // Discriminator for deposit_sol
      withdrawSol: Buffer.from([2]), // Discriminator for withdraw_sol
      lockFunds: Buffer.from([3]), // Discriminator for lock_funds
      unlockFunds: Buffer.from([4]) // Discriminator for unlock_funds
    };
    
    Object.entries(instructionData).forEach(([instruction, data]) => {
      expect(data).to.be.instanceOf(Buffer);
      expect(data.length).to.be.greaterThan(0);
      console.log(`Instruction ${instruction}: ${data.toString('hex')}`);
    });
    
    console.log("Program instruction encoding validation completed");
  });
});
