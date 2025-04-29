const { log, error, warn, info } = console;
const isDev = process.env.NODE_ENV === 'development';

interface DebugMethods {
  log: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
  info: (...args: unknown[]) => void;
}

const debug: DebugMethods = {
  log: (...args: unknown[]) => isDev && log(...args),
  error: (...args: unknown[]) => isDev && error(...args),
  warn: (...args: unknown[]) => isDev && warn(...args),
  info: (...args: unknown[]) => isDev && info(...args),
};

export default debug;