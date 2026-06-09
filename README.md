# 대학가 단체 모임 매장 탐색 MVP

대학가 회식, 뒤풀이, 동아리 모임 이후 사용할 수 있는 **단체 착석 가능성 기반 매장 탐색 모바일 웹앱 MVP**입니다.

이 MVP는 정확한 실시간 좌석 수를 제공하지 않습니다. 대신 매장의 고정 좌석 구조와 낮은 부담의 상태 업데이트를 결합해, 단체 사용자가 문의할 가치가 높은 후보를 빠르게 압축하도록 돕습니다.

## 핵심 문제

단체 모임 장소를 찾을 때 사용자는 여러 매장에 반복해서 전화해야 합니다.

- 몇 명 가능한지
- 같이 앉을 수 있는지
- 일부 분리 착석이 가능한지
- 지금 또는 특정 시간대에 가능한지

일반적인 맛집 추천 앱은 이 문제를 잘 해결하지 못합니다. 총 수용 인원이 커도 단체가 함께 앉지 못하면 실제 회식/뒤풀이 장소로는 적합하지 않을 수 있기 때문입니다.

## MVP 범위

포함한 기능:

- 지역, 인원, 시간, 착석 선호 기반 검색
- 적합도 순 매장 목록
- 같이 앉기 가능성 / 문의 권장 / 분리 착석 가능 / 어려움 분류
- 매장 상세의 단체 착석 구조 표시
- 문의 메시지 템플릿 생성 및 복사
- mock 관리자 화면에서 현재 단체 상태 및 시간대 상태 수정
- localStorage 기반 관리자 변경값 저장
- 향후 Supabase 전환용 schema.sql

제외한 기능:

- 결제
- 정식 예약 확정
- 로그인/회원가입
- 지도/GPS
- 네이버/카카오 지도 API
- 정확한 실시간 좌석 수 입력
- 실제 문자/전화/카카오톡 연동
- 복잡한 사장님 대시보드

## 기술 스택

- Next.js App Router
- TypeScript
- Tailwind CSS
- mock seed data + localStorage
- Vercel 배포 가능 구조
- Supabase schema only for future migration

## 실행 방법

```bash
npm install
npm run dev
```

브라우저에서 다음 주소로 접속합니다.

```txt
http://localhost:3000
```

처음부터 프로젝트를 새로 만들고 싶다면 다음 명령으로 Next.js 앱을 만든 뒤, 이 저장소의 `src/`, `README.md`, `src/supabase/schema.sql` 파일을 붙여넣으면 됩니다.

```bash
npx create-next-app@latest group-place-mvp --ts --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm
cd group-place-mvp
```

## 주요 경로

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

## 데이터 구조

핵심 데이터는 `src/lib/types.ts`에 정의되어 있습니다.

`Store`는 크게 다음 정보로 나뉩니다.

- 기본 정보: 이름, 지역, 주소, 카테고리
- 수용 정보: 붙여 앉기 권장 최대 인원, 분리 포함 최대 인원
- 착석 구조: 긴 테이블, 테이블 결합, 룸, 반분리 공간, 홀 분산
- 상태 정보: 현재 단체 상태, 시간대별 상태, 마지막 업데이트 시점
- 문의 정보: 전화, 메시지, 앱 요청 등

샘플 매장은 `src/lib/seedStores.ts`에 10개 들어 있습니다.

## 적합도 판단 로직

핵심 로직은 `src/lib/matching.ts`에 있습니다.

사용자의 검색 조건을 기준으로 매장을 다음 네 단계로 분류합니다.

1. `together_likely`  
   같이 앉기 가능성 높음
2. `inquiry_recommended`  
   구조상 가능하나 문의 권장
3. `split_only`  
   분리 착석 가능
4. `difficult`  
   현재 조건에서는 어려움

판단에 사용하는 주요 값:

- 요청 인원 <= 붙여 앉기 권장 최대 인원
- 요청 인원 <= 분리 포함 최대 인원
- 현재 단체 상태
- 선택 시간대 상태
- 마지막 업데이트가 24시간 이상 지났는지
- 사용자의 착석 선호

UI 문구는 예약 확정처럼 보이지 않도록 “가능성”, “문의 권장”, “어려울 수 있음” 중심으로 작성했습니다.

## 관리자 화면

`/manager`에서 mock 관리자 기능을 사용할 수 있습니다.

- 매장 선택
- 현재 단체 상태 수정
- 시간대별 상태 수정
- 저장 시 `lastUpdatedAt` 갱신
- localStorage에 저장

localStorage key:

```txt
group-place-store-overrides
```

주의: 이 변경값은 현재 브라우저에만 저장됩니다. 실제 공동 데이터 관리가 필요하면 Supabase로 전환해야 합니다.

## Supabase 전환 계획

`src/supabase/schema.sql`에 미래 전환용 스키마 초안을 포함했습니다.

테이블은 두 개입니다.

- `stores`
- `reservation_slots`

현재는 Supabase를 연결하지 않습니다. 이후 전환할 때는 `src/lib/storeRepository.ts`의 구현만 Supabase 조회/저장 코드로 바꾸면 됩니다.

## 현장 인터뷰 후 개선 계획

1. 대학가 실제 매장 5~10곳 인터뷰
2. 사장님이 부담 없이 업데이트할 수 있는 상태값 검증
3. “붙여 앉기 최대 인원”과 “분리 포함 최대 인원”이 실제 의사결정에 유용한지 확인
4. 문의 메시지 템플릿의 표현 개선
5. mock data를 실제 조사 데이터로 교체
6. 필요 시 Supabase 연동
