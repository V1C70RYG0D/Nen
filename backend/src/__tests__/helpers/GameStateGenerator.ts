export class GameStateGenerator {
  static createInitialState(): any {
    return {
      board: this.createEmptyBoard(),
      currentPlayer: 'player1',
      moveNumber: 1,
      gamePhase: 'opening',
      status: 'active'
    };
  }

  static createMidgameState(): any {
    return {
      board: this.createMidgameBoard(),
      currentPlayer: 'player1',
      moveNumber: 25,
      gamePhase: 'midgame',
      status: 'active'
    };
  }

  static createEndgameState(): any {
    return {
      board: this.createEndgameBoard(),
      currentPlayer: 'player1',
      moveNumber: 65,
      gamePhase: 'endgame',
      status: 'active'
    };
  }

  static createNoMovesState(): any {
    return {
      board: this.createEmptyBoard(),
      currentPlayer: 'player1',
      moveNumber: 1,
      gamePhase: 'opening',
      status: 'active',
      forcedNoMoves: true
    };
  }

  private static createEmptyBoard(): any[][] {
    return Array.from({ length: 9 }, () => Array(9).fill(null));
  }

  private static createMidgameBoard(): any[][] {
    const board = this.createEmptyBoard();
    // Add pieces to create a midgame scenario
    // Assume proper piece placement
    return board;
  }

  private static createEndgameBoard(): any[][] {
    const board = this.createEmptyBoard();
    // Add pieces to create an endgame scenario
    // Assume proper piece placement
    return board;
  }
}

