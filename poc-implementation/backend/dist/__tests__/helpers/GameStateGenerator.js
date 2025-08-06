"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GameStateGenerator = void 0;
class GameStateGenerator {
    static createInitialState() {
        return {
            board: this.createEmptyBoard(),
            currentPlayer: 'player1',
            moveNumber: 1,
            gamePhase: 'opening',
            status: 'active'
        };
    }
    static createMidgameState() {
        return {
            board: this.createMidgameBoard(),
            currentPlayer: 'player1',
            moveNumber: 25,
            gamePhase: 'midgame',
            status: 'active'
        };
    }
    static createEndgameState() {
        return {
            board: this.createEndgameBoard(),
            currentPlayer: 'player1',
            moveNumber: 65,
            gamePhase: 'endgame',
            status: 'active'
        };
    }
    static createNoMovesState() {
        return {
            board: this.createEmptyBoard(),
            currentPlayer: 'player1',
            moveNumber: 1,
            gamePhase: 'opening',
            status: 'active',
            forcedNoMoves: true
        };
    }
    static createEmptyBoard() {
        return Array.from({ length: 9 }, () => Array(9).fill(null));
    }
    static createMidgameBoard() {
        const board = this.createEmptyBoard();
        // Add pieces to create a midgame scenario
        // Assume proper piece placement
        return board;
    }
    static createEndgameBoard() {
        const board = this.createEmptyBoard();
        // Add pieces to create an endgame scenario
        // Assume proper piece placement
        return board;
    }
}
exports.GameStateGenerator = GameStateGenerator;
//# sourceMappingURL=GameStateGenerator.js.map