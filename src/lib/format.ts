import { seatingTypeLabels } from "./labels";
import type { SeatingType } from "./types";

export function formatLastUpdatedAt(iso: string, now: Date = new Date()): string {
  const updatedAt = new Date(iso).getTime();
  if (Number.isNaN(updatedAt)) return "업데이트 시점 확인 필요";

  const diffMinutes = Math.max(0, Math.floor((now.getTime() - updatedAt) / (1000 * 60)));

  if (diffMinutes < 1) return "방금 전";
  if (diffMinutes < 60) return `${diffMinutes}분 전`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}시간 전`;

  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}일 전`;
}

export function formatSeatingTypes(types: SeatingType[]): string {
  return types.map((type) => seatingTypeLabels[type]).join(" · ");
}

export function toQueryString(params: Record<string, string | number | undefined>): string {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== "") searchParams.set(key, String(value));
  });

  return searchParams.toString();
}
