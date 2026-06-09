"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { AREA_OPTIONS, SEATING_PREFERENCE_OPTIONS, TIME_OPTIONS } from "@/lib/constants";
import { areaLabels, seatingPreferenceLabels } from "@/lib/labels";
import { searchRequestToParams } from "@/lib/searchRequest";
import { toQueryString } from "@/lib/format";
import type { SearchRequest } from "@/lib/types";

const defaultRequest: SearchRequest = {
  area: "front_gate",
  groupSize: 12,
  preferredTime: "19:00",
  seatingPreference: "partial_split_ok",
};

export function SearchForm({ initialRequest = defaultRequest }: { initialRequest?: SearchRequest }) {
  const router = useRouter();
  const [area, setArea] = useState(initialRequest.area);
  const [groupSize, setGroupSize] = useState(initialRequest.groupSize);
  const [preferredTime, setPreferredTime] = useState(initialRequest.preferredTime);
  const [seatingPreference, setSeatingPreference] = useState(initialRequest.seatingPreference);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const query = toQueryString(
      searchRequestToParams({
        area,
        groupSize,
        preferredTime,
        seatingPreference,
      }),
    );

    router.push(`/results?${query}`);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
      <label className="block">
        <span className="text-sm font-semibold text-slate-800">지역 선택</span>
        <select
          value={area}
          onChange={(event) => setArea(event.target.value as SearchRequest["area"])}
          className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-3 py-3 text-base outline-none focus:border-slate-950"
        >
          {AREA_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {areaLabels[option]}
            </option>
          ))}
        </select>
      </label>

      <label className="block">
        <span className="text-sm font-semibold text-slate-800">인원</span>
        <input
          type="number"
          min={1}
          max={60}
          value={groupSize}
          onChange={(event) => setGroupSize(Number(event.target.value))}
          className="mt-2 w-full rounded-2xl border border-slate-200 px-3 py-3 text-base outline-none focus:border-slate-950"
        />
      </label>

      <label className="block">
        <span className="text-sm font-semibold text-slate-800">시간</span>
        <select
          value={preferredTime}
          onChange={(event) => setPreferredTime(event.target.value)}
          className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-3 py-3 text-base outline-none focus:border-slate-950"
        >
          {TIME_OPTIONS.map((time) => (
            <option key={time} value={time}>
              오늘 {time}
            </option>
          ))}
        </select>
      </label>

      <fieldset>
        <legend className="text-sm font-semibold text-slate-800">착석 선호</legend>
        <div className="mt-2 space-y-2">
          {SEATING_PREFERENCE_OPTIONS.map((option) => (
            <label
              key={option}
              className={`flex cursor-pointer items-center gap-3 rounded-2xl border px-3 py-3 text-sm ${
                seatingPreference === option ? "border-slate-950 bg-slate-50" : "border-slate-200 bg-white"
              }`}
            >
              <input
                type="radio"
                name="seatingPreference"
                value={option}
                checked={seatingPreference === option}
                onChange={() => setSeatingPreference(option)}
                className="h-4 w-4"
              />
              <span>{seatingPreferenceLabels[option]}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <button type="submit" className="w-full rounded-2xl bg-slate-950 px-4 py-3 font-bold text-white">
        조건에 맞는 매장 찾기
      </button>
    </form>
  );
}
