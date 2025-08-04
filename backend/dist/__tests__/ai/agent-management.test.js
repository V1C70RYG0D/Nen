"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const logger_1 = require("../../utils/logger");
const TEST_CONFIG = {
    DEFAULT_AGENT_COUNT: parseInt(process.env.TEST_DEFAULT_AGENT_COUNT || '3', 10),
    DEFAULT_ELO_RATING: parseInt(process.env.TEST_DEFAULT_ELO_RATING || '1200', 10),
    ELO_RATING_RANGES: {
        easy: { min: 800, max: 1200 },
        medium: { min: 1200, max: 1600 },
        hard: { min: 1600, max: 2000 },
        expert: { min: 2000, max: 2400 }
    },
    PERSONALITY_TRAITS: {
        aggressive: { aggression: 0.8, patience: 0.3, riskTolerance: 0.7 },
        defensive: { aggression: 0.2, patience: 0.8, riskTolerance: 0.3 },
        tactical: { aggression: 0.5, patience: 0.7, riskTolerance: 0.5 },
        balanced: { aggression: 0.5, patience: 0.5, riskTolerance: 0.5 }
    },
    DIFFICULTY_LEVELS: ['easy', 'medium', 'hard', 'expert'],
    PERSONALITY_TYPES: ['aggressive', 'defensive', 'tactical', 'balanced'],
    AGENT_NAMES: {
        easy: ['Scout', 'Rookie', 'Novice'],
        medium: ['Tactician', 'Strategist', 'Warrior'],
        hard: ['Veteran', 'Master', 'Elite'],
        expert: ['Grandmaster', 'Legend', 'Champion']
    }
};
class TestAIAgentFactory {
    static agentIdCounter = 0;
    static createMockAgent(difficulty, personality, overrides = {}) {
        const agentId = `test_agent_${difficulty}_${personality}_${++this.agentIdCounter}`;
        const traits = TEST_CONFIG.PERSONALITY_TRAITS[personality];
        const eloRange = TEST_CONFIG.ELO_RATING_RANGES[difficulty];
        return {
            id: agentId,
            name: `${difficulty.charAt(0).toUpperCase() + difficulty.slice(1)} ${personality} Agent`,
            difficulty,
            personality,
            skillLevel: this.mapDifficultyToSkillLevel(difficulty),
            eloRating: Math.floor(Math.random() * (eloRange.max - eloRange.min) + eloRange.min),
            gamesPlayed: 0,
            wins: 0,
            losses: 0,
            draws: 0,
            winRate: 0,
            personalityTraits: {
                aggression: traits.aggression,
                patience: traits.patience,
                riskTolerance: traits.riskTolerance,
                adaptability: 0.5 + (this.mapDifficultyToSkillLevel(difficulty) * 0.05)
            },
            playingStyle: {
                strategicFocus: personality,
                preferredOpenings: this.generatePreferredOpenings(personality),
                endgameStyle: this.mapPersonalityToEndgameStyle(personality)
            },
            performanceMetrics: {
                averageGameTime: 0,
                tacticalAccuracy: 0.5,
                consistencyScore: 50
            },
            createdAt: new Date(),
            lastActiveAt: new Date(),
            isActive: true,
            ...overrides
        };
    }
    static mapDifficultyToSkillLevel(difficulty) {
        const mapping = { easy: 2, medium: 5, hard: 8, expert: 10 };
        return mapping[difficulty] || 5;
    }
    static generatePreferredOpenings(personality) {
        const openings = {
            aggressive: ['King\'s Assault', 'Lightning Strike', 'Frontal Charge'],
            defensive: ['Fortress Defense', 'Iron Wall', 'Steady Build'],
            tactical: ['Strategic Control', 'Positional Play', 'Center Control'],
            balanced: ['Standard Opening', 'Flexible Setup', 'Adaptive Formation']
        };
        return openings[personality] || openings.balanced;
    }
    static mapPersonalityToEndgameStyle(personality) {
        const mapping = {
            aggressive: 'aggressive',
            defensive: 'patient',
            tactical: 'adaptive',
            balanced: 'adaptive'
        };
        return mapping[personality] || 'adaptive';
    }
}
class MockAIManager {
    agents = new Map();
    agentPools = new Map();
    activeGames = new Map();
    constructor() {
        this.initializeDefaultAgents();
    }
    initializeDefaultAgents() {
        TEST_CONFIG.DIFFICULTY_LEVELS.forEach(difficulty => {
            TEST_CONFIG.PERSONALITY_TYPES.forEach(personality => {
                const poolKey = `${difficulty}_${personality}`;
                this.agentPools.set(poolKey, []);
                for (let i = 0; i < TEST_CONFIG.DEFAULT_AGENT_COUNT; i++) {
                    const agent = TestAIAgentFactory.createMockAgent(difficulty, personality);
                    this.agents.set(agent.id, agent);
                    this.agentPools.get(poolKey).push(agent);
                }
            });
        });
    }
    getAgent(difficulty, personality) {
        const poolKey = `${difficulty}_${personality}`;
        const pool = this.agentPools.get(poolKey);
        if (!pool || pool.length === 0) {
            return null;
        }
        const availableAgent = pool.find(agent => !this.activeGames.has(agent.id));
        if (availableAgent) {
            availableAgent.lastActiveAt = new Date();
            this.activeGames.set(availableAgent.id, `temp_${Date.now()}`);
            return availableAgent;
        }
        const newAgent = TestAIAgentFactory.createMockAgent(difficulty, personality);
        this.agents.set(newAgent.id, newAgent);
        pool.push(newAgent);
        this.activeGames.set(newAgent.id, `temp_${Date.now()}`);
        return newAgent;
    }
    getAllAgents() {
        return Array.from(this.agents.values());
    }
    getAgentById(agentId) {
        return this.agents.get(agentId) || null;
    }
    updateAgentStats(agentId, result, gameData) {
        const agent = this.agents.get(agentId);
        if (!agent)
            return;
        agent.gamesPlayed += 1;
        switch (result) {
            case 'win':
                agent.wins += 1;
                agent.eloRating += 20;
                break;
            case 'loss':
                agent.losses += 1;
                agent.eloRating = Math.max(800, agent.eloRating - 20);
                break;
            case 'draw':
                agent.draws += 1;
                agent.eloRating += 5;
                break;
        }
        agent.winRate = agent.wins / agent.gamesPlayed;
        agent.lastActiveAt = new Date();
        const totalTime = agent.performanceMetrics.averageGameTime * (agent.gamesPlayed - 1) + gameData.duration;
        agent.performanceMetrics.averageGameTime = totalTime / agent.gamesPlayed;
        if (gameData.tacticalMoves && gameData.totalMoves) {
            const tacticalAccuracy = gameData.tacticalMoves / gameData.totalMoves;
            agent.performanceMetrics.tacticalAccuracy =
                (agent.performanceMetrics.tacticalAccuracy * 0.9) + (tacticalAccuracy * 0.1);
        }
    }
    assignAgentToGame(agentId, gameId) {
        this.activeGames.set(agentId, gameId);
    }
    releaseAgentFromGame(agentId) {
        this.activeGames.delete(agentId);
    }
    createCustomAgent(name, difficulty, personality, customizations) {
        const agent = TestAIAgentFactory.createMockAgent(difficulty, personality, {
            name,
            playingStyle: {
                ...TestAIAgentFactory.createMockAgent(difficulty, personality).playingStyle,
                ...customizations.playingStyle
            }
        });
        this.agents.set(agent.id, agent);
        return agent;
    }
    getAgentsByDifficulty(difficulty) {
        return Array.from(this.agents.values()).filter(agent => agent.difficulty === difficulty);
    }
    getAgentsByPersonality(personality) {
        return Array.from(this.agents.values()).filter(agent => agent.personality === personality);
    }
    getActiveAgents() {
        return Array.from(this.agents.values()).filter(agent => agent.isActive);
    }
    getAgentPerformanceStats(agentId) {
        const agent = this.agents.get(agentId);
        if (!agent)
            return null;
        return {
            gamesPlayed: agent.gamesPlayed,
            winRate: agent.winRate,
            eloRating: agent.eloRating,
            averageGameTime: agent.performanceMetrics.averageGameTime,
            tacticalAccuracy: agent.performanceMetrics.tacticalAccuracy,
            consistencyScore: agent.performanceMetrics.consistencyScore,
            totalWins: agent.wins,
            totalLosses: agent.losses,
            totalDraws: agent.draws
        };
    }
}
(0, globals_1.describe)('AI Agent Management', () => {
    let mockAIManager;
    (0, globals_1.beforeAll)(async () => {
        logger_1.logger.info('AI Agent Management tests initialized with mock services');
    });
    (0, globals_1.afterAll)(async () => {
        logger_1.logger.info('AI Agent Management tests completed');
    });
    (0, globals_1.beforeEach)(() => {
        mockAIManager = new MockAIManager();
    });
    (0, globals_1.afterEach)(() => {
        mockAIManager = null;
    });
    (0, globals_1.test)('Default agent initialization (3 agents)', async () => {
        const expectedCombinations = TEST_CONFIG.DIFFICULTY_LEVELS.length * TEST_CONFIG.PERSONALITY_TYPES.length;
        const expectedTotalAgents = expectedCombinations * TEST_CONFIG.DEFAULT_AGENT_COUNT;
        const allAgents = mockAIManager.getAllAgents();
        (0, globals_1.expect)(allAgents).toHaveLength(expectedTotalAgents);
        TEST_CONFIG.DIFFICULTY_LEVELS.forEach(difficulty => {
            TEST_CONFIG.PERSONALITY_TYPES.forEach(personality => {
                const agentsForCombination = allAgents.filter(agent => agent.difficulty === difficulty && agent.personality === personality);
                (0, globals_1.expect)(agentsForCombination).toHaveLength(TEST_CONFIG.DEFAULT_AGENT_COUNT);
                const ids = agentsForCombination.map(agent => agent.id);
                (0, globals_1.expect)(new Set(ids).size).toBe(TEST_CONFIG.DEFAULT_AGENT_COUNT);
            });
        });
    });
    (0, globals_1.test)('Agent personality implementation', async () => {
        const testCases = [
            { personality: 'aggressive', expectedTraits: { aggression: 0.8, patience: 0.3 } },
            { personality: 'defensive', expectedTraits: { aggression: 0.2, patience: 0.8 } },
            { personality: 'tactical', expectedTraits: { aggression: 0.5, patience: 0.7 } },
            { personality: 'balanced', expectedTraits: { aggression: 0.5, patience: 0.5 } }
        ];
        for (const testCase of testCases) {
            const agent = mockAIManager.getAgent('medium', testCase.personality);
            (0, globals_1.expect)(agent).not.toBeNull();
            (0, globals_1.expect)(agent.personality).toBe(testCase.personality);
            (0, globals_1.expect)(agent.personalityTraits.aggression).toBeCloseTo(testCase.expectedTraits.aggression, 1);
            (0, globals_1.expect)(agent.personalityTraits.patience).toBeCloseTo(testCase.expectedTraits.patience, 1);
            (0, globals_1.expect)(agent.playingStyle.strategicFocus).toBe(testCase.personality);
            (0, globals_1.expect)(agent.playingStyle.preferredOpenings).toHaveLength(3);
            const expectedEndgameStyle = testCase.personality === 'aggressive' ? 'aggressive' :
                testCase.personality === 'defensive' ? 'patient' : 'adaptive';
            (0, globals_1.expect)(agent.playingStyle.endgameStyle).toBe(expectedEndgameStyle);
        }
    });
    (0, globals_1.test)('ELO rating system', async () => {
        const agent = mockAIManager.getAgent('medium', 'balanced');
        (0, globals_1.expect)(agent).not.toBeNull();
        const initialElo = agent.eloRating;
        const initialGamesPlayed = agent.gamesPlayed;
        mockAIManager.updateAgentStats(agent.id, 'win', {
            duration: 1200000,
            tacticalMoves: 15,
            totalMoves: 30
        });
        (0, globals_1.expect)(agent.eloRating).toBeGreaterThan(initialElo);
        (0, globals_1.expect)(agent.gamesPlayed).toBe(initialGamesPlayed + 1);
        (0, globals_1.expect)(agent.wins).toBe(1);
        (0, globals_1.expect)(agent.winRate).toBeCloseTo(1.0, 2);
        const eloAfterWin = agent.eloRating;
        mockAIManager.updateAgentStats(agent.id, 'loss', {
            duration: 900000,
            tacticalMoves: 8,
            totalMoves: 25
        });
        (0, globals_1.expect)(agent.eloRating).toBeLessThan(eloAfterWin);
        (0, globals_1.expect)(agent.losses).toBe(1);
        (0, globals_1.expect)(agent.winRate).toBeCloseTo(0.5, 2);
        const eloAfterLoss = agent.eloRating;
        mockAIManager.updateAgentStats(agent.id, 'draw', {
            duration: 1800000,
            tacticalMoves: 12,
            totalMoves: 40
        });
        (0, globals_1.expect)(agent.eloRating).toBeGreaterThan(eloAfterLoss);
        (0, globals_1.expect)(agent.draws).toBe(1);
        (0, globals_1.expect)(agent.gamesPlayed).toBe(3);
        const weakAgent = mockAIManager.getAgent('easy', 'defensive');
        weakAgent.eloRating = 820;
        mockAIManager.updateAgentStats(weakAgent.id, 'loss', {
            duration: 600000,
            tacticalMoves: 5,
            totalMoves: 20
        });
        (0, globals_1.expect)(weakAgent.eloRating).toBeGreaterThanOrEqual(800);
    });
    (0, globals_1.test)('Agent selection for matches', async () => {
        const difficulties = ['easy', 'medium', 'hard'];
        const personalities = ['aggressive', 'defensive', 'tactical', 'balanced'];
        for (const difficulty of difficulties) {
            for (const personality of personalities) {
                const agent1 = mockAIManager.getAgent(difficulty, personality);
                const agent2 = mockAIManager.getAgent(difficulty, personality);
                (0, globals_1.expect)(agent1).not.toBeNull();
                (0, globals_1.expect)(agent2).not.toBeNull();
                (0, globals_1.expect)(agent1.id).not.toBe(agent2.id);
                mockAIManager.assignAgentToGame(agent1.id, 'game_123');
                mockAIManager.assignAgentToGame(agent2.id, 'game_456');
                const agent3 = mockAIManager.getAgent(difficulty, personality);
                (0, globals_1.expect)(agent3).not.toBeNull();
                (0, globals_1.expect)(agent3.id).not.toBe(agent1.id);
                (0, globals_1.expect)(agent3.id).not.toBe(agent2.id);
            }
        }
        const easyAgents = mockAIManager.getAgentsByDifficulty('easy');
        const hardAgents = mockAIManager.getAgentsByDifficulty('hard');
        (0, globals_1.expect)(easyAgents.every(agent => agent.difficulty === 'easy')).toBe(true);
        (0, globals_1.expect)(hardAgents.every(agent => agent.difficulty === 'hard')).toBe(true);
        (0, globals_1.expect)(easyAgents.every(agent => agent.skillLevel <= 3)).toBe(true);
        (0, globals_1.expect)(hardAgents.every(agent => agent.skillLevel >= 7)).toBe(true);
    });
    (0, globals_1.test)('Agent performance tracking', async () => {
        const agent = mockAIManager.getAgent('hard', 'tactical');
        (0, globals_1.expect)(agent).not.toBeNull();
        const initialStats = mockAIManager.getAgentPerformanceStats(agent.id);
        (0, globals_1.expect)(initialStats.gamesPlayed).toBe(0);
        (0, globals_1.expect)(initialStats.winRate).toBe(0);
        const gameResults = [
            { result: 'win', duration: 1200000, tacticalMoves: 20, totalMoves: 35 },
            { result: 'win', duration: 900000, tacticalMoves: 18, totalMoves: 30 },
            { result: 'loss', duration: 1500000, tacticalMoves: 12, totalMoves: 40 },
            { result: 'draw', duration: 1800000, tacticalMoves: 25, totalMoves: 45 },
            { result: 'win', duration: 600000, tacticalMoves: 15, totalMoves: 25 }
        ];
        gameResults.forEach(game => {
            mockAIManager.updateAgentStats(agent.id, game.result, {
                duration: game.duration,
                tacticalMoves: game.tacticalMoves,
                totalMoves: game.totalMoves
            });
        });
        const finalStats = mockAIManager.getAgentPerformanceStats(agent.id);
        (0, globals_1.expect)(finalStats.gamesPlayed).toBe(5);
        (0, globals_1.expect)(finalStats.totalWins).toBe(3);
        (0, globals_1.expect)(finalStats.totalLosses).toBe(1);
        (0, globals_1.expect)(finalStats.totalDraws).toBe(1);
        (0, globals_1.expect)(finalStats.winRate).toBeCloseTo(0.6, 2);
        const expectedAvgTime = gameResults.reduce((sum, game) => sum + game.duration, 0) / gameResults.length;
        (0, globals_1.expect)(finalStats.averageGameTime).toBeCloseTo(expectedAvgTime, 0);
        (0, globals_1.expect)(finalStats.tacticalAccuracy).toBeGreaterThan(0.4);
        (0, globals_1.expect)(finalStats.tacticalAccuracy).toBeLessThan(0.8);
        (0, globals_1.expect)(finalStats.eloRating).toBeGreaterThan(TEST_CONFIG.ELO_RATING_RANGES.hard.min);
    });
    (0, globals_1.test)('Agent metadata consistency', async () => {
        const agent = mockAIManager.getAgent('expert', 'aggressive');
        (0, globals_1.expect)(agent).not.toBeNull();
        (0, globals_1.expect)(agent.id).toMatch(/^test_agent_expert_aggressive_\d+$/);
        (0, globals_1.expect)(agent.name).toContain('Expert');
        (0, globals_1.expect)(agent.name).toContain('aggressive');
        (0, globals_1.expect)(agent.difficulty).toBe('expert');
        (0, globals_1.expect)(agent.personality).toBe('aggressive');
        (0, globals_1.expect)(agent.skillLevel).toBe(10);
        (0, globals_1.expect)(agent.eloRating).toBeGreaterThanOrEqual(TEST_CONFIG.ELO_RATING_RANGES.expert.min);
        (0, globals_1.expect)(agent.eloRating).toBeLessThanOrEqual(TEST_CONFIG.ELO_RATING_RANGES.expert.max);
        const originalMetadata = {
            id: agent.id,
            name: agent.name,
            difficulty: agent.difficulty,
            personality: agent.personality,
            skillLevel: agent.skillLevel,
            personalityTraits: { ...agent.personalityTraits },
            playingStyle: { ...agent.playingStyle },
            createdAt: agent.createdAt
        };
        for (let i = 0; i < 10; i++) {
            mockAIManager.updateAgentStats(agent.id, i % 3 === 0 ? 'win' : i % 3 === 1 ? 'loss' : 'draw', {
                duration: 900000 + (i * 100000),
                tacticalMoves: 10 + i,
                totalMoves: 30 + i
            });
        }
        (0, globals_1.expect)(agent.id).toBe(originalMetadata.id);
        (0, globals_1.expect)(agent.name).toBe(originalMetadata.name);
        (0, globals_1.expect)(agent.difficulty).toBe(originalMetadata.difficulty);
        (0, globals_1.expect)(agent.personality).toBe(originalMetadata.personality);
        (0, globals_1.expect)(agent.skillLevel).toBe(originalMetadata.skillLevel);
        (0, globals_1.expect)(agent.personalityTraits).toEqual(originalMetadata.personalityTraits);
        (0, globals_1.expect)(agent.playingStyle).toEqual(originalMetadata.playingStyle);
        (0, globals_1.expect)(agent.gamesPlayed).toBe(10);
        (0, globals_1.expect)(agent.lastActiveAt).toBeInstanceOf(Date);
        (0, globals_1.expect)(agent.lastActiveAt.getTime()).toBeGreaterThan(originalMetadata.createdAt.getTime());
    });
    (0, globals_1.test)('Custom agent creation', async () => {
        const customAgent = mockAIManager.createCustomAgent('Custom Tactical Master', 'hard', 'tactical', {
            playingStyle: {
                strategicFocus: 'positional',
                preferredOpenings: ['Custom Opening A', 'Custom Opening B'],
                endgameStyle: 'calculated'
            },
            personalityTraits: {
                aggression: 0.6,
                patience: 0.8,
                riskTolerance: 0.4,
                adaptability: 0.9
            }
        });
        (0, globals_1.expect)(customAgent.name).toBe('Custom Tactical Master');
        (0, globals_1.expect)(customAgent.difficulty).toBe('hard');
        (0, globals_1.expect)(customAgent.personality).toBe('tactical');
        (0, globals_1.expect)(customAgent.skillLevel).toBe(8);
        (0, globals_1.expect)(customAgent.playingStyle.strategicFocus).toBe('positional');
        (0, globals_1.expect)(customAgent.playingStyle.preferredOpenings).toContain('Custom Opening A');
        (0, globals_1.expect)(customAgent.playingStyle.preferredOpenings).toContain('Custom Opening B');
        (0, globals_1.expect)(customAgent.playingStyle.endgameStyle).toBe('calculated');
        const retrievedAgent = mockAIManager.getAgentById(customAgent.id);
        (0, globals_1.expect)(retrievedAgent).not.toBeNull();
        (0, globals_1.expect)(retrievedAgent.id).toBe(customAgent.id);
        const hardAgents = mockAIManager.getAgentsByDifficulty('hard');
        (0, globals_1.expect)(hardAgents.some(agent => agent.id === customAgent.id)).toBe(true);
        const tacticalAgents = mockAIManager.getAgentsByPersonality('tactical');
        (0, globals_1.expect)(tacticalAgents.some(agent => agent.id === customAgent.id)).toBe(true);
    });
    (0, globals_1.test)('Agent difficulty levels (easy/medium/hard)', async () => {
        const difficultyTests = [
            { difficulty: 'easy', expectedSkillRange: [1, 3], expectedEloRange: [800, 1200] },
            { difficulty: 'medium', expectedSkillRange: [4, 6], expectedEloRange: [1200, 1600] },
            { difficulty: 'hard', expectedSkillRange: [7, 9], expectedEloRange: [1600, 2000] },
            { difficulty: 'expert', expectedSkillRange: [10, 10], expectedEloRange: [2000, 2400] }
        ];
        for (const test of difficultyTests) {
            const agents = mockAIManager.getAgentsByDifficulty(test.difficulty);
            (0, globals_1.expect)(agents.length).toBeGreaterThan(0);
            agents.forEach(agent => {
                (0, globals_1.expect)(agent.difficulty).toBe(test.difficulty);
                (0, globals_1.expect)(agent.skillLevel).toBeGreaterThanOrEqual(test.expectedSkillRange[0]);
                (0, globals_1.expect)(agent.skillLevel).toBeLessThanOrEqual(test.expectedSkillRange[1]);
                (0, globals_1.expect)(agent.eloRating).toBeGreaterThanOrEqual(test.expectedEloRange[0]);
                (0, globals_1.expect)(agent.eloRating).toBeLessThanOrEqual(test.expectedEloRange[1]);
                const expectedAdaptability = 0.5 + (agent.skillLevel * 0.05);
                (0, globals_1.expect)(agent.personalityTraits.adaptability).toBeCloseTo(expectedAdaptability, 2);
            });
        }
        const easyAgent = mockAIManager.getAgent('easy', 'balanced');
        const mediumAgent = mockAIManager.getAgent('medium', 'balanced');
        const hardAgent = mockAIManager.getAgent('hard', 'balanced');
        const expertAgent = mockAIManager.getAgent('expert', 'balanced');
        (0, globals_1.expect)(easyAgent.skillLevel).toBeLessThan(mediumAgent.skillLevel);
        (0, globals_1.expect)(mediumAgent.skillLevel).toBeLessThan(hardAgent.skillLevel);
        (0, globals_1.expect)(hardAgent.skillLevel).toBeLessThan(expertAgent.skillLevel);
        (0, globals_1.expect)(easyAgent.personalityTraits.adaptability).toBeLessThan(hardAgent.personalityTraits.adaptability);
        (0, globals_1.expect)(mediumAgent.personalityTraits.adaptability).toBeLessThan(expertAgent.personalityTraits.adaptability);
    });
    (0, globals_1.test)('Agent naming and identification', async () => {
        const allAgents = mockAIManager.getAllAgents();
        const agentIds = allAgents.map(agent => agent.id);
        const agentNames = allAgents.map(agent => agent.name);
        (0, globals_1.expect)(new Set(agentIds).size).toBe(agentIds.length);
        agentIds.forEach(id => {
            (0, globals_1.expect)(id).toMatch(/^test_agent_\w+_\w+_\d+$/);
        });
        agentNames.forEach(name => {
            (0, globals_1.expect)(name).toBeTruthy();
            (0, globals_1.expect)(name.length).toBeGreaterThan(5);
            (0, globals_1.expect)(name).toMatch(/^[A-Z][a-z]+ [a-z]+ Agent$/);
        });
        TEST_CONFIG.DIFFICULTY_LEVELS.forEach(difficulty => {
            TEST_CONFIG.PERSONALITY_TYPES.forEach(personality => {
                const agent = mockAIManager.getAgent(difficulty, personality);
                (0, globals_1.expect)(agent.name).toContain(difficulty.charAt(0).toUpperCase() + difficulty.slice(1));
                (0, globals_1.expect)(agent.name).toContain(personality);
            });
        });
        allAgents.forEach(agent => {
            const retrieved = mockAIManager.getAgentById(agent.id);
            (0, globals_1.expect)(retrieved).not.toBeNull();
            (0, globals_1.expect)(retrieved.id).toBe(agent.id);
            (0, globals_1.expect)(retrieved.name).toBe(agent.name);
        });
    });
    (0, globals_1.test)('Agent state persistence', async () => {
        const agent = mockAIManager.getAgent('medium', 'aggressive');
        (0, globals_1.expect)(agent).not.toBeNull();
        const initialState = {
            id: agent.id,
            gamesPlayed: agent.gamesPlayed,
            eloRating: agent.eloRating,
            winRate: agent.winRate,
            createdAt: agent.createdAt.getTime(),
            isActive: agent.isActive
        };
        mockAIManager.assignAgentToGame(agent.id, 'test_game_001');
        await new Promise(resolve => setTimeout(resolve, 1));
        mockAIManager.updateAgentStats(agent.id, 'win', {
            duration: 1200000,
            tacticalMoves: 15,
            totalMoves: 30
        });
        (0, globals_1.expect)(agent.id).toBe(initialState.id);
        (0, globals_1.expect)(agent.gamesPlayed).toBe(initialState.gamesPlayed + 1);
        (0, globals_1.expect)(agent.eloRating).toBeGreaterThan(initialState.eloRating);
        (0, globals_1.expect)(agent.winRate).toBeGreaterThan(initialState.winRate);
        (0, globals_1.expect)(agent.createdAt.getTime()).toBe(initialState.createdAt);
        (0, globals_1.expect)(agent.isActive).toBe(true);
        (0, globals_1.expect)(agent.lastActiveAt.getTime()).toBeGreaterThan(initialState.createdAt);
        const retrievedAgent = mockAIManager.getAgentById(agent.id);
        (0, globals_1.expect)(retrievedAgent).not.toBeNull();
        (0, globals_1.expect)(retrievedAgent.gamesPlayed).toBe(agent.gamesPlayed);
        (0, globals_1.expect)(retrievedAgent.eloRating).toBe(agent.eloRating);
        (0, globals_1.expect)(retrievedAgent.winRate).toBe(agent.winRate);
        mockAIManager.releaseAgentFromGame(agent.id);
        const sameAgent = mockAIManager.getAgent('medium', 'aggressive');
        (0, globals_1.expect)(sameAgent.id).toBe(agent.id);
        const performanceStats = mockAIManager.getAgentPerformanceStats(agent.id);
        (0, globals_1.expect)(performanceStats.gamesPlayed).toBe(1);
        (0, globals_1.expect)(performanceStats.winRate).toBe(1.0);
        (0, globals_1.expect)(performanceStats.averageGameTime).toBe(1200000);
        (0, globals_1.expect)(performanceStats.tacticalAccuracy).toBeGreaterThan(0);
    });
});
//# sourceMappingURL=agent-management.test.js.map