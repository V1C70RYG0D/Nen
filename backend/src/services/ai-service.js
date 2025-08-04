/**
 * AI Service - Quick Start Wrapper
 * Provides simplified interface for quick-start backend

 */

const AIService = require('./AIService');

class QuickStartAIService {
  constructor() {
    try {
      this.aiService = new AIService();
    } catch (error) {
      console.error('AI Service initialization error:', error);
      this.aiService = null;
    }
  }

  async getAvailableAgents() {
    try {
      if (this.aiService) {
        return await this.aiService.getAvailableAgents();
      }

      // Fallback to basic structure if main service unavailable
      return [];
    } catch (error) {
      console.error('QuickStart AIService error:', error);
      return [];
    }
  }
}

module.exports = QuickStartAIService;
