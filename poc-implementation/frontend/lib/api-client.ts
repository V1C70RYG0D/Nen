/**
 * HTTP API Client for Nen Platform
 * Provides a centralized, error-resilient HTTP client with retry logic, 
 * rate limiting, and comprehensive error handling
 */

import { 
  apiConfig, 
  httpClientConfig, 
  apiErrors, 
  errorMessages, 
  ApiResponse,
  PaginatedResponse 
} from './api-config';

// Rate limiting state
interface RateLimitState {
  requests: number[];
  lastReset: number;
}

class RateLimiter {
  private state: RateLimitState = {
    requests: [],
    lastReset: Date.now(),
  };

  private readonly maxRequests = 60; // per minute
  private readonly windowMs = 60 * 1000; // 1 minute

  canMakeRequest(): boolean {
    const now = Date.now();
    
    // Reset window if needed
    if (now - this.state.lastReset > this.windowMs) {
      this.state.requests = [];
      this.state.lastReset = now;
    }

    // Filter out old requests
    this.state.requests = this.state.requests.filter(
      timestamp => now - timestamp < this.windowMs
    );

    return this.state.requests.length < this.maxRequests;
  }

  recordRequest(): void {
    this.state.requests.push(Date.now());
  }

  getRetryAfter(): number {
    const oldestRequest = Math.min(...this.state.requests);
    const retryAfter = this.windowMs - (Date.now() - oldestRequest);
    return Math.max(0, Math.ceil(retryAfter / 1000)); // seconds
  }
}

export class ApiError extends Error {
  public readonly code: string;
  public readonly status?: number;
  public readonly retryAfter?: number;

  constructor(
    message: string, 
    code: string, 
    status?: number, 
    retryAfter?: number
  ) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
    this.retryAfter = retryAfter;
  }
}

class ApiClient {
  private rateLimiter = new RateLimiter();
  private abortControllers = new Map<string, AbortController>();

  private createAbortController(requestId: string): AbortSignal {
    // Cancel any existing request with the same ID
    const existingController = this.abortControllers.get(requestId);
    if (existingController) {
      existingController.abort();
    }

    const controller = new AbortController();
    this.abortControllers.set(requestId, controller);

    // Clean up after timeout
    setTimeout(() => {
      this.abortControllers.delete(requestId);
    }, apiConfig.timeout);

    return controller.signal;
  }

  private async handleResponse<T>(response: Response): Promise<ApiResponse<T>> {
    let data: any;
    
    try {
      data = await response.json();
    } catch (error) {
      throw new ApiError(
        'Invalid JSON response from server',
        apiErrors.SERVER_ERROR,
        response.status
      );
    }

    if (!response.ok) {
      const errorCode = this.getErrorCode(response.status);
      const errorMessage = data.message || data.error || errorMessages[errorCode];
      
      const retryAfter = response.headers.get('Retry-After');
      throw new ApiError(
        errorMessage,
        errorCode,
        response.status,
        retryAfter ? parseInt(retryAfter) : undefined
      );
    }

    return data as ApiResponse<T>;
  }

  private getErrorCode(status: number): string {
    switch (status) {
      case 401:
        return apiErrors.UNAUTHORIZED;
      case 403:
        return apiErrors.FORBIDDEN;
      case 404:
        return apiErrors.NOT_FOUND;
      case 400:
        return apiErrors.VALIDATION_ERROR;
      case 429:
        return apiErrors.RATE_LIMITED;
      case 500:
      case 502:
      case 503:
      case 504:
        return apiErrors.SERVER_ERROR;
      default:
        return apiErrors.SERVER_ERROR;
    }
  }

  private async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private shouldRetry(error: ApiError, attempt: number): boolean {
    if (attempt >= apiConfig.retryAttempts) {
      return false;
    }

    // Retry on network errors, timeouts, and server errors
    const retryableErrors = [
      apiErrors.NETWORK_ERROR,
      apiErrors.TIMEOUT_ERROR,
      apiErrors.SERVER_ERROR,
    ];

    return retryableErrors.includes(error.code);
  }

  private getRetryDelay(attempt: number, error: ApiError): number {
    // Use server-provided retry-after if available
    if (error.retryAfter) {
      return error.retryAfter * 1000;
    }

    // Exponential backoff with jitter
    const baseDelay = apiConfig.retryDelay;
    const exponentialDelay = baseDelay * Math.pow(2, attempt - 1);
    const jitter = Math.random() * 0.1 * exponentialDelay;
    
    return Math.min(exponentialDelay + jitter, 30000); // Max 30 seconds
  }

  async request<T>(
    endpoint: string,
    options: RequestInit = {},
    requestId?: string
  ): Promise<ApiResponse<T>> {
    // Rate limiting check
    if (!this.rateLimiter.canMakeRequest()) {
      const retryAfter = this.rateLimiter.getRetryAfter();
      throw new ApiError(
        errorMessages[apiErrors.RATE_LIMITED],
        apiErrors.RATE_LIMITED,
        429,
        retryAfter
      );
    }

    const url = `${apiConfig.baseUrl}${endpoint}`;
    const signal = requestId ? this.createAbortController(requestId) : undefined;
    
    const requestOptions: RequestInit = {
      ...httpClientConfig,
      ...options,
      signal,
      headers: {
        ...httpClientConfig.headers,
        ...options.headers,
      },
    };

    let lastError: ApiError;

    for (let attempt = 1; attempt <= apiConfig.retryAttempts; attempt++) {
      try {
        this.rateLimiter.recordRequest();

        const response = await fetch(url, requestOptions);
        return await this.handleResponse<T>(response);

      } catch (error) {
        // Handle fetch errors
        if (error instanceof ApiError) {
          lastError = error;
        } else if (error instanceof DOMException && error.name === 'AbortError') {
          lastError = new ApiError(
            'Request was cancelled',
            apiErrors.TIMEOUT_ERROR
          );
        } else if (error instanceof TypeError && error.message.includes('fetch')) {
          lastError = new ApiError(
            errorMessages[apiErrors.NETWORK_ERROR],
            apiErrors.NETWORK_ERROR
          );
        } else {
          lastError = new ApiError(
            error instanceof Error ? error.message : 'Unknown error occurred',
            apiErrors.SERVER_ERROR
          );
        }

        // Don't retry if this was the last attempt
        if (!this.shouldRetry(lastError, attempt)) {
          break;
        }

        // Wait before retrying
        const retryDelay = this.getRetryDelay(attempt, lastError);
        await this.sleep(retryDelay);
      }
    }

    throw lastError!;
  }

  // Convenience methods
  async get<T>(endpoint: string, requestId?: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'GET' }, requestId);
  }

  async post<T>(
    endpoint: string, 
    data?: any, 
    requestId?: string
  ): Promise<ApiResponse<T>> {
    return this.request<T>(
      endpoint, 
      {
        method: 'POST',
        body: data ? JSON.stringify(data) : undefined,
      },
      requestId
    );
  }

  async put<T>(
    endpoint: string, 
    data?: any, 
    requestId?: string
  ): Promise<ApiResponse<T>> {
    return this.request<T>(
      endpoint,
      {
        method: 'PUT',
        body: data ? JSON.stringify(data) : undefined,
      },
      requestId
    );
  }

  async delete<T>(endpoint: string, requestId?: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'DELETE' }, requestId);
  }

  // Cancel all pending requests
  cancelAllRequests(): void {
    this.abortControllers.forEach(controller => controller.abort());
    this.abortControllers.clear();
  }

  // Cancel specific request
  cancelRequest(requestId: string): void {
    const controller = this.abortControllers.get(requestId);
    if (controller) {
      controller.abort();
      this.abortControllers.delete(requestId);
    }
  }
}

// Export singleton instance
export const apiClient = new ApiClient();

// Utility function for handling API responses in components
export const handleApiResponse = <T>(
  response: ApiResponse<T>,
  onSuccess?: (data: T) => void,
  onError?: (error: string) => void
): T | null => {
  if (response.success && response.data) {
    onSuccess?.(response.data);
    return response.data;
  } else {
    const errorMessage = response.error || response.message || 'Unknown error occurred';
    onError?.(errorMessage);
    return null;
  }
};

// Type-safe query parameter builder
export const buildQueryParams = (params: Record<string, any>): string => {
  const searchParams = new URLSearchParams();
  
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      searchParams.append(key, String(value));
    }
  });
  
  const queryString = searchParams.toString();
  return queryString ? `?${queryString}` : '';
};
