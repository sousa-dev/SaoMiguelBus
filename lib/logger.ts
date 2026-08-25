/** Dev-only tagged logging — shows in the Metro terminal (and DevTools via j). */

const PREFIX = '[SMB]';

export const devLogsEnabled = __DEV__ && process.env.EXPO_PUBLIC_DEV_LOGS !== 'false';

function emit(level: 'log' | 'warn' | 'error', args: unknown[]) {
  if (!devLogsEnabled) {
    return;
  }
  console[level](PREFIX, ...args);
}

export const logger = {
  debug: (...args: unknown[]) => emit('log', args),
  info: (...args: unknown[]) => emit('log', args),
  warn: (...args: unknown[]) => emit('warn', args),
  error: (...args: unknown[]) => emit('error', args),
};

export function logDevStartupHint() {
  if (!devLogsEnabled) {
    return;
  }
  console.log(
    PREFIX,
    'Dev logs ON → watch this Metro terminal. Press j in Metro for React Native DevTools console.',
  );
  console.log(PREFIX, 'API base:', process.env.EXPO_PUBLIC_API_URL ?? 'http://127.0.0.1:8000');
}
