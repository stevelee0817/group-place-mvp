# 대학가 단체 모임 매장 탐색 MVP

대학가 회식, 뒤풀이, 동아리 모임처럼 여러 명이 함께 움직이는 상황에서 **문의할 가치가 높은 매장 후보를 빠르게 좁혀주는 모바일 웹앱 MVP**입니다.

이 프로젝트는 정확한 예약 서비스를 만들기보다, 매장의 좌석 구조와 간단한 상태값을 바탕으로 “이 매장에 먼저 물어볼 만한가?”를 판단하는 데 집중합니다.

## 문제 정의

단체 모임 장소를 찾을 때 사용자는 보통 여러 매장에 반복해서 전화하거나 메시지를 보내야 합니다.

- 몇 명까지 가능한지
- 한 테이블 또는 가까운 구역에 함께 앉을 수 있는지
- 일부 분리 착석을 감수하면 가능한지
- 지금 또는 특정 시간대에 문의할 가치가 있는지

일반적인 맛집 추천 앱은 맛, 거리, 리뷰 중심이라 이 문제를 직접 해결하지 못합니다. 총 수용 인원이 커도 단체가 함께 앉기 어려우면 회식/뒤풀이 장소로는 부적합할 수 있습니다. 이 MVP는 “정확한 실시간 좌석 수” 대신 “단체 착석 가능성 판단”을 먼저 다룹니다.

## MVP 범위

포함한 기능:

- 지역, 인원, 시간, 착석 선호 기반 검색
- 적합도 순 매장 목록
- 같이 앉기 가능성 / 문의 권장 / 분리 착석 가능 / 어려움 분류
- 매장 상세의 단체 착석 구조 표시
- 문의 메시지 템플릿 생성 및 복사
- mock 관리자 화면에서 현재 단체 상태 및 시간대 상태 수정
- localStorage 기반 관리자 변경값 저장
- 향후 Supabase 전환용 `schema.sql`

제외한 기능:

- 지도 또는 GPS
- 로그인/회원가입
- 결제
- 정식 예약 확정
- 정확한 실시간 좌석 수 입력
- 실제 문자/전화/카카오톡 발송 연동
- 네이버/카카오 지도 API
- Supabase 런타임 연결
- 복잡한 사장님 대시보드

UI 문구도 이 범위에 맞춰 “예약 가능”, “확정”처럼 보이는 표현을 피하고 “가능성”, “문의 권장”, “확인 필요” 중심으로 작성했습니다.

## 기술 스택

- Next.js App Router
- TypeScript
- Tailwind CSS
- mock seed data + localStorage
- Vercel 배포 가능 구조
- Supabase schema only for future migration

## 실행 방법

의존성을 설치합니다.

```bash
npm install
```

개발 서버를 실행합니다.

```bash
npm run dev
```

브라우저에서 다음 주소로 접속합니다.

```txt
http://localhost:3000
```

빌드 확인:

```bash
npm run build
```

정적 검사:

```bash
npm run lint
```

## 주요 화면

```txt
/
  검색 페이지

/results
  query string 기반 결과 페이지

/stores/[storeId]
  매장 상세 페이지

/manager
  mock 관리자 페이지
```

검색 query string 예시:

```txt
/results?area=front_gate&groupSize=12&preferredTime=19:00&seatingPreference=partial_split_ok
```

## 도메인 모델

핵심 타입은 `src/lib/types.ts`에 정의되어 있습니다.

- `Store`: 매장 기본 정보, 수용 정보, 좌석 구조, 상태, 연락 정보를 가진 중심 도메인 모델
- `SearchRequest`: 사용자가 입력한 지역, 인원, 시간, 착석 선호
- `ReservationSlot`: 특정 시간대의 간단한 상태값
- `StoreMatchResult`: 매장과 검색 조건을 비교한 결과, 점수, 근거, 경고 메시지

`Store`는 다음 책임을 갖는 데이터 구조로 나뉩니다.

- 기본 정보: 이름, 지역, 주소, 카테고리
- 수용 정보: 붙여 앉기 권장 최대 인원, 분리 포함 최대 인원
- 착석 구조: 긴 테이블, 테이블 결합, 룸, 반분리 공간, 홀 분산
- 상태 정보: 현재 단체 상태, 시간대별 상태, 마지막 업데이트 시점
- 문의 정보: 전화, 메시지, 앱 요청 등

샘플 매장은 `src/lib/seedStores.ts`에 들어 있습니다.

## Object-Oriented / Domain-Oriented Design

이 프로젝트는 컴퓨팅/프로그래밍 과제에서 구조가 잘 보이도록 핵심 로직을 도메인 서비스와 저장소 객체로 분리했습니다. 화면 컴포넌트는 사용자 입력과 렌더링에 집중하고, 판단/저장/메시지 생성 책임은 별도 클래스가 맡습니다.

`MatchEngine` (`src/lib/services/MatchEngine.ts`)

- 검색 조건과 매장을 비교합니다.
- 시간대 상태와 오래된 업데이트 여부를 확인합니다.
- 매장을 네 단계의 `MatchLevel`로 분류합니다.
- 점수와 정렬 순서를 계산합니다.
- 사용자에게 보여줄 판단 근거와 경고를 생성합니다.

`StoreRepository` (`src/lib/repositories/StoreRepository.ts`)

- seed 매장 데이터를 기본 데이터 소스로 사용합니다.
- 브라우저 localStorage에 저장된 관리자 변경값을 읽습니다.
- seed data와 localStorage override를 병합합니다.
- mock 관리자 화면의 상태 저장과 초기화를 담당합니다.
- 이후 Supabase로 전환할 때 교체될 저장소 경계 역할을 합니다.

`InquiryMessageFactory` (`src/lib/services/InquiryMessageFactory.ts`)

- 매장과 검색 조건을 입력받아 문의 메시지 템플릿을 만듭니다.
- 착석 선호에 따라 문장을 다르게 구성합니다.
- 실제 메시지 발송은 하지 않습니다.

기존 화면 컴포넌트가 사용하던 함수형 export도 유지했습니다. `src/lib/matching.ts`, `src/lib/storeRepository.ts`, `src/lib/message.ts`는 compatibility wrapper로 남아 있으며, `getRankedStores`, `getStores`, `createInquiryMessage` 같은 기존 함수는 내부적으로 위 클래스 인스턴스에 위임합니다. 덕분에 UI를 크게 다시 쓰지 않고도 책임 분리와 객체 지향 구조를 설명할 수 있습니다.

Course project 관점에서 이 구조는 다음을 보여줍니다.

- 도메인 모델: `Store`, `SearchRequest`, `ReservationSlot`, `StoreMatchResult`
- 도메인 서비스: 매장 적합도를 판단하는 `MatchEngine`
- 저장소 객체: 데이터 접근과 localStorage 병합을 담당하는 `StoreRepository`
- 생성 전용 객체: 문의 문구를 만드는 `InquiryMessageFactory`
- UI와 비즈니스 로직의 분리: React 컴포넌트는 각 객체의 public method를 호출합니다.

## 매칭 로직

핵심 로직은 `src/lib/services/MatchEngine.ts`의 `MatchEngine`에 있습니다.

사용자의 검색 조건을 기준으로 매장을 다음 네 단계로 분류합니다.

1. `together_likely`  
   같이 앉기 가능성 높음
2. `inquiry_recommended`  
   구조상 가능성이 있으나 문의 권장
3. `split_only`  
   같은 매장 내 분리 착석 가능
4. `difficult`  
   현재 조건에서는 어려움

판단에 사용하는 주요 값:

- 요청 인원 <= 붙여 앉기 권장 최대 인원
- 요청 인원 <= 분리 포함 최대 인원
- 현재 단체 상태
- 선택 시간대 상태
- 마지막 업데이트가 24시간 이상 지났는지
- 사용자의 착석 선호

정렬은 먼저 match level 우선순위를 보고, 그다음 점수와 붙여 앉기 권장 최대 인원을 사용합니다. 점수는 예약 확정률이 아니라 후보 추천을 위한 내부 적합도입니다.

## localStorage 관리자 동작

`/manager`에서 mock 관리자 기능을 사용할 수 있습니다.

- 매장 선택
- 현재 단체 상태 수정
- 시간대별 상태 수정
- 저장 시 `lastUpdatedAt` 갱신
- 저장 시 `updateSource`를 `owner`로 변경
- 초기화 시 localStorage override 삭제

localStorage key:

```txt
group-place-store-overrides
```

주의할 점:

- 변경값은 현재 브라우저에만 저장됩니다.
- 다른 사용자나 다른 기기에는 공유되지 않습니다.
- seed data 자체를 수정하지 않고 override만 병합합니다.
- 실제 공동 데이터 관리가 필요하면 Supabase 같은 서버 저장소로 전환해야 합니다.

## Supabase 전환 계획

`src/supabase/schema.sql`에 미래 전환용 스키마 초안을 포함했습니다.

테이블은 두 개입니다.

- `stores`
- `reservation_slots`

현재는 Supabase를 런타임에 연결하지 않습니다. 이후 전환할 때는 `StoreRepository`의 구현을 Supabase 조회/저장 코드로 바꾸고, 화면과 매칭 엔진은 최대한 그대로 유지하는 방향을 목표로 합니다.

## 현장 인터뷰 계획

다음 단계에서는 실제 대학가 매장과 사용자를 인터뷰해 가정을 검증합니다.

1. 대학가 실제 매장 5~10곳 인터뷰
2. 사장님이 부담 없이 업데이트할 수 있는 상태값 검증
3. “붙여 앉기 최대 인원”과 “분리 포함 최대 인원”이 실제 의사결정에 유용한지 확인
4. 학생 사용자에게 검색 조건과 결과 문구가 직관적인지 확인
5. 문의 메시지 템플릿의 표현 개선
6. mock data를 실제 조사 데이터로 교체
7. 필요 시 Supabase 연동 범위 결정
