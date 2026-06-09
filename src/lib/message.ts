import type { SearchRequest, Store } from "./types";

function seatingSentenceForPreference(preference: SearchRequest["seatingPreference"]): string {
  switch (preference) {
    case "together":
      return "가능하면 함께 앉고 싶습니다.";
    case "partial_split_ok":
      return "가능하면 함께 앉고 싶고, 일부 분리 착석도 검토 가능합니다.";
    case "same_store_ok":
      return "같은 매장 내 이용 가능하다면 분리 착석도 괜찮습니다.";
  }
}

export function createInquiryMessage(store: Store, request: SearchRequest): string {
  const seatingSentence = seatingSentenceForPreference(request.seatingPreference);
  const storeNameHint = store.contact.contactMethod === "phone" ? "" : ` ${store.name} 이용 가능 여부를 문의드립니다.`;

  return `안녕하세요.${storeNameHint} 오늘 ${request.preferredTime}쯤 ${request.groupSize}명 단체 방문을 고려하고 있습니다. ${seatingSentence} 예약 또는 방문 가능할까요?`;
}
