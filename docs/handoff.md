# LLM Handoff Brief: 대학가 단체 모임 매장 탐색 MVP

이 파일을 다른 GPT에게 그대로 전달하세요.

---

## ROLE

너는 개발 담당 모델이다. 사용자는 대학 수업 Hidden Extra Challenge 과제로 **“대학가 단체 모임 매장 탐색 MVP”**를 만들고 있다.  
단순 아이디어가 아니라 **문제 정의 → 프로토타입 구현 → 현장 조사/피드백으로 개선** 과정을 보여주는 것이 목표다.

지금은 바로 과도한 기능을 만들지 말고, **1~2일 안에 실행 가능한 MVP**를 구현해야 한다.

---

## ONE-LINE PRODUCT DEFINITION

대학가 회식, 뒤풀이, 동아리 모임 이후 사용자가 여러 매장에 전화하지 않고도,  
**단체 인원과 착석 형태에 맞는 문의 가치 높은 매장 후보를 빠르게 압축하는 모바일 웹앱**.

---

## CORE POSITIONING

이 서비스는 다음이 아니다.

- 맛집 추천 앱 아님
- 정확한 실시간 잔여 좌석 수 앱 아님
- 예약 자동 확정 서비스 아님
- 지도/GPS 기반 장소 탐색 앱 아님

핵심은 다음이다.

> 고정 좌석 구조 정보와 낮은 부담의 상태 업데이트를 결합해,  
> 단체 사용자가 “같이 앉을 수 있는지 / 일부 분리 가능한지 / 문의가 필요한지”를 빠르게 판단하게 한다.

---

## MVP SCOPE

### 포함

- 모바일 웹앱
- Home/Search Page
- Results Page
- Store Detail Page
- Manager Page
- mock seed data 8~10개
- 지역, 인원, 시간, 착석 선호 입력
- 적합도 순 매장 목록
- 단체 착석 가능성 배지
- 문의 메시지 템플릿 생성
- 관리자 화면에서 상태/시간대 수정
- localStorage 저장
- README
- Supabase schema.sql 포함 가능

### 제외

- 결제
- 정식 예약 확정
- 복잡한 회원가입
- 지도/GPS
- 네이버/카카오 지도 API
- 정확한 실시간 좌석 수
- 실제 문자/카톡/전화 연동
- 복잡한 사장님 대시보드
- 앱스토어/플레이스토어 출시

---

## RECOMMENDED STACK

- Next.js App Router
- TypeScript
- Tailwind CSS
- mock data + localStorage first
- Supabase schema only for future migration
- Vercel deployable structure

중요: Supabase를 처음부터 붙이지 말 것.  
먼저 `seedStores.ts` + `storeRepository.ts` + localStorage 기반으로 실행 가능한 MVP를 만든다.

---

## ROUTES

```txt
/
  Home/Search Page

/results
  query string 기반 검색 결과

/stores/[storeId]
  매장 상세

/manager
  mock 관리자 화면
```

검색 조건은 query string 사용.

예시:

```txt
/results?area=front_gate&groupSize=12&preferredTime=19:00&seatingPreference=partial_split_ok
/stores/store-001?groupSize=12&preferredTime=19:00&seatingPreference=partial_split_ok
```

---

## RECOMMENDED FILE STRUCTURE

```txt
src/
  app/
    layout.tsx
    globals.css
    page.tsx
    results/
      page.tsx
    stores/
      [storeId]/
        page.tsx
    manager/
      page.tsx

  components/
    SearchForm.tsx
    StoreCard.tsx
    MatchBadge.tsx
    StatusBadge.tsx
    SeatingSummary.tsx
    SlotList.tsx
    MessageTemplateBox.tsx
    ManagerStoreEditor.tsx
    EmptyState.tsx

  lib/
    types.ts
    constants.ts
    seedStores.ts
    matching.ts
    labels.ts
    message.ts
    format.ts
    storeRepository.ts

  supabase/
    schema.sql
```

---

## TYPES

Use this final model unless there is a strong reason to simplify.

```ts
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

export type GroupStatus =
  | "good"
  | "limited"
  | "inquiry_needed"
  | "difficult";

export type SlotStatus =
  | "available"
  | "inquiry"
  | "unavailable";

export type ReservationSlot = {
  time: string;
  status: SlotStatus;
};

export type UpdateSource =
  | "owner"
  | "operator"
  | "mock";

export type ContactMethod =
  | "phone"
  | "message"
  | "app_request";

export type SeatingPreference =
  | "together"
  | "partial_split_ok"
  | "same_store_ok";

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
```

---

## MATCHING LOGIC

Implement in:

```txt
src/lib/matching.ts
```

Functions:

```ts
evaluateStoreMatch(store: Store, request: SearchRequest, now?: Date): StoreMatchResult
getRankedStores(stores: Store[], request: SearchRequest, now?: Date): StoreMatchResult[]
```

### Derived values

```ts
canSitTogether = groupSize <= store.capacity.maxContiguousGroupSize
canFitInStore = groupSize <= store.capacity.maxSplitGroupSize
slotStatus = slot matching preferredTime, default "inquiry"
isStale = lastUpdatedAt older than 24 hours
```

### Classification rules

Priority order:

1. `difficult`
   - groupSize > maxSplitGroupSize
   - OR currentGroupStatus === "difficult"
   - OR slotStatus === "unavailable"

2. `together_likely`
   - groupSize <= maxContiguousGroupSize
   - AND currentGroupStatus is "good" or "limited"
   - AND slotStatus is "available" or "inquiry"
   - AND not stale

3. `inquiry_recommended`
   - currentGroupStatus === "inquiry_needed"
   - OR isStale
   - OR slotStatus === "inquiry"
   - OR user wants together but only split is structurally possible

4. `split_only`
   - groupSize > maxContiguousGroupSize
   - AND groupSize <= maxSplitGroupSize
   - AND seatingPreference is "partial_split_ok" or "same_store_ok"
   - AND currentGroupStatus is "good" or "limited"

Fallback: `inquiry_recommended`.

### Score bands

```txt
together_likely       80-100
inquiry_recommended   60-79
split_only            40-59
difficult              0-39
```

Suggested modifiers:

- status good: +10
- status limited: +5
- status inquiry_needed: -5
- slot available: +10
- slot inquiry: +3
- stale update: -10
- capacity margin: +0~10

Sort by:

1. level priority
2. score desc
3. larger maxContiguousGroupSize desc

Important: UI wording should say 가능성/문의 권장, not guaranteed availability.

---

## KOREAN LABELS

Implement in `labels.ts`.

### Areas

```txt
front_gate: 정문
back_gate: 후문
station: 역 앞
food_street: 먹자골목
campus_nearby: 캠퍼스 주변
```

### GroupStatus

```txt
good: 여유 있음
limited: 제한적 가능
inquiry_needed: 문의 필요
difficult: 어려움
```

### SlotStatus

```txt
available: 가능
inquiry: 문의
unavailable: 불가
```

### MatchLevel badge text

```txt
together_likely: 같이 앉기 가능성 높음
inquiry_recommended: 구조상 가능하나 문의 권장
split_only: 분리 착석 가능
difficult: 현재 조건에서는 어려움
```

### SeatingType

```txt
long_table: 긴 테이블
combined_tables: 테이블 결합
private_room: 룸
semi_private_area: 반분리 공간
hall_split: 홀 분산
```

---

## SEED DATA REQUIREMENTS

Create 10 fake stores. Do not use real store names.

Use diverse characteristics:

| name | area | contiguous | split | status | key feature |
|---|---|---:|---:|---|---|
| 강의끝포차 | front_gate | 6 | 10 | good | small group pub |
| 둥근테이블 | back_gate | 8 | 12 | limited | round tables |
| 큰마당호프 | food_street | 12 | 28 | good | large hall, split seating |
| 조용한룸 | station | 10 | 16 | inquiry_needed | private room |
| 반칸라운지 | food_street | 14 | 24 | good | semi-private |
| 골목분식포차 | back_gate | 4 | 8 | difficult | small venue |
| 긴테이블집 | front_gate | 18 | 18 | limited | long table |
| 넓은홀식당 | campus_nearby | 10 | 30 | good | large hall, scattered seats |
| 작은잔 | station | 5 | 8 | inquiry_needed | small mood bar |
| 후문마당 | back_gate | 16 | 22 | good | combinable tables |

Every store should have reservation slots such as 18:00, 19:00, 20:00, 21:00 with mixed statuses.

---

## UI REQUIREMENTS

### Home/Search Page

Title:

```txt
단체 모임 장소 찾기
```

Fields:

- 지역 선택
- 인원 입력
- 시간 선택
- 착석 선호 선택
  - 최대한 붙어 앉기
  - 일부 분리 가능
  - 같은 매장이면 괜찮음
- 검색 버튼

### Results Page

Each card shows:

- store name
- match badge
- max contiguous group size
- max split group size
- seating summary
- current status
- last updated time
- detail button

### Store Detail Page

Shows:

- name
- area/address
- group seating info
- reservation slots
- current status
- inquiry message generator/copy

### Manager Page

- select store
- change currentGroupStatus
- edit slot statuses
- save button
- update lastUpdatedAt
- save to localStorage

No auth required.

---

## INQUIRY MESSAGE

Implement in:

```txt
src/lib/message.ts
```

Function:

```ts
createInquiryMessage(store: Store, request: SearchRequest): string
```

Base Korean template:

```txt
안녕하세요. 오늘 {time}쯤 {groupSize}명 단체 방문을 고려하고 있습니다. 가능하면 함께 앉고 싶고, 일부 분리 착석도 검토 가능합니다. 예약 또는 방문 가능할까요?
```

Adjust seating sentence by preference:

- together: `가능하면 함께 앉고 싶습니다.`
- partial_split_ok: `가능하면 함께 앉고 싶고, 일부 분리 착석도 검토 가능합니다.`
- same_store_ok: `같은 매장 내 이용 가능하다면 분리 착석도 괜찮습니다.`

---

## LOCAL STORAGE REPOSITORY

Implement in:

```txt
src/lib/storeRepository.ts
```

localStorage key:

```txt
group-place-store-overrides
```

Behavior:

```txt
getStores():
  seedStores + overrides merged

saveStoreStatus(storeId, status, slots):
  update localStorage override
  set lastUpdatedAt to new Date().toISOString()
```

Because Next.js SSR cannot access localStorage directly, use client components for manager state or guard with `typeof window !== "undefined"`.

---

## SUPABASE SCHEMA

Include optional future migration file:

```txt
src/supabase/schema.sql
```

Two tables are enough:

- stores
- reservation_slots

Do not wire Supabase in first MVP unless user explicitly asks.

---

## README CONTENT

Include:

1. Project purpose
2. Problem definition
3. MVP scope
4. Excluded features
5. Tech stack
6. Data model
7. Matching logic
8. How to run
9. How manager page works
10. Supabase migration plan
11. Future field interview plan

Key README statement:

> 이 MVP는 정확한 실시간 좌석 수를 제공하지 않는다. 대신 매장의 고정 좌석 구조와 낮은 부담의 상태 업데이트를 결합해, 단체 사용자가 문의할 가치가 높은 후보를 빠르게 압축하도록 돕는다.

---

## IMPLEMENTATION ORDER

1. Create Next.js + TS + Tailwind app structure.
2. Create `types.ts`.
3. Create `seedStores.ts`.
4. Create `labels.ts`.
5. Create `matching.ts`.
6. Create `message.ts`.
7. Create `storeRepository.ts`.
8. Build Home page.
9. Build Results page.
10. Build Store Detail page.
11. Build Manager page.
12. Add README.
13. Add `supabase/schema.sql`.
14. Check mobile UI.
15. Make sure app is Vercel deployable.

---

## FIRST CODING TASK TO DO NOW

Ask the coding model this:

```txt
Next.js + TypeScript + Tailwind CSS 기반으로 “대학가 단체 모임 매장 탐색 MVP”의 1차 코드를 만들어줘.

중요:
- Supabase는 아직 실제 연결하지 말고, seedStores.ts + localStorage 기반으로 구현해줘.
- 모바일 웹앱으로 구현해줘.
- 예약 확정/지도/로그인/결제는 제외해줘.
- “정확한 실시간 좌석 수”가 아니라 “단체 착석 가능성/문의 필요/착석 형태”를 보여주는 MVP야.

먼저 전체 프로젝트 파일을 생성해줘:
- src/lib/types.ts
- src/lib/seedStores.ts
- src/lib/labels.ts
- src/lib/matching.ts
- src/lib/message.ts
- src/lib/storeRepository.ts
- src/components/*
- src/app/page.tsx
- src/app/results/page.tsx
- src/app/stores/[storeId]/page.tsx
- src/app/manager/page.tsx
- README.md
- src/supabase/schema.sql

가상 매장 10개를 만들고, 사용자의 지역/인원/시간/착석 선호에 따라 together_likely, inquiry_recommended, split_only, difficult로 분류하는 로직을 구현해줘.
```

---

## IMPORTANT STYLE GUIDANCE

- Mobile-first.
- Clear cards and badges.
- Avoid saying “예약 가능 확정”.
- Use “가능성 높음”, “문의 권장”, “분리 착석 가능”, “어려움”.
- Keep code simple and readable.
- Prefer functions over hidden UI logic.
- Make screenshots easy: nice mobile card layout.
