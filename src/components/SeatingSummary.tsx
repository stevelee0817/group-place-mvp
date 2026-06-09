import { formatSeatingTypes } from "@/lib/format";
import type { Store } from "@/lib/types";

export function SeatingSummary({ store }: { store: Store }) {
  const chips = [
    store.seating.hasPrivateRoom ? "룸 있음" : null,
    store.seating.hasSemiPrivateArea ? "반분리" : null,
    store.seating.tablesCanBeCombined ? "테이블 결합" : null,
  ].filter(Boolean);

  return (
    <div className="space-y-2">
      <p className="text-sm text-slate-700">{formatSeatingTypes(store.seating.types)}</p>
      {chips.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {chips.map((chip) => (
            <span key={chip} className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
              {chip}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
