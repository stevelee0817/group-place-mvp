import { AREA_OPTIONS, SEATING_PREFERENCE_OPTIONS, TIME_OPTIONS } from "./constants";
import type { Area, SearchRequest, SeatingPreference } from "./types";

const DEFAULT_SEARCH_REQUEST: SearchRequest = {
  area: "front_gate",
  groupSize: 12,
  preferredTime: "19:00",
  seatingPreference: "partial_split_ok",
};

function firstValue(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

function isArea(value: string | undefined): value is Area {
  return !!value && AREA_OPTIONS.includes(value as Area);
}

function isSeatingPreference(value: string | undefined): value is SeatingPreference {
  return !!value && SEATING_PREFERENCE_OPTIONS.includes(value as SeatingPreference);
}

function isTimeOption(value: string | undefined): boolean {
  return !!value && TIME_OPTIONS.includes(value as (typeof TIME_OPTIONS)[number]);
}

export function parseSearchRequest(
  searchParams?: Record<string, string | string[] | undefined>,
): SearchRequest {
  const area = firstValue(searchParams?.area);
  const groupSizeParam = firstValue(searchParams?.groupSize);
  const preferredTime = firstValue(searchParams?.preferredTime);
  const seatingPreference = firstValue(searchParams?.seatingPreference);

  const groupSize = Number(groupSizeParam);

  return {
    area: isArea(area) ? area : DEFAULT_SEARCH_REQUEST.area,
    groupSize: Number.isFinite(groupSize) && groupSize > 0 ? Math.floor(groupSize) : DEFAULT_SEARCH_REQUEST.groupSize,
    preferredTime: isTimeOption(preferredTime) ? preferredTime! : DEFAULT_SEARCH_REQUEST.preferredTime,
    seatingPreference: isSeatingPreference(seatingPreference)
      ? seatingPreference
      : DEFAULT_SEARCH_REQUEST.seatingPreference,
  };
}

export function searchRequestToParams(request: SearchRequest): Record<string, string | number> {
  return {
    area: request.area,
    groupSize: request.groupSize,
    preferredTime: request.preferredTime,
    seatingPreference: request.seatingPreference,
  };
}
