export interface CheckoutAddress {
  id: string;
  isDefault?: boolean;
  label: string;
  value: string;
}

interface CheckoutAddressSource {
  addresses: Array<{ city: string; district: string; fullAddress: string; id: string; isDefault?: boolean; label: string }>;
}

export function buildCheckoutAddresses(customer: CheckoutAddressSource | null): CheckoutAddress[] {
  if (!customer) return [];
  return customer.addresses.map((address) => ({
    id: address.id,
    ...(typeof address.isDefault === "boolean" ? { isDefault: address.isDefault } : {}),
    label: address.label,
    value: `${address.fullAddress}, ${address.district} / ${address.city}`
  }));
}
