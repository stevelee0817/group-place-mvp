import type { Area, GroupStatus, SeatingPreference, SlotStatus } from "./types";

export const STALE_HOURS = 24;

export const AREA_OPTIONS: Area[] = [
  "front_gate",
  "back_gate",
  "station",
  "food_street",
  "campus_nearby",
];

export const TIME_OPTIONS = ["18:00", "19:00", "20:00", "21:00"] as const;

export const SEATING_PREFERENCE_OPTIONS: SeatingPreference[] = [
  "together",
  "partial_split_ok",
  "same_store_ok",
];

export const GROUP_STATUS_OPTIONS: GroupStatus[] = [
  "good",
  "limited",
  "inquiry_needed",
  "difficult",
];

export const SLOT_STATUS_OPTIONS: SlotStatus[] = ["available", "inquiry", "unavailable"];

export const MATCH_LEVEL_PRIORITY = {
  together_likely: 1,
  inquiry_recommended: 2,
  split_only: 3,
  difficult: 4,
} as const;
