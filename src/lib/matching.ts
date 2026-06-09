import { matchEngine } from "./services/MatchEngine";
import type { SearchRequest, SlotStatus, Store, StoreMatchResult } from "./types";

export { MatchEngine, matchEngine } from "./services/MatchEngine";

export function findSlotStatus(store: Store, preferredTime: string): SlotStatus {
  return matchEngine.findSlotStatus(store, preferredTime);
}

export function isLastUpdatedStale(lastUpdatedAt: string, now: Date = new Date()): boolean {
  return matchEngine.isLastUpdatedStale(lastUpdatedAt, now);
}

export function evaluateStoreMatch(
  store: Store,
  request: SearchRequest,
  now: Date = new Date(),
): StoreMatchResult {
  return matchEngine.evaluateStoreMatch(store, request, now);
}

export function getRankedStores(
  stores: Store[],
  request: SearchRequest,
  now: Date = new Date(),
): StoreMatchResult[] {
  return matchEngine.getRankedStores(stores, request, now);
}
