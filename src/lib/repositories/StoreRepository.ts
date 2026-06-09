import { seedStores } from "../seedStores";
import type { GroupStatus, ReservationSlot, Store, UpdateSource } from "../types";

export const STORE_OVERRIDES_KEY = "group-place-store-overrides";

export type StoreOverride = {
  currentGroupStatus?: GroupStatus;
  reservationSlots?: ReservationSlot[];
  lastUpdatedAt?: string;
  updateSource?: UpdateSource;
};

export type StoreOverrides = Record<string, StoreOverride>;

function canUseLocalStorage(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export class StoreRepository {
  constructor(
    private readonly baseStores: Store[] = seedStores,
    private readonly storageKey: string = STORE_OVERRIDES_KEY,
  ) {}

  getStoreOverrides(): StoreOverrides {
    if (!canUseLocalStorage()) return {};

    try {
      const raw = window.localStorage.getItem(this.storageKey);
      if (!raw) return {};
      return JSON.parse(raw) as StoreOverrides;
    } catch {
      return {};
    }
  }

  mergeStoreOverrides(stores: Store[], overrides: StoreOverrides): Store[] {
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

  getStores(): Store[] {
    return this.mergeStoreOverrides(this.baseStores, this.getStoreOverrides());
  }

  getStoreById(storeId: string): Store | undefined {
    return this.getStores().find((store) => store.id === storeId);
  }

  saveStoreStatus(
    storeId: string,
    currentGroupStatus: GroupStatus,
    reservationSlots: ReservationSlot[],
  ): Store[] {
    if (!canUseLocalStorage()) return this.getStores();

    const overrides = this.getStoreOverrides();
    overrides[storeId] = {
      currentGroupStatus,
      reservationSlots,
      lastUpdatedAt: new Date().toISOString(),
      updateSource: "owner",
    };

    window.localStorage.setItem(this.storageKey, JSON.stringify(overrides));
    return this.getStores();
  }

  resetStoreOverrides(): Store[] {
    if (canUseLocalStorage()) window.localStorage.removeItem(this.storageKey);
    return this.getStores();
  }
}

export const storeRepository = new StoreRepository();
