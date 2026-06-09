import { MATCH_LEVEL_PRIORITY, STALE_HOURS } from "./constants";
import { groupStatusLabels, matchLevelLabels, slotStatusLabels } from "./labels";
import type { MatchLevel, SearchRequest, SlotStatus, Store, StoreMatchResult } from "./types";

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export function findSlotStatus(store: Store, preferredTime: string): SlotStatus {
  return store.status.reservationSlots.find((slot) => slot.time === preferredTime)?.status ?? "inquiry";
}

export function isLastUpdatedStale(lastUpdatedAt: string, now: Date = new Date()): boolean {
  const updatedTime = new Date(lastUpdatedAt).getTime();
  if (Number.isNaN(updatedTime)) return true;

  const diffHours = (now.getTime() - updatedTime) / (1000 * 60 * 60);
  return diffHours > STALE_HOURS;
}

function getCapacityMarginScore(store: Store, request: SearchRequest): number {
  const margin = store.capacity.maxContiguousGroupSize - request.groupSize;
  if (margin <= 0) return 0;
  return clamp(margin, 0, 10);
}

function scoreForLevel(level: MatchLevel): number {
  switch (level) {
    case "together_likely":
      return 80;
    case "inquiry_recommended":
      return 60;
    case "split_only":
      return 40;
    case "difficult":
      return 10;
  }
}

function calculateScore(
  level: MatchLevel,
  store: Store,
  request: SearchRequest,
  slotStatus: SlotStatus,
  stale: boolean,
): number {
  let score = scoreForLevel(level);

  if (store.status.currentGroupStatus === "good") score += 10;
  if (store.status.currentGroupStatus === "limited") score += 5;
  if (store.status.currentGroupStatus === "inquiry_needed") score -= 5;

  if (slotStatus === "available") score += 10;
  if (slotStatus === "inquiry") score += 3;
  if (stale) score -= 10;

  score += getCapacityMarginScore(store, request);

  const band = {
    together_likely: [80, 100],
    inquiry_recommended: [60, 79],
    split_only: [40, 59],
    difficult: [0, 39],
  }[level];

  return clamp(score, band[0], band[1]);
}

function buildReasons(
  store: Store,
  request: SearchRequest,
  slotStatus: SlotStatus,
  stale: boolean,
): { reasons: string[]; warnings: string[] } {
  const reasons: string[] = [];
  const warnings: string[] = [];
  const canSitTogether = request.groupSize <= store.capacity.maxContiguousGroupSize;
  const canFitInStore = request.groupSize <= store.capacity.maxSplitGroupSize;

  if (canSitTogether) {
    reasons.push(`요청 인원 ${request.groupSize}명이 붙여 앉기 권장 범위 안에 있습니다.`);
  } else if (canFitInStore) {
    reasons.push("같은 매장 내 수용은 가능하지만 일부 분리될 수 있습니다.");
    warnings.push(`붙여 앉기 권장 인원은 최대 ${store.capacity.maxContiguousGroupSize}명입니다.`);
  } else {
    warnings.push(`요청 인원이 분리 착석 포함 최대 ${store.capacity.maxSplitGroupSize}명을 초과합니다.`);
  }

  reasons.push(`현재 단체 상태: ${groupStatusLabels[store.status.currentGroupStatus]}`);
  reasons.push(`${request.preferredTime} 시간대 상태: ${slotStatusLabels[slotStatus]}`);

  if (store.seating.hasPrivateRoom) reasons.push("룸이 있어 독립적인 단체 모임 가능성을 확인할 수 있습니다.");
  if (store.seating.hasSemiPrivateArea) reasons.push("반분리 공간이 있어 단체 대화에 유리할 수 있습니다.");
  if (store.seating.tablesCanBeCombined) reasons.push("테이블 결합이 가능한 구조입니다.");

  if (stale) warnings.push("최근 업데이트가 24시간 이상 지나 방문 전 확인이 필요합니다.");
  if (slotStatus === "inquiry") warnings.push("선택 시간대는 가능 여부를 문의해야 합니다.");
  if (slotStatus === "unavailable") warnings.push("선택 시간대는 현재 불가로 표시되어 있습니다.");
  if (store.status.currentGroupStatus === "difficult") warnings.push("매장 상태가 현재 단체 이용 어려움으로 표시되어 있습니다.");

  return { reasons, warnings };
}

function headlineForLevel(level: MatchLevel): string {
  switch (level) {
    case "together_likely":
      return "단체가 함께 앉을 가능성이 높은 후보입니다.";
    case "inquiry_recommended":
      return "구조상 가능성이 있으나 방문 전 확인이 필요합니다.";
    case "split_only":
      return "같은 매장 내 분리 착석을 전제로 검토할 수 있습니다.";
    case "difficult":
      return "현재 검색 조건에서는 적합도가 낮습니다.";
  }
}

export function evaluateStoreMatch(
  store: Store,
  request: SearchRequest,
  now: Date = new Date(),
): StoreMatchResult {
  const canSitTogether = request.groupSize <= store.capacity.maxContiguousGroupSize;
  const canFitInStore = request.groupSize <= store.capacity.maxSplitGroupSize;
  const slotStatus = findSlotStatus(store, request.preferredTime);
  const stale = isLastUpdatedStale(store.status.lastUpdatedAt, now);

  let level: MatchLevel;

  if (!canFitInStore || store.status.currentGroupStatus === "difficult" || slotStatus === "unavailable") {
    level = "difficult";
  } else if (
    canSitTogether &&
    ["good", "limited"].includes(store.status.currentGroupStatus) &&
    ["available", "inquiry"].includes(slotStatus) &&
    !stale
  ) {
    level = "together_likely";
  } else if (
    store.status.currentGroupStatus === "inquiry_needed" ||
    stale ||
    slotStatus === "inquiry" ||
    (request.seatingPreference === "together" && !canSitTogether && canFitInStore)
  ) {
    level = "inquiry_recommended";
  } else if (
    !canSitTogether &&
    canFitInStore &&
    ["partial_split_ok", "same_store_ok"].includes(request.seatingPreference) &&
    ["good", "limited"].includes(store.status.currentGroupStatus)
  ) {
    level = "split_only";
  } else {
    level = "inquiry_recommended";
  }

  const { reasons, warnings } = buildReasons(store, request, slotStatus, stale);

  return {
    store,
    level,
    score: calculateScore(level, store, request, slotStatus, stale),
    badgeText: matchLevelLabels[level],
    headline: headlineForLevel(level),
    reasons,
    warnings,
  };
}

export function getRankedStores(
  stores: Store[],
  request: SearchRequest,
  now: Date = new Date(),
): StoreMatchResult[] {
  return stores
    .filter((store) => store.area === request.area)
    .map((store) => evaluateStoreMatch(store, request, now))
    .sort((a, b) => {
      const levelDiff = MATCH_LEVEL_PRIORITY[a.level] - MATCH_LEVEL_PRIORITY[b.level];
      if (levelDiff !== 0) return levelDiff;

      const scoreDiff = b.score - a.score;
      if (scoreDiff !== 0) return scoreDiff;

      return b.store.capacity.maxContiguousGroupSize - a.store.capacity.maxContiguousGroupSize;
    });
}
