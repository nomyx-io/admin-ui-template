import { awaitTimeout } from "./index";

const DEFAULT_CONFIG = {
  maxAttempts: 12,
  initialDelayMs: 1500,
  maxDelayMs: 8000,
  backoffMultiplier: 1.5,
};

export async function waitForIndexer(checkFn, options = {}) {
  const {
    resourceName = "resource",
    maxAttempts = DEFAULT_CONFIG.maxAttempts,
    initialDelayMs = DEFAULT_CONFIG.initialDelayMs,
    maxDelayMs = DEFAULT_CONFIG.maxDelayMs,
    backoffMultiplier = DEFAULT_CONFIG.backoffMultiplier,
    onAttempt,
    maxConsecutiveErrors = 4,
  } = options;

  let delay = initialDelayMs;
  let consecutiveErrors = 0;
  let lastError = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    let checkSucceeded = false;
    let result;

    try {
      result = await checkFn();
      checkSucceeded = true;
      consecutiveErrors = 0;
    } catch (err) {
      consecutiveErrors++;
      lastError = err;
      console.warn(`[indexerWait] ${resourceName} attempt ${attempt}/${maxAttempts} threw:`, err?.message || err);

      if (consecutiveErrors >= maxConsecutiveErrors) {
        throw new Error(`Unable to verify ${resourceName} — indexer check failed repeatedly. ` + `Last error: ${lastError?.message || lastError}`);
      }
    }

    if (checkSucceeded && onAttempt) {
      try {
        onAttempt(attempt, maxAttempts);
      } catch (e) {
        /* ignore */
      }
    }

    if (checkSucceeded && result) {
      console.log(`[indexerWait] ${resourceName} indexed on attempt ${attempt}`);
      return result;
    }

    if (attempt < maxAttempts) {
      await awaitTimeout(delay);
      delay = Math.min(delay * backoffMultiplier, maxDelayMs);
    }
  }

  throw new Error(`${resourceName} not yet indexed after ${maxAttempts} attempts. Please refresh in a moment.`);
}

export async function retryDbWrite(writeFn, options = {}) {
  const { retries = 3, baseDelayMs = 1000, operationName = "DB write" } = options;
  let lastErr;
  for (let i = 0; i < retries; i++) {
    try {
      return await writeFn();
    } catch (err) {
      lastErr = err;
      console.warn(`[retryDbWrite] ${operationName} attempt ${i + 1} failed:`, err?.message);
      if (i < retries - 1) await awaitTimeout(baseDelayMs * (i + 1));
    }
  }
  throw lastErr;
}

export async function waitAndUpdate({ fetchFn, updateFn, resourceName, waitOptions = {} }) {
  const row = await waitForIndexer(fetchFn, { resourceName, ...waitOptions });
  return retryDbWrite(() => updateFn(row), { operationName: `Update ${resourceName}` });
}
