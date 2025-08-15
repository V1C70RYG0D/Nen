import { AIAgent } from "../models/AIAgent";
export declare class AIAgentManager {
    private agents;
    constructor();
    private initializeAgents;
    getAgentById(agentId: string): AIAgent | null;
    calculateElo(agentId: string, result: "win" | "loss" | "draw", opponentElo: number): number;
    listAgents(): AIAgent[];
}
export declare const aiAgentManager: AIAgentManager;
//# sourceMappingURL=AIAgentManager.d.ts.map