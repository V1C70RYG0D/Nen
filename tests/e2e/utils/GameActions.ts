import { Page } from '@playwright/test';
import { BasePage } from '../page-objects/BasePage';

export class GameActions extends BasePage {
  // Selects a piece to move
  async selectPiece(pieceSelector: string) {
    await this.page.click(pieceSelector);
  }

  // Moves selected piece to the target destination
  async movePieceTo(targetSelector: string) {
    await this.page.click(targetSelector);
  }

  // Example utility to make complete move
  async makeMove(from: string, to: string) {
    await this.selectPiece(from);
    await this.movePieceTo(to);
  }

  async offerDraw() {
    await this.page.click('[data-testid="draw-offer-button"]');
  }

  async resignGame() {
    await this.page.click('[data-testid="resign-button"]');
  }
}

