"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { areaLabels, updateSourceLabels } from "@/lib/labels";
import { toQueryString } from "@/lib/format";
import { searchRequestToParams } from "@/lib/searchRequest";
import { evaluateStoreMatch } from "@/lib/matching";
import { createInquiryMessage } from "@/lib/message";
import { seedStores } from "@/lib/seedStores";
import { getStores } from "@/lib/storeRepository";
import type { SearchRequest, Store } from "@/lib/types";
import { EmptyState } from "./EmptyState";
import { MatchBadge } from "./MatchBadge";
import { MessageTemplateBox } from "./MessageTemplateBox";
import { SeatingSummary } from "./SeatingSummary";
import { SlotList } from "./SlotList";
import { StatusBadge } from "./StatusBadge";

export function StoreDetailClient({ storeId, request }: { storeId: string; request: SearchRequest }) {
  const [stores, setStores] = useState<Store[]>(seedStores);

  useEffect(() => {
    setStores(getStores());
  }, []);

  const store = useMemo(() => stores.find((item) => item.id === storeId), [stores, storeId]);

  if (!store) {
    return (
      <EmptyState
        title="매장을 찾을 수 없습니다"
        description="seed data 또는 URL의 storeId를 확인해주세요."
        href="/results"
        actionText="결과로 돌아가기"
      />
    );
  }

  const match = evaluateStoreMatch(store, request);
  const message = createInquiryMessage(store, request);
  const resultsHref = `/results?${toQueryString(searchRequestToParams(request))}`;

  return (
    <div className="space-y-5">
      <section className="rounded-3xl bg-slate-950 p-5 text-white">
        <Link href={resultsHref} className="text-sm text-slate-300 underline underline-offset-4">
          결과 목록으로
        </Link>
        <p className="mt-4 text-sm text-slate-300">
          {areaLabels[store.area]} · {store.category}
        </p>
        <h1 className="mt-1 text-3xl font-extrabold">{store.name}</h1>
        {store.address && <p className="mt-2 text-sm text-slate-300">{store.address}</p>}
        <div className="mt-4 flex flex-wrap gap-2">
          <MatchBadge level={match.level} />
          <StatusBadge status={store.status.currentGroupStatus} />
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="font-bold text-slate-950">단체 착석 구조</h2>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <div className="rounded-2xl bg-slate-50 p-3">
            <p className="text-xs text-slate-500">붙여 앉기 권장</p>
            <p className="mt-1 text-xl font-extrabold">{store.capacity.maxContiguousGroupSize}명</p>
          </div>
          <div className="rounded-2xl bg-slate-50 p-3">
            <p className="text-xs text-slate-500">분리 포함 최대</p>
            <p className="mt-1 text-xl font-extrabold">{store.capacity.maxSplitGroupSize}명</p>
          </div>
        </div>
        <div className="mt-4">
          <SeatingSummary store={store} />
        </div>
        {store.seating.description && <p className="mt-3 text-sm leading-6 text-slate-700">{store.seating.description}</p>}
        {store.capacity.capacityNote && (
          <p className="mt-2 text-sm leading-6 text-slate-500">{store.capacity.capacityNote}</p>
        )}
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="font-bold text-slate-950">판단 근거</h2>
        <p className="mt-2 text-sm leading-6 text-slate-700">{match.headline}</p>
        <ul className="mt-3 space-y-2 text-sm text-slate-700">
          {match.reasons.map((reason) => (
            <li key={reason} className="rounded-2xl bg-slate-50 px-3 py-2">
              {reason}
            </li>
          ))}
        </ul>
        {match.warnings.length > 0 && (
          <div className="mt-3 rounded-2xl bg-amber-50 p-3 text-sm leading-6 text-amber-800">
            <p className="font-bold">확인 필요</p>
            <ul className="mt-1 list-inside list-disc">
              {match.warnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-bold text-slate-950">시간대 상태</h2>
          <span className="text-xs text-slate-500">업데이트: {updateSourceLabels[store.status.updateSource]}</span>
        </div>
        <div className="mt-3">
          <SlotList slots={store.status.reservationSlots} selectedTime={request.preferredTime} />
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="font-bold text-slate-950">문의 정보</h2>
        <p className="mt-2 text-sm text-slate-700">
          연락 방식: {store.contact.contactMethod === "phone" ? "전화" : store.contact.contactMethod === "message" ? "메시지" : "앱 요청"}
        </p>
        {store.contact.phone && <p className="mt-1 text-sm text-slate-700">연락처: {store.contact.phone}</p>}
        {store.contact.messageHint && <p className="mt-2 text-sm leading-6 text-slate-500">{store.contact.messageHint}</p>}
      </section>

      <MessageTemplateBox message={message} />
    </div>
  );
}
