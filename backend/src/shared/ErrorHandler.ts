interface ErrorWithStatus extends Error {
  status?: number;
}

export class ErrorHandler {
  static handleError(err: ErrorWithStatus): void {
    const statusCode = err.status || 500;
    console.error(`[ERROR] ${statusCode} - ${err.message}`);
    // Here you could integrate with a monitoring service as well.
  }
}

export default ErrorHandler;
