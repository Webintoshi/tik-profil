export function getPhoneDigits(value: string): string {
  return value.replace(/\D/g, "");
}

export function isLikelyTurkishMobilePhone(value: string): boolean {
  const digits = getPhoneDigits(value);

  return (
    /^5\d{9}$/.test(digits) ||
    /^05\d{9}$/.test(digits) ||
    /^905\d{9}$/.test(digits)
  );
}

export function formatTurkishPhoneInput(value: string): string {
  const digits = getPhoneDigits(value).slice(0, 12);

  if (!digits) {
    return "";
  }

  if (digits.startsWith("90")) {
    const local = digits.slice(2, 12);
    return ["+90", local.slice(0, 3), local.slice(3, 6), local.slice(6, 8), local.slice(8, 10)]
      .filter(Boolean)
      .join(" ");
  }

  const local = digits.startsWith("0") ? digits.slice(0, 11) : digits.slice(0, 10);

  if (local.startsWith("0")) {
    return [local.slice(0, 4), local.slice(4, 7), local.slice(7, 9), local.slice(9, 11)]
      .filter(Boolean)
      .join(" ");
  }

  return [local.slice(0, 3), local.slice(3, 6), local.slice(6, 8), local.slice(8, 10)]
    .filter(Boolean)
    .join(" ");
}
