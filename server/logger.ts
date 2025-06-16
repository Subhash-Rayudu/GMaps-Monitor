import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Define colors for each level
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
};

winston.addColors(colors);

// Custom format for console output with better readability
const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(({ timestamp, level, message, service, routeId, duration, ...meta }) => {
    let logLine = `${timestamp} [${level}]`;
    
    // Add service context if available
    if (service) {
      logLine += ` [${service}]`;
    }
    
    // Add route context if available
    if (routeId) {
      logLine += ` [Route:${routeId}]`;
    }
    
    logLine += ` ${message}`;
    
    // Add duration for performance logs
    if (duration) {
      logLine += ` (${duration}ms)`;
    }
    
    // Add other metadata
    const otherMeta = { ...meta };
    delete otherMeta.service;
    delete otherMeta.routeId;
    delete otherMeta.duration;
    
    if (Object.keys(otherMeta).length) {
      logLine += ` ${JSON.stringify(otherMeta)}`;
    }
    
    return logLine;
  })
);

// Custom format for file output
const fileFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Define transports
const transports = [
  // Console transport for development
  new winston.transports.Console({
    level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
    format: consoleFormat,
  }),
  
  // Daily rotating file for errors
  new DailyRotateFile({
    filename: 'logs/error-%DATE%.log',
    datePattern: 'YYYY-MM-DD',
    level: 'error',
    format: fileFormat,
    maxSize: '20m',
    maxFiles: '14d',
    createSymlink: true,
    symlinkName: 'error.log',
  }),
  
  // Daily rotating file for all logs
  new DailyRotateFile({
    filename: 'logs/combined-%DATE%.log',
    datePattern: 'YYYY-MM-DD',
    format: fileFormat,
    maxSize: '20m',
    maxFiles: '14d',
    createSymlink: true,
    symlinkName: 'combined.log',
  }),
];

// Create logger instance
const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  levels,
  transports,
  exitOnError: false,
});

// Create a stream object for Morgan HTTP request logging
export const morganStream = {
  write: (message: string) => {
    logger.http(message.trim());
  },
};

export default logger;