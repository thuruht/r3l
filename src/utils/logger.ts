/**
 * Structured logging utility for R3L:F
 *
 * Provides consistent log format across the application
 */

/**
 * Log levels enum
 */
export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3,
}

/**
 * Structured logger class
 */
export class Logger {
  private context: string;
  private level: LogLevel;

  /**
   * Create a new logger instance
   *
   * @param context Context name for the logger (usually class/file name)
   * @param level Minimum log level to display
   */
  constructor(context: string, level: LogLevel = LogLevel.INFO) {
    this.context = context;
    this.level = level;
  }

  /**
   * Internal log method
   *
   * @param level Log level
   * @param message Log message
   * @param meta Additional metadata
   */
  private log(level: LogLevel, message: string, meta?: any): void {
    if (level > this.level) return;

    const timestamp = new Date().toISOString();
    const levelName = LogLevel[level];

    const logEntry = {
      timestamp,
      level: levelName,
      context: this.context,
      message,
      ...meta,
    };

    // In Cloudflare Workers, console.log is sent to the logs
    console.log(JSON.stringify(logEntry));
  }

  /**
   * Log an error message
   *
   * @param message Error message
   * @param error Optional Error object
   * @param meta Additional metadata
   */
  error(message: string, error?: Error, meta?: any): void {
    this.log(LogLevel.ERROR, message, {
      error: error
        ? {
            name: error.name,
            message: error.message,
            stack: error.stack,
          }
        : undefined,
      ...meta,
    });
  }

  /**
   * Log a warning message
   *
   * @param message Warning message
   * @param meta Additional metadata
   */
  warn(message: string, meta?: any): void {
    this.log(LogLevel.WARN, message, meta);
  }

  /**
   * Log an info message
   *
   * @param message Info message
   * @param meta Additional metadata
   */
  info(message: string, meta?: any): void {
    this.log(LogLevel.INFO, message, meta);
  }

  /**
   * Log a debug message
   *
   * @param message Debug message
   * @param meta Additional metadata
   */
  debug(message: string, meta?: any): void {
    this.log(LogLevel.DEBUG, message, meta);
  }

  /**
   * Create a child logger with a sub-context
   *
   * @param subContext Sub-context name
   * @returns New logger instance
   */
  child(subContext: string): Logger {
    return new Logger(`${this.context}:${subContext}`, this.level);
  }

  /**
   * Set the minimum log level
   *
   * @param level New minimum log level
   */
  setLevel(level: LogLevel): void {
    this.level = level;
  }

  /**
   * Log request information
   *
   * @param request Request object
   * @param userId Optional user ID
   */
  logRequest(request: Request, userId?: string): void {
    this.info('Request received', {
      method: request.method,
      url: request.url,
      cf: request.cf,
      userId,
      userAgent: request.headers.get('User-Agent'),
      contentType: request.headers.get('Content-Type'),
    });
  }

  /**
   * Log response information
   *
   * @param response Response object
   * @param startTime Request start time
   */
  logResponse(response: Response, startTime: number): void {
    const duration = Date.now() - startTime;

    // Convert headers to an object
    const headers: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      headers[key] = value;
    });

    this.info('Response sent', {
      status: response.status,
      statusText: response.statusText,
      headers,
      duration: `${duration}ms`,
    });
  }
}
