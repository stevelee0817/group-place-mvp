import { inquiryMessageFactory } from "./services/InquiryMessageFactory";
import type { SearchRequest, Store } from "./types";

export { InquiryMessageFactory, inquiryMessageFactory } from "./services/InquiryMessageFactory";

export function createInquiryMessage(store: Store, request: SearchRequest): string {
  return inquiryMessageFactory.createInquiryMessage(store, request);
}
