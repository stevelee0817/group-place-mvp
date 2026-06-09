import { slotStatusLabels } from "@/lib/labels";
import type { ReservationSlot, SlotStatus } from "@/lib/types";

const slotClasses: Record<SlotStatus, string> = {
  available: "border-emerald-200 bg-emerald-50 text-emerald-700",
  inquiry: "border-amber-200 bg-amber-50 text-amber-700",
  unavailable: "border-slate-200 bg-slate-100 text-slate-500",
};

export function SlotList({ slots, selectedTime }: { slots: ReservationSlot[]; selectedTime?: string }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {slots.map((slot) => (
        <div
          key={slot.time}
          className={`rounded-2xl border p-3 ${slotClasses[slot.status]} ${
            selectedTime === slot.time ? "ring-2 ring-slate-900/10" : ""
          }`}
        >
          <div className="text-sm font-bold">{slot.time}</div>
          <div className="text-xs">{slotStatusLabels[slot.status]}</div>
        </div>
      ))}
    </div>
  );
}
