import assert from "node:assert/strict";
import test from "node:test";

import { hasReachedOtpAttemptLimit, OTP_MAX_ATTEMPTS } from "./policy.ts";

test("resending a challenge does not reset the email attempt budget", () => {
    assert.equal(hasReachedOtpAttemptLimit(OTP_MAX_ATTEMPTS - 1), false);
    assert.equal(hasReachedOtpAttemptLimit(OTP_MAX_ATTEMPTS), true);
    assert.equal(hasReachedOtpAttemptLimit(OTP_MAX_ATTEMPTS + 4), true);
});

