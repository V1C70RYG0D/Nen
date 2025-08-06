"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.aiAgentManager = exports.AIAgentManager = void 0;
class AIAgentManager {
    constructor() {
        this.agents = new Map();
        this.initializeAgents();
    }
    initializeAgents() {
        // Initializing predefined agents
        const predefinedAgents = [
            new AIAgent_1.AIAgent({
                id: "netero",
                name: "Isaac Netero",
                description: "Master strategist with unmatched experience",
                personalityTraits: { aggression: 0.5, patience: 0.8 },
                playingStyle: {
                    preferredOpenings: ["Nen Blitz"],
                    strategicFocus: "balanced",
                    endgameStyle: "patient"
                },
                skillLevel: 95,
                eloRating: 2100,
                gamesPlayed: 100,
                wins: 85,
                losses: 10,
                draws: 5,
                trainingDataCount: 1000,
                modelVersion: "1.0",
                isPublic: true,
                isTradeable: true,
                createdAt: new Date(),
                updatedAt: new Date()
            })
            // Add more agents here
        ];
        predefinedAgents.forEach(agent => this.agents.set(agent.id, agent));
    }
    getAgentById(agentId) {
        return this.agents.get(agentId) || null;
    }
    calculateElo(agentId, result, opponentElo) {
        const agent = this.agents.get(agentId);
        if (!agent)
            return 0;
        let expectedScore = 1 / (1 + Math.pow(10, (opponentElo - agent.eloRating) / 400));
        let score = result === "win" ? 1 : result === "loss" ? 0 : 0.5;
        const kFactor = 32; // Standard K-factor
        agent.eloRating += kFactor * (score - expectedScore);
        agent.updatedAt = new Date();
        return agent.eloRating;
    }
    listAgents() {
        return Array.from(this.agents.values());
    }
}
exports.AIAgentManager = AIAgentManager;
exports.aiAgentManager = new AIAgentManager();
//# sourceMappingURL=AIAgentManager.js.map