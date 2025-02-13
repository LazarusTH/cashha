type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface LogEntry {
  level: LogLevel
  message: string
  timestamp: string
  context?: Record<string, any>
  error?: Error
}

class Logger {
  private static instance: Logger
  private isDevelopment = process.env.NODE_ENV === 'development'

  private constructor() {}

  public static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger()
    }
    return Logger.instance
  }

  private formatMessage(entry: LogEntry): string {
    const timestamp = new Date(entry.timestamp).toISOString()
    const level = entry.level.toUpperCase().padEnd(5)
    let message = `[${timestamp}] ${level} ${entry.message}`

    if (entry.context) {
      message += `\nContext: ${JSON.stringify(entry.context, null, 2)}`
    }

    if (entry.error) {
      message += `\nError: ${entry.error.message}`
      if (this.isDevelopment && entry.error.stack) {
        message += `\nStack: ${entry.error.stack}`
      }
    }

    return message
  }

  private log(entry: LogEntry): void {
    const formattedMessage = this.formatMessage(entry)

    switch (entry.level) {
      case 'debug':
        if (this.isDevelopment) {
          console.debug(formattedMessage)
        }
        break
      case 'info':
        console.info(formattedMessage)
        break
      case 'warn':
        console.warn(formattedMessage)
        break
      case 'error':
        console.error(formattedMessage)
        break
    }

    // In production, you might want to send logs to a logging service
    if (process.env.NODE_ENV === 'production') {
      this.sendToLoggingService(entry)
    }
  }

  private async sendToLoggingService(entry: LogEntry): Promise<void> {
    // TODO: Implement sending logs to your preferred logging service
    // Example: Sentry, LogRocket, etc.
    try {
      // Your implementation here
    } catch (error) {
      console.error('Failed to send log to logging service:', error)
    }
  }

  public debug(message: string, context?: Record<string, any>): void {
    this.log({
      level: 'debug',
      message,
      timestamp: new Date().toISOString(),
      context
    })
  }

  public info(message: string, context?: Record<string, any>): void {
    this.log({
      level: 'info',
      message,
      timestamp: new Date().toISOString(),
      context
    })
  }

  public warn(message: string, context?: Record<string, any>): void {
    this.log({
      level: 'warn',
      message,
      timestamp: new Date().toISOString(),
      context
    })
  }

  public error(message: string, error?: Error, context?: Record<string, any>): void {
    this.log({
      level: 'error',
      message,
      timestamp: new Date().toISOString(),
      context,
      error
    })
  }

  public async flush(): Promise<void> {
    // Implement if you need to ensure all logs are sent before shutting down
  }
}

// Export a singleton instance
export const logger = Logger.getInstance()

// Export types for use in other files
export type { LogLevel, LogEntry } 