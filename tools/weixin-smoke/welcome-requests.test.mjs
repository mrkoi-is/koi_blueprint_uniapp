import assert from "node:assert/strict";
import { test } from "node:test";
import { runInNewContext } from "node:vm";
import { reachedWelcomeCount, replyToWelcome } from "./welcome-requests.mjs";

function simulator() {
  const seen = [];
  const app = { __koiWelcomeRequests: seen };
  // AppService receives just the function source and has no browser URL global.
  const reply = runInNewContext(`(${replyToWelcome})`, { getApp: () => app });
  return { reply, seen };
}

test("the first welcome GET returns 503 and a single retry returns the welcome payload", () => {
  const { reply, seen } = simulator();
  const pathname = "/api/v2/welcome";
  const options = { method: "GET", url: "https://example.test" + pathname };
  assert.equal(reachedWelcomeCount(seen, pathname, 1), false);
  assert.equal(reply(options, pathname).statusCode, 503);
  assert.equal(reachedWelcomeCount(seen, pathname, 1), true);
  const retry = reply(options, pathname);
  assert.equal(retry.statusCode, 200);
  assert.equal(retry.data.title, "Welcome back");
  assert.equal(reachedWelcomeCount(seen, pathname, 2), true);
  assert.throws(() => reachedWelcomeCount(seen, pathname, 1));
  assert.equal(reply(options, pathname).statusCode, 404);
  assert.throws(() => reachedWelcomeCount(seen, pathname, 2));
});

test("wrong paths, path prefixes, query strings, fragments and methods fail the recovery check", () => {
  for (const [method, path] of [
    ["GET", "/wrong-audit-path"],
    ["GET", "/unexpected/welcome"],
    ["GET", "/welcome?unexpected=1"],
    ["GET", "/welcome#fragment"],
    ["POST", "/welcome"],
  ]) {
    const { reply, seen } = simulator();
    assert.equal(
      reply({ method, url: "https://example.test" + path }, "/welcome")
        .statusCode,
      404,
    );
    assert.throws(() => reachedWelcomeCount(seen, "/welcome", 1));
  }
});
