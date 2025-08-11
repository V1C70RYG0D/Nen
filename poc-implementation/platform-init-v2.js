const { Connection, PublicKey, Keypair, Transaction, SystemProgram, TransactionInstruction } = require('@solana/web3.js');
const { serialize } = require('borsh');
const fs = require('fs');
const crypto = require('crypto');

// Configuration
const DEVNET_URL = "https://api.devnet.solana.com";
const BETTING_PROGRAM_ID = new PublicKey('C8uJ3ABMU87GjcB8moR1jiiAgYnFUDR17DBfiQE4eUcz');

// Platform configuration
const PLATFORM_CONFIG = {
    admin: null, // Will be set to keypair public key
    minimum_deposit: 100000000, // 0.1 SOL in lamports
    maximum_deposit: 100000000000, // 100 SOL in lamports  
    platform_fee_bps: 250 // 2.5% (250 basis points)
};

// Derive platform PDA
function derivePlatformPDA() {
    const [pda, bump] = PublicKey.findProgramAddressSync(
        [Buffer.from("betting_platform")],
        BETTING_PROGRAM_ID
    );
    return { pda, bump };
}

// Create Anchor instruction discriminator
function createInstructionDiscriminator(instructionName) {
    return crypto.createHash('sha256')
        .update(`global:${instructionName}`)
        .digest()
        .slice(0, 8);
}

// Serialize instruction data for initialize_betting_platform
function serializeInitializePlatformData(admin, minimumDeposit, maximumDeposit, platformFeeBps) {
    const discriminator = createInstructionDiscriminator('initialize_betting_platform');
    
    // Create buffer for the data
    // discriminator (8) + admin (32) + min_deposit (8) + max_deposit (8) + fee_bps (2)
    const buffer = Buffer.alloc(8 + 32 + 8 + 8 + 2);
    let offset = 0;
    
    // Write discriminator
    discriminator.copy(buffer, offset);
    offset += 8;
    
    // Write admin pubkey
    admin.toBuffer().copy(buffer, offset);
    offset += 32;
    
    // Write minimum_deposit (little endian u64)
    buffer.writeBigUInt64LE(BigInt(minimumDeposit), offset);
    offset += 8;
    
    // Write maximum_deposit (little endian u64)  
    buffer.writeBigUInt64LE(BigInt(maximumDeposit), offset);
    offset += 8;
    
    // Write platform_fee_bps (little endian u16)
    buffer.writeUInt16LE(platformFeeBps, offset);
    
    return buffer;
}

async function initializePlatform() {
    console.log('🚀 Starting platform initialization...');
    
    const connection = new Connection(DEVNET_URL, 'confirmed');
    
    // Load keypair
    let payerKeypair;
    try {
        const keypairData = JSON.parse(fs.readFileSync('/workspaces/Nen/poc-implementation/smart-contracts/config/deployment/magicblock-keypair.json', 'utf8'));
        payerKeypair = Keypair.fromSecretKey(new Uint8Array(keypairData));
        console.log(`✅ Loaded payer keypair: ${payerKeypair.publicKey.toBase58()}`);
        
        // Set admin to the keypair
        PLATFORM_CONFIG.admin = payerKeypair.publicKey;
    } catch (error) {
        console.error('❌ Failed to load keypair:', error.message);
        return;
    }

    // Check and fund account if needed
    const balance = await connection.getBalance(payerKeypair.publicKey);
    console.log(`💰 Current balance: ${balance / 1e9} SOL`);
    
    if (balance < 1e8) { // Less than 0.1 SOL
        console.log('💸 Balance too low, requesting airdrop...');
        try {
            const airdropSignature = await connection.requestAirdrop(payerKeypair.publicKey, 1e9); // 1 SOL
            await connection.confirmTransaction(airdropSignature, 'confirmed');
            const newBalance = await connection.getBalance(payerKeypair.publicKey);
            console.log(`✅ Airdrop successful! New balance: ${newBalance / 1e9} SOL`);
        } catch (error) {
            console.error('❌ Airdrop failed:', error.message);
        }
    }

    // Derive platform PDA
    const { pda: platformPDA, bump } = derivePlatformPDA();
    console.log(`📋 Platform PDA: ${platformPDA.toBase58()}`);
    console.log(`📋 Platform Bump: ${bump}`);
    
    // Check if already initialized
    const platformInfo = await connection.getAccountInfo(platformPDA);
    if (platformInfo) {
        console.log('✅ Platform already initialized!');
        console.log(`   Owner: ${platformInfo.owner.toBase58()}`);
        console.log(`   Data length: ${platformInfo.data.length}`);
        return;
    }
    
    console.log('❌ Platform not initialized - proceeding with initialization...');
    
    // Create instruction data
    const instructionData = serializeInitializePlatformData(
        PLATFORM_CONFIG.admin,
        PLATFORM_CONFIG.minimum_deposit,
        PLATFORM_CONFIG.maximum_deposit,
        PLATFORM_CONFIG.platform_fee_bps
    );
    
    console.log('📋 Platform Configuration:');
    console.log(`   Admin: ${PLATFORM_CONFIG.admin.toBase58()}`);
    console.log(`   Min Deposit: ${PLATFORM_CONFIG.minimum_deposit / 1e9} SOL`);
    console.log(`   Max Deposit: ${PLATFORM_CONFIG.maximum_deposit / 1e9} SOL`);
    console.log(`   Platform Fee: ${PLATFORM_CONFIG.platform_fee_bps / 100}%`);
    
    // Create initialization instruction
    const initInstruction = new TransactionInstruction({
        keys: [
            { pubkey: platformPDA, isSigner: false, isWritable: true },
            { pubkey: payerKeypair.publicKey, isSigner: true, isWritable: true },
            { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        ],
        programId: BETTING_PROGRAM_ID,
        data: instructionData
    });
    
    // Create and send transaction
    const transaction = new Transaction().add(initInstruction);
    transaction.feePayer = payerKeypair.publicKey;
    
    try {
        const { blockhash } = await connection.getLatestBlockhash();
        transaction.recentBlockhash = blockhash;
        
        console.log('📝 Signing transaction...');
        transaction.sign(payerKeypair);
        
        console.log('📡 Sending transaction...');
        const signature = await connection.sendRawTransaction(transaction.serialize());
        
        console.log(`🔄 Transaction sent: ${signature}`);
        console.log('⏳ Waiting for confirmation...');
        
        const confirmation = await connection.confirmTransaction(signature, 'confirmed');
        
        if (confirmation.value.err) {
            console.error('❌ Transaction failed:', confirmation.value.err);
        } else {
            console.log('✅ Platform initialization successful!');
            console.log(`🔗 Transaction: https://explorer.solana.com/tx/${signature}?cluster=devnet`);
            
            // Verify initialization
            const platformInfoAfter = await connection.getAccountInfo(platformPDA);
            if (platformInfoAfter) {
                console.log('✅ Platform PDA created successfully!');
                console.log(`   Owner: ${platformInfoAfter.owner.toBase58()}`);
                console.log(`   Data length: ${platformInfoAfter.data.length}`);
            }
        }
        
    } catch (error) {
        console.error('❌ Failed to initialize platform:', error);
        
        // If it's a program error, try to decode it
        if (error.logs) {
            console.log('\n📋 Transaction logs:');
            error.logs.forEach(log => console.log(`   ${log}`));
        }
    }
}

// Enhanced verification function
async function verifyPlatformStatus() {
    console.log('\n🔍 Verifying platform status...');
    
    const connection = new Connection(DEVNET_URL, 'confirmed');
    const { pda: platformPDA } = derivePlatformPDA();
    const platformInfo = await connection.getAccountInfo(platformPDA);
    
    if (platformInfo) {
        console.log('✅ Platform is initialized');
        console.log(`   PDA: ${platformPDA.toBase58()}`);
        console.log(`   Owner: ${platformInfo.owner.toBase58()}`);
        console.log(`   Data length: ${platformInfo.data.length} bytes`);
        console.log(`   Lamports: ${platformInfo.lamports}`);
        
        // Check if owner matches our program
        if (platformInfo.owner.equals(BETTING_PROGRAM_ID)) {
            console.log('✅ Platform owned by correct program');
        } else {
            console.log('❌ Platform owned by wrong program!');
        }
        
        return true;
    } else {
        console.log('❌ Platform not initialized');
        return false;
    }
}

async function main() {
    console.log('🎯 Platform Initialization Tool v2');
    console.log('====================================');
    
    // First check status
    const isInitialized = await verifyPlatformStatus();
    
    if (!isInitialized) {
        await initializePlatform();
        await verifyPlatformStatus();
    }
    
    console.log('\n🎉 Platform initialization process complete!');
}

main().catch(console.error);
