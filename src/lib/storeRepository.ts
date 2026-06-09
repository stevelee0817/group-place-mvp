import { seedStores } from "./seedStores";
import type { GroupStatus, ReservationSlot, Store, UpdateSource } from "./types";

export const STORE_OVERRIDES_KEY = "group-place-store-overrides";

type StoreOverride = {
  currentGroupStatus?: GroupStatus;
  reservationSlots?: ReservationSlot[];
  lastUpdatedAt?: string;
  updateSource?: UpdateSource;
};

type StoreOverrides = Record<string, StoreOverride>;

function canUseLocalStorage(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function getStoreOverrides(): StoreOverrides {
  if (!canUseLocalStorage()) return {};

  try {
    const raw = window.localStorage.getItem(STORE_OVERRIDES_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as StoreOverrides;
  } catch {
    return {};
  }
}

export function mergeStoreOverrides(stores: Store[], overrides: StoreOverrides): Store[] {
  return stores.map((store) => {
    const override = overrides[store.id];
    if (!override) return store;

    return {
      ...store,
      status: {
        ...store.status,
        currentGroupStatus: override.currentGroupStatus ?? store.status.currentGroupStatus,
        reservationSlots: override.reservationSlots ?? store.status.reservationSlots,
        lastUpdatedAt: override.lastUpdatedAt ?? store.status.lastUpdatedAt,
        updateSource: override.updateSource ?? store.status.updateSource,
      },
    };
  });
}

export function getStores(): Store[] {
  return mergeStoreOverrides(seedStores, getStoreOverrides());
}

export function getStoreById(storeId: string): Store | undefined {
  return getStores().find((store) => store.id === storeId);
}

export function saveStoreStatus(
  storeId: string,
  currentGroupStatus: GroupStatus,
  reservationSlots: ReservationSlot[],
): Store[] {
  if (!canUseLocalStorage()) return getStores();

  const overrides = getStoreOverrides();
  overrides[storeId] = {
    currentGroupStatus,
    reservationSlots,
    lastUpdatedAt: new Date().toISOString(),
    updateSource: "owner",
  };

  window.localStorage.setItem(STORE_OVERRIDES_KEY, JSON.stringify(overrides));
  return getStores();
}

export function resetStoreOverrides(): Store[] {
  if (canUseLocalStorage()) window.localStorage.removeItem(STORE_OVERRIDES_KEY);
  return getStores();
}
