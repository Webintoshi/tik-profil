import type { CustomerAccountProfile } from "@/auth/api";

export type AccountCompletionField = "displayName" | "email" | "phone";

export interface AccountCompletionStatus {
  isComplete: boolean;
  missingFields: AccountCompletionField[];
}

function hasText(value: null | string | undefined): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

export function getAccountCompletionStatus(
  account: Pick<CustomerAccountProfile, "displayName" | "email" | "phone"> | null,
): AccountCompletionStatus {
  const missingFields: AccountCompletionField[] = [];

  if (!hasText(account?.displayName)) {
    missingFields.push("displayName");
  }

  if (!hasText(account?.email)) {
    missingFields.push("email");
  }

  if (!hasText(account?.phone)) {
    missingFields.push("phone");
  }

  return {
    isComplete: missingFields.length === 0,
    missingFields,
  };
}
