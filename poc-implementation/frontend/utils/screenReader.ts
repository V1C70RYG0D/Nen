// Screen reader utilities for ARIA live region announcements
export type AnnouncementType = 'polite' | 'assertive';

/**
 * Announces a message to screen readers via ARIA live regions
 * @param message The message to announce
 * @param type The urgency level ('polite' for non-urgent, 'assertive' for urgent)
 */
export const announceToScreenReader = (message: string, type: AnnouncementType = 'polite'): void => {
  if (typeof document === 'undefined') return;

  const elementId = type === 'assertive' ? 'sr-alerts' : 'sr-announcements';
  const announcementElement = document.getElementById(elementId);

  if (announcementElement) {
    // Clear and then set the message to ensure screen readers pick it up
    announcementElement.innerText = '';

    // Use setTimeout to ensure the clear operation completes
    setTimeout(() => {
      announcementElement.innerText = message;
    }, 50);
  }
};

/**
 * Announces betting actions to screen readers
 */
export const announceBettingAction = (action: string, details: string): void => {
  announceToScreenReader(`${action}: ${details}`, 'polite');
};

/**
 * Announces game state changes to screen readers
 */
export const announceGameStateChange = (gameState: string, urgent = false): void => {
  announceToScreenReader(gameState, urgent ? 'assertive' : 'polite');
};

/**
 * Announces navigation changes
 */
export const announceNavigation = (destination: string): void => {
  announceToScreenReader(`Navigated to ${destination}`, 'polite');
};

/**
 * Announces form validation errors
 */
export const announceFormError = (error: string): void => {
  announceToScreenReader(`Error: ${error}`, 'assertive');
};

/**
 * Announces successful form submissions
 */
export const announceFormSuccess = (message: string): void => {
  announceToScreenReader(`Success: ${message}`, 'polite');
};

/**
 * Formats currency amounts for screen readers
 */
export const formatCurrencyForScreenReader = (amount: number, currency = 'SOL'): string => {
  return `${amount.toFixed(2)} ${currency}`.replace('.', ' point ');
};

/**
 * Formats percentages for screen readers
 */
export const formatPercentageForScreenReader = (percentage: number): string => {
  return `${percentage.toFixed(1)} percent`;
};

/**
 * Formats match information for screen readers
 */
export const formatMatchForScreenReader = (agent1: string, agent2: string, status: string): string => {
  return `Match between ${agent1} and ${agent2}, status: ${status}`;
};
