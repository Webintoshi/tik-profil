/// <reference types="node" />

import assert from "node:assert/strict";
import test from "node:test";

const stateModule = await import(new URL("./listing-state.ts", import.meta.url).href)
  .catch(() => null) as typeof import("./listing-state") | null;

test("listing inquiry state module exists", () => {
  assert.ok(stateModule, "listing inquiry state must be implemented");
});

if (stateModule) {
  test("changing the selected listing clears stale confirmation and errors", () => {
    let state = stateModule.reduceListingInquiryState(stateModule.createListingInquiryState(), { type: "select-listing", listingId: "listing-1" });
    state = stateModule.reduceListingInquiryState(state, { type: "submit-error", message: "Gonderilemedi" });
    state = stateModule.reduceListingInquiryState(state, { type: "select-listing", listingId: "listing-2" });
    assert.equal(state.listingId, "listing-2");
    assert.equal(state.message, "");
    assert.equal(state.error, null);
    assert.equal(state.inquiryId, null);
  });

  test("submit lifecycle exposes loading error and confirmation", () => {
    let state = stateModule.reduceListingInquiryState(stateModule.createListingInquiryState(), { type: "submit-start" });
    assert.equal(state.status, "submitting");
    state = stateModule.reduceListingInquiryState(state, { type: "submit-error", message: "Tekrar deneyin" });
    assert.equal(state.status, "error");
    state = stateModule.reduceListingInquiryState(state, { type: "submit-success", inquiryId: "inquiry-1" });
    assert.equal(state.status, "success");
    assert.equal(state.inquiryId, "inquiry-1");
  });

  test("lost-response retries preserve the key until the inquiry draft changes", () => {
    const initial = stateModule.createListingInquiryIdempotencyState();
    const first = stateModule.resolveListingInquiryIdempotency(initial, "listing-1|bilgi");
    const retry = stateModule.resolveListingInquiryIdempotency(first, "listing-1|bilgi");
    const changed = stateModule.resolveListingInquiryIdempotency(retry, "listing-1|fiyat");
    assert.equal(retry.key, first.key);
    assert.notEqual(changed.key, retry.key);
  });
}
