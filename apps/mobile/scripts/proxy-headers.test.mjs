import assert from "node:assert/strict";
import test from "node:test";

import { buildAllowedUpstreamHeaders, isAllowedProxyPath } from "./proxy-headers.mjs";

test("proxy preserves Authorization exactly and keeps request content type", () => {
  assert.deepEqual(buildAllowedUpstreamHeaders("/api/mobile/account/avatar", {
    authorization: "Bearer exact.token.value",
    "content-type": "multipart/form-data; boundary=test"
  }), {
    Authorization: "Bearer exact.token.value",
    "Content-Type": "multipart/form-data; boundary=test"
  });
});

test("proxy omits Authorization when the request did not provide it", () => {
  assert.deepEqual(buildAllowedUpstreamHeaders("/api/kesfet/user/profile", { "content-type": "application/json" }), {
    "Content-Type": "application/json"
  });
});

test("proxy path gate allows only exact configured prefixes", () => {
  assert.equal(isAllowedProxyPath("/api/kesfet/orders"), true);
  assert.equal(isAllowedProxyPath("/api/mobile/account/avatar"), true);
  assert.equal(isAllowedProxyPath("/api/kesfet-malicious"), false);
  assert.equal(isAllowedProxyPath("/api/mobile/accounting"), false);
});

test("denied paths cannot receive an Authorization header", () => {
  assert.equal(buildAllowedUpstreamHeaders("/api/mobile/accounting", {
    authorization: "Bearer must-not-leak",
    "content-type": "application/json"
  }), null);
});
