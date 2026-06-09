"use client";

import { useEffect, useMemo, useState } from "react";
import { GROUP_STATUS_OPTIONS, SLOT_STATUS_OPTIONS } from "@/lib/constants";
import { areaLabels, groupStatusLabels, slotStatusLabels } from "@/lib/labels";
import { seedStores } from "@/lib/seedStores";
import { getStores, resetStoreOverrides, saveStoreStatus } from "@/lib/storeRepository";
import type { GroupStatus, ReservationSlot, SlotStatus, Store } from "@/lib/types";
import { StatusBadge } from "./StatusBadge";

export function ManagerStoreEditor() {
  const [stores, setStores] = useState<Store[]>(seedStores);
  const [selectedStoreId, setSelectedStoreId] = useState(seedStores[0]?.id ?? "");
  const [draftStatus, setDraftStatus] = useState<GroupStatus>(seedStores[0]?.status.currentGroupStatus ?? "good");
  const [draftSlots, setDraftSlots] = useState<ReservationSlot[]>(seedStores[0]?.status.reservationSlots ?? []);
  const [saveMessage, setSaveMessage] = useState("");

  useEffect(() => {
    const loadedStores = getStores();
    setStores(loadedStores);
    if (loadedStores[0]) setSelectedStoreId(loadedStores[0].id);
  }, []);

  const selectedStore = useMemo(
    () => stores.find((store) => store.id === selectedStoreId),
    [stores, selectedStoreId],
  );

  useEffect(() => {
    if (!selectedStore) return;
    setDraftStatus(selectedStore.status.currentGroupStatus);
    setDraftSlots(selectedStore.status.reservationSlots);
    setSaveMessage("");
  }, [selectedStore]);

  function updateSlotStatus(time: string, status: SlotStatus) {
    setDraftSlots((currentSlots) =>
      currentSlots.map((slot) => (slot.time === time ? { ...slot, status } : slot)),
    );
  }

  function handleSave() {
    if (!selectedStore) return;
    const updatedStores = saveStoreStatus(selectedStore.id, draftStatus, draftSlots);
    setStores(updatedStores);
    setSaveMessage("저장되었습니다. 결과/상세 화면에도 이 브라우저 기준으로 반영됩니다.");
  }

  function handleReset() {
    const resetStores = resetStoreOverrides();
    setStores(resetStores);
    const firstStore = resetStores[0];
    if (firstStore) setSelectedStoreId(firstStore.id);
    setSaveMessage("localStorage 변경값을 초기화했습니다.");
  }

  if (!selectedStore) {
    return <p className="text-sm text-slate-600">수정할 매장이 없습니다.</p>;
  }

  return (
    <div className="space-y-4">
      <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
        <label className="block">
          <span className="text-sm font-semibold text-slate-800">매장 선택</span>
          <select
            value={selectedStoreId}
            onChange={(event) => setSelectedStoreId(event.target.value)}
            className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-3 py-3 outline-none focus:border-slate-950"
          >
            {stores.map((store) => (
              <option key={store.id} value={store.id}>
                {store.name} · {areaLabels[store.area]}
              </option>
            ))}
          </select>
        </label>

        <div className="mt-4 rounded-2xl bg-slate-50 p-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-bold text-slate-950">{selectedStore.name}</p>
              <p className="mt-1 text-xs text-slate-500">
                붙여 앉기 {selectedStore.capacity.maxContiguousGroupSize}명 · 분리 포함 {selectedStore.capacity.maxSplitGroupSize}명
              </p>
            </div>
            <StatusBadge status={selectedStore.status.currentGroupStatus} />
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="font-bold text-slate-950">현재 단체 상태</h2>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {GROUP_STATUS_OPTIONS.map((status) => (
            <label
              key={status}
              className={`cursor-pointer rounded-2xl border px-3 py-3 text-sm ${
                draftStatus === status ? "border-slate-950 bg-slate-50" : "border-slate-200 bg-white"
              }`}
            >
              <input
                type="radio"
                name="groupStatus"
                value={status}
                checked={draftStatus === status}
                onChange={() => setDraftStatus(status)}
                className="mr-2"
              />
              {groupStatusLabels[status]}
            </label>
          ))}
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="font-bold text-slate-950">시간대별 상태</h2>
        <div className="mt-3 space-y-3">
          {draftSlots.map((slot) => (
            <div key={slot.time} className="rounded-2xl bg-slate-50 p-3">
              <div className="flex items-center justify-between gap-3">
                <p className="font-bold text-slate-950">오늘 {slot.time}</p>
                <select
                  value={slot.status}
                  onChange={(event) => updateSlotStatus(slot.time, event.target.value as SlotStatus)}
                  className="rounded-xl border border-slate-200 bg-white px-2 py-2 text-sm outline-none focus:border-slate-950"
                >
                  {SLOT_STATUS_OPTIONS.map((status) => (
                    <option key={status} value={status}>
                      {slotStatusLabels[status]}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="grid grid-cols-2 gap-2">
        <button type="button" onClick={handleReset} className="rounded-2xl border border-slate-200 px-4 py-3 font-bold">
          초기화
        </button>
        <button type="button" onClick={handleSave} className="rounded-2xl bg-slate-950 px-4 py-3 font-bold text-white">
          저장
        </button>
      </div>

      {saveMessage && <p className="rounded-2xl bg-emerald-50 p-3 text-sm text-emerald-700">{saveMessage}</p>}
    </div>
  );
}
