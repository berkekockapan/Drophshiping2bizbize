const RETRYABLE_D1_ERROR_FRAGMENTS = [
  "network connection lost",
  "storage caused object to be reset",
  "reset because its code was updated",
] as const;

function defaultSleep(delayMs: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, delayMs);
  });
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

export interface RunWithWriteRetryOptions {
  maxAttempts?: number;
  sleep?: (delayMs: number) => Promise<void>;
}

export async function runWithWriteRetry<T>(
  operation: () => Promise<T>,
  options: RunWithWriteRetryOptions = {},
): Promise<T> {
  const maxAttempts = options.maxAttempts ?? 3;
  const sleep = options.sleep ?? defaultSleep;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      const normalizedMessage = getErrorMessage(error).toLowerCase();
      const retryable = RETRYABLE_D1_ERROR_FRAGMENTS.some((fragment) => normalizedMessage.includes(fragment));

      if (!retryable || attempt === maxAttempts) {
        throw error;
      }

      await sleep(50 * 2 ** (attempt - 1));
    }
  }

  throw new Error("Unreachable retry state");
}
