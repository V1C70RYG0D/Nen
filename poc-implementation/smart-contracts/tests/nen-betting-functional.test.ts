import * as anchor from "@coral-xyz/anchor";
import { expect } from "chai";
import { PublicKey, Keypair, SystemProgram, LAMPORTS_PER_SOL, Connection } from "@solana/web3.js";

describe("Nen Betting Program - Functional Tests", () => {
  const config = {
    rpcUrl: process.env.ANCHOR_PROVIDER_URL || "https://api.devnet.solana.com",
    programId: "34RNydfkFZmhvUupbW1qHBG5LmASc6zeS3tuUsw6PwC5",
  };

  const connection = new Connection(config.rpcUrl, "confirmed");
  const provider = new anchor.AnchorProvider(connection, anchor.AnchorProvider.env().wallet, {});
  anchor.setProvider(provider);

  const programId = new PublicKey(config.programId);
  
  const idl = {
    version: "0.1.0",
    name: "nen_betting",
    instructions: [
      {
        name: "createBettingAccount",
        accounts: [
          { name: "bettingAccount", isMut: true, isSigner: false },
          { name: "user", isMut: true, isSigner: true },
          { name: "systemProgram", isMut: false, isSigner: false }
        ],
        args: []
      },
      {
        name: "depositSol",
        accounts: [
          { name: "bettingAccount", isMut: true, isSigner: false },
          { name: "user", isMut: true, isSigner: true },
          { name: "systemProgram", isMut: false, isSigner: false }
        ],
        args: [
          { name: "amount", type: "u64" }
        ]
      },
      {
        name: "withdrawSol",
        accounts: [
          { name: "bettingAccount", isMut: true, isSigner: false },
          { name: "user", isMut: true, isSigner: true }
        ],
        args: [
          { name: "amount", type: "u64" }
        ]
      },
      {
        name: "lockFunds",
        accounts: [
          { name: "bettingAccount", isMut: true, isSigner: false },
          { name: "user", isMut: false, isSigner: true }
        ],
        args: [
          { name: "amount", type: "u64" }
        ]
      },
      {
        name: "unlockFunds",
        accounts: [
          { name: "bettingAccount", isMut: true, isSigner: false },
          { name: "user", isMut: false, isSigner: true }
        ],
        args: [
          { name: "amount", type: "u64" }
        ]
      }
    ],
    accounts: [
      {
        name: "BettingAccount",
        type: {
          kind: "struct",
          fields: [
            { name: "user", type: "publicKey" },
            { name: "balance", type: "u64" },
            { name: "totalDeposited", type: "u64" },
            { name: "totalWithdrawn", type: "u64" },
            { name: "lockedBalance", type: "u64" },
            { name: "depositCount", type: "u32" },
            { name: "withdrawalCount", type: "u32" },
            { name: "lastWithdrawalTime", type: "i64" }
          ]
        }
      }
    ],
    errors: [
      { code: 6000, name: "BelowMinimumDeposit", msg: "Deposit amount is below minimum" },
      { code: 6001, name: "InsufficientBalance", msg: "Insufficient balance for withdrawal" },
      { code: 6002, name: "WithdrawalCooldownActive", msg: "24-hour withdrawal cooldown is active" }
    ]
  };

  const program = new anchor.Program(idl, programId, provider);
  let user1: Keypair;
  let user2: Keypair;
  let bettingPda1: PublicKey;
  let bettingPda2: PublicKey;

  before(async () => {
    user1 = Keypair.generate();
    user2 = Keypair.generate();

    // Airdrop SOL to test accounts
    await provider.connection.requestAirdrop(user1.publicKey, 5 * LAMPORTS_PER_SOL);
    await provider.connection.requestAirdrop(user2.publicKey, 5 * LAMPORTS_PER_SOL);

    await new Promise(resolve => setTimeout(resolve, 2000));

    [bettingPda1] = PublicKey.findProgramAddressSync(
      [Buffer.from("betting_account"), user1.publicKey.toBuffer()],
      program.programId
    );

    [bettingPda2] = PublicKey.findProgramAddressSync(
      [Buffer.from("betting_account"), user2.publicKey.toBuffer()],
      program.programId
    );

    console.log("Test setup complete");
    console.log("User1 betting PDA:", bettingPda1.toString());
    console.log("User2 betting PDA:", bettingPda2.toString());
  });

  describe("Betting Account Management", () => {
    it("Should create betting account for user1", async () => {
      await program.methods
        .createBettingAccount()
        .accounts({
          bettingAccount: bettingPda1,
          user: user1.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([user1])
        .rpc();

      const bettingAccount = await program.account.bettingAccount.fetch(bettingPda1);
      expect(bettingAccount.user.toString()).to.equal(user1.publicKey.toString());
      expect(bettingAccount.balance).to.equal(0);
      expect(bettingAccount.totalDeposited).to.equal(0);
      expect(bettingAccount.totalWithdrawn).to.equal(0);
      expect(bettingAccount.lockedBalance).to.equal(0);
      expect(bettingAccount.depositCount).to.equal(0);
      expect(bettingAccount.withdrawalCount).to.equal(0);

      console.log("Betting account created for user1");
      console.log("Account owner:", bettingAccount.user.toString());
      console.log("Initial balance:", bettingAccount.balance);
    });

    it("Should create betting account for user2", async () => {
      await program.methods
        .createBettingAccount()
        .accounts({
          bettingAccount: bettingPda2,
          user: user2.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([user2])
        .rpc();

      const bettingAccount = await program.account.bettingAccount.fetch(bettingPda2);
      expect(bettingAccount.user.toString()).to.equal(user2.publicKey.toString());
      expect(bettingAccount.balance).to.equal(0);

      console.log("Betting account created for user2");
      console.log("Account owner:", bettingAccount.user.toString());
    });
  });

  describe("SOL Deposit Operations", () => {
    it("Should deposit 0.5 SOL to user1 betting account", async () => {
      const depositAmount = 0.5 * LAMPORTS_PER_SOL;
      
      const userBalanceBefore = await provider.connection.getBalance(user1.publicKey);
      const pdaBalanceBefore = await provider.connection.getBalance(bettingPda1);

      await program.methods
        .depositSol(new anchor.BN(depositAmount))
        .accounts({
          bettingAccount: bettingPda1,
          user: user1.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([user1])
        .rpc();

      const bettingAccount = await program.account.bettingAccount.fetch(bettingPda1);
      const userBalanceAfter = await provider.connection.getBalance(user1.publicKey);
      const pdaBalanceAfter = await provider.connection.getBalance(bettingPda1);

      expect(bettingAccount.balance).to.equal(depositAmount);
      expect(bettingAccount.totalDeposited).to.equal(depositAmount);
      expect(bettingAccount.depositCount).to.equal(1);
      expect(pdaBalanceAfter - pdaBalanceBefore).to.equal(depositAmount);

      console.log("SOL deposit successful");
      console.log("Deposited amount:", depositAmount / LAMPORTS_PER_SOL, "SOL");
      console.log("Account balance:", bettingAccount.balance / LAMPORTS_PER_SOL, "SOL");
      console.log("Total deposited:", bettingAccount.totalDeposited / LAMPORTS_PER_SOL, "SOL");
      console.log("Deposit count:", bettingAccount.depositCount);
    });

    it("Should deposit 1.0 SOL to user2 betting account", async () => {
      const depositAmount = 1.0 * LAMPORTS_PER_SOL;

      await program.methods
        .depositSol(new anchor.BN(depositAmount))
        .accounts({
          bettingAccount: bettingPda2,
          user: user2.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([user2])
        .rpc();

      const bettingAccount = await program.account.bettingAccount.fetch(bettingPda2);
      expect(bettingAccount.balance).to.equal(depositAmount);
      expect(bettingAccount.totalDeposited).to.equal(depositAmount);
      expect(bettingAccount.depositCount).to.equal(1);

      console.log("Second SOL deposit successful");
      console.log("User2 balance:", bettingAccount.balance / LAMPORTS_PER_SOL, "SOL");
    });

    it("Should reject deposit below minimum (0.1 SOL)", async () => {
      const invalidAmount = 0.05 * LAMPORTS_PER_SOL; // Below 0.1 SOL minimum

      try {
        await program.methods
          .depositSol(new anchor.BN(invalidAmount))
          .accounts({
            bettingAccount: bettingPda1,
            user: user1.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .signers([user1])
          .rpc();
        
        expect.fail("Should have rejected deposit below minimum");
      } catch (error) {
        expect(error.message).to.include("BelowMinimumDeposit");
        console.log("Correctly rejected deposit below minimum");
        console.log("Attempted amount:", invalidAmount / LAMPORTS_PER_SOL, "SOL");
      }
    });
  });

  describe("Fund Locking Operations", () => {
    it("Should lock 0.2 SOL from user1 account", async () => {
      const lockAmount = 0.2 * LAMPORTS_PER_SOL;

      await program.methods
        .lockFunds(new anchor.BN(lockAmount))
        .accounts({
          bettingAccount: bettingPda1,
          user: user1.publicKey,
        })
        .signers([user1])
        .rpc();

      const bettingAccount = await program.account.bettingAccount.fetch(bettingPda1);
      expect(bettingAccount.lockedBalance).to.equal(lockAmount);

      const availableBalance = bettingAccount.balance - bettingAccount.lockedBalance;
      expect(availableBalance).to.equal(0.3 * LAMPORTS_PER_SOL);

      console.log("Funds locked successfully");
      console.log("Locked amount:", bettingAccount.lockedBalance / LAMPORTS_PER_SOL, "SOL");
      console.log("Available balance:", availableBalance / LAMPORTS_PER_SOL, "SOL");
    });

    it("Should unlock 0.1 SOL from user1 account", async () => {
      const unlockAmount = 0.1 * LAMPORTS_PER_SOL;

      await program.methods
        .unlockFunds(new anchor.BN(unlockAmount))
        .accounts({
          bettingAccount: bettingPda1,
          user: user1.publicKey,
        })
        .signers([user1])
        .rpc();

      const bettingAccount = await program.account.bettingAccount.fetch(bettingPda1);
      expect(bettingAccount.lockedBalance).to.equal(0.1 * LAMPORTS_PER_SOL);

      const availableBalance = bettingAccount.balance - bettingAccount.lockedBalance;
      expect(availableBalance).to.equal(0.4 * LAMPORTS_PER_SOL);

      console.log("Funds unlocked successfully");
      console.log("Remaining locked:", bettingAccount.lockedBalance / LAMPORTS_PER_SOL, "SOL");
      console.log("Available balance:", availableBalance / LAMPORTS_PER_SOL, "SOL");
    });
  });

  describe("SOL Withdrawal Operations", () => {
    it("Should withdraw 0.2 SOL from user1 account", async () => {
      const withdrawAmount = 0.2 * LAMPORTS_PER_SOL;
      
      const userBalanceBefore = await provider.connection.getBalance(user1.publicKey);
      const pdaBalanceBefore = await provider.connection.getBalance(bettingPda1);

      await program.methods
        .withdrawSol(new anchor.BN(withdrawAmount))
        .accounts({
          bettingAccount: bettingPda1,
          user: user1.publicKey,
        })
        .signers([user1])
        .rpc();

      const bettingAccount = await program.account.bettingAccount.fetch(bettingPda1);
      const userBalanceAfter = await provider.connection.getBalance(user1.publicKey);
      const pdaBalanceAfter = await provider.connection.getBalance(bettingPda1);

      expect(bettingAccount.balance).to.equal(0.3 * LAMPORTS_PER_SOL);
      expect(bettingAccount.totalWithdrawn).to.equal(withdrawAmount);
      expect(bettingAccount.withdrawalCount).to.equal(1);
      expect(pdaBalanceBefore - pdaBalanceAfter).to.be.greaterThan(withdrawAmount * 0.9); // Account for fees

      console.log("SOL withdrawal successful");
      console.log("Withdrawn amount:", withdrawAmount / LAMPORTS_PER_SOL, "SOL");
      console.log("Remaining balance:", bettingAccount.balance / LAMPORTS_PER_SOL, "SOL");
      console.log("Total withdrawn:", bettingAccount.totalWithdrawn / LAMPORTS_PER_SOL, "SOL");
      console.log("Withdrawal count:", bettingAccount.withdrawalCount);
    });

    it("Should reject withdrawal exceeding available balance", async () => {
      const excessiveAmount = 1.0 * LAMPORTS_PER_SOL; // More than available

      try {
        await program.methods
          .withdrawSol(new anchor.BN(excessiveAmount))
          .accounts({
            bettingAccount: bettingPda1,
            user: user1.publicKey,
          })
          .signers([user1])
          .rpc();
        
        expect.fail("Should have rejected excessive withdrawal");
      } catch (error) {
        expect(error.message).to.include("InsufficientBalance");
        console.log("Correctly rejected excessive withdrawal");
        console.log("Attempted amount:", excessiveAmount / LAMPORTS_PER_SOL, "SOL");
      }
    });

    it("Should enforce 24-hour withdrawal cooldown", async () => {
      const withdrawAmount = 0.05 * LAMPORTS_PER_SOL;

      try {
        await program.methods
          .withdrawSol(new anchor.BN(withdrawAmount))
          .accounts({
            bettingAccount: bettingPda1,
            user: user1.publicKey,
          })
          .signers([user1])
          .rpc();
        
        expect.fail("Should have enforced withdrawal cooldown");
      } catch (error) {
        expect(error.message).to.include("WithdrawalCooldownActive");
        console.log("Correctly enforced 24-hour withdrawal cooldown");
        console.log("Attempted second withdrawal amount:", withdrawAmount / LAMPORTS_PER_SOL, "SOL");
      }
    });
  });

  describe("Account State Verification", () => {
    it("Should verify final account states", async () => {
      const bettingAccount1 = await program.account.bettingAccount.fetch(bettingPda1);
      const bettingAccount2 = await program.account.bettingAccount.fetch(bettingPda2);

      console.log("Final account states:");
      console.log("User1 account:");
      console.log("  Balance:", bettingAccount1.balance / LAMPORTS_PER_SOL, "SOL");
      console.log("  Locked:", bettingAccount1.lockedBalance / LAMPORTS_PER_SOL, "SOL");
      console.log("  Total deposited:", bettingAccount1.totalDeposited / LAMPORTS_PER_SOL, "SOL");
      console.log("  Total withdrawn:", bettingAccount1.totalWithdrawn / LAMPORTS_PER_SOL, "SOL");
      console.log("  Deposit count:", bettingAccount1.depositCount);
      console.log("  Withdrawal count:", bettingAccount1.withdrawalCount);

      console.log("User2 account:");
      console.log("  Balance:", bettingAccount2.balance / LAMPORTS_PER_SOL, "SOL");
      console.log("  Locked:", bettingAccount2.lockedBalance / LAMPORTS_PER_SOL, "SOL");
      console.log("  Total deposited:", bettingAccount2.totalDeposited / LAMPORTS_PER_SOL, "SOL");
      console.log("  Deposit count:", bettingAccount2.depositCount);

      expect(bettingAccount1.balance + bettingAccount1.totalWithdrawn).to.equal(bettingAccount1.totalDeposited);
      expect(bettingAccount2.balance).to.equal(bettingAccount2.totalDeposited);

      console.log("Account integrity verified - all balances consistent");
    });
  });
});
