import assert from "node:assert/strict";
import test from "node:test";

import {
  readOrCreateStableId,
  readSnowplowDomainUserId,
  readStableId,
  SHARED_COOKIE_DOMAIN,
  STABLE_ID_COOKIE_NAME,
} from "../src/cookies/cookies.js";
import type { CookieStore } from "../src/core/types.js";

function createCookieJar(header = ""): CookieStore & { writes: string[] } {
  const jar = new Map<string, string>();
  const writes: string[] = [];
  const store: CookieStore & { writes: string[] } = {
    writes,
    read() {
      return Array.from(jar.entries())
        .map(([name, value]) => `${name}=${value}`)
        .join("; ");
    },
    write(cookie: string) {
      writes.push(cookie);
      const parts = cookie.split(";").map((part) => part.trim());
      const pair = parts[0] ?? "";
      const separator = pair.indexOf("=");
      const name = pair.slice(0, separator);
      const value = pair.slice(separator + 1);
      const expired = parts.some((part) => part === "Max-Age=0");
      if (expired || !value) jar.delete(name);
      else jar.set(name, value);
    },
  };

  if (header) {
    for (const part of header.split(";")) {
      const trimmed = part.trim();
      const separator = trimmed.indexOf("=");
      if (separator === -1) continue;
      jar.set(trimmed.slice(0, separator), trimmed.slice(separator + 1));
    }
  }

  return store;
}

test("reads the first segment of a Snowplow domain user id cookie", () => {
  const header = "other=1; _sp_id.b4a1=8b2c9d.169000.3; statsiguuid=0123456789abcdef";
  assert.equal(readSnowplowDomainUserId(header), "8b2c9d");
});

test("reads a bare _sp_id cookie and decodes the value", () => {
  assert.equal(readSnowplowDomainUserId("_sp_id=abc%2Ddef.123"), "abc-def");
});

test("omits the Snowplow id when the cookie is absent", () => {
  assert.equal(readSnowplowDomainUserId(""), undefined);
  assert.equal(readSnowplowDomainUserId("statsiguuid=0123456789abcdef"), undefined);
});

test("reads a valid statsiguuid and rejects a malformed one", () => {
  assert.equal(readStableId("statsiguuid=0123456789abcdef"), "0123456789abcdef");
  assert.equal(readStableId("statsiguuid=short"), null);
  assert.equal(readStableId(""), null);
});

test("creates statsiguuid on the shared domain when the cookie is absent", () => {
  const jar = createCookieJar();
  const stableId = readOrCreateStableId(jar, "www.simpleonlinepharmacy.co.uk", true);

  assert.equal(typeof stableId, "string");
  assert.match(stableId ?? "", /^[\dA-Za-z-]{16,128}$/);
  assert.equal(jar.read().includes(`${STABLE_ID_COOKIE_NAME}=${stableId}`), true);
  assert.equal(
    jar.writes.some((cookie) => cookie.includes(`Domain=${SHARED_COOKIE_DOMAIN}`)),
    true
  );
  assert.equal(
    jar.writes.some((cookie) => cookie.includes("Secure")),
    true
  );
});

test("keeps an existing statsiguuid instead of replacing it", () => {
  const existing = "0123456789abcdef";
  const jar = createCookieJar(`statsiguuid=${existing}`);
  const stableId = readOrCreateStableId(jar, "localhost", false);

  assert.equal(stableId, existing);
  assert.equal(
    jar.writes.some((cookie) => cookie.includes("Domain=")),
    false
  );
});
