/**
 * R3L:F - Centralized Debug Logging System
 *
 * Provides a unified, non-breaking interface for logging, performance monitoring,
 * and error tracking across the application. This script is self-contained and
 * can be safely included on any page.
 */

(function(window) {
    'use strict';

    // Avoid re-initializing if the script is loaded multiple times
    if (window.r3lDebug) {
        return;
    }

    const MAX_LOGS = 1000;
    let logs = [];
    let logLevel = 'INFO'; // Default log level
    const logLevels = {
        'DEBUG': 1,
        'INFO': 2,
        'WARN': 3,
        'ERROR': 4,
        'NONE': 5
    };

    /**
     * System information gathering
     */
    function getSystemInfo() {
        return {
            timestamp: new Date().toISOString(),
            url: window.location.href,
            userAgent: navigator.userAgent,
            platform: navigator.platform,
        };
    }

    /**
     * Adds a log entry.
     */
    function addLog(level, message, data = {}) {
        if (logLevels[level] < logLevels[logLevel]) {
            return;
        }

        const logEntry = { level, message, ...data, ...getSystemInfo() };
        logs.push(logEntry);
        if (logs.length > MAX_LOGS) {
            logs.shift();
        }

        const consoleMethod = level.toLowerCase() in console ? level.toLowerCase() : 'log';
        console[consoleMethod](`[R3L:${level}] ${message}`, data);
    }

    const performanceTimers = new Map();

    function startPerfTimer(name) {
        performanceTimers.set(name, performance.now());
        addLog('DEBUG', `Perf timer started: ${name}`);
    }

    function endPerfTimer(name) {
        if (!performanceTimers.has(name)) {
            addLog('WARN', `Perf timer ended but was never started: ${name}`);
            return;
        }
        const duration = performance.now() - performanceTimers.get(name);
        performanceTimers.delete(name);
        addLog('INFO', `Perf timer finished: ${name}`, { durationMs: duration });
        return duration;
    }

    const r3lDebug = {
        debug: (message, data) => addLog('DEBUG', message, data),
        info: (message, data) => addLog('INFO', message, data),
        warn: (message, data) => addLog('WARN', message, data),
        error: (message, error, data = {}) => {
            const errorData = {
                error: error ? { message: error.message, stack: error.stack } : 'N/A',
                ...data,
            };
            addLog('ERROR', message, errorData);
        },
        startPerf: startPerfTimer,
        endPerf: endPerfTimer,
        getLogs: () => [...logs],
        exportLogs: () => {
            const blob = new Blob([JSON.stringify(logs, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `r3l-logs-${new Date().toISOString()}.json`;
            a.click();
            URL.revokeObjectURL(url);
            addLog('INFO', 'Logs exported.');
        },
        clearLogs: () => {
            logs = [];
            addLog('INFO', 'Logs cleared.');
        },
        setLogLevel: (level) => {
            const upperLevel = level.toUpperCase();
            if (logLevels[upperLevel]) {
                logLevel = upperLevel;
                addLog('INFO', `Log level set to: ${logLevel}`);
            } else {
                addLog('WARN', `Invalid log level: ${level}.`);
            }
        },
    };

    // Global error handlers
    const unhandledErrorHandler = (event) => {
        addLog('ERROR', 'Unhandled global error', {
            error: {
                message: event.message,
                filename: event.filename,
                lineno: event.lineno,
                colno: event.colno,
                error: event.error ? { message: event.error.message, stack: event.error.stack } : 'N/A',
            }
        });
    };

    const unhandledRejectionHandler = (event) => {
        addLog('ERROR', 'Unhandled promise rejection', {
            reason: event.reason ? { message: event.reason.message, stack: event.reason.stack } : event.reason
        });
    };

    window.addEventListener('error', unhandledErrorHandler);
    window.addEventListener('unhandledrejection', unhandledRejectionHandler);

    // Expose the logger to the global scope
    window.r3lDebug = r3lDebug;

    addLog('INFO', 'R3L Debug Logger initialized.');

})(window);