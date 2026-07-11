export interface ListingInquiryState {
  error: string | null;
  inquiryId: string | null;
  listingId: string | null;
  message: string;
  status: "editing" | "error" | "submitting" | "success";
}

export type ListingInquiryAction =
  | { type: "select-listing"; listingId: string }
  | { type: "set-message"; message: string }
  | { type: "submit-start" }
  | { type: "submit-error"; message: string }
  | { type: "submit-success"; inquiryId: string };

export interface ListingInquiryIdempotencyState {
  key: string;
  signature: string;
}

function newIdempotencyKey() {
  return `listing-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}

export function createListingInquiryIdempotencyState(): ListingInquiryIdempotencyState {
  return { key: newIdempotencyKey(), signature: "" };
}

export function resolveListingInquiryIdempotency(current: ListingInquiryIdempotencyState, signature: string) {
  return current.signature === signature ? current : { key: newIdempotencyKey(), signature };
}

export function createListingInquiryState(): ListingInquiryState {
  return { error: null, inquiryId: null, listingId: null, message: "", status: "editing" };
}

export function reduceListingInquiryState(state: ListingInquiryState, action: ListingInquiryAction): ListingInquiryState {
  switch (action.type) {
    case "select-listing":
      return { error: null, inquiryId: null, listingId: action.listingId, message: "", status: "editing" };
    case "set-message":
      return { ...state, error: null, message: action.message, status: "editing" };
    case "submit-start":
      return { ...state, error: null, status: "submitting" };
    case "submit-error":
      return { ...state, error: action.message, status: "error" };
    case "submit-success":
      return { ...state, error: null, inquiryId: action.inquiryId, status: "success" };
  }
}
