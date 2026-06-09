import Link from "next/link";
import { areaLabels } from "@/lib/labels";
import { formatLastUpdatedAt, toQueryString } from "@/lib/format";
import { searchRequestToParams } from "@/lib/searchRequest";
import type { SearchRequest, StoreMatchResult } from "@/lib/types";
import { MatchBadge } from "./MatchBadge";
import { SeatingSummary } from "./SeatingSummary";
import { StatusBadge } from "./StatusBadge";

export function StoreCard({ result, request }: { result: StoreMatchResult; request: SearchRequest }) {
  const { store } = result;
  const detailHref = `/stores/${store.id}?${toQueryString(searchRequestToParams(request))}`;

  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-slate-500">
            {areaLabels[store.area]} · {store.category}
          </p>
          <h2 className="mt-1 text-lg font-bold text-slate-950">{store.name}</h2>
        </div>
        <StatusBadge status={store.status.currentGroupStatus} />
      </div>

      <div className="mt-3">
        <MatchBadge level={result.level} />
        <p className="mt-2 text-sm leading-6 text-slate-700">{result.headline}</p>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <div className="rounded-2xl bg-slate-50 p-3">
          <p className="text-xs text-slate-500">붙여 앉기</p>
          <p className="mt-1 text-lg font-bold">최대 {store.capacity.maxContiguousGroupSize}명</p>
        </div>
        <div className="rounded-2xl bg-slate-50 p-3">
          <p className="text-xs text-slate-500">분리 포함</p>
          <p className="mt-1 text-lg font-bold">최대 {store.capacity.maxSplitGroupSize}명</p>
        </div>
      </div>

      <div className="mt-4">
        <SeatingSummary store={store} />
      </div>

      <div className="mt-4 flex items-center justify-between gap-3 border-t border-slate-100 pt-3">
        <p className="text-xs text-slate-500">업데이트 {formatLastUpdatedAt(store.status.lastUpdatedAt)}</p>
        <Link
          href={detailHref}
          className="rounded-2xl bg-slate-950 px-3 py-2 text-sm font-semibold text-white"
        >
          상세 보기
        </Link>
      </div>
    </article>
  );
}
