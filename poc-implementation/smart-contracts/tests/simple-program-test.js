const { Connection, PublicKey } = require('@solana/web3.js');

async function testProgramsExist() {
  const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
  
  const programs = [
    { name: 'nen-core', id: 'Xs4PKxWNyY1C7i5bdqMh5tNhwPbDbxMXf4YcJAreJcF' },
    { name: 'nen-betting', id: '34RNydfkFZmhvUupbW1qHBG5LmASc6zeS3tuUsw6PwC5' },
    { name: 'nen-magicblock', id: 'AhGXiWjzKjd8T7J3FccYk51y4D97jGkZ7d7NJfmb3aFX' },
    { name: 'nen-marketplace', id: '8FbcrTGS9wQCyC99h5jbHx2bzZjYfkGERSMCjmYBDisH' }
  ];

  console.log('Testing program deployment status on Solana devnet...');
  
  for (const program of programs) {
    try {
      const programId = new PublicKey(program.id);
      const accountInfo = await connection.getAccountInfo(programId);
      
      if (accountInfo) {
        console.log(`✓ ${program.name}: DEPLOYED (${program.id})`);
        console.log(`  Data length: ${accountInfo.data.length} bytes`);
        console.log(`  Owner: ${accountInfo.owner.toString()}`);
      } else {
        console.log(`✗ ${program.name}: NOT FOUND (${program.id})`);
      }
    } catch (error) {
      console.log(`✗ ${program.name}: ERROR - ${error.message}`);
    }
  }
}

testProgramsExist().catch(console.error);
