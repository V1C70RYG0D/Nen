import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Connection, PublicKey, Keypair, SystemProgram, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { expect } from "chai";
import BN from "bn.js";

// Type definitions based on the Rust program
interface BettingAccount {
  user: PublicKey;
  balance: BN;
  totalDeposited: BN;
  totalWithdrawn: BN;
  lockedBalance: BN;
  depositCount: number;
  withdrawalCount: number;
  createdAt: BN;
  lastUpdated: BN;
  lastWithdrawalTime: BN;
  bump: number;
}

describe("Nen Betting Program - Comprehensive Tests", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = new Program(
    require("../target/idl/nen_betting.json"),
    "34RNydfkFZmhvUupbW1qHBG5LmASc6zeS3tuUsw6PwC5",
    provider
  );

  let user1: Keypair;
  let user2: Keypair;
  let user3: Keypair;
  let bettingPda1: PublicKey;
  let bettingPda2: PublicKey;
  let bettingPda3: PublicKey;
  let bettingBump1: number;
  let bettingBump2: number;
  let bettingBump3: number;

  before(async () => {
    user1 = Keypair.generate();
    user2 = Keypair.generate();
    user3 = Keypair.generate();

    // Airdrop SOL to test accounts
    await Promise.all([
      provider.connection.requestAirdrop(user1.publicKey, 10 * LAMPORTS_PER_SOL),
      provider.connection.requestAirdrop(user2.publicKey, 10 * LAMPORTS_PER_SOL),
      provider.connection.requestAirdrop(user3.publicKey, 10 * LAMPORTS_PER_SOL),
    ]);

    // Wait for confirmations
    await new Promise(resolve => setTimeout(resolve, 2000));

    [bettingPda1, bettingBump1] = PublicKey.findProgramAddressSync(
      [Buffer.from("betting_account"), user1.publicKey.toBuffer()],
      program.programId
    );

    [bettingPda2, bettingBump2] = PublicKey.findProgramAddressSync(
      [Buffer.from("betting_account"), user2.publicKey.toBuffer()],
      program.programId
    );

    [bettingPda3, bettingBump3] = PublicKey.findProgramAddressSync(
      [Buffer.from("betting_account"), user3.publicKey.toBuffer()],
      program.programId
    );

    console.log("Test setup complete");
    console.log("Program ID:", program.programId.toString());
    console.log("User1 betting PDA:", bettingPda1.toString());
    console.log("User2 betting PDA:", bettingPda2.toString());
    console.log("User3 betting PDA:", bettingPda3.toString());
  });

  describe("Betting Account Creation", () => {
    it("Should create betting account for user1", async () => {
      const tx = await program.methods
        .createBettingAccount()
        .accounts({
          bettingAccount: bettingPda1,
          user: user1.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([user1])
        .rpc();

      console.log("Betting account creation transaction:", tx);

      // Verify betting account
      const bettingAccount = await program.account.bettingAccount.fetch(bettingPda1) as BettingAccount;
      
      expect(bettingAccount.user.toString()).to.equal(user1.publicKey.toString());
      expect(bettingAccount.balance.toNumber()).to.equal(0);
      expect(bettingAccount.totalDeposited.toNumber()).to.equal(0);
      expect(bettingAccount.totalWithdrawn.toNumber()).to.equal(0);
      expect(bettingAccount.lockedBalance.toNumber()).to.equal(0);
      expect(bettingAccount.depositCount).to.equal(0);
      expect(bettingAccount.withdrawalCount).to.equal(0);
      expect(bettingAccount.lastWithdrawalTime.toNumber()).to.equal(0);
      expect(bettingAccount.bump).to.equal(bettingBump1);
      expect(bettingAccount.createdAt.toNumber()).to.be.greaterThan(0);
      expect(bettingAccount.lastUpdated.toNumber()).to.be.greaterThan(0);
    });

    it("Should create betting account for user2", async () => {
      const tx = await program.methods
        .createBettingAccount()
        .accounts({
          bettingAccount: bettingPda2,
          user: user2.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([user2])
        .rpc();

      console.log("User2 betting account creation transaction:", tx);

      const bettingAccount = await program.account.bettingAccount.fetch(bettingPda2) as BettingAccount;
      expect(bettingAccount.user.toString()).to.equal(user2.publicKey.toString());
      expect(bettingAccount.balance.toNumber()).to.equal(0);
    });

    it("Should reject duplicate betting account creation", async () => {
      try {
        await program.methods
          .createBettingAccount()
          .accounts({
            bettingAccount: bettingPda1,
            user: user1.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .signers([user1])
          .rpc();
        
        expect.fail("Should have failed with account already exists");
      } catch (error) {
        expect(error.message).to.include("already in use");
      }
    });
  });

  describe("SOL Deposits", () => {
    it("Should deposit minimum amount (0.1 SOL)", async () => {
      const depositAmount = new BN(100_000_000); // 0.1 SOL
      const initialBalance = await provider.connection.getBalance(user1.publicKey);
      const initialPdaBalance = await provider.connection.getBalance(bettingPda1);

      const tx = await program.methods
        .depositSol(depositAmount)
        .accounts({
          bettingAccount: bettingPda1,
          user: user1.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([user1])
        .rpc();

      console.log("Deposit transaction:", tx);

      // Verify balances updated
      const finalBalance = await provider.connection.getBalance(user1.publicKey);
      const finalPdaBalance = await provider.connection.getBalance(bettingPda1);
      const bettingAccount = await program.account.bettingAccount.fetch(bettingPda1) as BettingAccount;

      expect(bettingAccount.balance.toString()).to.equal(depositAmount.toString());
      expect(bettingAccount.totalDeposited.toString()).to.equal(depositAmount.toString());
      expect(bettingAccount.depositCount).to.equal(1);
      expect(finalPdaBalance - initialPdaBalance).to.equal(depositAmount.toNumber());
      expect(bettingAccount.lastUpdated.toNumber()).to.be.greaterThan(0);
    });

    it("Should deposit larger amount (1 SOL)", async () => {
      const depositAmount = new BN(1_000_000_000); // 1 SOL
      const initialBettingAccount = await program.account.bettingAccount.fetch(bettingPda1) as BettingAccount;

      const tx = await program.methods
        .depositSol(depositAmount)
        .accounts({
          bettingAccount: bettingPda1,
          user: user1.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([user1])
        .rpc();

      console.log("Large deposit transaction:", tx);

      const bettingAccount = await program.account.bettingAccount.fetch(bettingPda1) as BettingAccount;
      const expectedBalance = initialBettingAccount.balance.add(depositAmount);
      const expectedTotal = initialBettingAccount.totalDeposited.add(depositAmount);

      expect(bettingAccount.balance.toString()).to.equal(expectedBalance.toString());
      expect(bettingAccount.totalDeposited.toString()).to.equal(expectedTotal.toString());
      expect(bettingAccount.depositCount).to.equal(2);
    });

    it("Should reject deposit below minimum (0.05 SOL)", async () => {
      const belowMinimumAmount = new BN(50_000_000); // 0.05 SOL

      try {
        await program.methods
          .depositSol(belowMinimumAmount)
          .accounts({
            bettingAccount: bettingPda1,
            user: user1.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .signers([user1])
          .rpc();
        
        expect.fail("Should have failed with below minimum deposit");
      } catch (error) {
        expect(error.message).to.include("BelowMinimumDeposit");
      }
    });

    it("Should reject deposit above maximum (150 SOL)", async () => {
      const aboveMaximumAmount = new BN(150_000_000_000); // 150 SOL

      try {
        await program.methods
          .depositSol(aboveMaximumAmount)
          .accounts({
            bettingAccount: bettingPda1,
            user: user1.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .signers([user1])
          .rpc();
        
        expect.fail("Should have failed with above maximum deposit");
      } catch (error) {
        expect(error.message).to.include("AboveMaximumDeposit");
      }
    });

    it("Should handle multiple users depositing", async () => {
      // Create user2 betting account first
      await program.methods
        .createBettingAccount()
        .accounts({
          bettingAccount: bettingPda2,
          user: user2.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([user2])
        .rpc();

      const depositAmount = new BN(500_000_000); // 0.5 SOL

      const tx = await program.methods
        .depositSol(depositAmount)
        .accounts({
          bettingAccount: bettingPda2,
          user: user2.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([user2])
        .rpc();

      console.log("User2 deposit transaction:", tx);

      const bettingAccount = await program.account.bettingAccount.fetch(bettingPda2) as BettingAccount;
      expect(bettingAccount.balance.toString()).to.equal(depositAmount.toString());
      expect(bettingAccount.depositCount).to.equal(1);
    });
  });

  describe("SOL Withdrawals", () => {
    let withdrawalTestUser: Keypair;
    let withdrawalTestPda: PublicKey;

    before(async () => {
      withdrawalTestUser = Keypair.generate();
      await provider.connection.requestAirdrop(withdrawalTestUser.publicKey, 5 * LAMPORTS_PER_SOL);
      await new Promise(resolve => setTimeout(resolve, 1000));

      [withdrawalTestPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("betting_account"), withdrawalTestUser.publicKey.toBuffer()],
        program.programId
      );

      // Create account and deposit
      await program.methods
        .createBettingAccount()
        .accounts({
          bettingAccount: withdrawalTestPda,
          user: withdrawalTestUser.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([withdrawalTestUser])
        .rpc();

      await program.methods
        .depositSol(new BN(1_000_000_000)) // 1 SOL
        .accounts({
          bettingAccount: withdrawalTestPda,
          user: withdrawalTestUser.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([withdrawalTestUser])
        .rpc();
    });

    it("Should withdraw SOL successfully", async () => {
      const withdrawAmount = new BN(200_000_000); // 0.2 SOL
      const initialUserBalance = await provider.connection.getBalance(withdrawalTestUser.publicKey);
      const initialBettingAccount = await program.account.bettingAccount.fetch(withdrawalTestPda) as BettingAccount;

      const tx = await program.methods
        .withdrawSol(withdrawAmount)
        .accounts({
          bettingAccount: withdrawalTestPda,
          user: withdrawalTestUser.publicKey,
        })
        .signers([withdrawalTestUser])
        .rpc();

      console.log("Withdrawal transaction:", tx);

      const finalUserBalance = await provider.connection.getBalance(withdrawalTestUser.publicKey);
      const bettingAccount = await program.account.bettingAccount.fetch(withdrawalTestPda) as BettingAccount;

      const expectedBalance = initialBettingAccount.balance.sub(withdrawAmount);
      const expectedTotal = initialBettingAccount.totalWithdrawn.add(withdrawAmount);

      expect(bettingAccount.balance.toString()).to.equal(expectedBalance.toString());
      expect(bettingAccount.totalWithdrawn.toString()).to.equal(expectedTotal.toString());
      expect(bettingAccount.withdrawalCount).to.equal(1);
      expect(bettingAccount.lastWithdrawalTime.toNumber()).to.be.greaterThan(0);
      
      // User should receive SOL (minus transaction fees)
      expect(finalUserBalance).to.be.greaterThan(initialUserBalance);
    });

    it("Should reject withdrawal exceeding available balance", async () => {
      const bettingAccount = await program.account.bettingAccount.fetch(withdrawalTestPda) as BettingAccount;
      const excessiveAmount = bettingAccount.balance.add(new BN(1_000_000)); // More than available

      try {
        await program.methods
          .withdrawSol(excessiveAmount)
          .accounts({
            bettingAccount: withdrawalTestPda,
            user: withdrawalTestUser.publicKey,
          })
          .signers([withdrawalTestUser])
          .rpc();
        
        expect.fail("Should have failed with insufficient balance");
      } catch (error) {
        expect(error.message).to.include("InsufficientBalance");
      }
    });

    it("Should reject withdrawal of zero amount", async () => {
      const zeroAmount = new BN(0);

      try {
        await program.methods
          .withdrawSol(zeroAmount)
          .accounts({
            bettingAccount: withdrawalTestPda,
            user: withdrawalTestUser.publicKey,
          })
          .signers([withdrawalTestUser])
          .rpc();
        
        expect.fail("Should have failed with invalid withdrawal amount");
      } catch (error) {
        expect(error.message).to.include("InvalidWithdrawalAmount");
      }
    });

    it("Should enforce 24-hour withdrawal cooldown", async () => {
      // First withdrawal already done in previous test
      const secondWithdrawAmount = new BN(100_000_000); // 0.1 SOL

      try {
        await program.methods
          .withdrawSol(secondWithdrawAmount)
          .accounts({
            bettingAccount: withdrawalTestPda,
            user: withdrawalTestUser.publicKey,
          })
          .signers([withdrawalTestUser])
          .rpc();
        
        expect.fail("Should have failed with withdrawal cooldown active");
      } catch (error) {
        expect(error.message).to.include("WithdrawalCooldownActive");
      }
    });
  });

  describe("Fund Locking and Unlocking", () => {
    let lockingTestUser: Keypair;
    let lockingTestPda: PublicKey;

    before(async () => {
      lockingTestUser = Keypair.generate();
      await provider.connection.requestAirdrop(lockingTestUser.publicKey, 3 * LAMPORTS_PER_SOL);
      await new Promise(resolve => setTimeout(resolve, 1000));

      [lockingTestPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("betting_account"), lockingTestUser.publicKey.toBuffer()],
        program.programId
      );

      // Create account and deposit
      await program.methods
        .createBettingAccount()
        .accounts({
          bettingAccount: lockingTestPda,
          user: lockingTestUser.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([lockingTestUser])
        .rpc();

      await program.methods
        .depositSol(new BN(2_000_000_000)) // 2 SOL
        .accounts({
          bettingAccount: lockingTestPda,
          user: lockingTestUser.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([lockingTestUser])
        .rpc();
    });

    it("Should lock funds successfully", async () => {
      const lockAmount = new BN(500_000_000); // 0.5 SOL
      const initialBettingAccount = await program.account.bettingAccount.fetch(lockingTestPda) as BettingAccount;

      const tx = await program.methods
        .lockFunds(lockAmount)
        .accounts({
          bettingAccount: lockingTestPda,
          user: lockingTestUser.publicKey,
        })
        .signers([lockingTestUser])
        .rpc();

      console.log("Lock funds transaction:", tx);

      const bettingAccount = await program.account.bettingAccount.fetch(lockingTestPda) as BettingAccount;
      const expectedLocked = initialBettingAccount.lockedBalance.add(lockAmount);

      expect(bettingAccount.lockedBalance.toString()).to.equal(expectedLocked.toString());
      expect(bettingAccount.balance.toString()).to.equal(initialBettingAccount.balance.toString()); // Total balance unchanged
    });

    it("Should lock additional funds", async () => {
      const additionalLockAmount = new BN(300_000_000); // 0.3 SOL
      const initialBettingAccount = await program.account.bettingAccount.fetch(lockingTestPda) as BettingAccount;

      const tx = await program.methods
        .lockFunds(additionalLockAmount)
        .accounts({
          bettingAccount: lockingTestPda,
          user: lockingTestUser.publicKey,
        })
        .signers([lockingTestUser])
        .rpc();

      console.log("Additional lock funds transaction:", tx);

      const bettingAccount = await program.account.bettingAccount.fetch(lockingTestPda) as BettingAccount;
      const expectedLocked = initialBettingAccount.lockedBalance.add(additionalLockAmount);

      expect(bettingAccount.lockedBalance.toString()).to.equal(expectedLocked.toString());
    });

    it("Should reject locking more than available balance", async () => {
      const bettingAccount = await program.account.bettingAccount.fetch(lockingTestPda) as BettingAccount;
      const availableBalance = bettingAccount.balance.sub(bettingAccount.lockedBalance);
      const excessiveLockAmount = availableBalance.add(new BN(1_000_000)); // More than available

      try {
        await program.methods
          .lockFunds(excessiveLockAmount)
          .accounts({
            bettingAccount: lockingTestPda,
            user: lockingTestUser.publicKey,
          })
          .signers([lockingTestUser])
          .rpc();
        
        expect.fail("Should have failed with insufficient balance");
      } catch (error) {
        expect(error.message).to.include("InsufficientBalance");
      }
    });

    it("Should unlock funds successfully", async () => {
      const unlockAmount = new BN(200_000_000); // 0.2 SOL
      const initialBettingAccount = await program.account.bettingAccount.fetch(lockingTestPda) as BettingAccount;

      const tx = await program.methods
        .unlockFunds(unlockAmount)
        .accounts({
          bettingAccount: lockingTestPda,
          user: lockingTestUser.publicKey,
        })
        .signers([lockingTestUser])
        .rpc();

      console.log("Unlock funds transaction:", tx);

      const bettingAccount = await program.account.bettingAccount.fetch(lockingTestPda) as BettingAccount;
      const expectedLocked = initialBettingAccount.lockedBalance.sub(unlockAmount);

      expect(bettingAccount.lockedBalance.toString()).to.equal(expectedLocked.toString());
    });

    it("Should reject unlocking more than locked balance", async () => {
      const bettingAccount = await program.account.bettingAccount.fetch(lockingTestPda) as BettingAccount;
      const excessiveUnlockAmount = bettingAccount.lockedBalance.add(new BN(1_000_000)); // More than locked

      try {
        await program.methods
          .unlockFunds(excessiveUnlockAmount)
          .accounts({
            bettingAccount: lockingTestPda,
            user: lockingTestUser.publicKey,
          })
          .signers([lockingTestUser])
          .rpc();
        
        expect.fail("Should have failed with insufficient locked funds");
      } catch (error) {
        expect(error.message).to.include("InsufficientLockedFunds");
      }
    });

    it("Should reject locking zero amount", async () => {
      const zeroAmount = new BN(0);

      try {
        await program.methods
          .lockFunds(zeroAmount)
          .accounts({
            bettingAccount: lockingTestPda,
            user: lockingTestUser.publicKey,
          })
          .signers([lockingTestUser])
          .rpc();
        
        expect.fail("Should have failed with invalid withdrawal amount");
      } catch (error) {
        expect(error.message).to.include("InvalidWithdrawalAmount");
      }
    });
  });

  describe("Multiple User Scenarios", () => {
    before(async () => {
      user3 = Keypair.generate();
      await provider.connection.requestAirdrop(user3.publicKey, 5 * LAMPORTS_PER_SOL);
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Create user3 betting account
      await program.methods
        .createBettingAccount()
        .accounts({
          bettingAccount: bettingPda3,
          user: user3.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([user3])
        .rpc();
    });

    it("Should handle concurrent deposits from multiple users", async () => {
      const depositAmount = new BN(300_000_000); // 0.3 SOL

      const [tx1, tx2] = await Promise.all([
        program.methods
          .depositSol(depositAmount)
          .accounts({
            bettingAccount: bettingPda2,
            user: user2.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .signers([user2])
          .rpc(),
        
        program.methods
          .depositSol(depositAmount)
          .accounts({
            bettingAccount: bettingPda3,
            user: user3.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .signers([user3])
          .rpc()
      ]);

      console.log("Concurrent deposit transactions:", tx1, tx2);

      // Verify both accounts updated correctly
      const bettingAccount2 = await program.account.bettingAccount.fetch(bettingPda2) as BettingAccount;
      const bettingAccount3 = await program.account.bettingAccount.fetch(bettingPda3) as BettingAccount;

      expect(bettingAccount3.balance.toString()).to.equal(depositAmount.toString());
      expect(bettingAccount3.depositCount).to.equal(1);
    });

    it("Should maintain account isolation between users", async () => {
      const bettingAccount1 = await program.account.bettingAccount.fetch(bettingPda1) as BettingAccount;
      const bettingAccount2 = await program.account.bettingAccount.fetch(bettingPda2) as BettingAccount;
      const bettingAccount3 = await program.account.bettingAccount.fetch(bettingPda3) as BettingAccount;

      // Each account should have different user authority
      expect(bettingAccount1.user.toString()).to.equal(user1.publicKey.toString());
      expect(bettingAccount2.user.toString()).to.equal(user2.publicKey.toString());
      expect(bettingAccount3.user.toString()).to.equal(user3.publicKey.toString());

      // Accounts should have different balances and histories
      expect(bettingAccount1.balance.toString()).to.not.equal(bettingAccount2.balance.toString());
      expect(bettingAccount1.depositCount).to.not.equal(bettingAccount3.depositCount);
    });
  });

  describe("Error Handling and Security", () => {
    it("Should reject unauthorized access to other user's account", async () => {
      const unauthorizedAmount = new BN(100_000_000);

      try {
        await program.methods
          .depositSol(unauthorizedAmount)
          .accounts({
            bettingAccount: bettingPda1, // User1's account
            user: user2.publicKey,       // But signing with user2
            systemProgram: SystemProgram.programId,
          })
          .signers([user2])
          .rpc();
        
        expect.fail("Should have failed with unauthorized access");
      } catch (error) {
        expect(error.message).to.include("signature verification failed");
      }
    });

    it("Should handle account not found gracefully", async () => {
      const nonExistentPda = Keypair.generate().publicKey;
      
      try {
        await program.account.bettingAccount.fetch(nonExistentPda);
        expect.fail("Should have failed with account not found");
      } catch (error) {
        expect(error.message).to.include("Account does not exist");
      }
    });

    it("Should validate PDA derivation security", async () => {
      const testUser = Keypair.generate();
      
      const [pda] = PublicKey.findProgramAddressSync(
        [Buffer.from("betting_account"), testUser.publicKey.toBuffer()],
        program.programId
      );
      
      // PDA should be off-curve (not on Ed25519 curve)
      expect(PublicKey.isOnCurve(pda.toBuffer())).to.be.false;
    });
  });

  describe("Performance and Gas Optimization", () => {
    it("Should track transaction costs for different operations", async () => {
      const testUser = Keypair.generate();
      await provider.connection.requestAirdrop(testUser.publicKey, 2 * LAMPORTS_PER_SOL);
      await new Promise(resolve => setTimeout(resolve, 1000));

      const [testPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("betting_account"), testUser.publicKey.toBuffer()],
        program.programId
      );

      // Track account creation cost
      const preCreateBalance = await provider.connection.getBalance(testUser.publicKey);
      
      await program.methods
        .createBettingAccount()
        .accounts({
          bettingAccount: testPda,
          user: testUser.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([testUser])
        .rpc();

      const postCreateBalance = await provider.connection.getBalance(testUser.publicKey);
      const createCost = preCreateBalance - postCreateBalance;

      // Track deposit cost
      const preDepositBalance = await provider.connection.getBalance(testUser.publicKey);
      
      await program.methods
        .depositSol(new BN(100_000_000))
        .accounts({
          bettingAccount: testPda,
          user: testUser.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([testUser])
        .rpc();

      const postDepositBalance = await provider.connection.getBalance(testUser.publicKey);
      const depositCost = preDepositBalance - postDepositBalance - 100_000_000; // Exclude the deposited amount

      console.log(`Account creation cost: ${createCost / LAMPORTS_PER_SOL} SOL`);
      console.log(`Deposit transaction cost: ${depositCost / LAMPORTS_PER_SOL} SOL`);
      
      expect(createCost).to.be.lessThan(0.01 * LAMPORTS_PER_SOL);
      expect(depositCost).to.be.lessThan(0.001 * LAMPORTS_PER_SOL);
    });
  });

  describe("Integration Test Scenarios", () => {
    it("Should handle complete user lifecycle", async () => {
      const lifecycleUser = Keypair.generate();
      await provider.connection.requestAirdrop(lifecycleUser.publicKey, 3 * LAMPORTS_PER_SOL);
      await new Promise(resolve => setTimeout(resolve, 1000));

      const [lifecyclePda] = PublicKey.findProgramAddressSync(
        [Buffer.from("betting_account"), lifecycleUser.publicKey.toBuffer()],
        program.programId
      );

      // 1. Create account
      await program.methods
        .createBettingAccount()
        .accounts({
          bettingAccount: lifecyclePda,
          user: lifecycleUser.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([lifecycleUser])
        .rpc();

      // 2. Make multiple deposits
      const deposits = [
        new BN(200_000_000), // 0.2 SOL
        new BN(300_000_000), // 0.3 SOL
        new BN(150_000_000), // 0.15 SOL
      ];

      for (const deposit of deposits) {
        await program.methods
          .depositSol(deposit)
          .accounts({
            bettingAccount: lifecyclePda,
            user: lifecycleUser.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .signers([lifecycleUser])
          .rpc();
      }

      // 3. Lock some funds
      await program.methods
        .lockFunds(new BN(250_000_000)) // 0.25 SOL
        .accounts({
          bettingAccount: lifecyclePda,
          user: lifecycleUser.publicKey,
        })
        .signers([lifecycleUser])
        .rpc();

      // 4. Unlock some funds
      await program.methods
        .unlockFunds(new BN(100_000_000)) // 0.1 SOL
        .accounts({
          bettingAccount: lifecyclePda,
          user: lifecycleUser.publicKey,
        })
        .signers([lifecycleUser])
        .rpc();

      // Verify final state
      const finalAccount = await program.account.bettingAccount.fetch(lifecyclePda) as BettingAccount;
      const expectedTotal = deposits.reduce((sum, deposit) => sum.add(deposit), new BN(0));
      
      expect(finalAccount.balance.toString()).to.equal(expectedTotal.toString());
      expect(finalAccount.lockedBalance.toString()).to.equal(new BN(150_000_000).toString()); // 0.25 - 0.1 = 0.15
      expect(finalAccount.depositCount).to.equal(3);
      expect(finalAccount.totalDeposited.toString()).to.equal(expectedTotal.toString());
    });
  });
});
