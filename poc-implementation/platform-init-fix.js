const { Connection, PublicKey, Keypair, Transaction, SystemProgram, TransactionInstruction } = require('@solana/web3.js');
const fs = require('fs');

// Configuration
const DEVNET_URL = "https://api.devnet.solana.com";
const BETTING_PROGRAM_ID = new PublicKey('C8uJ3ABMU87GjcB8moR1jiiAgYnFUDR17DBfiQE4eUcz');

// Hardcoded platform PDA (derived deterministically)
const PLATFORM_SEED = "betting_platform";
const PLATFORM_PDA = new PublicKey('7aFXYxdFcXjakzEH3Ev9Z7DD9W3GX3JJn32xzwh58zHf');

async function initializePlatform() {
    console.log('🚀 Starting platform initialization...');
    
    const connection = new Connection(DEVNET_URL, 'confirmed');
    
    // Load keypair from magicblock-keypair.json
    let payerKeypair;
    try {
        const keypairData = JSON.parse(fs.readFileSync('/workspaces/Nen/poc-implementation/smart-contracts/config/deployment/magicblock-keypair.json', 'utf8'));
        payerKeypair = Keypair.fromSecretKey(new Uint8Array(keypairData));
        console.log(`✅ Loaded payer keypair: ${payerKeypair.publicKey.toBase58()}`);
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
    console.log(`\n📋 Checking platform PDA: ${PLATFORM_PDA.toBase58()}`);
    const platformInfo = await connection.getAccountInfo(PLATFORM_PDA);
    
    if (platformInfo) {
        console.log('✅ Platform already initialized!');
        console.log(`   Owner: ${platformInfo.owner.toBase58()}`);
        console.log(`   Data length: ${platformInfo.data.length}`);
        return;
    }
    
    console.log('❌ Platform not initialized - proceeding with initialization...');
    
    // Create initialization instruction
    // Based on the Rust program, initialize_platform takes no arguments
    const initInstruction = new TransactionInstruction({
        keys: [
            { pubkey: PLATFORM_PDA, isSigner: false, isWritable: true },
            { pubkey: payerKeypair.publicKey, isSigner: true, isWritable: true },
            { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        ],
        programId: BETTING_PROGRAM_ID,
        data: Buffer.from([0]) // instruction discriminator for initialize_platform
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
            const platformInfoAfter = await connection.getAccountInfo(PLATFORM_PDA);
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
    const platformInfo = await connection.getAccountInfo(PLATFORM_PDA);
    
    if (platformInfo) {
        console.log('✅ Platform is initialized');
        console.log(`   PDA: ${PLATFORM_PDA.toBase58()}`);
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
    console.log('🎯 Platform Initialization Tool');
    console.log('================================');
    
    // First check status
    const isInitialized = await verifyPlatformStatus();
    
    if (!isInitialized) {
        await initializePlatform();
        await verifyPlatformStatus();
    }
    
    console.log('\n🎉 Platform initialization process complete!');
}

main().catch(console.error);
