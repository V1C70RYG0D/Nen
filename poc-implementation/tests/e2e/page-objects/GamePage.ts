import { Page, expect } from '@playwright/test';
import { BasePage } from './BasePage';

export class GamePage extends BasePage {
  // Game board selectors
  private readonly gameBoard = '[data-testid="game-board"]';
  private readonly gameSquare = (row: number, col: number) => `[data-testid="square-${row}-${col}"]`;
  private readonly gamePiece = (pieceId: string) => `[data-testid="piece-${pieceId}"]`;

  // Game controls
  private readonly startGameButton = '[data-testid="start-game-button"]';
  private readonly resignButton = '[data-testid="resign-button"]';
  private readonly drawOfferButton = '[data-testid="draw-offer-button"]';
  private readonly undoMoveButton = '[data-testid="undo-move-button"]';

  // Game information
  private readonly currentPlayer = '[data-testid="current-player"]';
  private readonly gameStatus = '[data-testid="game-status"]';
  private readonly moveHistory = '[data-testid="move-history"]';
  private readonly capturedPieces = '[data-testid="captured-pieces"]';
  private readonly gameTimer = '[data-testid="game-timer"]';

  // Betting UI
  private readonly betAmount = '[data-testid="bet-amount"]';
  private readonly placeBetButton = '[data-testid="place-bet-button"]';
  private readonly currentOdds = '[data-testid="current-odds"]';
  private readonly totalPot = '[data-testid="total-pot"]';

  // AI interaction
  private readonly aiThinkingIndicator = '[data-testid="ai-thinking"]';
  private readonly aiMoveInfo = '[data-testid="ai-move-info"]';
  private readonly aiDifficulty = '[data-testid="ai-difficulty"]';

  // Notifications and alerts
  private readonly gameAlert = '[data-testid="game-alert"]';
  private readonly moveError = '[data-testid="move-error"]';
  private readonly connectionStatus = '[data-testid="connection-status"]';

  constructor(page: Page) {
    super(page);
  }

  /**
   * Navigate to game page
   */
  async gotoGame(gameId?: string) {
    const path = gameId ? `/game/${gameId}` : '/game';
    await this.goto(path);
    await this.waitForElement(this.gameBoard);
  }

  /**
   * Start a new game
   */
  async startNewGame() {
    await this.clickElement(this.startGameButton);
    await this.waitForElement(this.gameStatus);
    await this.waitForNetworkIdle();
  }

  /**
   * Make a move by clicking from and to squares
   */
  async makeMove(fromRow: number, fromCol: number, toRow: number, toCol: number) {
    // Click the piece to select it
    await this.clickElement(this.gameSquare(fromRow, fromCol));

    // Wait for piece selection visual feedback
    await this.page.waitForTimeout(500);

    // Click the destination square
    await this.clickElement(this.gameSquare(toRow, toCol));

    // Wait for move to be processed
    await this.waitForNetworkIdle();

    // Check if move was successful or if there's an error
    const hasError = await this.isElementVisible(this.moveError);
    if (hasError) {
      const errorText = await this.getTextContent(this.moveError);
      throw new Error(`Move failed: ${errorText}`);
    }
  }

  /**
   * Get the current game status
   */
  async getGameStatus(): Promise<string> {
    return await this.getTextContent(this.gameStatus);
  }

  /**
   * Get the current player's turn
   */
  async getCurrentPlayer(): Promise<string> {
    return await this.getTextContent(this.currentPlayer);
  }

  /**
   * Check if it's the player's turn
   */
  async isPlayerTurn(): Promise<boolean> {
    const currentPlayer = await this.getCurrentPlayer();
    return currentPlayer.toLowerCase().includes('your turn') || currentPlayer.toLowerCase().includes('player');
  }

  /**
   * Wait for AI to make a move
   */
  async waitForAIMove(timeout: number = 30000) {
    // Wait for AI thinking indicator to appear
    await this.waitForElement(this.aiThinkingIndicator, 5000);

    // Wait for AI thinking to complete
    await this.page.waitForFunction(() => {
      const aiThinking = document.querySelector('[data-testid="ai-thinking"]');
      return !aiThinking || aiThinking.textContent?.includes('completed');
    }, { timeout });

    await this.waitForNetworkIdle();
  }

  /**
   * Place a bet on the game
   */
  async placeBet(amount: number) {
    await this.fillField(this.betAmount, amount.toString());
    await this.clickElement(this.placeBetButton);

    // Wait for bet confirmation
    await this.waitForElement('[data-testid="bet-confirmation"]', 10000);
  }

  /**
   * Get current betting odds
   */
  async getCurrentOdds(): Promise<string> {
    return await this.getTextContent(this.currentOdds);
  }

  /**
   * Get total pot amount
   */
  async getTotalPot(): Promise<string> {
    return await this.getTextContent(this.totalPot);
  }

  /**
   * Resign from the game
   */
  async resignGame() {
    await this.clickElement(this.resignButton);

    // Handle confirmation dialog
    await this.handleDialog(true);

    // Wait for game to end
    await this.waitForElement('[data-testid="game-ended"]', 10000);
  }

  /**
   * Offer a draw
   */
  async offerDraw() {
    await this.clickElement(this.drawOfferButton);
    await this.waitForElement('[data-testid="draw-offered"]', 5000);
  }

  /**
   * Get move history
   */
  async getMoveHistory(): Promise<string[]> {
    const historyElement = await this.page.locator(this.moveHistory);
    const moves = await historyElement.locator('[data-testid="move-item"]').allTextContents();
    return moves;
  }

  /**
   * Get captured pieces
   */
  async getCapturedPieces(): Promise<string[]> {
    const capturedElement = await this.page.locator(this.capturedPieces);
    const pieces = await capturedElement.locator('[data-testid="captured-piece"]').allTextContents();
    return pieces;
  }

  /**
   * Check if game is finished
   */
  async isGameFinished(): Promise<boolean> {
    const status = await this.getGameStatus();
    return status.toLowerCase().includes('checkmate') ||
           status.toLowerCase().includes('draw') ||
           status.toLowerCase().includes('resigned');
  }

  /**
   * Get game timer value
   */
  async getGameTimer(): Promise<string> {
    return await this.getTextContent(this.gameTimer);
  }

  /**
   * Verify game board is properly loaded
   */
  async verifyGameBoard() {
    await expect(this.page.locator(this.gameBoard)).toBeVisible();

    // Check that all squares are present (9x9 Gungi board)
    for (let row = 0; row < 9; row++) {
      for (let col = 0; col < 9; col++) {
        await expect(this.page.locator(this.gameSquare(row, col))).toBeVisible();
      }
    }
  }

  /**
   * Check if piece is at specific position
   */
  async isPieceAtPosition(row: number, col: number): Promise<boolean> {
    const square = this.page.locator(this.gameSquare(row, col));
    const pieceExists = await square.locator('[data-testid*="piece-"]').count() > 0;
    return pieceExists;
  }

  /**
   * Get piece type at position
   */
  async getPieceAtPosition(row: number, col: number): Promise<string | null> {
    const square = this.page.locator(this.gameSquare(row, col));
    const piece = square.locator('[data-testid*="piece-"]').first();

    if (await piece.count() > 0) {
      const pieceId = await piece.getAttribute('data-testid');
      return pieceId?.replace('piece-', '') || null;
    }

    return null;
  }

  /**
   * Verify connection status
   */
  async verifyConnectionStatus(expectedStatus: string = 'connected') {
    const status = await this.getTextContent(this.connectionStatus);
    expect(status.toLowerCase()).toContain(expectedStatus.toLowerCase());
  }

  /**
   * Wait for game alert and get message
   */
  async waitForGameAlert(timeout: number = 10000): Promise<string> {
    await this.waitForElement(this.gameAlert, timeout);
    return await this.getTextContent(this.gameAlert);
  }

  /**
   * Clear any existing alerts
   */
  async clearAlerts() {
    const alerts = this.page.locator(this.gameAlert);
    const count = await alerts.count();

    for (let i = 0; i < count; i++) {
      const alert = alerts.nth(i);
      const closeButton = alert.locator('[data-testid="close-alert"]');
      if (await closeButton.isVisible()) {
        await closeButton.click();
      }
    }
  }

  /**
   * Set AI difficulty level
   */
  async setAIDifficulty(level: string) {
    await this.page.locator(this.aiDifficulty).selectOption(level);
    await this.waitForNetworkIdle();
  }

  /**
   * Take screenshot of current game state
   */
  async takeGameScreenshot(name: string) {
    await this.takeScreenshot(`game-${name}`);
  }
}
