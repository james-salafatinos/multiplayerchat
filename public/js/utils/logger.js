/**
 * Logger utility for structured logging across the application
 * Controls verbosity and provides consistent formatting
 */

// Log levels
const LogLevels = {
  ERROR: 0,   // Critical errors that prevent functionality
  WARN: 1,    // Non-critical problems that may affect behavior
  INFO: 2,    // Important system state changes and events
  DEBUG: 3,   // Detailed information for debugging issues
  TRACE: 4    // Most granular information (networking, rendering frames)
};

// Log categories for better filtering
const LogCategories = {
  SYSTEM: 'SYSTEM',     // Core system operations
  NETWORK: 'NETWORK',   // Network operations
  RENDER: 'RENDER',     // Rendering operations
  PHYSICS: 'PHYSICS',   // Physics calculations
  ENTITY: 'ENTITY',     // Entity creation/deletion
  PLAYER: 'PLAYER',     // Player-specific events
  CHUNK: 'CHUNK',       // Chunk loading/management
  INPUT: 'INPUT'        // User input handling
};

// Default log level - change this to control verbosity
let CURRENT_LOG_LEVEL = LogLevels.INFO;

// Enable/disable specific categories (all enabled by default)
const ENABLED_CATEGORIES = Object.values(LogCategories).reduce((obj, cat) => {
  obj[cat] = true;
  return obj;
}, {});

// Preserve original console methods so Logger can safely call them without recursion
const nativeConsole = {
  error: console.error.bind(console),
  warn: console.warn.bind(console),
  info: console.info.bind(console),
  debug: console.debug.bind(console),
  log: console.log.bind(console),
};

/**
 * Get formatted timestamp for logs
 * @return {string} Formatted timestamp
 */
const getTimestamp = () => {
  const now = new Date();
  return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}.${now.getMilliseconds().toString().padStart(3, '0')}`;
};

/**
 * Log a message with the specified level and category
 * @param {number} level - Log level from LogLevels
 * @param {string} category - Log category from LogCategories
 * @param {string} system - System name (e.g., 'ChunkSystem', 'MovementSystem')
 * @param {string} message - Message to log
 * @param {any} [data] - Optional data to include in the log
 */
const log = (level, category, system, message, data) => {
  // Skip if log level is too detailed for current setting
  if (level > CURRENT_LOG_LEVEL) return;
  
  // Skip if category is disabled
  if (!ENABLED_CATEGORIES[category]) return;
  
  const timestamp = getTimestamp();
  const prefix = `[${timestamp}][${category}][${system}]`;
  
  
  switch (level) {
    case LogLevels.ERROR:
      nativeConsole.error(`${prefix} 🔴 ERROR:`, message, data !== undefined ? data : '');
      break;
    case LogLevels.WARN:
      nativeConsole.warn(`${prefix} 🟠 WARN:`, message, data !== undefined ? data : '');
      break;
    case LogLevels.INFO:
      nativeConsole.info(`${prefix} 🔵 INFO:`, message, data !== undefined ? data : '');
      break;
    case LogLevels.DEBUG:
      nativeConsole.debug(`${prefix} 🟢 DEBUG:`, message, data !== undefined ? data : '');
      break;
    case LogLevels.TRACE:
      nativeConsole.debug(`${prefix} ⚪ TRACE:`, message, data !== undefined ? data : '');
      break;
    default:
      nativeConsole.log(`${prefix}`, message, data !== undefined ? data : '');
  }
};

/**
 * Configure the logger
 * @param {Object} config - Configuration object
 * @param {number} [config.level] - New log level
 * @param {Object} [config.categories] - Categories to enable/disable {CATEGORY: boolean}
 */
const configure = (config) => {
  if (config.level !== undefined) {
    CURRENT_LOG_LEVEL = config.level;
    log(LogLevels.SYSTEM, LogCategories.SYSTEM, 'Logger', `Log level set to ${getLogLevelName(CURRENT_LOG_LEVEL)}`);
  }
  
  if (config.categories) {
    Object.entries(config.categories).forEach(([category, enabled]) => {
      if (ENABLED_CATEGORIES[category] !== undefined) {
        ENABLED_CATEGORIES[category] = enabled;
      }
    });
  }
};

/**
 * Get the name of a log level
 * @param {number} level - Log level
 * @return {string} Name of the log level
 */
const getLogLevelName = (level) => {
  return Object.entries(LogLevels).find(([_, val]) => val === level)?.[0] || 'UNKNOWN';
};

// Convenience methods for each log level
const error = (category, system, message, data) => log(LogLevels.ERROR, category, system, message, data);
const warn = (category, system, message, data) => log(LogLevels.WARN, category, system, message, data);
const info = (category, system, message, data) => log(LogLevels.INFO, category, system, message, data);
const debug = (category, system, message, data) => log(LogLevels.DEBUG, category, system, message, data);
const trace = (category, system, message, data) => log(LogLevels.TRACE, category, system, message, data);

// Create logger object for export
const Logger = {
  LogLevels,
  LogCategories,
  configure,
  log,
  error,
  warn,
  info,
  debug,
  trace
};

export default Logger;

// Redirect built-in console methods to structured Logger calls for consistency
['error','warn','info','debug','log'].forEach((method) => {
  console[method] = (...args) => {
    switch (method) {
      case 'error':
        Logger.error(LogCategories.SYSTEM, 'Console', args.join(' '));
        break;
      case 'warn':
        Logger.warn(LogCategories.SYSTEM, 'Console', args.join(' '));
        break;
      case 'info':
        Logger.info(LogCategories.SYSTEM, 'Console', args.join(' '));
        break;
      case 'debug':
        Logger.debug(LogCategories.SYSTEM, 'Console', args.join(' '));
        break;
      case 'log':
      default:
        Logger.debug(LogCategories.SYSTEM, 'Console', args.join(' '));
    }
  };
});
