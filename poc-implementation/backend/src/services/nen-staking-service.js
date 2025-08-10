/**
 * $NEN Token Staking Service
 * Implements staking validation for training priority on Solana devnet
 * 
 * Environment Variables:
 * - NEN_TOKEN_MINT_ADDRESS: The $NEN token mint address on devnet
 * - MIN_STAKE_FOR_PRIORITY: Minimum $NEN tokens required for priority training
 * - SOLANA_RPC_URL: Devnet RPC endpoint
 * - COMMITMENT: Transaction commitment level
 */

const { Connection, PublicKey } = require('@solana/web3.js');
const { TOKEN_PROGRAM_ID, getAssociatedTokenAddress } = require('@solana/spl-token');

class NENStakingService {
  constructor() {
    this.connection = new Connection(
      process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com',
      process.env.COMMITMENT || 'confirmed'
    );
    
    // Default to a devnet test token mint if not configured
    this.nenTokenMint = process.env.NEN_TOKEN_MINT_ADDRESS 
      ? new PublicKey(process.env.NEN_TOKEN_MINT_ADDRESS)
      : null;
    
    this.minStakeForPriority = parseFloat(process.env.MIN_STAKE_FOR_PRIORITY || '100'); // 100 $NEN minimum
    
    console.log('NEN Staking Service initialized');
    console.log('- Token Mint:', this.nenTokenMint?.toString() || 'Not configured');
    console.log('- Min Stake for Priority:', this.minStakeForPriority, '$NEN');
    console.log('- RPC:', this.connection.rpcEndpoint);
  }

  /**
   * Check if user has sufficient $NEN staked for priority training
   */
  async validateStakedNEN(walletAddress) {
    try {
      if (!this.nenTokenMint) {
        console.log('$NEN token mint not configured - skipping stake validation');
        return {
          hasMinimumStake: false,
          stakedAmount: 0,
          priority: 'normal',
          reason: 'NEN token not deployed'
        };
      }

      const userPublicKey = new PublicKey(walletAddress);
      
      // Get user's $NEN token account
      const userTokenAccount = await getAssociatedTokenAddress(
        this.nenTokenMint,
        userPublicKey
      );

      // Check if token account exists and get balance
      const accountInfo = await this.connection.getParsedAccountInfo(userTokenAccount);
      
      if (!accountInfo.value) {
        return {
          hasMinimumStake: false,
          stakedAmount: 0,
          priority: 'normal',
          reason: 'No NEN token account found'
        };
      }

      const tokenAmount = accountInfo.value.data.parsed.info.tokenAmount;
      const stakedAmount = parseFloat(tokenAmount.uiAmount || '0');

      const hasMinimumStake = stakedAmount >= this.minStakeForPriority;
      
      // Determine priority based on stake amount
      let priority = 'normal';
      if (stakedAmount >= this.minStakeForPriority * 10) {
        priority = 'highest';
      } else if (stakedAmount >= this.minStakeForPriority * 5) {
        priority = 'high';
      } else if (stakedAmount >= this.minStakeForPriority) {
        priority = 'medium';
      }

      return {
        hasMinimumStake,
        stakedAmount,
        priority,
        tokenAccount: userTokenAccount.toString(),
        reason: hasMinimumStake ? 'Sufficient stake' : 'Insufficient stake'
      };

    } catch (error) {
      console.error('Error validating NEN stake:', error.message);
      return {
        hasMinimumStake: false,
        stakedAmount: 0,
        priority: 'normal',
        reason: `Error: ${error.message}`
      };
    }
  }

  /**
   * Get training queue position based on stake amount
   */
  async getTrainingQueuePosition(walletAddress, sessionId) {
    const stakeInfo = await this.validateStakedNEN(walletAddress);
    
    // Priority levels (higher number = higher priority)
    const priorityWeights = {
      'highest': 1000,
      'high': 100,
      'medium': 10,
      'normal': 1
    };

    const weight = priorityWeights[stakeInfo.priority] || 1;
    const timestamp = Date.now();
    
    // Queue position calculation: higher stake = lower position number (earlier in queue)
    const queuePosition = Math.floor(timestamp / weight);

    return {
      sessionId,
      priority: stakeInfo.priority,
      queuePosition,
      estimatedWaitTime: this.calculateWaitTime(stakeInfo.priority),
      stakeInfo
    };
  }

  /**
   * Calculate estimated wait time based on priority
   */
  calculateWaitTime(priority) {
    const baseTimes = {
      'highest': 5,    // 5 minutes
      'high': 15,      // 15 minutes  
      'medium': 30,    // 30 minutes
      'normal': 60     // 60 minutes
    };

    return baseTimes[priority] || 60;
  }

  /**
   * Deploy a test $NEN token for development (devnet only)
   */
  async deployTestNENToken(payerKeypair) {
    if (this.connection.rpcEndpoint.includes('mainnet')) {
      throw new Error('Test token deployment only allowed on devnet');
    }

    try {
      const { createMint, getOrCreateAssociatedTokenAccount, mintTo } = require('@solana/spl-token');
      
      console.log('Deploying test $NEN token on devnet...');
      
      // Create mint with 9 decimals (standard for tokens)
      const mint = await createMint(
        this.connection,
        payerKeypair,
        payerKeypair.publicKey, // mint authority
        payerKeypair.publicKey, // freeze authority
        9 // decimals
      );

      console.log('Test $NEN token mint created:', mint.toString());
      
      // Create token account for payer and mint some test tokens
      const tokenAccount = await getOrCreateAssociatedTokenAccount(
        this.connection,
        payerKeypair,
        mint,
        payerKeypair.publicKey
      );

      // Mint 1 million test $NEN tokens
      await mintTo(
        this.connection,
        payerKeypair,
        mint,
        tokenAccount.address,
        payerKeypair.publicKey,
        1_000_000 * 10**9 // 1M tokens with 9 decimals
      );

      console.log('Minted 1,000,000 test $NEN tokens to:', tokenAccount.address.toString());
      
      return {
        mint: mint.toString(),
        tokenAccount: tokenAccount.address.toString(),
        explorerUrl: `https://explorer.solana.com/address/${mint.toString()}?cluster=devnet`
      };

    } catch (error) {
      console.error('Error deploying test $NEN token:', error.message);
      throw error;
    }
  }

  /**
   * Check if $NEN token is deployed and accessible
   */
  async checkTokenDeployment() {
    if (!this.nenTokenMint) {
      return {
        deployed: false,
        reason: 'NEN_TOKEN_MINT_ADDRESS not configured'
      };
    }

    try {
      const mintInfo = await this.connection.getParsedAccountInfo(this.nenTokenMint);
      
      if (!mintInfo.value) {
        return {
          deployed: false,
          reason: 'Token mint account not found on devnet'
        };
      }

      const mintData = mintInfo.value.data.parsed.info;
      
      return {
        deployed: true,
        mintAddress: this.nenTokenMint.toString(),
        decimals: mintData.decimals,
        supply: mintData.supply,
        mintAuthority: mintData.mintAuthority,
        explorerUrl: `https://explorer.solana.com/address/${this.nenTokenMint.toString()}?cluster=devnet`
      };

    } catch (error) {
      return {
        deployed: false,
        reason: `Error checking deployment: ${error.message}`
      };
    }
  }
}

module.exports = {
  NENStakingService
};
