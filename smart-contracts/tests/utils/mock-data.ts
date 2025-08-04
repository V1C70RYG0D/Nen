/**
 * Mock Data Generators for Smart Contract Testing

 */

import { PublicKey, Keypair, LAMPORTS_PER_SOL } from "@solana/web3.js";
import BN from "bn.js";
import crypto from "crypto";

// Seed for reproducible test data (GI #8: Extensive testing)
const MOCK_DATA_SEED = process.env.MOCK_DATA_SEED || "nen-test-seed-2025";

/**
 * Deterministic random number generator for consistent test data
 * GI #17: Generalize for reusability
 */
class SeededRandom {
    private seed: number;

    constructor(seed: string) {
        this.seed = this.hashString(seed);
    }

    private hashString(str: string): number {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return Math.abs(hash);
    }

    next(): number {
        this.seed = (this.seed * 9301 + 49297) % 233280;
        return this.seed / 233280;
    }

    nextInt(max: number): number {
        return Math.floor(this.next() * max);
    }

    nextBN(max: BN): BN {
        const rand = this.next();
        return max.muln(rand);
    }
}

/**
 * Enhanced Platform Configuration Mock Data
 * GI #2: Real implementations over simulations
 */
export class PlatformMockData {
    private static rng = new SeededRandom(MOCK_DATA_SEED);

    /**
     * Generate realistic platform initialization data
     * GI #45: Handle edge cases and robust testing
     */
    static generatePlatformConfig(options: {
        useEdgeCases?: boolean;
        feeVariation?: boolean;
    } = {}): {
        adminAuthority: PublicKey;
        platformFeePercentage: number;
        treasuryAddress: PublicKey;
        emergencyAddress: PublicKey;
        maxBetAmount: BN;
        minBetAmount: BN;
    } {
        const { useEdgeCases = false, feeVariation = false } = options;

        let platformFeePercentage = 250; // 2.5% default
        if (feeVariation) {
            // Test various fee levels: 0%, 1%, 2.5%, 5%, 10%
            const feeOptions = [0, 100, 250, 500, 1000];
            platformFeePercentage = feeOptions[this.rng.nextInt(feeOptions.length)];
        }

        let maxBetAmount = new BN(10).mul(new BN(LAMPORTS_PER_SOL)); // 10 SOL default
        let minBetAmount = new BN(0.01 * LAMPORTS_PER_SOL); // 0.01 SOL default

        if (useEdgeCases) {
            // Test edge cases: very small and very large amounts
            const edgeCases = [
                { max: new BN(1), min: new BN(1) }, // Minimum possible
                { max: new BN(LAMPORTS_PER_SOL), min: new BN(0.001 * LAMPORTS_PER_SOL) }, // Standard small
                { max: new BN(1000).mul(new BN(LAMPORTS_PER_SOL)), min: new BN(1).mul(new BN(LAMPORTS_PER_SOL)) }, // Large amounts
            ];
            const edgeCase = edgeCases[this.rng.nextInt(edgeCases.length)];
            maxBetAmount = edgeCase.max;
            minBetAmount = edgeCase.min;
        }

        return {
            adminAuthority: Keypair.generate().publicKey,
            platformFeePercentage,
            treasuryAddress: Keypair.generate().publicKey,
            emergencyAddress: Keypair.generate().publicKey,
            maxBetAmount,
            minBetAmount,
        };
    }

    /**
     * Generate platform state variations for comprehensive testing
     * GI #17: Generalize for reusability
     */
    static generatePlatformStates(): Array<{
        isActive: boolean;
        isPaused: boolean;
        maintenanceMode: boolean;
        totalMatches: number;
        totalBets: number;
        totalVolume: BN;
        scenario: string;
    }> {
        return [
            {
                isActive: true,
                isPaused: false,
                maintenanceMode: false,
                totalMatches: 0,
                totalBets: 0,
                totalVolume: new BN(0),
                scenario: "fresh_platform",
            },
            {
                isActive: true,
                isPaused: false,
                maintenanceMode: false,
                totalMatches: 100,
                totalBets: 1500,
                totalVolume: new BN(50).mul(new BN(LAMPORTS_PER_SOL)),
                scenario: "active_platform",
            },
            {
                isActive: false,
                isPaused: true,
                maintenanceMode: true,
                totalMatches: 250,
                totalBets: 5000,
                totalVolume: new BN(200).mul(new BN(LAMPORTS_PER_SOL)),
                scenario: "maintenance_mode",
            },
            {
                isActive: true,
                isPaused: false,
                maintenanceMode: false,
                totalMatches: 10000,
                totalBets: 150000,
                totalVolume: new BN(5000).mul(new BN(LAMPORTS_PER_SOL)),
                scenario: "high_volume_platform",
            },
            {
                isActive: false,
                isPaused: false,
                maintenanceMode: false,
                totalMatches: 50,
                totalBets: 100,
                totalVolume: new BN(5).mul(new BN(LAMPORTS_PER_SOL)),
                scenario: "disabled_platform",
            },
        ];
    }

    /**
     * Generate stress test scenarios
     * GI #25: Design for scalability and extensibility
     */
    static generateStressTestScenarios(): Array<{
        name: string;
        userCount: number;
        transactionRate: number; // tx/second
        duration: number; // seconds
        betSizeRange: { min: BN; max: BN };
    }> {
        return [
            {
                name: "light_load",
                userCount: 10,
                transactionRate: 5,
                duration: 60,
                betSizeRange: {
                    min: new BN(0.1 * LAMPORTS_PER_SOL),
                    max: new BN(1 * LAMPORTS_PER_SOL)
                }
            },
            {
                name: "moderate_load",
                userCount: 100,
                transactionRate: 50,
                duration: 120,
                betSizeRange: {
                    min: new BN(0.01 * LAMPORTS_PER_SOL),
                    max: new BN(5 * LAMPORTS_PER_SOL)
                }
            },
            {
                name: "heavy_load",
                userCount: 1000,
                transactionRate: 200,
                duration: 300,
                betSizeRange: {
                    min: new BN(0.001 * LAMPORTS_PER_SOL),
                    max: new BN(10 * LAMPORTS_PER_SOL)
                }
            },
            {
                name: "burst_load",
                userCount: 500,
                transactionRate: 1000,
                duration: 30,
                betSizeRange: {
                    min: new BN(0.01 * LAMPORTS_PER_SOL),
                    max: new BN(2 * LAMPORTS_PER_SOL)
                }
            }
        ];
    }
}

/**
 * User Account Mock Data
 * GI #17: Generalize for reusability
 */
export class UserMockData {
    /**
     * Generate diverse user profiles for testing
     */
    static generateUserProfiles(): Array<{
        authority: PublicKey;
        kycLevel: number;
        complianceFlags: number;
        reputationScore: BN;
        totalWagered: BN;
        totalWon: BN;
        matchesPlayed: number;
        isBlacklisted: boolean;
        createdAt: BN;
    }> {
        const now = new BN(Date.now() / 1000);

        return [
            // New user
            {
                authority: Keypair.generate().publicKey,
                kycLevel: 1,
                complianceFlags: 0,
                reputationScore: new BN(100),
                totalWagered: new BN(0),
                totalWon: new BN(0),
                matchesPlayed: 0,
                isBlacklisted: false,
                createdAt: now,
            },
            // Experienced user
            {
                authority: Keypair.generate().publicKey,
                kycLevel: 2,
                complianceFlags: 1, // Verified email
                reputationScore: new BN(750),
                totalWagered: new BN(10).mul(new BN(LAMPORTS_PER_SOL)),
                totalWon: new BN(8).mul(new BN(LAMPORTS_PER_SOL)),
                matchesPlayed: 50,
                isBlacklisted: false,
                createdAt: now.sub(new BN(86400 * 30)), // 30 days ago
            },
            // Premium user
            {
                authority: Keypair.generate().publicKey,
                kycLevel: 3,
                complianceFlags: 7, // All verifications
                reputationScore: new BN(950),
                totalWagered: new BN(100).mul(new BN(LAMPORTS_PER_SOL)),
                totalWon: new BN(120).mul(new BN(LAMPORTS_PER_SOL)),
                matchesPlayed: 200,
                isBlacklisted: false,
                createdAt: now.sub(new BN(86400 * 90)), // 90 days ago
            },
            // Blacklisted user
            {
                authority: Keypair.generate().publicKey,
                kycLevel: 1,
                complianceFlags: 0,
                reputationScore: new BN(0),
                totalWagered: new BN(5).mul(new BN(LAMPORTS_PER_SOL)),
                totalWon: new BN(0),
                matchesPlayed: 10,
                isBlacklisted: true,
                createdAt: now.sub(new BN(86400 * 7)), // 7 days ago
            },
        ];
    }

    /**
     * Generate KYC test cases
     */
    static generateKycTestCases(): Array<{
        level: number;
        description: string;
        expectedCapabilities: string[];
        maxBetAmount: BN;
    }> {
        return [
            {
                level: 1,
                description: "Basic KYC - Email verification only",
                expectedCapabilities: ["place_small_bets", "view_matches"],
                maxBetAmount: new BN(0.1).mul(new BN(LAMPORTS_PER_SOL)),
            },
            {
                level: 2,
                description: "Verified KYC - ID verification completed",
                expectedCapabilities: ["place_medium_bets", "create_matches", "withdraw_funds"],
                maxBetAmount: new BN(1).mul(new BN(LAMPORTS_PER_SOL)),
            },
            {
                level: 3,
                description: "Premium KYC - Full verification with income proof",
                expectedCapabilities: ["place_large_bets", "vip_features", "priority_support"],
                maxBetAmount: new BN(10).mul(new BN(LAMPORTS_PER_SOL)),
            },
        ];
    }
}

/**
 * Match and Betting Mock Data
 * GI #45: Handle edge cases and robust testing
 */
export class MatchMockData {
    /**
     * Generate comprehensive match scenarios
     */
    static generateMatchScenarios(): Array<{
        matchId: string;
        agent1Id: PublicKey;
        agent2Id: PublicKey;
        matchType: number;
        entryFee: BN;
        maxParticipants: number;
        duration: BN;
        status: number;
        startTime: BN;
        endTime: BN;
        poolAgent1: BN;
        poolAgent2: BN;
        totalBets: number;
        winnerAgent: number;
    }> {
        const now = new BN(Date.now() / 1000);

        return [
            // Upcoming match
            {
                matchId: "match_001",
                agent1Id: Keypair.generate().publicKey,
                agent2Id: Keypair.generate().publicKey,
                matchType: 1, // Standard match
                entryFee: new BN(0.1).mul(new BN(LAMPORTS_PER_SOL)),
                maxParticipants: 100,
                duration: new BN(1800), // 30 minutes
                status: 0, // Created
                startTime: now.add(new BN(3600)), // Starts in 1 hour
                endTime: now.add(new BN(5400)), // Ends in 1.5 hours
                poolAgent1: new BN(0),
                poolAgent2: new BN(0),
                totalBets: 0,
                winnerAgent: 0, // No winner yet
            },
            // Active match with betting
            {
                matchId: "match_002",
                agent1Id: Keypair.generate().publicKey,
                agent2Id: Keypair.generate().publicKey,
                matchType: 1,
                entryFee: new BN(0.5).mul(new BN(LAMPORTS_PER_SOL)),
                maxParticipants: 50,
                duration: new BN(3600), // 1 hour
                status: 1, // Active
                startTime: now.sub(new BN(600)), // Started 10 minutes ago
                endTime: now.add(new BN(3000)), // Ends in 50 minutes
                poolAgent1: new BN(15).mul(new BN(LAMPORTS_PER_SOL)),
                poolAgent2: new BN(10).mul(new BN(LAMPORTS_PER_SOL)),
                totalBets: 50,
                winnerAgent: 0, // No winner yet
            },
            // Completed match
            {
                matchId: "match_003",
                agent1Id: Keypair.generate().publicKey,
                agent2Id: Keypair.generate().publicKey,
                matchType: 2, // Tournament match
                entryFee: new BN(1).mul(new BN(LAMPORTS_PER_SOL)),
                maxParticipants: 20,
                duration: new BN(2400), // 40 minutes
                status: 2, // Completed
                startTime: now.sub(new BN(3600)), // Started 1 hour ago
                endTime: now.sub(new BN(1200)), // Ended 20 minutes ago
                poolAgent1: new BN(12).mul(new BN(LAMPORTS_PER_SOL)),
                poolAgent2: new BN(8).mul(new BN(LAMPORTS_PER_SOL)),
                totalBets: 20,
                winnerAgent: 1, // Agent 1 won
            },
            // Cancelled match
            {
                matchId: "match_004",
                agent1Id: Keypair.generate().publicKey,
                agent2Id: Keypair.generate().publicKey,
                matchType: 1,
                entryFee: new BN(0.2).mul(new BN(LAMPORTS_PER_SOL)),
                maxParticipants: 30,
                duration: new BN(1800),
                status: 3, // Cancelled
                startTime: now.add(new BN(1800)),
                endTime: now.add(new BN(3600)),
                poolAgent1: new BN(2).mul(new BN(LAMPORTS_PER_SOL)),
                poolAgent2: new BN(1).mul(new BN(LAMPORTS_PER_SOL)),
                totalBets: 15,
                winnerAgent: 0, // No winner
            },
        ];
    }

    /**
     * Generate betting patterns for testing
     */
    static generateBettingPatterns(): Array<{
        bettor: PublicKey;
        matchId: string;
        agentChoice: number;
        amount: BN;
        odds: number;
        timestamp: BN;
        status: number;
        potentialWinnings: BN;
    }> {
        const now = new BN(Date.now() / 1000);

        return [
            // Small bet on favorite
            {
                bettor: Keypair.generate().publicKey,
                matchId: "match_002",
                agentChoice: 1,
                amount: new BN(0.1).mul(new BN(LAMPORTS_PER_SOL)),
                odds: 150, // 1.5x
                timestamp: now.sub(new BN(300)),
                status: 0, // Active
                potentialWinnings: new BN(0.15).mul(new BN(LAMPORTS_PER_SOL)),
            },
            // Large bet on underdog
            {
                bettor: Keypair.generate().publicKey,
                matchId: "match_002",
                agentChoice: 2,
                amount: new BN(2).mul(new BN(LAMPORTS_PER_SOL)),
                odds: 300, // 3x
                timestamp: now.sub(new BN(600)),
                status: 0, // Active
                potentialWinnings: new BN(6).mul(new BN(LAMPORTS_PER_SOL)),
            },
            // Won bet
            {
                bettor: Keypair.generate().publicKey,
                matchId: "match_003",
                agentChoice: 1,
                amount: new BN(0.5).mul(new BN(LAMPORTS_PER_SOL)),
                odds: 200, // 2x
                timestamp: now.sub(new BN(4000)),
                status: 1, // Won
                potentialWinnings: new BN(1).mul(new BN(LAMPORTS_PER_SOL)),
            },
            // Lost bet
            {
                bettor: Keypair.generate().publicKey,
                matchId: "match_003",
                agentChoice: 2,
                amount: new BN(1).mul(new BN(LAMPORTS_PER_SOL)),
                odds: 180, // 1.8x
                timestamp: now.sub(new BN(3800)),
                status: 2, // Lost
                potentialWinnings: new BN(0),
            },
        ];
    }
}

/**
 * AI Agent Mock Data
 * GI #12: Real-time updates and data
 */
export class AgentMockData {
    /**
     * Generate AI agent profiles
     */
    static generateAgentProfiles(): Array<{
        agentId: PublicKey;
        name: string;
        description: string;
        owner: PublicKey;
        aiModel: string;
        traits: number[];
        winRate: number;
        totalMatches: number;
        reputation: BN;
        mintPrice: BN;
        royaltyPercentage: number;
        isActive: boolean;
        metadataUri: string;
    }> {
        return [
            {
                agentId: Keypair.generate().publicKey,
                name: "Lightning Strategist",
                description: "Aggressive AI with lightning-fast decision making",
                owner: Keypair.generate().publicKey,
                aiModel: "GPT-4-TURBO",
                traits: [85, 92, 78, 90, 88], // Strategy, Speed, Aggression, Defense, Adaptability
                winRate: 72.5,
                totalMatches: 150,
                reputation: new BN(850),
                mintPrice: new BN(2).mul(new BN(LAMPORTS_PER_SOL)),
                royaltyPercentage: 500, // 5%
                isActive: true,
                metadataUri: "https://metadata.nenplatform.com/agents/lightning-strategist.json",
            },
            {
                agentId: Keypair.generate().publicKey,
                name: "Defensive Master",
                description: "Conservative playstyle with exceptional defensive capabilities",
                owner: Keypair.generate().publicKey,
                aiModel: "CLAUDE-3-OPUS",
                traits: [90, 70, 60, 95, 85],
                winRate: 68.3,
                totalMatches: 200,
                reputation: new BN(920),
                mintPrice: new BN(1.5).mul(new BN(LAMPORTS_PER_SOL)),
                royaltyPercentage: 400, // 4%
                isActive: true,
                metadataUri: "https://metadata.nenplatform.com/agents/defensive-master.json",
            },
            {
                agentId: Keypair.generate().publicKey,
                name: "Adaptive Learner",
                description: "AI that adapts its strategy based on opponent behavior",
                owner: Keypair.generate().publicKey,
                aiModel: "GEMINI-PRO",
                traits: [80, 85, 75, 80, 98],
                winRate: 75.1,
                totalMatches: 100,
                reputation: new BN(750),
                mintPrice: new BN(3).mul(new BN(LAMPORTS_PER_SOL)),
                royaltyPercentage: 600, // 6%
                isActive: true,
                metadataUri: "https://metadata.nenplatform.com/agents/adaptive-learner.json",
            },
            {
                agentId: Keypair.generate().publicKey,
                name: "Experimental Bot",
                description: "Beta AI agent for testing new strategies",
                owner: Keypair.generate().publicKey,
                aiModel: "CUSTOM-MODEL-V1",
                traits: [70, 80, 85, 70, 75],
                winRate: 45.2,
                totalMatches: 50,
                reputation: new BN(300),
                mintPrice: new BN(0.5).mul(new BN(LAMPORTS_PER_SOL)),
                royaltyPercentage: 200, // 2%
                isActive: false, // Disabled for maintenance
                metadataUri: "https://metadata.nenplatform.com/agents/experimental-bot.json",
            },
        ];
    }

    /**
     * Generate agent performance data
     */
    static generatePerformanceData(): Array<{
        agentId: PublicKey;
        matchHistory: Array<{
            matchId: string;
            opponent: PublicKey;
            result: number; // 0: loss, 1: win, 2: draw
            movesPlayed: number;
            avgMoveTime: number;
            strategiesUsed: string[];
        }>;
        statistics: {
            totalGames: number;
            wins: number;
            losses: number;
            draws: number;
            avgGameDuration: number;
            avgMovesPerGame: number;
            favoriteStrategies: string[];
        };
    }> {
        const agent1 = Keypair.generate().publicKey;
        const agent2 = Keypair.generate().publicKey;

        return [
            {
                agentId: agent1,
                matchHistory: [
                    {
                        matchId: "match_001",
                        opponent: agent2,
                        result: 1,
                        movesPlayed: 45,
                        avgMoveTime: 2.3,
                        strategiesUsed: ["opening_control", "center_dominance", "endgame_pressure"],
                    },
                    {
                        matchId: "match_002",
                        opponent: Keypair.generate().publicKey,
                        result: 0,
                        movesPlayed: 38,
                        avgMoveTime: 1.8,
                        strategiesUsed: ["defensive_play", "counter_attack"],
                    },
                ],
                statistics: {
                    totalGames: 150,
                    wins: 109,
                    losses: 35,
                    draws: 6,
                    avgGameDuration: 1845, // seconds
                    avgMovesPerGame: 42.3,
                    favoriteStrategies: ["opening_control", "center_dominance", "tactical_combinations"],
                },
            },
        ];
    }
}

/**
 * Security Test Cases
 * GI #13: Security measures and validation
 */
export class SecurityMockData {
    /**
     * Generate attack vectors for security testing
     */
    static generateAttackVectors(): Array<{
        name: string;
        description: string;
        maliciousInput: any;
        expectedBehavior: string;
        severity: "low" | "medium" | "high" | "critical";
    }> {
        return [
            {
                name: "Integer Overflow Attack",
                description: "Attempt to overflow bet amount calculation",
                maliciousInput: {
                    betAmount: new BN(2).pow(new BN(64)), // Overflow u64
                },
                expectedBehavior: "Should reject with overflow error",
                severity: "high",
            },
            {
                name: "Unauthorized Withdrawal",
                description: "Try to withdraw funds from another user's account",
                maliciousInput: {
                    victimAccount: Keypair.generate().publicKey,
                    maliciousUser: Keypair.generate().publicKey,
                    amount: new BN(LAMPORTS_PER_SOL),
                },
                expectedBehavior: "Should reject with authorization error",
                severity: "critical",
            },
            {
                name: "Reentrancy Attack",
                description: "Attempt to call vulnerable function recursively",
                maliciousInput: {
                    recursiveCallData: Buffer.from("recursive_call_payload"),
                },
                expectedBehavior: "Should have reentrancy protection",
                severity: "high",
            },
            {
                name: "Invalid KYC Bypass",
                description: "Try to place bets above KYC level limits",
                maliciousInput: {
                    kycLevel: 1,
                    betAmount: new BN(5).mul(new BN(LAMPORTS_PER_SOL)), // Above level 1 limit
                },
                expectedBehavior: "Should reject bet due to KYC restrictions",
                severity: "medium",
            },
        ];
    }

    /**
     * Generate edge case scenarios
     */
    static generateEdgeCases(): Array<{
        scenario: string;
        inputs: any;
        expectedOutcome: string;
    }> {
        return [
            {
                scenario: "Zero amount bet",
                inputs: { betAmount: new BN(0) },
                expectedOutcome: "Should reject with minimum amount error",
            },
            {
                scenario: "Bet on non-existent match",
                inputs: { matchId: "non_existent_match" },
                expectedOutcome: "Should reject with match not found error",
            },
            {
                scenario: "Bet after match ended",
                inputs: {
                    matchId: "ended_match",
                    betAmount: new BN(LAMPORTS_PER_SOL),
                    currentTime: new BN(Date.now() / 1000 + 10000), // Future timestamp
                },
                expectedOutcome: "Should reject with match ended error",
            },
            {
                scenario: "Multiple bets from same user on same match",
                inputs: {
                    user: Keypair.generate().publicKey,
                    matchId: "active_match",
                    firstBet: new BN(0.5).mul(new BN(LAMPORTS_PER_SOL)),
                    secondBet: new BN(0.3).mul(new BN(LAMPORTS_PER_SOL)),
                },
                expectedOutcome: "Should either allow or reject based on business rules",
            },
        ];
    }
}

/**
 * Performance Test Data
 * GI #21: Performance optimization and testing
 */
export class PerformanceMockData {
    /**
     * Generate load testing scenarios
     */
    static generateLoadTestScenarios(): Array<{
        name: string;
        userCount: number;
        actionsPerUser: number;
        actionTypes: string[];
        expectedThroughput: number; // TPS
        maxLatency: number; // ms
    }> {
        return [
            {
                name: "Light Load - Normal Usage",
                userCount: 10,
                actionsPerUser: 5,
                actionTypes: ["place_bet", "view_match", "check_balance"],
                expectedThroughput: 50,
                maxLatency: 500,
            },
            {
                name: "Medium Load - Peak Hours",
                userCount: 50,
                actionsPerUser: 10,
                actionTypes: ["place_bet", "create_match", "withdraw_funds", "view_match"],
                expectedThroughput: 100,
                maxLatency: 1000,
            },
            {
                name: "Heavy Load - Tournament Event",
                userCount: 200,
                actionsPerUser: 20,
                actionTypes: ["place_bet", "view_match", "check_balance"],
                expectedThroughput: 150,
                maxLatency: 2000,
            },
            {
                name: "Stress Test - System Limits",
                userCount: 500,
                actionsPerUser: 50,
                actionTypes: ["place_bet", "view_match"],
                expectedThroughput: 200,
                maxLatency: 3000,
            },
        ];
    }

    /**
     * Generate benchmark data
     */
    static generateBenchmarkData(): {
        transactionTypes: Record<string, { expectedLatency: number; maxComputeUnits: number }>;
        networkMetrics: { targetTPS: number; maxBlockTime: number };
        resourceLimits: { maxAccountsPerTx: number; maxInstructionData: number };
    } {
        return {
            transactionTypes: {
                "initialize_platform": { expectedLatency: 500, maxComputeUnits: 50000 },
                "create_user": { expectedLatency: 300, maxComputeUnits: 30000 },
                "create_match": { expectedLatency: 400, maxComputeUnits: 40000 },
                "place_bet": { expectedLatency: 200, maxComputeUnits: 25000 },
                "resolve_match": { expectedLatency: 600, maxComputeUnits: 60000 },
                "withdraw_funds": { expectedLatency: 350, maxComputeUnits: 35000 },
            },
            networkMetrics: {
                targetTPS: 100,
                maxBlockTime: 400, // ms
            },
            resourceLimits: {
                maxAccountsPerTx: 64,
                maxInstructionData: 1280, // bytes
            },
        };
    }
}

// Note: All classes are already exported with their declarations above
