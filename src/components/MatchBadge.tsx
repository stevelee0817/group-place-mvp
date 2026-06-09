import { matchLevelLabels } from "@/lib/labels";
import type { MatchLevel } from "@/lib/types";

const badgeClasses: Record<MatchLevel, string> = {
  together_likely: "border-emerald-200 bg-emerald-50 text-emerald-700",
  inquiry_recommended: "border-amber-200 bg-amber-50 text-amber-700",
  split_only: "border-sky-200 bg-sky-50 text-sky-700",
  difficult: "border-slate-200 bg-slate-100 text-slate-600",
};

export function MatchBadge({ level }: { level: MatchLevel }) {
  return (
    <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${badgeClasses[level]}`}>
      {matchLevelLabels[level]}
    </span>
  );
}
