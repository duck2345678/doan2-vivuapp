/**
 * Logger Utility
 * Centralized logging with different levels
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
    [key: string]: unknown;
}

const LOG_LEVELS: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
};

// Set minimum log level based on environment
const MIN_LOG_LEVEL: LogLevel = __DEV__ ? 'debug' : 'warn';

function shouldLog(level: LogLevel): boolean {
    return LOG_LEVELS[level] >= LOG_LEVELS[MIN_LOG_LEVEL];
}

function formatMessage(level: LogLevel, message: string, context?: LogContext): string {
    const timestamp = new Date().toISOString();
    const contextStr = context ? ` ${JSON.stringify(context)}` : '';
    return `[${timestamp}] [${level.toUpperCase()}] ${message}${contextStr}`;
}

/**
 * Logger with different log levels
 */
export const logger = {
    debug: (message: string, context?: LogContext): void => {
        if (shouldLog('debug')) {
            console.debug(formatMessage('debug', message, context));
        }
    },

    info: (message: string, context?: LogContext): void => {
        if (shouldLog('info')) {
            console.info(formatMessage('info', message, context));
        }
    },

    warn: (message: string, context?: LogContext): void => {
        if (shouldLog('warn')) {
            console.warn(formatMessage('warn', message, context));
        }
    },

    error: (message: string, context?: LogContext): void => {
        if (shouldLog('error')) {
            console.error(formatMessage('error', message, context));
        }
    },

    /**
     * Log with custom level
     */
    log: (level: LogLevel, message: string, context?: LogContext): void => {
        if (shouldLog(level)) {
            const formatted = formatMessage(level, message, context);
            switch (level) {
                case 'debug':
                    console.debug(formatted);
                    break;
                case 'info':
                    console.info(formatted);
                    break;
                case 'warn':
                    console.warn(formatted);
                    break;
                case 'error':
                    console.error(formatted);
                    break;
            }
        }
    },

    /**
     * Create a child logger with preset context
     */
    child: (baseContext: LogContext) => ({
        debug: (message: string, context?: LogContext) =>
            logger.debug(message, { ...baseContext, ...context }),
        info: (message: string, context?: LogContext) =>
            logger.info(message, { ...baseContext, ...context }),
        warn: (message: string, context?: LogContext) =>
            logger.warn(message, { ...baseContext, ...context }),
        error: (message: string, context?: LogContext) =>
            logger.error(message, { ...baseContext, ...context }),
    }),
};
