export const OTP_MAX_ATTEMPTS = 5;

export function hasReachedOtpAttemptLimit(recentAttempts: number): boolean {
    return recentAttempts >= OTP_MAX_ATTEMPTS;
}

