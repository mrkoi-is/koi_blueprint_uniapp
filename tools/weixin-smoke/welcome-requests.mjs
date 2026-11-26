import assert from "node:assert/strict";

// The automator serializes this function into the WeChat AppService.
export function replyToWelcome(options, expectedPath) {
  const requests = getApp().__koiWelcomeRequests;
  const pathname = /^https?:\/\/[^/?#]+(\/[^?#]*)$/u.exec(options.url)?.[1];
  const method = options.method ?? "GET";
  requests.push(method + " " + (pathname ?? "(invalid URL)"));
  if (method !== "GET" || pathname !== expectedPath || requests.length > 2) {
    return { statusCode: 404, data: {}, header: {} };
  }
  if (requests.length === 1) return { statusCode: 503, data: {}, header: {} };
  return {
    statusCode: 200,
    data: { title: "Welcome back", body: "The workspace is ready." },
    header: {},
  };
}

export function reachedWelcomeCount(seen, pathname, count) {
  const expected = Array(count).fill("GET " + pathname);
  assert.deepEqual(
    seen,
    expected.slice(0, seen.length),
    "Unexpected welcome request sequence",
  );
  return seen.length === count;
}
