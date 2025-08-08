/**
 * Initialize betting platform using raw program instruction
 * This bypasses Anchor CLI issues and directly calls the program
 */

const { Connection, Keypair, PublicKey, SystemProgram, Transaction, TransactionInstruction } = require('@solana/web3.js');
const { Program, AnchorProvider, Wallet, BN } = require('@coral-xyz/anchor');
const fs = require('fs');

// Constants
const PROGRAM_ID = new PublicKey('C8uJ3ABMU87GjcB8moR1jiiAgYnFUDR17DBfiQE4eUcz');
const DEVNET_URL = 'https://api.devnet.solana.com';

async function initializePlatformDirect() {
  console.log('🔧 Direct Platform Initialization');
  
  // Load wallet
  const walletKeypair = Keypair.fromSecretKey(
    new Uint8Array(JSON.parse(fs.readFileSync(process.env.HOME + '/.config/solana/id.json', 'utf8')))
  );
  console.log('Admin wallet:', walletKeypair.publicKey.toString());
  
  // Setup connection
  const connection = new Connection(DEVNET_URL, 'confirmed');
  
  // Check wallet balance
  const balance = await connection.getBalance(walletKeypair.publicKey);
  console.log('Wallet balance:', balance / 1e9, 'SOL');
  
  if (balance < 0.01 * 1e9) {
    console.log('⚠️  Low balance. Requesting airdrop...');
    try {
      const airdropSignature = await connection.requestAirdrop(walletKeypair.publicKey, 1 * 1e9);
      console.log('Airdrop signature:', airdropSignature);
      
      // Wait for airdrop confirmation
      await connection.confirmTransaction(airdropSignature);
      console.log('✅ Airdrop confirmed');
    } catch (error) {
      console.log('❌ Airdrop failed (rate limited), continuing with available balance...');
    }
  }
  
  // Calculate betting platform PDA
  const [bettingPlatformPDA, bump] = PublicKey.findProgramAddressSync(
    [Buffer.from('betting_platform')],
    PROGRAM_ID
  );
  
  console.log('Platform PDA:', bettingPlatformPDA.toString());
  console.log('Bump:', bump);
  
  try {
    // Check if already initialized
    const existingAccount = await connection.getAccountInfo(bettingPlatformPDA);
    if (existingAccount) {
      console.log('✅ Platform already initialized');
      return;
    }
    
    console.log('🎯 Initializing platform...');
    
    // Use the frontend IDL to set up the program properly
    const rawIdl = JSON.parse(fs.readFileSync('../../frontend/lib/idl/nen_betting.json', 'utf8'));
    const idl = {
      ...rawIdl,
      address: PROGRAM_ID.toString()
    };
    
    // Setup provider
    const wallet = new Wallet(walletKeypair);
    const provider = new AnchorProvider(connection, wallet, AnchorProvider.defaultOptions());
    
    // Initialize program
    const program = new Program(idl, provider);
    
    console.log('📞 Calling initializeBettingPlatform...');
    
    // Call initialize function
    const tx = await program.methods
      .initializeBettingPlatform(
        walletKeypair.publicKey, // admin
        new BN(0.1 * 1e9), // minimum deposit (0.1 SOL)
        new BN(100 * 1e9), // maximum deposit (100 SOL)  
        100 // platform fee in basis points (1%)
      )
      .accounts({
        bettingPlatform: bettingPlatformPDA,
        admin: walletKeypair.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();
    
    console.log('✅ Platform initialized successfully!');
    console.log('Transaction signature:', tx);
    console.log(`🔗 View on Explorer: https://explorer.solana.com/tx/${tx}?cluster=devnet`);
    
    // Verify initialization
    const verifyAccount = await connection.getAccountInfo(bettingPlatformPDA);
    if (verifyAccount) {
      console.log('✅ Verification: Platform account exists');
      console.log('Account data length:', verifyAccount.data.length);
      console.log('Account owner:', verifyAccount.owner.toString());
    }
    
  } catch (error) {
    console.error('❌ Platform initialization failed:', error);
    
    if (error.message.includes('already in use')) {
      console.log('✅ Platform already exists (account in use)');
    } else {
      throw error;
    }
  }
}

initializePlatformDirect().catch(console.error);
