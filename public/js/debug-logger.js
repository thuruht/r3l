/**
 * R3L:F Debug Logger System
 * Centralized logging for debugging and monitoring
 */

class R3LLogger {
    constructor() {
        this.enabled = true;
        this.logLevel = 'DEBUG'; // DEBUG, INFO, WARN, ERROR
        this.logs = [];
        this.maxLogs = 1000;
        this.components = new Set();
    }

    setLevel(level) {
        this.logLevel = level;
        this.info('Logger', `Log level set to ${level}`);
    }

    enable() {
        this.enabled = true;
        console.log('[R3L-Logger] Logging enabled');
    }

    disable() {
        this.enabled = false;
        console.log('[R3L-Logger] Logging disabled');
    }

    _shouldLog(level) {
        if (!this.enabled) return false;
        
        const levels = { DEBUG: 0, INFO: 1, WARN: 2, ERROR: 3 };
        return levels[level] >= levels[this.logLevel];
    }

    _log(level, component, message, data = null) {
        if (!this._shouldLog(level)) return;

        const timestamp = new Date().toISOString();
        const logEntry = {
            timestamp,
            level,
            component,
            message,
            data,
            url: window.location.href,
            userAgent: navigator.userAgent
        };

        this.logs.push(logEntry);
        this.components.add(component);

        // Keep only recent logs
        if (this.logs.length > this.maxLogs) {
            this.logs = this.logs.slice(-this.maxLogs);
        }

        // Console output with styling
        const styles = {
            DEBUG: 'color: #666; font-weight: normal',
            INFO: 'color: #2196F3; font-weight: bold',
            WARN: 'color: #FF9800; font-weight: bold',
            ERROR: 'color: #F44336; font-weight: bold'
        };

        console.log(
            `%c[${level}] [${component}] ${message}`,
            styles[level],
            data || ''
        );
    }

    debug(component, message, data) {
        this._log('DEBUG', component, message, data);
    }

    info(component, message, data) {
        this._log('INFO', component, message, data);
    }

    warn(component, message, data) {
        this._log('WARN', component, message, data);
    }

    error(component, message, data) {
        this._log('ERROR', component, message, data);
    }

    // API call logging
    logApiCall(method, url, data, response) {
        this.info('API', `${method} ${url}`, {
            request: data,
            response: response,
            status: response?.status,
            timestamp: Date.now()
        });
    }

    // User action logging
    logUserAction(action, details) {
        this.info('UserAction', action, details);
    }

    // Page navigation logging
    logPageView(page, referrer) {
        this.info('Navigation', `Page view: ${page}`, {
            page,
            referrer,
            timestamp: Date.now()
        });
    }

    // Error tracking
    logError(component, error, context) {
        this.error(component, error.message || 'Unknown error', {
            error: error.toString(),
            stack: error.stack,
            context,
            timestamp: Date.now()
        });
    }

    // Performance logging
    logPerformance(component, operation, duration) {
        this.debug('Performance', `${component}.${operation}: ${duration}ms`, {
            component,
            operation,
            duration,
            timestamp: Date.now()
        });
    }

    // Get logs for debugging
    getLogs(component = null, level = null) {
        let filtered = this.logs;
        
        if (component) {
            filtered = filtered.filter(log => log.component === component);
        }
        
        if (level) {
            filtered = filtered.filter(log => log.level === level);
        }
        
        return filtered;
    }

    // Export logs for analysis
    exportLogs() {
        const data = {
            logs: this.logs,
            components: Array.from(this.components),
            session: {
                url: window.location.href,
                userAgent: navigator.userAgent,
                timestamp: new Date().toISOString()
            }
        };
        
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `r3l-logs-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }

    // Clear logs
    clearLogs() {
        this.logs = [];
        this.components.clear();
        this.info('Logger', 'Logs cleared');
    }

    // Get system info for debugging
    getSystemInfo() {
        return {
            userAgent: navigator.userAgent,
            url: window.location.href,
            timestamp: new Date().toISOString(),
            screen: {
                width: screen.width,
                height: screen.height
            },
            viewport: {
                width: window.innerWidth,
                height: window.innerHeight
            },
            cookies: document.cookie,
            localStorage: Object.keys(localStorage),
            sessionStorage: Object.keys(sessionStorage)
        };
    }
}

// Create global logger instance
window.R3LLogger = new R3LLogger();

// Global error handler
window.addEventListener('error', (event) => {
    window.R3LLogger.logError('Global', event.error, {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno
    });
});

// Unhandled promise rejection handler
window.addEventListener('unhandledrejection', (event) => {
    window.R3LLogger.logError('Promise', event.reason, {
        type: 'unhandledrejection'
    });
});

// Page visibility change logging
document.addEventListener('visibilitychange', () => {
    window.R3LLogger.logUserAction('VisibilityChange', {
        hidden: document.hidden,
        visibilityState: document.visibilityState
    });
});

// Console commands for debugging
window.r3lDebug = {
    logs: () => window.R3LLogger.getLogs(),
    export: () => window.R3LLogger.exportLogs(),
    clear: () => window.R3LLogger.clearLogs(),
    info: () => window.R3LLogger.getSystemInfo(),
    enable: () => window.R3LLogger.enable(),
    disable: () => window.R3LLogger.disable(),
    level: (level) => window.R3LLogger.setLevel(level)
};

console.log('%cR3L:F Debug Logger initialized. Use r3lDebug.* commands for debugging.', 'color: #4CAF50; font-weight: bold');