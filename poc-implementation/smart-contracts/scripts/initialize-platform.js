const { Connection, Keypair, PublicKey, SystemProgram, LAMPORTS_PER_SOL } = require('@solana/web3.js');
const { Program, AnchorProvider, Wallet, BN } = require('@coral-xyz/anchor');
const fs = require('fs');

// Constants
const PROGRAM_ID = new PublicKey('C8uJ3ABMU87GjcB8moR1jiiAgYnFUDR17DBfiQE4eUcz');
const DEVNET_URL = 'https://api.devnet.solana.com';

// Load IDL and add the address field if missing
const rawIdl = JSON.parse(fs.readFileSync('../../frontend/lib/idl/nen_betting.json', 'utf8'));
const idl = {
  ...rawIdl,
  address: PROGRAM_ID.toString()
};
console.log('IDL loaded with address:', idl.address);

async function initializeBettingPlatform() {
  console.log('🚀 Initializing Betting Platform on Devnet...');
  console.log('Program ID:', PROGRAM_ID.toString());
  
  // Load wallet
  const walletKeypair = Keypair.fromSecretKey(
    new Uint8Array(JSON.parse(fs.readFileSync(process.env.HOME + '/.config/solana/id.json', 'utf8')))
  );
  console.log('Admin wallet:', walletKeypair.publicKey.toString());
  
  // Setup connection and provider
  const connection = new Connection(DEVNET_URL, 'confirmed');
  const wallet = new Wallet(walletKeypair);
  const provider = new AnchorProvider(connection, wallet, AnchorProvider.defaultOptions());
  
  // Initialize program
  const program = new Program(idl, PROGRAM_ID, provider);
  console.log('Program loaded successfully');
  
  // Calculate betting platform PDA
  const [bettingPlatformPDA, bump] = PublicKey.findProgramAddressSync(
    [Buffer.from('betting_platform')],
    PROGRAM_ID
  );
  
  console.log('Betting Platform PDA:', bettingPlatformPDA.toString());
  console.log('Bump:', bump);
  
  try {
    // Check if already initialized
    const existingAccount = await connection.getAccountInfo(bettingPlatformPDA);
    if (existingAccount) {
      console.log('✅ Betting platform already initialized');
      return;
    }
    
    // Initialize betting platform
    console.log('🎯 Initializing betting platform...');
    const tx = await program.methods
      .initializeBettingPlatform(
        walletKeypair.publicKey, // admin
        new BN(0.1 * LAMPORTS_PER_SOL), // minimum deposit (0.1 SOL)
        new BN(100 * LAMPORTS_PER_SOL), // maximum deposit (100 SOL)
        100 // platform fee in basis points (1%)
      )
      .accounts({
        bettingPlatform: bettingPlatformPDA,
        admin: walletKeypair.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([walletKeypair])
      .rpc();
    
    console.log('✅ Betting platform initialized!');
    console.log('Transaction signature:', tx);
    console.log(`🔗 View on Explorer: https://explorer.solana.com/tx/${tx}?cluster=devnet`);
    
  } catch (error) {
    console.error('❌ Failed to initialize betting platform:', error);
    
    if (error.message.includes('already in use')) {
      console.log('✅ Platform already initialized (account exists)');
    } else {
      throw error;
    }
  }
}

// IDL file fallback - create if it doesn't exist
if (!fs.existsSync('../target/idl/nen_betting.json')) {
  console.log('Creating IDL directory...');
  fs.mkdirSync('../target/idl/', { recursive: true });
  
  // Use the IDL from frontend lib
  const frontendIdl = fs.readFileSync('../../frontend/lib/idl/nen_betting.json', 'utf8');
  fs.writeFileSync('../target/idl/nen_betting.json', frontendIdl);
}

initializeBettingPlatform().catch(console.error);
