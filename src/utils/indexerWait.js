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
    failFastOnError = true, // ← NEW: fail immediately if checkFn throws
  } = options;

  let delay = initialDelayMs;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    let result;

    try {
      result = await checkFn();
    } catch (err) {
      // The check itself failed (Parse error, permission, network) —
      // this is NOT "not yet indexed", it's a real problem. Retrying won't fix it.
      console.error(`[indexerWait] ${resourceName} check threw on attempt ${attempt}:`, err);

      if (failFastOnError) {
        // Preserve the original error message so the toast can display it
        const wrapped = new Error(err?.message || err?.reason || String(err));
        wrapped.cause = err;
        wrapped.originalError = err;
        wrapped.resourceName = resourceName;
        throw wrapped;
      }

      // Legacy behavior: treat as "not yet indexed", continue polling
      result = null;
    }

    if (onAttempt) {
      try {
        onAttempt(attempt, maxAttempts);
      } catch (e) {
        /* ignore */
      }
    }

    if (result) {
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
