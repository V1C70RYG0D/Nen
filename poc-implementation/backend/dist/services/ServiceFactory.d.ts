export interface GameService {
    id: string;
    name: string;
    status: 'active' | 'inactive' | 'maintenance';
    createMatch(players: string[], options?: any): Promise<any>;
    getMatch(matchId: string): Promise<any>;
    updateMatch(matchId: string, data: any): Promise<any>;
    endMatch(matchId: string, result: any): Promise<any>;
    validateMove(matchId: string, move: any, playerId: string): Promise<boolean>;
    processMove(matchId: string, move: any, playerId: string): Promise<any>;
    getGameState(matchId: string): Promise<any>;
    updateGameState(matchId: string, state: any): Promise<any>;
    getActiveMatches(): Promise<any[]>;
    getMatchHistory(playerId: string, limit?: number): Promise<any[]>;
    getStats(): Promise<any>;
    startMatch(matchId: string): Promise<any>;
    makeMove(matchId: string, move: any): Promise<any>;
}
export interface BettingService {
    id: string;
    name: string;
    status: 'active' | 'inactive' | 'maintenance';
    createBettingPool(matchId: string, options?: any): Promise<any>;
    getBettingPool(matchId: string): Promise<any>;
    closeBettingPool(matchId: string): Promise<any>;
    placeBet(userId: string, matchId: string, amount: number, prediction: any): Promise<any>;
    cancelBet(betId: string, userId: string): Promise<boolean>;
    processPayout(matchId: string, result: any): Promise<any>;
    calculateOdds(matchId: string): Promise<any>;
    getBettingStats(matchId?: string): Promise<any>;
    getUserBettingHistory(userId: string, limit?: number): Promise<any[]>;
}
export declare function getGameServiceInstance(): GameService;
export declare function getBettingServiceInstance(): BettingService;
export declare const gameService: GameService;
export declare const bettingService: BettingService;
export declare class ServiceRegistry {
    private static instance;
    private services;
    static getInstance(): ServiceRegistry;
    register(name: string, service: any): void;
    get(name: string): any;
    getAll(): Map<string, any>;
    unregister(name: string): boolean;
    healthCheck(): Promise<any>;
}
declare const serviceRegistry: ServiceRegistry;
export { serviceRegistry };
declare const _default: {
    gameService: GameService;
    bettingService: BettingService;
    serviceRegistry: ServiceRegistry;
    getGameServiceInstance: typeof getGameServiceInstance;
    getBettingServiceInstance: typeof getBettingServiceInstance;
};
export default _default;
//# sourceMappingURL=ServiceFactory.d.ts.map