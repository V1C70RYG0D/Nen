# Toolchain Issues - Nen Anchor Programs

## Overview
This document logs the build and deployment issues encountered with the Nen Anchor programs and provides reproduction steps for debugging.

## Issues Encountered

### 1. GLIBC Compatibility Issue
**Error**: 
```
/lib/x86_64-linux-gnu/libm.so.6: version `GLIBC_2.38' not found
/lib/x86_64-linux-gnu/libc.so.6: version `GLIBC_2.39' not found
```

**Root Cause**: Anchor CLI binary was compiled with newer GLIBC version than available on Ubuntu system

**Impact**: Prevents `anchor build`, `anchor test`, and `anchor deploy` commands from working

**Reproduction Steps**:
1. Install Anchor CLI via npm or avm
2. Run `anchor --version` 
3. Observe GLIBC version error

### 2. Cargo.lock Version 4 Compatibility
**Error**:
```
error: failed to parse lock file at: /home/ubuntu/Nen/poc-implementation/smart-contracts/Cargo.lock
Caused by: lock file version 4 requires `-Znext-lockfile-bump`
```

**Root Cause**: Cargo.lock was generated with Rust 1.80+ which uses lockfile format version 4, but current Rust toolchain doesn't support it

**Impact**: Prevents `cargo build-sbf` and compilation of Solana programs

**Reproduction Steps**:
1. Navigate to smart-contracts directory
2. Run `cargo build-sbf`
3. Observe lockfile version error

## Environment Details
- **OS**: Ubuntu (GLIBC version incompatible with Anchor CLI)
- **Rust Version**: 1.89.0
- **Cargo Version**: 1.89.0
- **Solana CLI**: Working (2 SOL balance available)
- **Node.js**: v22.12.0

## Workarounds Implemented

### 1. Direct Solana CLI Deployment
- Used `solana program deploy` instead of `anchor deploy`
- Successfully deployed 3 out of 4 programs to devnet
- Programs verified as executable on devnet

### 2. Alternative Testing with @solana/web3.js
- Created `test-nen-betting-web3.js` for direct program testing
- Bypasses anchor test framework
- Tests deployed programs directly via RPC calls

### 3. Manual Program Verification
- Used `solana program show <program_id>` to verify deployments
- Confirmed program accounts exist and are executable
- Validated program data lengths and ownership

## Suggested Fixes

### Option 1: Downgrade Toolchain
```bash
# Downgrade Solana CLI to compatible version
solana-install init 1.18.8

# Pin Rust to pre-lockfile v4
rustup override set 1.79.0

# Clean and regenerate Cargo.lock
rm Cargo.lock
cargo update
```

### Option 2: Docker Environment
```dockerfile
FROM ubuntu:22.04
RUN apt-get update && apt-get install -y curl build-essential
# Install compatible Solana CLI and Anchor versions
RUN sh -c "$(curl -sSfL https://release.solana.com/v1.18.8/install)"
RUN npm install -g @coral-xyz/anchor-cli@0.30.1
```

### Option 3: Manual Compilation
```bash
# Use solana-program-library tools
cargo build-bpf --manifest-path programs/nen-marketplace/Cargo.toml
solana program deploy target/deploy/nen_marketplace.so
```

## Current Status
- **nen-core**: ✅ Deployed (Program ID: Xs4PKxWNyY1C7i5bdqMh5tNhwPbDbxMXf4YcJAreJcF)
- **nen-betting**: ✅ Deployed (Program ID: 34RNydfkFZmhvUupbW1qHBG5LmASc6zeS3tuUsw6PwC5)
- **nen-magicblock**: ✅ Deployed (Program ID: AhGXiWjzKjd8T7J3FccYk51y4D97jGkZ7d7NJfmb3aFX)
- **nen-marketplace**: ⚠️ Deployment blocked by build issues

## Community Resources
- [Anchor Release Notes v0.31.0](https://www.anchor-lang.com/docs/updates/release-notes/0-31-0)
- [Solana Program Library](https://github.com/solana-labs/solana-program-library)
- [Solana Discord #anchor-support](https://discord.gg/solana)

## Next Steps
1. Try toolchain downgrade approach
2. If unsuccessful, use Docker environment for clean build
3. Consider manual compilation as fallback
4. Document any successful resolution for future reference
