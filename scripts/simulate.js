#!/usr/bin/env node
/*
 * 대학가 술집/뒤풀이 단체 좌석 매칭 MVP
 * 가상 좌석 점유 기반 event simulation
 *
 * 실행:
 *   node scripts/simulate.js
 *
 * 외부 라이브러리 없이 동작하며, 실행 시 docs/ 폴더와 아래 파일을 생성합니다.
 *   - docs/simulation.md
 *   - docs/simulation-summary.json
 *   - docs/simulation-requests.csv
 *   - docs/simulation-scenarios.json
 */

const fs = require("fs");
const path = require("path");

const OUTPUT_DIR = path.join(process.cwd(), "docs");
const DEFAULT_TEST_REQUEST_COUNT = 1000;
const DEFAULT_DAY_COUNT = 30;
const BASE_SEED = 20260615;
const OPEN_MINUTE = 18 * 60;
const CLOSE_MINUTE = 26 * 60;
const PEAK_START = 20 * 60;
const PEAK_END = 24 * 60;

const MATCH_LEVELS = ["together_likely", "inquiry_recommended", "split_only", "difficult"];

const matchLevelLabels = {
  together_likely: "같이 앉기 가능성 높음",
  inquiry_recommended: "문의 권장",
  split_only: "분리 착석 가능",
  difficult: "현재 조건에서는 어려움",
};

const areaLabels = {
  front_gate: "정문",
  back_gate: "후문",
  food_street: "먹자골목",
  station: "역 앞",
  campus_nearby: "캠퍼스 주변",
};

const seatingPreferenceLabels = {
  together: "붙어 앉기 선호",
  split_ok: "일부 분리 가능",
  any: "같은 매장이면 괜찮음",
};

const scenarioLabels = {
  small_drinks: "소규모 술자리",
  friends: "친구 모임",
  team_after: "조모임 뒤풀이",
  club_small: "동아리 소모임",
  department_after: "과 행사 뒤풀이",
  student_council: "학생회 행사 후 모임",
  club_full: "동아리 전체 모임",
  mt_after: "MT 뒤풀이",
};

const tableTypeLabels = {
  two: "2인 테이블",
  four: "4인 테이블",
  six: "6인 긴 테이블",
  eight: "8인 긴 테이블",
  ten: "10인 긴 테이블",
  room: "룸 테이블",
};

function createRandom(seed) {
  let value = seed >>> 0;

  return function random() {
    value += 0x6D2B79F5;
    let t = value;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function round(value, digits = 2) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function percent(value, total, digits = 1) {
  if (total === 0) return "0.0%";
  return `${((value / total) * 100).toFixed(digits)}%`;
}

function pickWeighted(random, items) {
  const total = items.reduce((sum, item) => sum + item.weight, 0);
  let cursor = random() * total;

  for (const item of items) {
    cursor -= item.weight;
    if (cursor <= 0) return item.value;
  }

  return items[items.length - 1].value;
}

function randomInt(random, min, max) {
  return Math.floor(random() * (max - min + 1)) + min;
}

function randomMinuteInRange(random, start, end) {
  return randomInt(random, start, end - 1);
}

function formatMinute(minute) {
  const normalized = minute % (24 * 60);
  const hour = Math.floor(normalized / 60);
  const min = normalized % 60;
  const base = `${String(hour).padStart(2, "0")}:${String(min).padStart(2, "0")}`;

  if (minute >= 24 * 60) {
    return `${base}(+1)`;
  }

  return base;
}

function hourBucket(minute) {
  return Math.floor(minute / 60);
}

function hourBucketLabel(hour) {
  if (hour < 24) return `${hour}시대`;
  return `${hour}시대(${hour - 24}시대)`;
}

function isPeakMinute(minute) {
  return minute >= PEAK_START && minute < PEAK_END;
}

function createTables(storeId, groups) {
  const tables = [];

  for (const group of groups) {
    for (let index = 1; index <= group.count; index += 1) {
      tables.push({
        id: `${storeId}-${group.zone}-${group.type}-${index}`,
        type: group.type,
        seats: group.seats,
        zone: group.zone,
      });
    }
  }

  return tables;
}

function groupBy(items, keyFn) {
  return items.reduce((acc, item) => {
    const key = keyFn(item);
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});
}

function sumSeats(tables) {
  return tables.reduce((sum, table) => sum + table.seats, 0);
}

function combinationSearch(tables, targetSeats, options = {}) {
  const maxTables = options.maxTables || tables.length;
  const minTables = options.minTables || 1;
  const sorted = [...tables].sort((a, b) => {
    if (b.seats !== a.seats) return b.seats - a.seats;
    return a.id.localeCompare(b.id);
  });

  let best = null;

  function consider(chosen, seats) {
    if (chosen.length < minTables) return;
    if (seats < targetSeats) return;

    const candidate = {
      tables: [...chosen],
      seats,
      waste: seats - targetSeats,
      tableCount: chosen.length,
    };

    if (!best) {
      best = candidate;
      return;
    }

    if (candidate.waste < best.waste) {
      best = candidate;
      return;
    }

    if (candidate.waste === best.waste && candidate.tableCount < best.tableCount) {
      best = candidate;
      return;
    }

    if (
      candidate.waste === best.waste &&
      candidate.tableCount === best.tableCount &&
      candidate.seats < best.seats
    ) {
      best = candidate;
    }
  }

  function dfs(startIndex, chosen, seats) {
    if (chosen.length > maxTables) return;

    consider(chosen, seats);

    if (chosen.length === maxTables) return;

    for (let index = startIndex; index < sorted.length; index += 1) {
      const table = sorted[index];
      dfs(index + 1, [...chosen, table], seats + table.seats);
    }
  }

  dfs(0, [], 0);
  return best;
}

function findTogetherPlan(store, availableTables, groupSize) {
  if (groupSize > store.capacity.maxContiguousGroupSize) return null;

  const singleTable = [...availableTables]
    .filter((table) => table.seats >= groupSize)
    .sort((a, b) => {
      if (a.seats !== b.seats) return a.seats - b.seats;
      return a.id.localeCompare(b.id);
    })[0];

  if (singleTable) {
    return {
      kind: "together_single",
      tables: [singleTable],
      seats: singleTable.seats,
      waste: singleTable.seats - groupSize,
      tableCount: 1,
      zoneCount: 1,
      label: `${tableTypeLabels[singleTable.type] || "테이블"} 1개`,
    };
  }

  if (!store.combineAllowed) return null;

  const byZone = groupBy(availableTables, (table) => table.zone);
  let best = null;

  for (const zoneTables of Object.values(byZone)) {
    const combo = combinationSearch(zoneTables, groupSize, {
      minTables: 2,
      maxTables: store.maxCombineTables,
    });

    if (!combo) continue;

    const candidate = {
      kind: "together_combined",
      ...combo,
      zoneCount: 1,
      label: `${combo.tableCount}개 테이블 결합`,
    };

    if (!best) {
      best = candidate;
      continue;
    }

    if (candidate.waste < best.waste) best = candidate;
    else if (candidate.waste === best.waste && candidate.tableCount < best.tableCount) best = candidate;
  }

  return best;
}

function findSplitPlan(store, availableTables, groupSize) {
  if (groupSize > store.capacity.maxSplitGroupSize) return null;

  const combo = combinationSearch(availableTables, groupSize, {
    minTables: 2,
    maxTables: store.maxSplitTables,
  });

  if (!combo) return null;

  const zones = new Set(combo.tables.map((table) => table.zone));

  return {
    kind: "split",
    ...combo,
    zoneCount: zones.size,
    label: `${combo.tableCount}개 테이블 분리 착석`,
  };
}

function computeMaxContiguousCapacity(store, tables) {
  const total = sumSeats(tables);

  for (let size = total; size >= 1; size -= 1) {
    if (
      findTogetherPlan(
        { ...store, capacity: { maxContiguousGroupSize: total, maxSplitGroupSize: total } },
        tables,
        size,
      )
    ) {
      return size;
    }
  }

  return 0;
}

function computeMaxOpenContiguous(store, availableTables) {
  const maxCheck = Math.min(sumSeats(availableTables), store.capacity.maxContiguousGroupSize);

  for (let size = maxCheck; size >= 1; size -= 1) {
    if (findTogetherPlan(store, availableTables, size)) return size;
  }

  return 0;
}

function createStoreBlueprints() {
  const stores = [
    {
      id: "store-001",
      name: "강의끝포차",
      area: "front_gate",
      category: "포차",
      popularity: 1.05,
      combineAllowed: true,
      maxCombineTables: 2,
      maxSplitTables: 4,
      tables: createTables("store-001", [
        { type: "two", seats: 2, count: 4, zone: "hall-a" },
        { type: "four", seats: 4, count: 5, zone: "hall-a" },
        { type: "six", seats: 6, count: 1, zone: "hall-b" },
      ]),
    },
    {
      id: "store-002",
      name: "둥근테이블",
      area: "back_gate",
      category: "술집",
      popularity: 1,
      combineAllowed: false,
      maxCombineTables: 1,
      maxSplitTables: 5,
      tables: createTables("store-002", [
        { type: "two", seats: 2, count: 3, zone: "hall-a" },
        { type: "four", seats: 4, count: 6, zone: "hall-a" },
      ]),
    },
    {
      id: "store-003",
      name: "큰마당호프",
      area: "food_street",
      category: "호프",
      popularity: 1.22,
      combineAllowed: true,
      maxCombineTables: 4,
      maxSplitTables: 7,
      tables: createTables("store-003", [
        { type: "two", seats: 2, count: 4, zone: "hall-a" },
        { type: "four", seats: 4, count: 7, zone: "hall-a" },
        { type: "six", seats: 6, count: 3, zone: "hall-b" },
      ]),
    },
    {
      id: "store-004",
      name: "조용한룸",
      area: "station",
      category: "이자카야",
      popularity: 0.95,
      combineAllowed: true,
      maxCombineTables: 2,
      maxSplitTables: 4,
      tables: createTables("store-004", [
        { type: "room", seats: 10, count: 1, zone: "room" },
        { type: "four", seats: 4, count: 4, zone: "hall-a" },
        { type: "two", seats: 2, count: 2, zone: "hall-a" },
      ]),
    },
    {
      id: "store-005",
      name: "반칸라운지",
      area: "food_street",
      category: "라운지",
      popularity: 1.08,
      combineAllowed: true,
      maxCombineTables: 3,
      maxSplitTables: 6,
      tables: createTables("store-005", [
        { type: "two", seats: 2, count: 2, zone: "semi-a" },
        { type: "four", seats: 4, count: 4, zone: "semi-a" },
        { type: "six", seats: 6, count: 2, zone: "semi-b" },
        { type: "eight", seats: 8, count: 1, zone: "semi-b" },
      ]),
    },
    {
      id: "store-006",
      name: "골목분식포차",
      area: "back_gate",
      category: "분식포차",
      popularity: 0.82,
      combineAllowed: false,
      maxCombineTables: 1,
      maxSplitTables: 3,
      tables: createTables("store-006", [
        { type: "two", seats: 2, count: 3, zone: "hall-a" },
        { type: "four", seats: 4, count: 2, zone: "hall-a" },
      ]),
    },
    {
      id: "store-007",
      name: "긴테이블집",
      area: "front_gate",
      category: "한식주점",
      popularity: 1.12,
      combineAllowed: false,
      maxCombineTables: 1,
      maxSplitTables: 5,
      tables: createTables("store-007", [
        { type: "four", seats: 4, count: 2, zone: "hall-a" },
        { type: "six", seats: 6, count: 2, zone: "hall-a" },
        { type: "ten", seats: 10, count: 1, zone: "hall-b" },
      ]),
    },
    {
      id: "store-008",
      name: "넓은홀식당",
      area: "campus_nearby",
      category: "식당형 술집",
      popularity: 0.9,
      combineAllowed: true,
      maxCombineTables: 3,
      maxSplitTables: 7,
      tables: createTables("store-008", [
        { type: "two", seats: 2, count: 2, zone: "hall-a" },
        { type: "four", seats: 4, count: 5, zone: "hall-a" },
        { type: "six", seats: 6, count: 4, zone: "hall-b" },
      ]),
    },
    {
      id: "store-009",
      name: "작은잔",
      area: "station",
      category: "바",
      popularity: 0.75,
      combineAllowed: false,
      maxCombineTables: 1,
      maxSplitTables: 3,
      tables: createTables("store-009", [
        { type: "two", seats: 2, count: 3, zone: "hall-a" },
        { type: "four", seats: 4, count: 3, zone: "hall-a" },
      ]),
    },
    {
      id: "store-010",
      name: "후문마당",
      area: "back_gate",
      category: "고깃집",
      popularity: 1.16,
      combineAllowed: true,
      maxCombineTables: 3,
      maxSplitTables: 6,
      tables: createTables("store-010", [
        { type: "four", seats: 4, count: 6, zone: "hall-a" },
        { type: "six", seats: 6, count: 2, zone: "hall-b" },
      ]),
    },
  ];

  return stores.map((store) => {
    const maxSplitGroupSize = sumSeats(store.tables);
    const maxContiguousGroupSize = computeMaxContiguousCapacity(
      { ...store, capacity: { maxContiguousGroupSize: maxSplitGroupSize, maxSplitGroupSize } },
      store.tables,
    );

    return {
      ...store,
      capacity: {
        totalSeats: maxSplitGroupSize,
        maxContiguousGroupSize,
        maxSplitGroupSize,
      },
    };
  });
}

const STORE_BLUEPRINTS = createStoreBlueprints();

function cloneRuntimeStores() {
  return STORE_BLUEPRINTS.map((store) => ({
    ...store,
    tables: store.tables.map((table) => ({
      ...table,
      occupiedUntil: null,
      occupantId: null,
      occupantSize: 0,
      occupantKind: null,
    })),
  }));
}

function releaseTables(store, minute) {
  for (const table of store.tables) {
    if (table.occupiedUntil !== null && table.occupiedUntil <= minute) {
      table.occupiedUntil = null;
      table.occupantId = null;
      table.occupantSize = 0;
      table.occupantKind = null;
    }
  }
}

function releaseAllStores(runtimeStores, minute) {
  for (const store of runtimeStores) {
    releaseTables(store, minute);
  }
}

function getAvailableTables(store) {
  return store.tables.filter((table) => table.occupiedUntil === null);
}

function getOccupiedTables(store) {
  return store.tables.filter((table) => table.occupiedUntil !== null);
}

function storeSnapshot(store) {
  const availableTables = getAvailableTables(store);
  const occupiedTables = getOccupiedTables(store);
  const freeSeats = sumSeats(availableTables);
  const occupiedSeats = sumSeats(occupiedTables);
  const totalSeats = store.capacity.totalSeats;

  return {
    freeSeats,
    occupiedSeats,
    totalSeats,
    availableTableCount: availableTables.length,
    occupiedTableCount: occupiedTables.length,
    occupancyRatio: totalSeats === 0 ? 0 : occupiedSeats / totalSeats,
    maxOpenContiguous: computeMaxOpenContiguous(store, availableTables),
  };
}

function findSoonTables(store, minute, withinMinutes) {
  return store.tables.filter((table) => {
    if (table.occupiedUntil === null) return true;
    return table.occupiedUntil <= minute + withinMinutes;
  });
}

function getPreferenceStrictness(seatingPreference) {
  if (seatingPreference === "together") return 1;
  if (seatingPreference === "split_ok") return 0.5;
  return 0;
}

function createStoreScore(level, request, snapshot, plan) {
  const baseScores = {
    together_likely: 86,
    inquiry_recommended: 58,
    split_only: request.seatingPreference === "any" ? 66 : 63,
    difficult: 8,
  };

  let score = baseScores[level];

  score += clamp(snapshot.freeSeats - request.groupSize, -8, 10) * 0.8;
  score -= snapshot.occupancyRatio * 12;

  if (plan) {
    score -= plan.waste * 0.4;
    score -= Math.max(0, plan.tableCount - 1) * 1.5;
    if (plan.kind === "together_combined") score -= 2;
    if (plan.kind === "split") score -= 4;
  }

  if (request.groupSize >= 9) score -= 4;
  if (request.seatingPreference === "together" && level !== "together_likely") score -= 8;
  if (isPeakMinute(request.arrivalMinute)) score -= 3;

  return round(clamp(score, 0, 100), 2);
}

function evaluateStoreForRequest(store, request) {
  const availableTables = getAvailableTables(store);
  const snapshot = storeSnapshot(store);
  const togetherPlan = findTogetherPlan(store, availableTables, request.groupSize);
  const splitPlan = findSplitPlan(store, availableTables, request.groupSize);
  const strictness = getPreferenceStrictness(request.seatingPreference);

  const structurallyTogetherPossible = request.groupSize <= store.capacity.maxContiguousGroupSize;
  const structurallySplitPossible = request.groupSize <= store.capacity.maxSplitGroupSize;

  const soonTables = findSoonTables(store, request.arrivalMinute, 20);
  const soonTogetherPlan = togetherPlan ? null : findTogetherPlan(store, soonTables, request.groupSize);
  const soonSplitPlan = splitPlan ? null : findSplitPlan(store, soonTables, request.groupSize);

  const reasons = [];
  const warnings = [];
  let level = "difficult";
  let plan = null;
  let occupancyBlocked = false;
  let blockedReason = "";

  if (!structurallySplitPossible) {
    level = "difficult";
    warnings.push(`매장 구조상 분리 착석을 포함해도 ${request.groupSize}명을 수용하기 어렵습니다.`);
    blockedReason = "structural_capacity";
  } else if (request.seatingPreference === "together" && !structurallyTogetherPossible) {
    level = "difficult";
    warnings.push(
      `붙어 앉기 선호 요청이지만 이 매장의 최대 붙여 앉기 가능 인원은 ${store.capacity.maxContiguousGroupSize}명입니다.`,
    );
    blockedReason = "strict_together_over_contiguous_capacity";
  } else if (togetherPlan) {
    plan = togetherPlan;
    reasons.push(`현재 빈 테이블 기준으로 ${togetherPlan.label} 배정이 가능합니다.`);

    const tightLargeGroup = request.groupSize >= 9 && snapshot.occupancyRatio >= 0.46;
    const complexCombination = togetherPlan.kind === "together_combined" && togetherPlan.tableCount >= 3;
    const almostNoMargin = snapshot.freeSeats - request.groupSize <= 3 && snapshot.occupancyRatio >= 0.58;
    const peakBusyMediumGroup = isPeakMinute(request.arrivalMinute) && request.groupSize >= 5 && snapshot.occupancyRatio >= 0.58;

    if (tightLargeGroup || complexCombination || almostNoMargin || peakBusyMediumGroup) {
      level = "inquiry_recommended";
      warnings.push("빈자리는 있으나 피크 시간대 점유와 테이블 결합 여유가 작아 문의가 필요합니다.");
    } else {
      level = "together_likely";
    }
  } else if (splitPlan && request.seatingPreference !== "together") {
    plan = splitPlan;
    level = "split_only";
    reasons.push(`붙어 앉기는 어렵지만 현재 빈 테이블 ${splitPlan.tableCount}개로 분리 착석은 가능합니다.`);
  } else if (splitPlan && request.seatingPreference === "together") {
    plan = splitPlan;
    level = "inquiry_recommended";
    reasons.push("현재 빈 테이블을 나누면 수용은 가능하지만, 붙어 앉기 선호와 맞지 않아 문의가 필요합니다.");
    warnings.push("붙어 앉기 요청 기준으로는 현재 연속 좌석이 부족합니다.");
    occupancyBlocked = structurallyTogetherPossible;
    blockedReason = "contiguous_tables_occupied";
  } else if ((soonTogetherPlan || soonSplitPlan) && structurallySplitPossible) {
    plan = soonTogetherPlan || soonSplitPlan;
    level = "inquiry_recommended";
    reasons.push("현재 바로 배정 가능한 테이블은 부족하지만 20분 내 비는 테이블을 포함하면 가능성이 있습니다.");
    warnings.push("입장 가능 여부는 매장에 대기/정리 시간을 문의해야 합니다.");
    occupancyBlocked = true;
    blockedReason = "tables_freeing_soon";
  } else {
    level = "difficult";
    warnings.push("현재 점유 중인 테이블 때문에 요청 인원에 맞는 빈 테이블 조합이 부족합니다.");
    occupancyBlocked = structurallySplitPossible;
    blockedReason = structurallySplitPossible ? "occupied_tables_block_current_plan" : "structural_capacity";
  }

  if (snapshot.occupancyRatio >= 0.75) {
    warnings.push("현재 좌석 점유율이 높습니다.");
  }

  if (!togetherPlan && structurallyTogetherPossible && request.seatingPreference !== "any") {
    occupancyBlocked = true;
    if (!blockedReason) blockedReason = "contiguous_tables_occupied";
  }

  if (!splitPlan && structurallySplitPossible && snapshot.freeSeats < request.groupSize) {
    occupancyBlocked = true;
    if (!blockedReason) blockedReason = "not_enough_free_seats_due_to_occupancy";
  }

  const score = createStoreScore(level, request, snapshot, plan);

  return {
    store,
    level,
    score,
    plan,
    snapshot,
    reasons,
    warnings,
    occupancyBlocked,
    blockedReason,
    structurallyTogetherPossible,
    structurallySplitPossible,
    togetherPlanExists: Boolean(togetherPlan),
    splitPlanExists: Boolean(splitPlan),
    strictness,
  };
}

function sortEvaluations(a, b) {
  if (b.score !== a.score) return b.score - a.score;

  const levelOrder = {
    together_likely: 1,
    split_only: 2,
    inquiry_recommended: 3,
    difficult: 4,
  };

  if (levelOrder[a.level] !== levelOrder[b.level]) return levelOrder[a.level] - levelOrder[b.level];

  return b.store.capacity.maxContiguousGroupSize - a.store.capacity.maxContiguousGroupSize;
}

function evaluateRequestAcrossStores(runtimeStores, request) {
  const areaStores = runtimeStores.filter((store) => store.area === request.area);
  const evaluations = areaStores.map((store) => evaluateStoreForRequest(store, request)).sort(sortEvaluations);
  const best = evaluations[0] || null;
  const candidateCount = evaluations.filter((item) => item.level !== "difficult").length;
  const occupancyBlockedEvaluations = evaluations.filter((item) => item.occupancyBlocked);

  return {
    best,
    evaluations,
    candidateCount,
    occupancyBlockedEvaluations,
  };
}

function allocatePlan(store, plan, occupant) {
  if (!plan || !plan.tables || plan.tables.length === 0) return false;

  const tableIds = new Set(plan.tables.map((table) => table.id));
  const runtimeTables = store.tables.filter((table) => tableIds.has(table.id));

  if (runtimeTables.length !== tableIds.size) return false;
  if (runtimeTables.some((table) => table.occupiedUntil !== null)) return false;

  for (const table of runtimeTables) {
    table.occupiedUntil = occupant.departureMinute;
    table.occupantId = occupant.id;
    table.occupantSize = occupant.groupSize;
    table.occupantKind = occupant.kind;
  }

  return true;
}

function chooseBackgroundArea(random) {
  return pickWeighted(random, [
    { value: "front_gate", weight: 24 },
    { value: "back_gate", weight: 24 },
    { value: "food_street", weight: 26 },
    { value: "station", weight: 16 },
    { value: "campus_nearby", weight: 10 },
  ]);
}

function chooseArrivalMinute(random, mode = "baseline") {
  const weightsByMode = {
    baseline: [
      { range: [18 * 60, 20 * 60], weight: 22 },
      { range: [20 * 60, 22 * 60], weight: 31 },
      { range: [22 * 60, 24 * 60], weight: 32 },
      { range: [24 * 60, 26 * 60], weight: 15 },
    ],
    peak: [
      { range: [18 * 60, 20 * 60], weight: 8 },
      { range: [20 * 60, 22 * 60], weight: 37 },
      { range: [22 * 60, 24 * 60], weight: 43 },
      { range: [24 * 60, 26 * 60], weight: 12 },
    ],
    late: [
      { range: [18 * 60, 20 * 60], weight: 5 },
      { range: [20 * 60, 22 * 60], weight: 20 },
      { range: [22 * 60, 24 * 60], weight: 48 },
      { range: [24 * 60, 26 * 60], weight: 27 },
    ],
  };

  const selected = pickWeighted(
    random,
    weightsByMode[mode].map((item) => ({ value: item.range, weight: item.weight })),
  );

  return randomMinuteInRange(random, selected[0], selected[1]);
}

function chooseGroupSize(random, mode = "baseline") {
  if (mode === "large") {
    return pickWeighted(random, [
      { value: 9, weight: 15 },
      { value: 10, weight: 18 },
      { value: 11, weight: 17 },
      { value: 12, weight: 18 },
      { value: 13, weight: 13 },
      { value: 14, weight: 11 },
      { value: 15, weight: 5 },
      { value: 16, weight: 3 },
    ]);
  }

  if (mode === "small") {
    return pickWeighted(random, [
      { value: 2, weight: 30 },
      { value: 3, weight: 35 },
      { value: 4, weight: 35 },
    ]);
  }

  return pickWeighted(random, [
    { value: 2, weight: 10 },
    { value: 3, weight: 12 },
    { value: 4, weight: 13 },
    { value: 5, weight: 12 },
    { value: 6, weight: 11 },
    { value: 7, weight: 9 },
    { value: 8, weight: 8 },
    { value: 9, weight: 7 },
    { value: 10, weight: 6 },
    { value: 11, weight: 4 },
    { value: 12, weight: 4 },
    { value: 13, weight: 3 },
    { value: 14, weight: 1 },
  ]);
}

function chooseSeatingPreference(random, mode = "baseline", groupSize = 4) {
  if (mode === "strict") return "together";

  if (mode === "split_friendly") {
    return pickWeighted(random, [
      { value: "together", weight: groupSize >= 9 ? 18 : 28 },
      { value: "split_ok", weight: groupSize >= 9 ? 48 : 42 },
      { value: "any", weight: groupSize >= 9 ? 34 : 30 },
    ]);
  }

  return pickWeighted(random, [
    { value: "together", weight: groupSize >= 9 ? 30 : 34 },
    { value: "split_ok", weight: groupSize >= 9 ? 46 : 38 },
    { value: "any", weight: groupSize >= 9 ? 24 : 28 },
  ]);
}

function chooseScenarioLabel(random, groupSize) {
  if (groupSize <= 4) {
    return pickWeighted(random, [
      { value: "small_drinks", weight: 55 },
      { value: "friends", weight: 45 },
    ]);
  }

  if (groupSize <= 8) {
    return pickWeighted(random, [
      { value: "team_after", weight: 45 },
      { value: "club_small", weight: 35 },
      { value: "friends", weight: 20 },
    ]);
  }

  return pickWeighted(random, [
    { value: "department_after", weight: 34 },
    { value: "student_council", weight: 24 },
    { value: "club_full", weight: 27 },
    { value: "mt_after", weight: 15 },
  ]);
}

function chooseStayDuration(random, groupSize) {
  if (groupSize <= 4) return randomInt(random, 80, 135);
  if (groupSize <= 8) return randomInt(random, 90, 155);
  return randomInt(random, 110, 180);
}

function createRequest(random, options) {
  const groupSize = chooseGroupSize(random, options.groupSizeMode || "baseline");
  const seatingPreference = chooseSeatingPreference(random, options.preferenceMode || "baseline", groupSize);
  const arrivalMinute = chooseArrivalMinute(random, options.timeMode || "baseline");
  const stayDuration = chooseStayDuration(random, groupSize);

  return {
    area: chooseBackgroundArea(random),
    groupSize,
    arrivalMinute,
    departureMinute: Math.min(CLOSE_MINUTE + 120, arrivalMinute + stayDuration),
    stayDuration,
    seatingPreference,
    scenarioKey: chooseScenarioLabel(random, groupSize),
  };
}

function distributeCount(total, buckets) {
  const base = Math.floor(total / buckets);
  const remainder = total % buckets;

  return Array.from({ length: buckets }, (_, index) => base + (index < remainder ? 1 : 0));
}

function createBackgroundEvents(random, dayIndex, config) {
  const base = config.backgroundBasePerDay || 160;
  const multiplier = config.backgroundMultiplier || 1;
  const jitter = randomInt(random, -12, 18);
  const count = Math.max(0, Math.round(base * multiplier + jitter));
  const events = [];

  for (let index = 0; index < count; index += 1) {
    const groupMode = pickWeighted(random, [
      { value: "baseline", weight: 72 },
      { value: "large", weight: config.largeBackgroundWeight || 16 },
      { value: "small", weight: 12 },
    ]);

    const request = createRequest(random, {
      groupSizeMode: groupMode,
      preferenceMode: groupMode === "large" ? "split_friendly" : "baseline",
      timeMode: config.backgroundTimeMode || "baseline",
    });

    events.push({
      ...request,
      id: `bg-d${dayIndex + 1}-${String(index + 1).padStart(4, "0")}`,
      day: dayIndex + 1,
      kind: "background",
    });
  }

  return events;
}

function createTestEvents(random, dayIndex, countForDay, config, globalOffset) {
  const events = [];

  for (let index = 0; index < countForDay; index += 1) {
    const request = createRequest(random, {
      groupSizeMode: config.testGroupSizeMode || "baseline",
      preferenceMode: config.testPreferenceMode || "baseline",
      timeMode: config.testTimeMode || "baseline",
    });

    events.push({
      ...request,
      id: `req-${String(globalOffset + index + 1).padStart(5, "0")}`,
      day: dayIndex + 1,
      kind: "test",
    });
  }

  return events;
}

function chooseBackgroundStore(random, evaluations) {
  const feasible = evaluations.filter((item) => item.level !== "difficult" && item.plan);
  if (feasible.length === 0) return null;

  const weighted = feasible.map((item) => ({
    value: item,
    weight: Math.max(1, item.score * item.store.popularity),
  }));

  return pickWeighted(random, weighted);
}

function acceptanceProbabilityForBackground(level, seatingPreference) {
  if (level === "together_likely") return 0.92;
  if (level === "split_only") return seatingPreference === "any" ? 0.74 : 0.62;
  if (level === "inquiry_recommended") return seatingPreference === "together" ? 0.28 : 0.44;
  return 0;
}

function acceptanceProbabilityForTest(level, seatingPreference) {
  if (level === "together_likely") return 0.82;
  if (level === "split_only") return seatingPreference === "any" ? 0.65 : 0.55;
  if (level === "inquiry_recommended") return seatingPreference === "together" ? 0.16 : 0.32;
  return 0;
}

function processBackgroundEvent(random, runtimeStores, event) {
  const result = evaluateRequestAcrossStores(runtimeStores, event);
  const chosen = chooseBackgroundStore(random, result.evaluations);

  if (!chosen) return false;

  const probability = acceptanceProbabilityForBackground(chosen.level, event.seatingPreference);
  if (random() > probability) return false;

  return allocatePlan(chosen.store, chosen.plan, event);
}

function shortWarning(evaluation) {
  if (!evaluation) return "후보 없음";
  if (evaluation.warnings.length > 0) return evaluation.warnings[0];
  if (evaluation.reasons.length > 0) return evaluation.reasons[0];
  return "특이 사항 없음";
}

function processTestEvent(random, runtimeStores, event, scenarioName) {
  const result = evaluateRequestAcrossStores(runtimeStores, event);
  const best = result.best;
  const bestSnapshot = best ? best.snapshot : null;
  const blockedStoreNames = result.occupancyBlockedEvaluations.map((item) => item.store.name);

  let allocated = false;
  if (best && best.level !== "difficult" && best.plan) {
    const probability = acceptanceProbabilityForTest(best.level, event.seatingPreference);
    if (random() <= probability) {
      allocated = allocatePlan(best.store, best.plan, event);
    }
  }

  return {
    id: event.id,
    day: event.day,
    scenarioName,
    scenarioKey: event.scenarioKey,
    scenarioLabel: scenarioLabels[event.scenarioKey],
    area: event.area,
    areaLabel: areaLabels[event.area],
    groupSize: event.groupSize,
    arrivalMinute: event.arrivalMinute,
    arrivalTime: formatMinute(event.arrivalMinute),
    hour: hourBucket(event.arrivalMinute),
    hourLabel: hourBucketLabel(hourBucket(event.arrivalMinute)),
    isPeakTime: isPeakMinute(event.arrivalMinute),
    stayDuration: event.stayDuration,
    seatingPreference: event.seatingPreference,
    seatingPreferenceLabel: seatingPreferenceLabels[event.seatingPreference],
    resultLevel: best ? best.level : "difficult",
    resultLabel: best ? matchLevelLabels[best.level] : matchLevelLabels.difficult,
    score: best ? best.score : 0,
    candidateCount: result.candidateCount,
    topStoreId: best ? best.store.id : "",
    topStoreName: best ? best.store.name : "없음",
    topStoreCategory: best ? best.store.category : "",
    topStoreTotalSeats: best ? best.store.capacity.totalSeats : 0,
    topStoreMaxContiguous: best ? best.store.capacity.maxContiguousGroupSize : 0,
    topStoreMaxSplit: best ? best.store.capacity.maxSplitGroupSize : 0,
    topStoreFreeSeats: bestSnapshot ? bestSnapshot.freeSeats : 0,
    topStoreOccupiedSeats: bestSnapshot ? bestSnapshot.occupiedSeats : 0,
    topStoreOccupancyRatio: bestSnapshot ? round(bestSnapshot.occupancyRatio, 4) : 0,
    topStoreAvailableTables: bestSnapshot ? bestSnapshot.availableTableCount : 0,
    topStoreMaxOpenContiguous: bestSnapshot ? bestSnapshot.maxOpenContiguous : 0,
    planKind: best && best.plan ? best.plan.kind : "none",
    planTableCount: best && best.plan ? best.plan.tableCount : 0,
    topReason: best ? shortWarning(best) : "해당 지역에 평가할 매장이 없습니다.",
    warnings: best ? best.warnings : ["해당 지역에 평가할 매장이 없습니다."],
    reasons: best ? best.reasons : [],
    occupancyBlocked: result.occupancyBlockedEvaluations.length > 0,
    blockedStoreCount: result.occupancyBlockedEvaluations.length,
    blockedStoreNames,
    allocatedToSimulation: allocated,
  };
}

function runSimulation(config) {
  const random = createRandom(config.seed || BASE_SEED);
  const dayCount = config.dayCount || DEFAULT_DAY_COUNT;
  const testRequestCount = config.testRequestCount || DEFAULT_TEST_REQUEST_COUNT;
  const testCountsByDay = distributeCount(testRequestCount, dayCount);
  const rows = [];
  let globalTestOffset = 0;

  for (let dayIndex = 0; dayIndex < dayCount; dayIndex += 1) {
    const runtimeStores = cloneRuntimeStores();
    const backgroundEvents = createBackgroundEvents(random, dayIndex, config);
    const testEvents = createTestEvents(random, dayIndex, testCountsByDay[dayIndex], config, globalTestOffset);
    globalTestOffset += testCountsByDay[dayIndex];

    const events = [...backgroundEvents, ...testEvents].sort((a, b) => {
      if (a.arrivalMinute !== b.arrivalMinute) return a.arrivalMinute - b.arrivalMinute;
      const order = { background: 1, test: 2 };
      return order[a.kind] - order[b.kind];
    });

    for (const event of events) {
      releaseAllStores(runtimeStores, event.arrivalMinute);

      if (event.kind === "background") {
        processBackgroundEvent(random, runtimeStores, event);
      } else {
        rows.push(processTestEvent(random, runtimeStores, event, config.name || "baseline"));
      }
    }
  }

  return {
    rows,
    summary: createSummary(rows, config),
  };
}

function initLevelCounts() {
  return MATCH_LEVELS.reduce((acc, level) => {
    acc[level] = 0;
    return acc;
  }, {});
}

function createGroupSummary(rows, keyFn, labelFn) {
  const map = new Map();

  for (const row of rows) {
    const key = keyFn(row);
    if (!map.has(key)) {
      map.set(key, {
        key,
        label: labelFn(row),
        total: 0,
        candidateAvailable: 0,
        candidateCountSum: 0,
        scoreSum: 0,
        levelCounts: initLevelCounts(),
      });
    }

    const item = map.get(key);
    item.total += 1;
    if (row.resultLevel !== "difficult") item.candidateAvailable += 1;
    item.candidateCountSum += row.candidateCount;
    item.scoreSum += row.score;
    item.levelCounts[row.resultLevel] += 1;
  }

  return Array.from(map.values()).map((item) => ({
    key: item.key,
    label: item.label,
    total: item.total,
    candidateAvailable: item.candidateAvailable,
    candidateAvailabilityRatio: round(item.candidateAvailable / item.total, 4),
    candidateAvailabilityRatioText: percent(item.candidateAvailable, item.total),
    averageCandidateCount: round(item.candidateCountSum / item.total, 2),
    averageScore: round(item.scoreSum / item.total, 2),
    levelCounts: item.levelCounts,
  }));
}

function createSummary(rows, config) {
  const levelCounts = initLevelCounts();
  let candidateAvailable = 0;
  let candidateCountSum = 0;
  let scoreSum = 0;

  for (const row of rows) {
    levelCounts[row.resultLevel] += 1;
    if (row.resultLevel !== "difficult") candidateAvailable += 1;
    candidateCountSum += row.candidateCount;
    scoreSum += row.score;
  }

  const levelTable = MATCH_LEVELS.map((level) => ({
    level,
    label: matchLevelLabels[level],
    count: levelCounts[level],
    ratio: round(levelCounts[level] / rows.length, 4),
    ratioText: percent(levelCounts[level], rows.length),
  }));

  const byHour = createGroupSummary(
    rows,
    (row) => row.hour,
    (row) => row.hourLabel,
  ).sort((a, b) => Number(a.key) - Number(b.key));

  const byGroupSize = createGroupSummary(
    rows,
    (row) => row.groupSize,
    (row) => `${row.groupSize}명`,
  ).sort((a, b) => Number(a.key) - Number(b.key));

  const bySeatingPreference = createGroupSummary(
    rows,
    (row) => row.seatingPreference,
    (row) => row.seatingPreferenceLabel,
  );

  const peakFailureCases = rows
    .filter((row) => row.isPeakTime && row.resultLevel === "difficult")
    .sort((a, b) => b.groupSize - a.groupSize || b.topStoreOccupancyRatio - a.topStoreOccupancyRatio)
    .slice(0, 5);

  const largeGroupFailureCases = rows
    .filter((row) => row.groupSize >= 9 && row.resultLevel === "difficult")
    .sort((a, b) => b.groupSize - a.groupSize || b.topStoreOccupancyRatio - a.topStoreOccupancyRatio)
    .slice(0, 5);

  const occupancyBlockedCases = rows
    .filter((row) => row.occupancyBlocked)
    .sort((a, b) => {
      if (a.resultLevel === "difficult" && b.resultLevel !== "difficult") return -1;
      if (a.resultLevel !== "difficult" && b.resultLevel === "difficult") return 1;
      return b.topStoreOccupancyRatio - a.topStoreOccupancyRatio || b.groupSize - a.groupSize;
    })
    .slice(0, 7);

  return {
    generatedAt: new Date().toISOString(),
    simulationType: "virtual_seat_occupancy_event_simulation",
    scenarioName: config.name || "baseline",
    seed: config.seed || BASE_SEED,
    dayCount: config.dayCount || DEFAULT_DAY_COUNT,
    totalTestRequests: rows.length,
    candidateAvailable,
    candidateAvailabilityRatio: round(candidateAvailable / rows.length, 4),
    candidateAvailabilityRatioText: percent(candidateAvailable, rows.length),
    averageCandidateCount: round(candidateCountSum / rows.length, 2),
    averageScore: round(scoreSum / rows.length, 2),
    levelCounts,
    levelTable,
    byHour,
    byGroupSize,
    bySeatingPreference,
    peakFailureCases,
    largeGroupFailureCases,
    occupancyBlockedCases,
    storeBlueprints: STORE_BLUEPRINTS.map((store) => ({
      id: store.id,
      name: store.name,
      area: store.area,
      areaLabel: areaLabels[store.area],
      category: store.category,
      combineAllowed: store.combineAllowed,
      maxCombineTables: store.maxCombineTables,
      maxSplitTables: store.maxSplitTables,
      totalSeats: store.capacity.totalSeats,
      maxContiguousGroupSize: store.capacity.maxContiguousGroupSize,
      maxSplitGroupSize: store.capacity.maxSplitGroupSize,
      tableSummary: summarizeTableStructure(store),
    })),
    notes: [
      "이 결과는 실제 운영 데이터가 아니라 가상 좌석 점유 기반 시뮬레이션 결과이다.",
      "다른 가상 손님들의 입장·퇴장으로 테이블이 점유되는 상황을 만든 뒤, 테스트 요청 시점의 빈 테이블 조합을 평가했다.",
      "후보 확보 비율은 difficult가 아닌 결과 비율이며, 실제 예약 성공률을 의미하지 않는다.",
    ],
  };
}

function summarizeTableStructure(store) {
  const grouped = {};

  for (const table of store.tables) {
    const label = tableTypeLabels[table.type] || `${table.seats}인 테이블`;
    grouped[label] = (grouped[label] || 0) + 1;
  }

  return Object.entries(grouped)
    .map(([label, count]) => `${label} ${count}개`)
    .join(", ");
}

function csvEscape(value) {
  const text = String(value ?? "");
  if (/[",\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

function createCsv(rows) {
  const headers = [
    "id",
    "day",
    "scenario_label",
    "area",
    "area_label",
    "group_size",
    "arrival_time",
    "hour",
    "stay_duration_minutes",
    "seating_preference",
    "seating_preference_label",
    "result_level",
    "result_label",
    "score",
    "candidate_count",
    "top_store_name",
    "top_store_category",
    "top_store_total_seats",
    "top_store_free_seats",
    "top_store_occupied_seats",
    "top_store_occupancy_ratio",
    "top_store_max_contiguous",
    "top_store_max_open_contiguous",
    "top_store_max_split",
    "top_store_available_tables",
    "plan_kind",
    "plan_table_count",
    "occupancy_blocked",
    "blocked_store_count",
    "blocked_store_names",
    "top_reason",
  ];

  const lines = rows.map((row) =>
    [
      row.id,
      row.day,
      row.scenarioLabel,
      row.area,
      row.areaLabel,
      row.groupSize,
      row.arrivalTime,
      row.hourLabel,
      row.stayDuration,
      row.seatingPreference,
      row.seatingPreferenceLabel,
      row.resultLevel,
      row.resultLabel,
      row.score,
      row.candidateCount,
      row.topStoreName,
      row.topStoreCategory,
      row.topStoreTotalSeats,
      row.topStoreFreeSeats,
      row.topStoreOccupiedSeats,
      row.topStoreOccupancyRatio,
      row.topStoreMaxContiguous,
      row.topStoreMaxOpenContiguous,
      row.topStoreMaxSplit,
      row.topStoreAvailableTables,
      row.planKind,
      row.planTableCount,
      row.occupancyBlocked ? "true" : "false",
      row.blockedStoreCount,
      row.blockedStoreNames.join(" | "),
      row.topReason,
    ]
      .map(csvEscape)
      .join(","),
  );

  return [headers.join(","), ...lines].join("\n");
}

function markdownTable(headers, rows) {
  const headerLine = `| ${headers.join(" | ")} |`;
  const separatorLine = `| ${headers.map(() => "---").join(" | ")} |`;
  const rowLines = rows.map((row) => `| ${row.map((cell) => String(cell).replace(/\n/g, "<br />")).join(" | ")} |`);
  return [headerLine, separatorLine, ...rowLines].join("\n");
}

function caseRow(row) {
  const occupancy = `${Math.round(row.topStoreOccupancyRatio * 100)}%`;
  return [
    row.id,
    row.scenarioLabel,
    row.areaLabel,
    `${row.groupSize}명`,
    row.arrivalTime,
    row.seatingPreferenceLabel,
    row.topStoreName,
    `${row.topStoreFreeSeats}/${row.topStoreTotalSeats}`,
    occupancy,
    row.topReason,
  ];
}

function createMarkdown(summary, scenarioSummaries) {
  const levelRows = summary.levelTable.map((item) => [item.label, item.count, item.ratioText]);
  const hourRows = summary.byHour.map((item) => [
    item.label,
    item.total,
    item.candidateAvailabilityRatioText,
    item.averageCandidateCount,
    item.levelCounts.together_likely,
    item.levelCounts.inquiry_recommended,
    item.levelCounts.split_only,
    item.levelCounts.difficult,
  ]);
  const groupRows = summary.byGroupSize.map((item) => [
    item.label,
    item.total,
    item.candidateAvailabilityRatioText,
    item.averageCandidateCount,
    item.levelCounts.together_likely,
    item.levelCounts.inquiry_recommended,
    item.levelCounts.split_only,
    item.levelCounts.difficult,
  ]);
  const preferenceRows = summary.bySeatingPreference.map((item) => [
    item.label,
    item.total,
    item.candidateAvailabilityRatioText,
    item.levelCounts.together_likely,
    item.levelCounts.inquiry_recommended,
    item.levelCounts.split_only,
    item.levelCounts.difficult,
  ]);
  const storeRows = summary.storeBlueprints.map((store) => [
    store.name,
    store.areaLabel,
    store.tableSummary,
    store.combineAllowed ? "가능" : "불가",
    `${store.maxContiguousGroupSize}명`,
    `${store.maxSplitGroupSize}명`,
  ]);
  const scenarioRows = scenarioSummaries.map((item) => [
    item.scenarioName,
    item.totalTestRequests,
    item.candidateAvailabilityRatioText,
    item.averageCandidateCount,
    item.levelCounts.together_likely,
    item.levelCounts.inquiry_recommended,
    item.levelCounts.split_only,
    item.levelCounts.difficult,
  ]);

  const failureHeaders = [
    "요청 ID",
    "상황",
    "지역",
    "인원",
    "시간",
    "착석 선호",
    "상위 후보",
    "빈 좌석/총 좌석",
    "점유율",
    "판단 이유",
  ];

  return `# 가상 좌석 점유 기반 시뮬레이션 결과

## 1. 시뮬레이션 목적

이 문서는 대학가 술집/뒤풀이 단체 좌석 매칭 MVP의 핵심 로직을 점검하기 위한 가상 좌석 점유 기반 시뮬레이션 결과이다. 이 시뮬레이션은 실제 운영 데이터가 아니며, 실제 매장 예약 가능성을 보장하지 않는다. 가상의 매장 테이블 구조와 가상의 손님 입장·퇴장 이벤트를 만든 뒤, 특정 요청이 들어온 시점의 빈 테이블 조합을 기준으로 매칭 결과를 판단했다.

기존의 단순 상태값 기반 테스트에서 한 단계 더 나아가, 가상의 손님 입장·퇴장과 테이블 점유를 반영해 시간대별 좌석 상태를 생성했다. 이를 통해 피크 시간대와 대규모 단체 요청에서 왜 문의 권장 또는 어려움으로 분류되는지 더 현실적으로 확인할 수 있었다.

이 시뮬레이션은 실제 예약 가능성을 검증하기 위한 것이 아니라, 인원·시간대·착석 선호가 달라질 때 매칭 로직이 어떤 방향으로 반응하는지 확인하기 위한 것이다. 특히 20~24시 피크 시간대와 9명 이상 단체 요청에서 문의 권장 또는 어려움으로 분류되는 사례를 확인함으로써, 단체 좌석 탐색이 단순한 매장 검색 문제가 아니라 좌석 구조와 시간대 상태가 함께 작용하는 문제임을 확인했다.

## 2. 설정

- 기본 테스트 요청 수: ${summary.totalTestRequests}건
- 시뮬레이션 일수: ${summary.dayCount}일
- 시간대: 18시~26시
- 주요 요청 집중 시간대: 20시~24시
- 체류 시간: 보통 90~150분 수준이며, 대규모 단체는 더 길게 머물 수 있도록 설정
- 결과 해석: 후보 확보 비율은 difficult가 아닌 결과 비율이며, 실제 예약 성공률이 아니다.

## 3. 매장별 가상 테이블 구조

${markdownTable(["매장", "지역", "테이블 구조", "결합", "최대 붙여 앉기", "분리 포함 최대"], storeRows)}

매장 상태를 처음부터 혼잡/여유로 고정하지 않고, 위 테이블 구조에 가상의 손님을 실제로 배정했다. 시간이 흐르면서 체류 시간이 끝난 손님은 퇴장하고 해당 테이블은 다시 빈 테이블로 처리했다.

## 4. 전체 결과 요약

- 전체 테스트 요청 수: ${summary.totalTestRequests}건
- 후보 확보 비율: ${summary.candidateAvailabilityRatioText}
- 평균 추천 후보 수: ${summary.averageCandidateCount}개
- 평균 score: ${summary.averageScore}

${markdownTable(["결과 상태", "건수", "비율"], levelRows)}

'together_likely'는 현재 빈 테이블 조합으로 붙어 앉을 가능성이 높은 경우이다. 'split_only'는 붙어 앉기는 어렵지만 분리 착석은 가능한 경우이다. 'inquiry_recommended'는 곧 비는 테이블, 복잡한 테이블 결합, 피크 시간대의 높은 점유율 등으로 인해 전화나 메시지 문의가 필요한 경우이다. 'difficult'는 현재 빈 좌석 또는 좌석 구조상 추천하기 어려운 경우이다.

## 5. 시간대별 후보 확보 비율

${markdownTable(["시간대", "요청 수", "후보 확보 비율", "평균 후보 수", "같이 앉기", "문의 권장", "분리 착석", "어려움"], hourRows)}

20~24시에는 배경 손님 이벤트가 많이 발생하도록 설정했다. 따라서 같은 매장이라도 18~20시보다 피크 시간대에 빈 테이블 조합이 줄어들고, 대규모 요청은 문의 권장 또는 어려움으로 이동하는 경향이 나타난다.

## 6. 인원수별 후보 확보 비율

${markdownTable(["인원", "요청 수", "후보 확보 비율", "평균 후보 수", "같이 앉기", "문의 권장", "분리 착석", "어려움"], groupRows)}

2~4명 요청은 빈 테이블 하나로 해결되는 경우가 많지만, 9명 이상 단체는 테이블 결합 또는 여러 테이블 분리 배정이 필요하다. 따라서 대규모 단체일수록 단순히 남은 좌석 수만 보는 것으로는 충분하지 않고, 붙여 앉을 수 있는 테이블 조합이 실제로 비어 있는지를 확인해야 한다.

## 7. 착석 선호별 결과

${markdownTable(["착석 선호", "요청 수", "후보 확보 비율", "같이 앉기", "문의 권장", "분리 착석", "어려움"], preferenceRows)}

붙어 앉기 선호가 강한 요청은 빈 좌석 총량이 남아 있더라도 연속 좌석이 없으면 낮게 평가된다. 반대로 일부 분리 가능 또는 같은 매장이면 괜찮음 요청은 여러 빈 테이블을 조합할 수 있어 'split_only' 후보가 생긴다.

## 8. 피크 시간대 실패 사례

${summary.peakFailureCases.length > 0 ? markdownTable(failureHeaders, summary.peakFailureCases.map(caseRow)) : "피크 시간대 실패 사례가 충분히 발생하지 않았다."}

## 9. 대규모 단체 실패 사례

${summary.largeGroupFailureCases.length > 0 ? markdownTable(failureHeaders, summary.largeGroupFailureCases.map(caseRow)) : "대규모 단체 실패 사례가 충분히 발생하지 않았다."}

## 10. 실제 점유 상황 때문에 추천이 어려워진 사례

${summary.occupancyBlockedCases.length > 0 ? markdownTable(failureHeaders, summary.occupancyBlockedCases.map(caseRow)) : "점유 상황 때문에 추천이 어려워진 사례가 충분히 발생하지 않았다."}

이 사례들은 매장 구조상으로는 어느 정도 수용 가능성이 있어도, 테스트 요청이 들어온 시점에 다른 가상 손님들이 테이블을 사용하고 있어 붙여 앉기 또는 분리 착석이 어려워진 경우이다. 즉, 총 좌석 수가 아니라 시간대별 실제 빈 테이블 조합이 중요하다는 점을 보여준다.

## 11. 시나리오별 추가 요약

${markdownTable(["시나리오", "요청 수", "후보 확보 비율", "평균 후보 수", "같이 앉기", "문의 권장", "분리 착석", "어려움"], scenarioRows)}

시나리오별 결과는 docs/simulation-scenarios.json에도 저장된다. 이 파일은 기본 상황 외에 피크 시간대, 대규모 단체, 붙어 앉기 선호, 점유 스트레스가 강한 상황에서 로직이 어떻게 반응하는지 비교하기 위한 참고 자료이다.

## 12. 해석과 한계

이 시뮬레이션은 실제 운영 데이터가 아니라 가상 좌석 점유 기반 시뮬레이션이다. 매장의 실제 회전율, 사장님의 테이블 이동 판단, 예약 취소, 노쇼, 현장 대기, 전화 응답 속도 등은 반영하지 않았다. 따라서 수치를 실제 예약 성공률처럼 해석하면 안 된다.

다만 단순 상태값 기반 테스트보다 한 단계 더 나아가, 손님들이 시간대별로 입장하고 퇴장하면서 테이블이 점유되는 상황을 반영했다는 점에서 현재 MVP의 문제의식을 더 잘 설명할 수 있다. 대학가 술집/뒤풀이/2차 장소 탐색에서는 단순히 매장을 검색하는 것보다, 지금 이 인원이 들어갈 수 있는 테이블 조합이 있는지를 빠르게 확인하는 것이 중요하다.
`;
}

function createScenarioConfigs() {
  return [
    {
      name: "baseline",
      seed: BASE_SEED,
      dayCount: DEFAULT_DAY_COUNT,
      testRequestCount: DEFAULT_TEST_REQUEST_COUNT,
      backgroundBasePerDay: 280,
      backgroundMultiplier: 1,
      backgroundTimeMode: "baseline",
      testTimeMode: "baseline",
      testGroupSizeMode: "baseline",
      testPreferenceMode: "baseline",
      largeBackgroundWeight: 16,
    },
    {
      name: "peakTime",
      seed: BASE_SEED + 101,
      dayCount: DEFAULT_DAY_COUNT,
      testRequestCount: DEFAULT_TEST_REQUEST_COUNT,
      backgroundBasePerDay: 250,
      backgroundMultiplier: 1.25,
      backgroundTimeMode: "peak",
      testTimeMode: "peak",
      testGroupSizeMode: "baseline",
      testPreferenceMode: "baseline",
      largeBackgroundWeight: 12,
    },
    {
      name: "largeGroup",
      seed: BASE_SEED + 202,
      dayCount: DEFAULT_DAY_COUNT,
      testRequestCount: DEFAULT_TEST_REQUEST_COUNT,
      backgroundBasePerDay: 165,
      backgroundMultiplier: 1.05,
      backgroundTimeMode: "baseline",
      testTimeMode: "baseline",
      testGroupSizeMode: "large",
      testPreferenceMode: "split_friendly",
      largeBackgroundWeight: 14,
    },
    {
      name: "strictTogether",
      seed: BASE_SEED + 303,
      dayCount: DEFAULT_DAY_COUNT,
      testRequestCount: DEFAULT_TEST_REQUEST_COUNT,
      backgroundBasePerDay: 165,
      backgroundMultiplier: 1.03,
      backgroundTimeMode: "baseline",
      testTimeMode: "baseline",
      testGroupSizeMode: "baseline",
      testPreferenceMode: "strict",
      largeBackgroundWeight: 11,
    },
    {
      name: "occupancyStress",
      seed: BASE_SEED + 404,
      dayCount: DEFAULT_DAY_COUNT,
      testRequestCount: DEFAULT_TEST_REQUEST_COUNT,
      backgroundBasePerDay: 310,
      backgroundMultiplier: 1.25,
      backgroundTimeMode: "peak",
      testTimeMode: "late",
      testGroupSizeMode: "baseline",
      testPreferenceMode: "baseline",
      largeBackgroundWeight: 15,
    },
  ];
}

function compactScenarioSummary(summary) {
  return {
    scenarioName: summary.scenarioName,
    totalTestRequests: summary.totalTestRequests,
    candidateAvailabilityRatio: summary.candidateAvailabilityRatio,
    candidateAvailabilityRatioText: summary.candidateAvailabilityRatioText,
    averageCandidateCount: summary.averageCandidateCount,
    averageScore: summary.averageScore,
    levelCounts: summary.levelCounts,
    levelTable: summary.levelTable,
    byHour: summary.byHour,
    byGroupSize: summary.byGroupSize,
    bySeatingPreference: summary.bySeatingPreference,
  };
}

function printConsoleSummary(summary) {
  const level = (name) => summary.levelTable.find((item) => item.level === name);

  console.log("\n가상 좌석 점유 기반 시뮬레이션");
  console.log("=".repeat(60));
  console.log(`전체 테스트 요청 수: ${summary.totalTestRequests}건`);
  console.log(`together_likely 비율: ${level("together_likely").ratioText}`);
  console.log(`inquiry_recommended 비율: ${level("inquiry_recommended").ratioText}`);
  console.log(`split_only 비율: ${level("split_only").ratioText}`);
  console.log(`difficult 비율: ${level("difficult").ratioText}`);
  console.log(`평균 추천 후보 수: ${summary.averageCandidateCount}`);
  console.log(`후보 확보 비율: ${summary.candidateAvailabilityRatioText}`);

  console.log("\n시간대별 후보 확보 비율");
  for (const item of summary.byHour) {
    console.log(`- ${item.label}: ${item.candidateAvailabilityRatioText} (${item.candidateAvailable}/${item.total})`);
  }

  console.log("\n인원수별 후보 확보 비율");
  for (const item of summary.byGroupSize) {
    console.log(`- ${item.label}: ${item.candidateAvailabilityRatioText} (${item.candidateAvailable}/${item.total})`);
  }

  console.log("\n피크 시간대 실패 사례");
  if (summary.peakFailureCases.length === 0) {
    console.log("- 해당 사례가 충분히 발생하지 않았습니다.");
  } else {
    summary.peakFailureCases.forEach((row) => {
      console.log(`- ${row.id}: ${row.areaLabel}, ${row.groupSize}명, ${row.arrivalTime}, ${row.topStoreName}, ${row.topReason}`);
    });
  }

  console.log("\n대규모 단체 실패 사례");
  if (summary.largeGroupFailureCases.length === 0) {
    console.log("- 해당 사례가 충분히 발생하지 않았습니다.");
  } else {
    summary.largeGroupFailureCases.forEach((row) => {
      console.log(`- ${row.id}: ${row.areaLabel}, ${row.groupSize}명, ${row.arrivalTime}, ${row.topStoreName}, ${row.topReason}`);
    });
  }

  console.log("\n실제 점유 상황 때문에 추천이 어려워진 사례");
  if (summary.occupancyBlockedCases.length === 0) {
    console.log("- 해당 사례가 충분히 발생하지 않았습니다.");
  } else {
    summary.occupancyBlockedCases.forEach((row) => {
      console.log(`- ${row.id}: ${row.areaLabel}, ${row.groupSize}명, ${row.arrivalTime}, ${row.topStoreName}, 점유율 ${Math.round(row.topStoreOccupancyRatio * 100)}%`);
    });
  }
}

function main() {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const scenarioConfigs = createScenarioConfigs();
  const scenarioResults = scenarioConfigs.map((config) => runSimulation(config));
  const baseline = scenarioResults.find((item) => item.summary.scenarioName === "baseline") || scenarioResults[0];
  const scenarioSummaries = scenarioResults.map((item) => compactScenarioSummary(item.summary));

  const markdownPath = path.join(OUTPUT_DIR, "simulation.md");
  const summaryPath = path.join(OUTPUT_DIR, "simulation-summary.json");
  const csvPath = path.join(OUTPUT_DIR, "simulation-requests.csv");
  const scenariosPath = path.join(OUTPUT_DIR, "simulation-scenarios.json");

  fs.writeFileSync(markdownPath, createMarkdown(baseline.summary, scenarioSummaries), "utf8");
  fs.writeFileSync(summaryPath, `${JSON.stringify(baseline.summary, null, 2)}\n`, "utf8");
  fs.writeFileSync(csvPath, `${createCsv(baseline.rows)}\n`, "utf8");
  fs.writeFileSync(scenariosPath, `${JSON.stringify(scenarioSummaries, null, 2)}\n`, "utf8");

  printConsoleSummary(baseline.summary);

  console.log("\n생성된 파일");
  console.log(`- ${path.relative(process.cwd(), markdownPath)}`);
  console.log(`- ${path.relative(process.cwd(), summaryPath)}`);
  console.log(`- ${path.relative(process.cwd(), csvPath)}`);
  console.log(`- ${path.relative(process.cwd(), scenariosPath)}`);
}

main();