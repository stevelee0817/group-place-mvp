import { groupStatusLabels } from "@/lib/labels";
import type { GroupStatus } from "@/lib/types";

const statusClasses: Record<GroupStatus, string> = {
  good: "bg-emerald-100 text-emerald-700",
  limited: "bg-yellow-100 text-yellow-800",
  inquiry_needed: "bg-orange-100 text-orange-700",
  difficult: "bg-slate-200 text-slate-600",
};

export function StatusBadge({ status }: { status: GroupStatus }) {
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusClasses[status]}`}>
      {groupStatusLabels[status]}
    </span>
  );
}
