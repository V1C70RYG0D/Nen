import { v4 as uuidv4 } from 'uuid';
import { GameService } from '../../src/services/GameService';
import { MockGameService, MockMatchData } from '../__tests__/services/match-management.test';

// Add WebSocket event emitting mock (replace SimpleWebSocket with the actual socket server instance)
const socketServer = {
    emit: jest.fn((event, payload) => {
        console.log(`Event Emitted: ${event}`, payload);
    }),
};

// Extend the GameService class to integrate WebSocket mock
class WebSocketGameService extends GameService {
    constructor() {
        super();
        this.socketServer = socketServer;
    }

    // Override methods to include WebSocket emits
    async startMatch(matchId: string): Promise<MockMatchData> {
        const match = await super.startMatch(matchId);
        this.socketServer.emit('matchStarted', { matchId: match.id });
        return match;
    }

    async completeMatch(matchId: string): Promise<void> {
        // Mark completed logic here
        this.socketServer.emit('matchCompleted', { matchId });
    }
}

describe('Match Status Transition Tests', () => {
    let gameService: WebSocketGameService;

    beforeEach(() => {
        gameService = new WebSocketGameService();
    });

    test('should transition status from pending to active to completed', async () => {
        // Arrange
        const match = await gameService.createMatch({
            matchType: 'ai_vs_ai',
            aiAgent1Id: 'ai-agent-1',
            aiAgent2Id: 'ai-agent-2',
        });

        // Act
        const startedMatch = await gameService.startMatch(match.id);

        // Assert
        expect(startedMatch.status).toBe('active');

        // For demo purposes, let's assume the match completes
        await gameService.completeMatch(match.id);
        const completedMatch = await gameService.getMatch(match.id);
        expect(completedMatch?.status).toBe('completed');
    });

    test('should reject invalid status transition', async () => {
        // Arrange
        const match = await gameService.createMatch({
            matchType: 'ai_vs_ai',
            aiAgent1Id: 'ai-agent-1',
            aiAgent2Id: 'ai-agent-2',
        });
        await gameService.startMatch(match.id);

        // Act  Assert
        await expect(gameService.startMatch(match.id)).rejects.toThrow('Match already started or completed');
    });

    test('should handle concurrent status updates', async () => {
        // Arrange
        const matches = await Promise.all([
            gameService.createMatch({ matchType: 'ai_vs_ai', aiAgent1Id: 'ai-1', aiAgent2Id: 'ai-2' }),
            gameService.createMatch({ matchType: 'ai_vs_ai', aiAgent1Id: 'ai-3', aiAgent2Id: 'ai-4' }),
            gameService.createMatch({ matchType: 'ai_vs_ai', aiAgent1Id: 'ai-5', aiAgent2Id: 'ai-6' }),
        ]);

        // Act
        const startPromises = matches.map(match => gameService.startMatch(match.id));
        const results = await Promise.all(startPromises);

        // Assert
        results.forEach(result => {
            expect(result.status).toBe('active');
        });
    });

    test('should emit events for status transitions', async () => {
        // Arrange
        const match = await gameService.createMatch({
            matchType: 'ai_vs_ai',
            aiAgent1Id: 'ai-agent-1',
            aiAgent2Id: 'ai-agent-2',
        });

        // Act
        await gameService.startMatch(match.id);

        // Assert
        expect(socketServer.emit).toHaveBeenCalledWith('matchStarted', { matchId: match.id });
    });

    // Additional tests for business rules and integrity can be added here
});

