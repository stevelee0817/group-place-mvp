import type {
  Area,
  GroupStatus,
  MatchLevel,
  SeatingPreference,
  SeatingType,
  SlotStatus,
  UpdateSource,
} from "./types";

export const areaLabels: Record<Area, string> = {
  front_gate: "정문",
  back_gate: "후문",
  station: "역 앞",
  food_street: "먹자골목",
  campus_nearby: "캠퍼스 주변",
};

export const groupStatusLabels: Record<GroupStatus, string> = {
  good: "여유 있음",
  limited: "제한적 가능",
  inquiry_needed: "문의 필요",
  difficult: "어려움",
};

export const slotStatusLabels: Record<SlotStatus, string> = {
  available: "가능",
  inquiry: "문의",
  unavailable: "불가",
};

export const matchLevelLabels: Record<MatchLevel, string> = {
  together_likely: "같이 앉기 가능성 높음",
  inquiry_recommended: "구조상 가능하나 문의 권장",
  split_only: "분리 착석 가능",
  difficult: "현재 조건에서는 어려움",
};

export const seatingTypeLabels: Record<SeatingType, string> = {
  long_table: "긴 테이블",
  combined_tables: "테이블 결합",
  private_room: "룸",
  semi_private_area: "반분리 공간",
  hall_split: "홀 분산",
};

export const seatingPreferenceLabels: Record<SeatingPreference, string> = {
  together: "최대한 붙어 앉기",
  partial_split_ok: "일부 분리 가능",
  same_store_ok: "같은 매장이면 괜찮음",
};

export const updateSourceLabels: Record<UpdateSource, string> = {
  owner: "매장 관리자",
  operator: "운영자",
  mock: "샘플 데이터",
};
