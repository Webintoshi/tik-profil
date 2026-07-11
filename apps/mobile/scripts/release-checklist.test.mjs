import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

const checklistUrl = new URL("../../../docs/mobile-release-checklist.md", import.meta.url);

test("mobile release checklist covers workflows, failures, devices, duration, and prerequisites", () => {
  const checklist = existsSync(checklistUrl) ? readFileSync(checklistUrl, "utf8") : "";
  const requiredCoverage = [
    "sign-in",
    "account",
    "favorites",
    "search",
    "profile",
    "menu",
    "product configuration",
    "delivery",
    "pickup",
    "order",
    "QR",
    "theme",
    "offline",
    "slow API",
    "401",
    "404",
    "empty menu",
    "unavailable product",
    "upload rejection",
    "camera denial",
    "Android 10-11",
    "Android 14+",
    "30-minute",
    "background/foreground",
    "migration",
    "Logto",
    "signing"
  ];

  for (const requirement of requiredCoverage) {
    assert.match(checklist, new RegExp(requirement.replace(/[+]/g, "\\+"), "i"), requirement);
  }
});
