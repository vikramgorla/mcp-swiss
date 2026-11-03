import { expect } from "vitest";

/**
 * `npm test` must never touch the network: a test that quietly reaches a live
 * API passes on real data, hides a broken mock, and fails in a sandbox. Any
 * fetch a unit or protocol test has not stubbed lands here and fails loudly.
 *
 * tests/integration exists to call the real APIs, so it is exempt — by path,
 * so running a single integration file directly still works.
 */
const passthrough = globalThis.fetch;

function allowsNetwork(): boolean {
  if (process.env.VITEST_ALLOW_NETWORK === "1") return true;
  const path = expect.getState().testPath ?? "";
  return path.includes("/tests/integration/");
}

globalThis.fetch = ((...args: Parameters<typeof fetch>) => {
  const input = args[0];
  const url = typeof input === "string" ? input : (input as Request | URL).toString();
  const external = /^https?:\/\/(?!127\.0\.0\.1|localhost|\[::1\])/.test(url);

  if (external && !allowsNetwork()) {
    // Reject rather than throw, so it fails the way a network error does.
    return Promise.reject(
      new Error(
        `Test made a real network request to ${url}. Stub fetch (vi.stubGlobal) or move it to tests/integration.`
      )
    );
  }
  return passthrough(...args);
}) as typeof fetch;
