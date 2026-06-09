"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { areaLabels, seatingPreferenceLabels } from "@/lib/labels";
import { getRankedStores } from "@/lib/matching";
import { seedStores } from "@/lib/seedStores";
import { getStores } from "@/lib/storeRepository";
import type { SearchRequest, Store } from "@/lib/types";
import { EmptyState } from "./EmptyState";
import { StoreCard } from "./StoreCard";

export function ResultsClient({ request }: { request: SearchRequest }) {
  const [stores, setStores] = useState<Store[]>(seedStores);

  useEffect(() => {
    setStores(getStores());
  }, []);

  const rankedStores = useMemo(() => getRankedStores(stores, request), [stores, request]);

  return (
    <div className="space-y-5">
      <section className="rounded-3xl bg-slate-950 p-5 text-white">
        <p className="text-sm text-slate-300">검색 결과</p>
        <h1 className="mt-1 text-2xl font-extrabold">문의 가치 높은 후보</h1>
        <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
          <div className="rounded-2xl bg-white/10 p-3">
            <p className="text-slate-300">지역</p>
            <p className="mt-1 font-bold">{areaLabels[request.area]}</p>
          </div>
          <div className="rounded-2xl bg-white/10 p-3">
            <p className="text-slate-300">인원</p>
            <p className="mt-1 font-bold">{request.groupSize}명</p>
          </div>
          <div className="rounded-2xl bg-white/10 p-3">
            <p className="text-slate-300">시간</p>
            <p className="mt-1 font-bold">오늘 {request.preferredTime}</p>
          </div>
          <div className="rounded-2xl bg-white/10 p-3">
            <p className="text-slate-300">착석</p>
            <p className="mt-1 font-bold">{seatingPreferenceLabels[request.seatingPreference]}</p>
          </div>
        </div>
      </section>

      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-slate-700">총 {rankedStores.length}개 후보</p>
        <Link href="/" className="text-sm font-semibold text-slate-500 underline underline-offset-4">
          조건 수정
        </Link>
      </div>

      {rankedStores.length === 0 ? (
        <EmptyState
          title="해당 지역의 샘플 매장이 없습니다"
          description="다른 지역을 선택하거나 seed data에 매장을 추가해보세요."
        />
      ) : (
        <div className="space-y-3">
          {rankedStores.map((result) => (
            <StoreCard key={result.store.id} result={result} request={request} />
          ))}
        </div>
      )}
    </div>
  );
}
