import assert from "node:assert/strict";
import test from "node:test";

test("extractAuthorizationPin accepts typed, scanned, and swiped manager credentials", async () => {
  process.env.DATABASE_URL ??= "postgres://jnj:jnj@localhost:5432/jnj_test";
  const { extractAuthorizationPin } = await import("./service");

  const cases = [
    ["1234", "1234"],
    ["PIN:1234", "1234"],
    ["AUTH=1234", "1234"],
    ["APEXAUTH1234", "1234"],
    ["JNJ-MGR-1234", "1234"],
    ["JNJ-MGR/1234", "1234"],
    ["MANAGER|1234", "1234"],
    ['{"pin":"1234"}', "1234"],
    ['{"managerPin":"1234"}', "1234"],
    ["JNJ://auth?pin=1234", "1234"],
    ["https://JNJ.local/auth?managerPin=1234", "1234"],
    ["MGR#1234", "1234"],
    [";1234=MANAGER?", "1234"],
    [";1234=APEXMANAGER?", "1234"],
    ["%B1234^JNJ MANAGER?", "1234"],
    ["%B999999^JNJ MANAGER^1234?", "1234"],
  ] as const;

  for (const [input, expected] of cases) {
    assert.equal(extractAuthorizationPin(input), expected, input);
  }
});

test("extractAuthorizationPin rejects credentials without a dedicated four digit secret", async () => {
  process.env.DATABASE_URL ??= "postgres://jnj:jnj@localhost:5432/jnj_test";
  const { extractAuthorizationPin } = await import("./service");

  assert.equal(extractAuthorizationPin(""), null);
  assert.equal(extractAuthorizationPin("12345"), null);
  assert.equal(extractAuthorizationPin("MANAGER"), null);
  assert.equal(extractAuthorizationPin('{"pin":"12345"}'), null);
  assert.equal(extractAuthorizationPin("JNJ://auth?pin=12345"), null);
  assert.equal(extractAuthorizationPin("%B999999^JNJ MANAGER?"), null);
  assert.equal(extractAuthorizationPin("%B999999^CUSTOMER NAME^2512?"), null);
  assert.equal(extractAuthorizationPin(";1234=SALECARD?"), null);
});
