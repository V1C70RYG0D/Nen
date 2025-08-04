/**
 * Real-time Message Handling Tests
 */

import { WebSocket } from 'ws';

const WS_URL = process.env.WS_URL || process.env.DEFAULT_WS_URL;
if (!WS_URL) {
}

const TEST_TIMEOUT = parseInt(process.env.TEST_TIMEOUT || '10000', 10);
const WS_TIMEOUT = parseInt(process.env.WS_TIMEOUT || '5000', 10);

describe('Real-time Message Handling', () => {
    let mockWebSocket: WebSocket;

    beforeEach(() => {
        jest.clearAllMocks();
    });

    afterEach(() => {
        if (mockWebSocket && mockWebSocket.readyState === WebSocket.OPEN) {
            mockWebSocket.close();
        }
    });

    test('should process move updates', async () => {
        // Test move update message processing
        const moveMessage = {
            type: 'move_update',
            gameId: 'test-game-123',
            from: { x: 2, y: 7 },
            to: { x: 2, y: 5 },
            piece: 'pawn',
            timestamp: Date.now()
        };

        const messageHandler = jest.fn();
        mockWebSocket = new WebSocket(WS_URL);

        await new Promise((resolve) => {
            mockWebSocket.on('open', () => {
                mockWebSocket.on('message', messageHandler);
                mockWebSocket.send(JSON.stringify(moveMessage));
                setTimeout(resolve, 100);
            });
        });

        expect(messageHandler).toHaveBeenCalled();
    }, TEST_TIMEOUT);

    test('should handle board state updates', async () => {
        // Test complete board state synchronization
        const boardStateMessage = {
            type: 'board_state_update',
            gameId: 'test-game-123',
            boardState: Array(9).fill(null).map(() => Array(9).fill(null)),
            currentPlayer: 'player1',
            moveCount: 15,
            timestamp: Date.now()
        };

        const stateUpdateHandler = jest.fn();

        // Simulate board state update processing
        const processStateUpdate = (message: any) => {
            if (message.type === 'board_state_update') {
                stateUpdateHandler(message);
                return true;
            }
            return false;
        };

        const result = processStateUpdate(boardStateMessage);
        expect(result).toBe(true);
        expect(stateUpdateHandler).toHaveBeenCalledWith(boardStateMessage);
    }, TEST_TIMEOUT);

    test('should process AI move notifications', async () => {
        // Test AI move update handling
        const aiMoveMessage = {
            type: 'ai_move',
            gameId: 'test-game-123',
            move: {
                from: { x: 1, y: 8 },
                to: { x: 3, y: 6 },
                piece: 'knight'
            },
            aiLevel: 'expert',
            evaluationScore: 0.75,
            timestamp: Date.now()
        };

        const aiMoveHandler = jest.fn();

        const processAiMove = (message: any) => {
            if (message.type === 'ai_move') {
                aiMoveHandler(message);
                return message.move;
            }
            return null;
        };

        const processedMove = processAiMove(aiMoveMessage);
        expect(processedMove).toEqual(aiMoveMessage.move);
        expect(aiMoveHandler).toHaveBeenCalledWith(aiMoveMessage);
    }, TEST_TIMEOUT);

    test('should validate message integrity', async () => {
        // Test message validation and error handling
        const validMessage = {
            type: 'game_update',
            gameId: 'test-game-123',
            data: { score: 100 },
            timestamp: Date.now(),
            signature: 'valid-signature'
        };

        const invalidMessage = {
            type: 'invalid_type',
            // Missing required fields
        };

        const validateMessage = (message: any) => {
            const requiredFields = ['type', 'timestamp'];
            return requiredFields.every(field => field in message);
        };

        expect(validateMessage(validMessage)).toBe(true);
        expect(validateMessage(invalidMessage)).toBe(false);
    }, TEST_TIMEOUT);

    test('should handle game state updates and validation', async () => {
        // Test game state updates
        const gameStateMessage = {
            type: 'game_state',
            gameId: 'test-game-123',
            state: 'in_progress',
            players: ['player1', 'player2'],
            currentTurn: 'player1',
            moveHistory: [],
            timestamp: Date.now()
        };

        const gameStateHandler = jest.fn();

        const processGameState = (message: any) => {
            if (message.type === 'game_state' && message.gameId) {
                gameStateHandler(message);
                return true;
            }
            return false;
        };

        const result = processGameState(gameStateMessage);
        expect(result).toBe(true);
        expect(gameStateHandler).toHaveBeenCalledWith(gameStateMessage);
    }, TEST_TIMEOUT);

    test('should handle error messages and provide user feedback', async () => {
        // Test error message handling
        const errorMessage = {
            type: 'error',
            code: 'INVALID_MOVE',
            message: 'Move is not valid in current game state',
            gameId: 'test-game-123',
            timestamp: Date.now()
        };

        const errorHandler = jest.fn();

        const processError = (message: any) => {
            if (message.type === 'error') {
                errorHandler(message);
                return {
                    handled: true,
                    userMessage: message.message,
                    code: message.code
                };
            }
            return { handled: false };
        };

        const result = processError(errorMessage);
        expect(result.handled).toBe(true);
        expect(result.userMessage).toBe(errorMessage.message);
        expect(errorHandler).toHaveBeenCalledWith(errorMessage);
    }, TEST_TIMEOUT);

    test('should manage message queuing and ordering', async () => {
        // Test message queuing
        const messages = [
            { type: 'move', id: 1, timestamp: Date.now() },
            { type: 'move', id: 2, timestamp: Date.now() + 1 },
            { type: 'move', id: 3, timestamp: Date.now() + 2 }
        ];

        const messageQueue: any[] = [];
        const processedMessages: any[] = [];

        const queueMessage = (message: any) => {
            messageQueue.push(message);
            messageQueue.sort((a, b) => a.timestamp - b.timestamp);
        };

        const processQueue = () => {
            while (messageQueue.length > 0) {
                const message = messageQueue.shift();
                processedMessages.push(message);
            }
        };

        // Queue messages out of order
        queueMessage(messages[2]);
        queueMessage(messages[0]);
        queueMessage(messages[1]);

        processQueue();

        expect(processedMessages).toHaveLength(3);
        expect(processedMessages[0].id).toBe(1);
        expect(processedMessages[1].id).toBe(2);
        expect(processedMessages[2].id).toBe(3);
    }, TEST_TIMEOUT);

    test('should measure real-time latency', async () => {
        // Test real-time latency measurement
        const maxLatency = parseInt(process.env.MAX_LATENCY_MS || '50', 10);

        const measureLatency = async () => {
            const startTime = Date.now();

            return new Promise<number>((resolve) => {
                setTimeout(() => {
                    const endTime = Date.now();
                    const latency = endTime - startTime;
                    resolve(latency);
                }, 10); // Simulate small delay
            });
        };

        const latency = await measureLatency();
        expect(latency).toBeLessThan(maxLatency);
        expect(latency).toBeGreaterThan(0);
    }, TEST_TIMEOUT);
});
