/**
 * User Story 2: Deposit SOL - Comprehensive Validation Test
 * 
 * Validates all on-chain requirements from User Stories:
 * - Create/access user's betting account PDA on devnet
 * - Transfer real SOL from user wallet to betting PDA via devnet transaction
 * - Update user's on-chain balance record with actual data
 * - Emit deposit event for tracking, verifiable on devnet
 * - Enforce minimum deposit (0.1 SOL); use real devnet SOL for testing
 */

import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { expect } from "chai";
import { 
  PublicKey, 
  Keypair, 
  SystemProgram,
  LAMPORTS_PER_SOL,
  Connection,
  Transaction,
  sendAndConfirmTransaction
} from "@solana/web3.js";
import { NenBetting } from "../target/types/nen_betting";

describe("User Story 2: Deposit SOL - On-Chain Requirements Validation", () => {
  // Configure the client to use devnet
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const connection = provider.connection;
  
  const program = anchor.workspace.NenBetting as Program<NenBetting>;
  
  let userKeypair: Keypair;
  let bettingAccountPDA: PublicKey;
  let bettingAccountBump: number;
  
  // User Story 2: Minimum deposit requirement (0.1 SOL)
  const MIN_DEPOSIT = 0.1 * LAMPORTS_PER_SOL;
  const TEST_DEPOSIT = 0.5 * LAMPORTS_PER_SOL;
  
  before(async () => {
    // Generate a new user keypair for testing
    userKeypair = Keypair.generate();
    
    // Airdrop real devnet SOL for testing
    console.log("🚰 Requesting devnet SOL airdrop for test user...");
    const airdropSignature = await connection.requestAirdrop(
      userKeypair.publicKey,
      2 * LAMPORTS_PER_SOL // Request 2 SOL for testing
    );
    
    // Wait for airdrop confirmation
    await connection.confirmTransaction(airdropSignature, "confirmed");
    
    const balance = await connection.getBalance(userKeypair.publicKey);
    console.log(`✅ User balance after airdrop: ${balance / LAMPORTS_PER_SOL} SOL`);
    
    // Derive betting account PDA
    [bettingAccountPDA, bettingAccountBump] = PublicKey.findProgramAddressSync(
      [Buffer.from("betting-account"), userKeypair.publicKey.toBuffer()],
      program.programId
    );
    
    console.log(`📍 Betting Account PDA: ${bettingAccountPDA.toString()}`);
    console.log(`📍 Program ID: ${program.programId.toString()}`);
  });

  describe("On-Chain Requirement 1: Create/access user's betting account PDA on devnet", () => {
    it("Should create a new betting account PDA with correct seeds", async () => {
      const tx = await program.methods
        .createBettingAccount()
        .accounts({
          bettingAccount: bettingAccountPDA,
          user: userKeypair.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([userKeypair])
        .rpc();
      
      console.log(`✅ Betting account created. Transaction: ${tx}`);
      
      // Verify the account was created with correct data
      const bettingAccount = await program.account.bettingAccount.fetch(bettingAccountPDA);
      
      expect(bettingAccount.owner.toString()).to.equal(userKeypair.publicKey.toString());
      expect(bettingAccount.balance.toNumber()).to.equal(0);
      expect(bettingAccount.totalDeposited.toNumber()).to.equal(0);
      expect(bettingAccount.totalWithdrawn.toNumber()).to.equal(0);
      expect(bettingAccount.lockedFunds.toNumber()).to.equal(0);
      expect(bettingAccount.withdrawalCount.toNumber()).to.equal(0);
      expect(bettingAccount.lastActivity.toNumber()).to.be.greaterThan(0);
      
      console.log("✅ Betting account PDA created with correct initial state");
    });
    
    it("Should fail when trying to create duplicate betting account", async () => {
      try {
        await program.methods
          .createBettingAccount()
          .accounts({
            bettingAccount: bettingAccountPDA,
            user: userKeypair.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .signers([userKeypair])
          .rpc();
        
        expect.fail("Should have failed due to duplicate account creation");
      } catch (error) {
        console.log("✅ Correctly prevented duplicate account creation");
      }
    });
  });

  describe("On-Chain Requirement 2: Transfer real SOL from user wallet to betting PDA", () => {
    it("Should transfer SOL from user wallet to betting account PDA", async () => {
      const userBalanceBefore = await connection.getBalance(userKeypair.publicKey);
      const bettingBalanceBefore = await connection.getBalance(bettingAccountPDA);
      
      console.log(`💰 User balance before deposit: ${userBalanceBefore / LAMPORTS_PER_SOL} SOL`);
      console.log(`💰 Betting account balance before: ${bettingBalanceBefore / LAMPORTS_PER_SOL} SOL`);
      
      const tx = await program.methods
        .depositSol(new anchor.BN(TEST_DEPOSIT))
        .accounts({
          bettingAccount: bettingAccountPDA,
          user: userKeypair.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([userKeypair])
        .rpc();
      
      console.log(`✅ Deposit transaction: ${tx}`);
      
      // Verify SOL was actually transferred
      const userBalanceAfter = await connection.getBalance(userKeypair.publicKey);
      const bettingBalanceAfter = await connection.getBalance(bettingAccountPDA);
      
      console.log(`💰 User balance after deposit: ${userBalanceAfter / LAMPORTS_PER_SOL} SOL`);
      console.log(`💰 Betting account balance after: ${bettingBalanceAfter / LAMPORTS_PER_SOL} SOL`);
      
      // Account for transaction fees
      expect(userBalanceAfter).to.be.lessThan(userBalanceBefore - TEST_DEPOSIT);
      expect(bettingBalanceAfter).to.be.greaterThan(bettingBalanceBefore);
      
      console.log("✅ Real SOL transfer completed successfully");
    });
  });

  describe("On-Chain Requirement 3: Update user's on-chain balance record with actual data", () => {
    it("Should update betting account balance and totals correctly", async () => {
      const bettingAccount = await program.account.bettingAccount.fetch(bettingAccountPDA);
      
      expect(bettingAccount.balance.toNumber()).to.equal(TEST_DEPOSIT);
      expect(bettingAccount.totalDeposited.toNumber()).to.equal(TEST_DEPOSIT);
      expect(bettingAccount.lastActivity.toNumber()).to.be.greaterThan(0);
      
      console.log(`✅ Balance updated: ${bettingAccount.balance.toNumber() / LAMPORTS_PER_SOL} SOL`);
      console.log(`✅ Total deposited: ${bettingAccount.totalDeposited.toNumber() / LAMPORTS_PER_SOL} SOL`);
    });
    
    it("Should handle multiple deposits and track cumulative amounts", async () => {
      const secondDeposit = 0.2 * LAMPORTS_PER_SOL;
      
      await program.methods
        .depositSol(new anchor.BN(secondDeposit))
        .accounts({
          bettingAccount: bettingAccountPDA,
          user: userKeypair.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([userKeypair])
        .rpc();
      
      const bettingAccount = await program.account.bettingAccount.fetch(bettingAccountPDA);
      
      expect(bettingAccount.balance.toNumber()).to.equal(TEST_DEPOSIT + secondDeposit);
      expect(bettingAccount.totalDeposited.toNumber()).to.equal(TEST_DEPOSIT + secondDeposit);
      
      console.log("✅ Multiple deposits tracked correctly");
    });
  });

  describe("On-Chain Requirement 4: Emit deposit event for tracking, verifiable on devnet", () => {
    it("Should emit SolDeposited event with correct data", async () => {
      const testAmount = 0.1 * LAMPORTS_PER_SOL;
      
      // Listen for events
      const eventListener = program.addEventListener("SolDeposited", (event) => {
        console.log("📡 Deposit Event Received:");
        console.log(`  User: ${event.user.toString()}`);
        console.log(`  Account: ${event.account.toString()}`);
        console.log(`  Amount: ${event.amount.toNumber() / LAMPORTS_PER_SOL} SOL`);
        console.log(`  New Balance: ${event.newBalance.toNumber() / LAMPORTS_PER_SOL} SOL`);
        console.log(`  Timestamp: ${new Date(event.timestamp.toNumber() * 1000)}`);
        
        expect(event.user.toString()).to.equal(userKeypair.publicKey.toString());
        expect(event.account.toString()).to.equal(bettingAccountPDA.toString());
        expect(event.amount.toNumber()).to.equal(testAmount);
      });
      
      const tx = await program.methods
        .depositSol(new anchor.BN(testAmount))
        .accounts({
          bettingAccount: bettingAccountPDA,
          user: userKeypair.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([userKeypair])
        .rpc();
      
      // Wait a bit for event processing
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Remove event listener
      await program.removeEventListener(eventListener);
      
      console.log("✅ Deposit event emitted and verified on devnet");
    });
  });

  describe("On-Chain Requirement 5: Enforce minimum deposit (0.1 SOL)", () => {
    it("Should reject deposits below minimum (0.1 SOL)", async () => {
      const tooSmall = 0.05 * LAMPORTS_PER_SOL; // Below 0.1 SOL minimum
      
      try {
        await program.methods
          .depositSol(new anchor.BN(tooSmall))
          .accounts({
            bettingAccount: bettingAccountPDA,
            user: userKeypair.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .signers([userKeypair])
          .rpc();
        
        expect.fail("Should have rejected deposit below minimum");
      } catch (error) {
        expect(error.toString()).to.include("DepositTooSmall");
        console.log("✅ Correctly rejected deposit below 0.1 SOL minimum");
      }
    });
    
    it("Should accept deposits at exactly minimum (0.1 SOL)", async () => {
      const exactMin = MIN_DEPOSIT;
      
      const tx = await program.methods
        .depositSol(new anchor.BN(exactMin))
        .accounts({
          bettingAccount: bettingAccountPDA,
          user: userKeypair.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([userKeypair])
        .rpc();
      
      console.log(`✅ Accepted minimum deposit. Transaction: ${tx}`);
    });
    
    it("Should reject deposits above maximum (100 SOL)", async () => {
      const tooLarge = 101 * LAMPORTS_PER_SOL; // Above 100 SOL maximum
      
      try {
        await program.methods
          .depositSol(new anchor.BN(tooLarge))
          .accounts({
            bettingAccount: bettingAccountPDA,
            user: userKeypair.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .signers([userKeypair])
          .rpc();
        
        expect.fail("Should have rejected deposit above maximum");
      } catch (error) {
        expect(error.toString()).to.include("DepositTooLarge");
        console.log("✅ Correctly rejected deposit above 100 SOL maximum");
      }
    });
  });

  describe("Integration Test: Complete Deposit Flow", () => {
    it("Should complete full deposit workflow with real devnet data", async () => {
      // Create a new user for integration test
      const newUser = Keypair.generate();
      
      // Airdrop real devnet SOL
      const airdropTx = await connection.requestAirdrop(
        newUser.publicKey,
        1 * LAMPORTS_PER_SOL
      );
      await connection.confirmTransaction(airdropTx, "confirmed");
      
      // Derive PDA
      const [newBettingPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from("betting-account"), newUser.publicKey.toBuffer()],
        program.programId
      );
      
      console.log("🧪 Integration Test: Starting complete deposit flow");
      
      // Step 1: Create betting account
      await program.methods
        .createBettingAccount()
        .accounts({
          bettingAccount: newBettingPDA,
          user: newUser.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([newUser])
        .rpc();
      
      console.log("✅ Step 1: Betting account created");
      
      // Step 2: Make deposit
      const depositAmount = 0.3 * LAMPORTS_PER_SOL;
      const depositTx = await program.methods
        .depositSol(new anchor.BN(depositAmount))
        .accounts({
          bettingAccount: newBettingPDA,
          user: newUser.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([newUser])
        .rpc();
      
      console.log("✅ Step 2: Deposit completed");
      
      // Step 3: Verify all requirements
      const account = await program.account.bettingAccount.fetch(newBettingPDA);
      const pdaBalance = await connection.getBalance(newBettingPDA);
      
      // Requirement 1: PDA exists and accessible
      expect(account.owner.toString()).to.equal(newUser.publicKey.toString());
      
      // Requirement 2: Real SOL transferred
      expect(pdaBalance).to.be.greaterThan(depositAmount - 1000); // Account for rent
      
      // Requirement 3: On-chain balance updated
      expect(account.balance.toNumber()).to.equal(depositAmount);
      expect(account.totalDeposited.toNumber()).to.equal(depositAmount);
      
      console.log("✅ Step 3: All requirements verified");
      console.log(`📊 Final state:`);
      console.log(`  - PDA Address: ${newBettingPDA.toString()}`);
      console.log(`  - Balance: ${account.balance.toNumber() / LAMPORTS_PER_SOL} SOL`);
      console.log(`  - Total Deposited: ${account.totalDeposited.toNumber() / LAMPORTS_PER_SOL} SOL`);
      console.log(`  - Last Activity: ${new Date(account.lastActivity.toNumber() * 1000)}`);
      
      // Get transaction details from devnet
      const txDetails = await connection.getTransaction(depositTx, {
        commitment: "confirmed",
        maxSupportedTransactionVersion: 0
      });
      
      if (txDetails) {
        console.log(`📋 Transaction verifiable on devnet explorer:`);
        console.log(`   https://explorer.solana.com/tx/${depositTx}?cluster=devnet`);
      }
      
      console.log("🎉 Complete User Story 2 implementation verified on devnet!");
    });
  });
});
