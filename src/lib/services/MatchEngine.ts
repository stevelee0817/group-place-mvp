import { MATCH_LEVEL_PRIORITY, STALE_HOURS } from "../constants";
import { groupStatusLabels, matchLevelLabels, slotStatusLabels } from "../labels";
import type { MatchLevel, SearchRequest, SlotStatus, Store, StoreMatchResult } from "../types";

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export class MatchEngine {
  findSlotStatus(store: Store, preferredTime: string): SlotStatus {
    return store.status.reservationSlots.find((slot) => slot.time === preferredTime)?.status ?? "inquiry";
  }

  isLastUpdatedStale(lastUpdatedAt: string, now: Date = new Date()): boolean {
    const updatedTime = new Date(lastUpdatedAt).getTime();
    if (Number.isNaN(updatedTime)) return true;

    const diffHours = (now.getTime() - updatedTime) / (1000 * 60 * 60);
    return diffHours > STALE_HOURS;
  }

  evaluateStoreMatch(store: Store, request: SearchRequest, now: Date = new Date()): StoreMatchResult {
    const canSitTogether = request.groupSize <= store.capacity.maxContiguousGroupSize;
    const canFitInStore = request.groupSize <= store.capacity.maxSplitGroupSize;
    const slotStatus = this.findSlotStatus(store, request.preferredTime);
    const stale = this.isLastUpdatedStale(store.status.lastUpdatedAt, now);
    const level = this.chooseMatchLevel(store, request, canSitTogether, canFitInStore, slotStatus, stale);
    const { reasons, warnings } = this.buildReasons(store, request, slotStatus, stale);

    return {
      store,
      level,
      score: this.calculateScore(level, store, request, slotStatus, stale),
      badgeText: matchLevelLabels[level],
      headline: this.headlineForLevel(level),
      reasons,
      warnings,
    };
  }

  getRankedStores(stores: Store[], request: SearchRequest, now: Date = new Date()): StoreMatchResult[] {
    return stores
      .filter((store) => store.area === request.area)
      .map((store) => this.evaluateStoreMatch(store, request, now))
      .sort((a, b) => {
        const levelDiff = MATCH_LEVEL_PRIORITY[a.level] - MATCH_LEVEL_PRIORITY[b.level];
        if (levelDiff !== 0) return levelDiff;

        const scoreDiff = b.score - a.score;
        if (scoreDiff !== 0) return scoreDiff;

        return b.store.capacity.maxContiguousGroupSize - a.store.capacity.maxContiguousGroupSize;
      });
  }

  private chooseMatchLevel(
    store: Store,
    request: SearchRequest,
    canSitTogether: boolean,
    canFitInStore: boolean,
    slotStatus: SlotStatus,
    stale: boolean,
  ): MatchLevel {
    if (!canFitInStore || store.status.currentGroupStatus === "difficult" || slotStatus === "unavailable") {
      return "difficult";
    }

    if (
      canSitTogether &&
      ["good", "limited"].includes(store.status.currentGroupStatus) &&
      ["available", "inquiry"].includes(slotStatus) &&
      !stale
    ) {
      return "together_likely";
    }

    if (
      store.status.currentGroupStatus === "inquiry_needed" ||
      stale ||
      slotStatus === "inquiry" ||
      (request.seatingPreference === "together" && !canSitTogether && canFitInStore)
    ) {
      return "inquiry_recommended";
    }

    if (
      !canSitTogether &&
      canFitInStore &&
      ["partial_split_ok", "same_store_ok"].includes(request.seatingPreference) &&
      ["good", "limited"].includes(store.status.currentGroupStatus)
    ) {
      return "split_only";
    }

    return "inquiry_recommended";
  }

  private getCapacityMarginScore(store: Store, request: SearchRequest): number {
    const margin = store.capacity.maxContiguousGroupSize - request.groupSize;
    if (margin <= 0) return 0;
    return clamp(margin, 0, 10);
  }

  private scoreForLevel(level: MatchLevel): number {
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

  private calculateScore(
    level: MatchLevel,
    store: Store,
    request: SearchRequest,
    slotStatus: SlotStatus,
    stale: boolean,
  ): number {
    let score = this.scoreForLevel(level);

    if (store.status.currentGroupStatus === "good") score += 10;
    if (store.status.currentGroupStatus === "limited") score += 5;
    if (store.status.currentGroupStatus === "inquiry_needed") score -= 5;

    if (slotStatus === "available") score += 10;
    if (slotStatus === "inquiry") score += 3;
    if (stale) score -= 10;

    score += this.getCapacityMarginScore(store, request);

    const band = {
      together_likely: [80, 100],
      inquiry_recommended: [60, 79],
      split_only: [40, 59],
      difficult: [0, 39],
    }[level];

    return clamp(score, band[0], band[1]);
  }

  private buildReasons(
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

  private headlineForLevel(level: MatchLevel): string {
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
}

export const matchEngine = new MatchEngine();
