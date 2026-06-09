export type Area =
  | "front_gate"
  | "back_gate"
  | "station"
  | "food_street"
  | "campus_nearby";

export type SeatingType =
  | "long_table"
  | "combined_tables"
  | "private_room"
  | "semi_private_area"
  | "hall_split";

export type GroupStatus = "good" | "limited" | "inquiry_needed" | "difficult";

export type SlotStatus = "available" | "inquiry" | "unavailable";

export type ReservationSlot = {
  time: string;
  status: SlotStatus;
};

export type UpdateSource = "owner" | "operator" | "mock";

export type ContactMethod = "phone" | "message" | "app_request";

export type SeatingPreference = "together" | "partial_split_ok" | "same_store_ok";

export type Store = {
  id: string;
  name: string;
  area: Area;
  address?: string;
  category: string;

  capacity: {
    maxContiguousGroupSize: number;
    maxSplitGroupSize: number;
    capacityNote?: string;
  };

  seating: {
    types: SeatingType[];
    hasPrivateRoom: boolean;
    hasSemiPrivateArea: boolean;
    tablesCanBeCombined: boolean;
    description?: string;
  };

  status: {
    currentGroupStatus: GroupStatus;
    reservationSlots: ReservationSlot[];
    lastUpdatedAt: string;
    updateSource: UpdateSource;
  };

  contact: {
    contactMethod: ContactMethod;
    phone?: string;
    messageHint?: string;
  };

  notes?: string;
};

export type SearchRequest = {
  area: Area;
  groupSize: number;
  preferredTime: string;
  seatingPreference: SeatingPreference;
};

export type MatchLevel =
  | "together_likely"
  | "inquiry_recommended"
  | "split_only"
  | "difficult";

export type StoreMatchResult = {
  store: Store;
  level: MatchLevel;
  score: number;
  badgeText: string;
  headline: string;
  reasons: string[];
  warnings: string[];
};
