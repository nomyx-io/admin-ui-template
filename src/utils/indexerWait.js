import { awaitTimeout } from "./index"; // adjust path to your existing awaitTimeout

/**
 * Total worst-case wait: ~75s (12 attempts with backoff 1.5s → 8s)
 * Fast networks resolve on attempt 1-2 (~3s).
 */
const DEFAULT_CONFIG = {
  maxAttempts: 12,
  initialDelayMs: 1500,
  maxDelayMs: 8000,
  backoffMultiplier: 1.5,
};

/**
 * Generic poller — repeatedly invokes `checkFn` until it returns a truthy value.
 *
 * @param {Function} checkFn   async () => any. Truthy result = success, returned to caller.
 * @param {Object}   options
 * @param {string}   options.resourceName  Human-readable name for error messages (e.g. "Claim Topic 3")
 * @param {number}   [options.maxAttempts]
 * @param {number}   [options.initialDelayMs]
 * @param {number}   [options.maxDelayMs]
 * @param {number}   [options.backoffMultiplier]
 * @param {Function} [options.onAttempt]   (attempt, maxAttempts) => void — for UI updates
 * @returns {Promise<any>} the truthy value returned by checkFn
 * @throws if maxAttempts exhausted without success
 */
export async function waitForIndexer(checkFn, options = {}) {
  const {
    resourceName = "resource",
    maxAttempts = DEFAULT_CONFIG.maxAttempts,
    initialDelayMs = DEFAULT_CONFIG.initialDelayMs,
    maxDelayMs = DEFAULT_CONFIG.maxDelayMs,
    backoffMultiplier = DEFAULT_CONFIG.backoffMultiplier,
    onAttempt,
  } = options;

  let delay = initialDelayMs;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    if (onAttempt) {
      try {
        onAttempt(attempt, maxAttempts);
      } catch (e) {
        /* ignore UI callback errors */
      }
    }

    try {
      const result = await checkFn();
      if (result) {
        console.log(`[indexerWait] ${resourceName} indexed on attempt ${attempt}`);
        return result;
      }
    } catch (err) {
      console.warn(`[indexerWait] ${resourceName} attempt ${attempt}/${maxAttempts} threw:`, err?.message || err);
    }

    if (attempt < maxAttempts) {
      await awaitTimeout(delay);
      delay = Math.min(delay * backoffMultiplier, maxDelayMs);
    }
  }

  throw new Error(
    `${resourceName} was not indexed after ${maxAttempts} attempts. ` +
      `The on-chain transaction likely succeeded — please refresh the page in a moment.`
  );
}

/**
 * Retry wrapper for off-chain DB writes (Parse/Back4App updateXxx calls).
 * Use when the row exists but the write itself might transiently fail.
 */
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

/**
 * Convenience: wait for a Parse/Back4App row to appear, then update it.
 * This is the canonical "create on chain → wait for indexer → patch metadata" pattern.
 *
 * @param {Object} args
 * @param {Function} args.fetchFn      async () => row | null/undefined
 * @param {Function} args.updateFn     async (row?) => void  — called once row exists
 * @param {string}   args.resourceName For logging/errors
 * @param {Object}   [args.waitOptions]
 */
export async function waitAndUpdate({ fetchFn, updateFn, resourceName, waitOptions = {} }) {
  const row = await waitForIndexer(fetchFn, { resourceName, ...waitOptions });
  return retryDbWrite(() => updateFn(row), { operationName: `Update ${resourceName}` });
}
