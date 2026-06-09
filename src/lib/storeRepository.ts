import {
  storeRepository,
  type StoreOverrides,
} from "./repositories/StoreRepository";
import type { GroupStatus, ReservationSlot, Store } from "./types";

export {
  STORE_OVERRIDES_KEY,
  StoreRepository,
  storeRepository,
  type StoreOverride,
  type StoreOverrides,
} from "./repositories/StoreRepository";

export function getStoreOverrides(): StoreOverrides {
  return storeRepository.getStoreOverrides();
}

export function mergeStoreOverrides(stores: Store[], overrides: StoreOverrides): Store[] {
  return storeRepository.mergeStoreOverrides(stores, overrides);
}

export function getStores(): Store[] {
  return storeRepository.getStores();
}

export function getStoreById(storeId: string): Store | undefined {
  return storeRepository.getStoreById(storeId);
}

export function saveStoreStatus(
  storeId: string,
  currentGroupStatus: GroupStatus,
  reservationSlots: ReservationSlot[],
): Store[] {
  return storeRepository.saveStoreStatus(storeId, currentGroupStatus, reservationSlots);
}

export function resetStoreOverrides(): Store[] {
  return storeRepository.resetStoreOverrides();
}
