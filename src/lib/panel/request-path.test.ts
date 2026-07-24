import assert from "node:assert/strict";
import test from "node:test";

import {
    createPanelForwardHeaders,
    PANEL_PATHNAME_HEADER,
    readPanelForwardedPathname,
} from "./request-path.ts";

test("middleware overwrites a spoofed panel pathname with the trusted request path", () => {
    const forwarded = createPanelForwardHeaders(
        new Headers({ [PANEL_PATHNAME_HEADER]: "/panel/hesap-aktivasyonu?spoofed=1", "x-request-id": "request-1" }),
        "/panel/hesap-aktivasyonu",
    );

    assert.equal(forwarded.get(PANEL_PATHNAME_HEADER), "/panel/hesap-aktivasyonu");
    assert.equal(forwarded.get("x-request-id"), "request-1");
    assert.equal(readPanelForwardedPathname(forwarded), "/panel/hesap-aktivasyonu");
});

test("invalid or absent forwarded paths fail closed to the panel root", () => {
    assert.equal(readPanelForwardedPathname(new Headers()), "/panel");
    assert.equal(readPanelForwardedPathname(new Headers({ [PANEL_PATHNAME_HEADER]: "/account" })), "/panel");
    assert.equal(readPanelForwardedPathname(new Headers({ [PANEL_PATHNAME_HEADER]: "/panel?next=/evil" })), "/panel");
    assert.equal(createPanelForwardHeaders(new Headers(), "/outside").get(PANEL_PATHNAME_HEADER), "/panel");
});
