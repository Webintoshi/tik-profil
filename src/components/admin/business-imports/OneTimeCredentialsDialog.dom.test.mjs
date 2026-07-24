import assert from "node:assert/strict";
import test from "node:test";

import { Window } from "happy-dom";
import React, { act, useCallback, useState } from "react";
import { createRoot } from "react-dom/client";

import { OneTimeCredentialsDialog } from "./OneTimeCredentialsDialog.tsx";

const CREDENTIALS = [
    {
        businessId: "11111111-1111-4111-8111-111111111111",
        businessName: "Altınordu Pati",
        loginEmail: "altinordu@example.test",
        initialPassword: "First-secret-123",
        deliveryGeneration: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    },
    {
        businessId: "22222222-2222-4222-8222-222222222222",
        businessName: "Fatsa Pati",
        loginEmail: "fatsa@example.test",
        initialPassword: "Middle-secret-456",
        deliveryGeneration: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    },
    {
        businessId: "33333333-3333-4333-8333-333333333333",
        businessName: "Ünye Pati",
        loginEmail: "unye@example.test",
        initialPassword: "Last-secret-789",
        deliveryGeneration: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
    },
];

function installDom() {
    const window = new Window({ url: "http://localhost/dashboard/businesses/import" });
    window.document.body.innerHTML = "<button id='outside'>Dış denetim</button><div id='root'></div>";
    const previous = new Map();
    for (const key of ["window", "document", "navigator", "HTMLElement", "Element", "Node", "KeyboardEvent", "MouseEvent"]) {
        previous.set(key, globalThis[key]);
        Object.defineProperty(globalThis, key, { configurable: true, writable: true, value: window[key] });
    }
    previous.set("IS_REACT_ACT_ENVIRONMENT", globalThis.IS_REACT_ACT_ENVIRONMENT);
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    previous.set("React", globalThis.React);
    globalThis.React = React;
    previous.set("fetch", globalThis.fetch);
    globalThis.fetch = async () => ({ status: 409 });

    return () => {
        window.close();
        for (const [key, value] of previous) {
            if (value === undefined) delete globalThis[key];
            else Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
        }
    };
}

function Harness() {
    const [credentials, setCredentials] = useState(CREDENTIALS);
    const [notice, setNotice] = useState(null);
    const close = useCallback(() => undefined, []);
    return React.createElement(OneTimeCredentialsDialog, {
        credentials,
        notice,
        onCredentialRemoved: (generation, nextNotice) => {
            setCredentials((current) => current.filter((credential) => credential.deliveryGeneration !== generation));
            setNotice(nextNotice);
        },
        onClose: close,
    });
}

function deliveryButton(name) {
    return [...document.querySelectorAll("button")].find((button) => button.getAttribute("aria-label") === `${name} giriş bilgilerini teslim edildi olarak işaretle`);
}

async function click(element) {
    assert.ok(element);
    await act(async () => {
        element.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
}

test("credential removal keeps focus inside the mounted dialog", async () => {
    const restoreDom = installDom();
    const outside = document.getElementById("outside");
    const root = createRoot(document.getElementById("root"));
    outside.focus();

    try {
        await act(async () => { root.render(React.createElement(Harness)); });
        const dialog = document.querySelector('[role="dialog"]');
        assert.ok(dialog);

        await click(deliveryButton("Fatsa Pati"));
        assert.equal(document.activeElement, deliveryButton("Ünye Pati"));
        assert.equal(dialog.contains(document.activeElement), true);

        await click(deliveryButton("Altınordu Pati"));
        assert.equal(document.activeElement, deliveryButton("Ünye Pati"));
        assert.equal(dialog.contains(document.activeElement), true);

        await click(deliveryButton("Ünye Pati"));
        const closeButton = document.querySelector('button[aria-label="Giriş bilgileri penceresini kapat"]');
        assert.equal(document.activeElement, closeButton);
        assert.equal(dialog.contains(document.activeElement), true);
        assert.equal(document.body.textContent.includes("Last-secret-789"), false);
    } finally {
        await act(async () => { root.unmount(); });
        restoreDom();
    }
});
