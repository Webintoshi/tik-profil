import assert from "node:assert/strict";
import test from "node:test";

import { buildUpstreamHeaders } from "./proxy-headers.mjs";

test("proxy preserves Authorization exactly and keeps request content type", () => {
  assert.deepEqual(buildUpstreamHeaders({
    authorization: "Bearer exact.token.value",
    "content-type": "multipart/form-data; boundary=test"
  }), {
    Authorization: "Bearer exact.token.value",
    "Content-Type": "multipart/form-data; boundary=test"
  });
});

test("proxy omits Authorization when the request did not provide it", () => {
  assert.deepEqual(buildUpstreamHeaders({ "content-type": "application/json" }), {
    "Content-Type": "application/json"
  });
});
