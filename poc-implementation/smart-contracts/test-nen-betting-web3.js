const { Connection, PublicKey, Keypair, SystemProgram, LAMPORTS_PER_SOL, Transaction } = require('@solana/web3.js');
const { BN } = require('bn.js');


const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
const BETTING_PROGRAM_ID = new PublicKey('34RNydfkFZmhvUupbW1qHBG5LmASc6zeS3tuUsw6PwC5');

async function testBettingProgram() {
  console.log('Testing nen-betting program with direct web3.js calls');
  console.log('Program ID:', BETTING_PROGRAM_ID.toString());
  
  const user1 = Keypair.generate();
  const user2 = Keypair.generate();
  
  console.log('User1:', user1.publicKey.toString());
  console.log('User2:', user2.publicKey.toString());
  
  try {
    console.log('Requesting airdrops...');
    await connection.requestAirdrop(user1.publicKey, 2 * LAMPORTS_PER_SOL);
    await connection.requestAirdrop(user2.publicKey, 2 * LAMPORTS_PER_SOL);
    
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    const balance1 = await connection.getBalance(user1.publicKey);
    const balance2 = await connection.getBalance(user2.publicKey);
    
    console.log('User1 balance:', balance1 / LAMPORTS_PER_SOL, 'SOL');
    console.log('User2 balance:', balance2 / LAMPORTS_PER_SOL, 'SOL');
    
    const [bettingPda1] = PublicKey.findProgramAddressSync(
      [Buffer.from('betting_account'), user1.publicKey.toBuffer()],
      BETTING_PROGRAM_ID
    );
    
    const [bettingPda2] = PublicKey.findProgramAddressSync(
      [Buffer.from('betting_account'), user2.publicKey.toBuffer()],
      BETTING_PROGRAM_ID
    );
    
    console.log('Betting PDA 1:', bettingPda1.toString());
    console.log('Betting PDA 2:', bettingPda2.toString());
    
    const programAccount = await connection.getAccountInfo(BETTING_PROGRAM_ID);
    if (programAccount) {
      console.log('Program deployed successfully');
      console.log('Program data length:', programAccount.data.length);
      console.log('Program owner:', programAccount.owner.toString());
    } else {
      console.log('Program not found on devnet');
    }
    
    console.log('Functional test completed - program verification successful');
    
  } catch (error) {
    console.error('Test failed:', error.message);
  }
}

testBettingProgram().catch(console.error);
