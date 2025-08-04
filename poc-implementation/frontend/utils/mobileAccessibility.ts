// Mobile accessibility utilities for touch interactions and screen readers

/**
 * Mobile accessibility configuration
 */
export const MOBILE_A11Y_CONFIG = {
  // WCAG AA minimum touch target size
  MIN_TOUCH_TARGET_SIZE: 44, // 44px minimum

  // Touch feedback duration
  TOUCH_FEEDBACK_DURATION: 150,

  // Swipe gesture thresholds
  SWIPE_THRESHOLD: 50,
  SWIPE_VELOCITY_THRESHOLD: 0.3,

  // Voice input delays
  VOICE_INPUT_DELAY: 1000,
} as const;

/**
 * Detects if the device is a mobile device
 */
export const isMobileDevice = (): boolean => {
  if (typeof window === 'undefined') return false;

  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  ) || window.innerWidth <= 768;
};

/**
 * Detects if VoiceOver is running (iOS)
 */
export const isVoiceOverRunning = (): boolean => {
  if (typeof window === 'undefined') return false;

  // Check for VoiceOver specific indicators
  return (
    (window as any).speechSynthesis &&
    (window as any).speechSynthesis.speaking === false &&
    navigator.userAgent.includes('Safari') &&
    !navigator.userAgent.includes('Chrome')
  );
};

/**
 * Detects if TalkBack is running (Android)
 */
export const isTalkBackRunning = (): boolean => {
  if (typeof window === 'undefined') return false;

  // Check for Android TalkBack indicators
  return (
    navigator.userAgent.includes('Android') &&
    (window as any).speechSynthesis !== undefined
  );
};

/**
 * Announces content to mobile screen readers
 */
export const announceMobile = (message: string, priority: 'polite' | 'assertive' = 'polite'): void => {
  if (typeof document === 'undefined') return;

  const announcement = document.createElement('div');
  announcement.setAttribute('aria-live', priority);
  announcement.setAttribute('aria-atomic', 'true');
  announcement.className = 'sr-only';
  announcement.textContent = message;

  document.body.appendChild(announcement);

  // Remove after announcement
  setTimeout(() => {
    if (document.body.contains(announcement)) {
      document.body.removeChild(announcement);
    }
  }, 1000);
};

/**
 * Touch gesture handler for swipe detection
 */
export class TouchGestureHandler {
  private startX = 0;
  private startY = 0;
  private startTime = 0;
  private element: HTMLElement;

  constructor(element: HTMLElement) {
    this.element = element;
    this.setupTouchListeners();
  }

  private setupTouchListeners(): void {
    this.element.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: false });
    this.element.addEventListener('touchend', this.handleTouchEnd.bind(this), { passive: false });
  }

  private handleTouchStart(e: TouchEvent): void {
    const touch = e.touches[0];
    this.startX = touch.clientX;
    this.startY = touch.clientY;
    this.startTime = Date.now();
  }

  private handleTouchEnd(e: TouchEvent): void {
    const touch = e.changedTouches[0];
    const endX = touch.clientX;
    const endY = touch.clientY;
    const endTime = Date.now();

    const deltaX = endX - this.startX;
    const deltaY = endY - this.startY;
    const deltaTime = endTime - this.startTime;

    const velocity = Math.sqrt(deltaX * deltaX + deltaY * deltaY) / deltaTime;

    if (velocity > MOBILE_A11Y_CONFIG.SWIPE_VELOCITY_THRESHOLD) {
      this.detectSwipeDirection(deltaX, deltaY);
    }
  }

  private detectSwipeDirection(deltaX: number, deltaY: number): void {
    const absX = Math.abs(deltaX);
    const absY = Math.abs(deltaY);

    if (absX > MOBILE_A11Y_CONFIG.SWIPE_THRESHOLD || absY > MOBILE_A11Y_CONFIG.SWIPE_THRESHOLD) {
      if (absX > absY) {
        // Horizontal swipe
        const direction = deltaX > 0 ? 'right' : 'left';
        this.triggerSwipeEvent(direction);
      } else {
        // Vertical swipe
        const direction = deltaY > 0 ? 'down' : 'up';
        this.triggerSwipeEvent(direction);
      }
    }
  }

  private triggerSwipeEvent(direction: 'left' | 'right' | 'up' | 'down'): void {
    const swipeEvent = new CustomEvent('swipe', {
      detail: { direction },
      bubbles: true,
      cancelable: true
    });

    this.element.dispatchEvent(swipeEvent);
    announceMobile(`Swiped ${direction}`, 'polite');
  }

  destroy(): void {
    this.element.removeEventListener('touchstart', this.handleTouchStart.bind(this));
    this.element.removeEventListener('touchend', this.handleTouchEnd.bind(this));
  }
}

/**
 * Creates mobile-friendly touch targets
 */
export const createTouchTarget = (element: HTMLElement): void => {
  const currentStyle = window.getComputedStyle(element);
  const currentWidth = parseInt(currentStyle.width);
  const currentHeight = parseInt(currentStyle.height);

  const minSize = MOBILE_A11Y_CONFIG.MIN_TOUCH_TARGET_SIZE;

  if (currentWidth < minSize || currentHeight < minSize) {
    element.style.minWidth = `${minSize}px`;
    element.style.minHeight = `${minSize}px`;
    element.style.display = 'inline-flex';
    element.style.alignItems = 'center';
    element.style.justifyContent = 'center';
  }
};

/**
 * Adds haptic feedback for mobile interactions
 */
export const addHapticFeedback = (type: 'light' | 'medium' | 'heavy' = 'light'): void => {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    const patterns = {
      light: [10],
      medium: [20],
      heavy: [30]
    };

    navigator.vibrate(patterns[type]);
  }
};

/**
 * Voice input support for mobile
 */
export class VoiceInputHandler {
  private recognition: any = null;
  private isListening = false;

  constructor() {
    this.initializeSpeechRecognition();
  }

  private initializeSpeechRecognition(): void {
    if (typeof window === 'undefined') return;

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      this.recognition = new SpeechRecognition();
      this.recognition.continuous = false;
      this.recognition.interimResults = false;
      this.recognition.lang = 'en-US';

      this.recognition.onresult = this.handleSpeechResult.bind(this);
      this.recognition.onerror = this.handleSpeechError.bind(this);
      this.recognition.onend = this.handleSpeechEnd.bind(this);
    }
  }

  startListening(): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!this.recognition) {
        reject(new Error('Speech recognition not supported'));
        return;
      }

      if (this.isListening) {
        reject(new Error('Already listening'));
        return;
      }

      this.isListening = true;
      this.recognition.onresult = (event: any) => {
        const result = event.results[0][0].transcript;
        resolve(result);
      };

      this.recognition.onerror = (event: any) => {
        reject(new Error(event.error));
      };

      this.recognition.start();
      announceMobile('Listening for voice input', 'polite');
    });
  }

  stopListening(): void {
    if (this.recognition && this.isListening) {
      this.recognition.stop();
      this.isListening = false;
    }
  }

  private handleSpeechResult(event: any): void {
    const result = event.results[0][0].transcript;
    announceMobile(`Voice input received: ${result}`, 'polite');
  }

  private handleSpeechError(event: any): void {
    announceMobile(`Voice input error: ${event.error}`, 'assertive');
    this.isListening = false;
  }

  private handleSpeechEnd(): void {
    this.isListening = false;
    announceMobile('Voice input ended', 'polite');
  }
}

/**
 * Mobile-specific ARIA announcements for gaming actions
 */
export const mobileGameAnnouncements = {
  pieceSelected: (piece: string, position: string) =>
    announceMobile(`Selected ${piece} at ${position}. Double tap to confirm move.`, 'polite'),

  moveMade: (piece: string, from: string, to: string) =>
    announceMobile(`Moved ${piece} from ${from} to ${to}`, 'polite'),

  betPlaced: (amount: string, agent: string) =>
    announceMobile(`Placed bet of ${amount} on ${agent}`, 'polite'),

  gameStateChange: (state: string) =>
    announceMobile(`Game state: ${state}`, 'assertive'),

  connectionStatus: (status: string) =>
    announceMobile(`Connection ${status}`, status === 'connected' ? 'polite' : 'assertive'),
};

/**
 * Touch-friendly button configuration
 */
export const configureTouchButton = (button: HTMLElement, options?: {
  feedback?: boolean;
  haptic?: 'light' | 'medium' | 'heavy';
  announcement?: string;
}): void => {
  // Ensure minimum touch target size
  createTouchTarget(button);

  // Add touch feedback
  if (options?.feedback !== false) {
    button.addEventListener('touchstart', () => {
      button.style.transform = 'scale(0.95)';
      if (options?.haptic) {
        addHapticFeedback(options.haptic);
      }
    });

    button.addEventListener('touchend', () => {
      setTimeout(() => {
        button.style.transform = '';
      }, MOBILE_A11Y_CONFIG.TOUCH_FEEDBACK_DURATION);

      if (options?.announcement) {
        announceMobile(options.announcement, 'polite');
      }
    });
  }

  // Ensure proper focus management
  button.addEventListener('focus', () => {
    if (isMobileDevice()) {
      button.style.outline = '3px solid #4ECDC4';
      button.style.outlineOffset = '2px';
    }
  });

  button.addEventListener('blur', () => {
    button.style.outline = '';
    button.style.outlineOffset = '';
  });
};
