# 창세록 Folder Structure

## Proposed Structure

```text
src/
  app/
    admin/
    activities/
    content/
    places/
    recent/
    records/[id]/
    review/
    thoughts/
    words/
    globals.css
    layout.tsx
    page.tsx
    providers.tsx
  components/
    archive/
    layout/
    ui/
  lib/
    archive/
```

## Layer Responsibilities

### `src/app`

- 라우팅
- 페이지 메타데이터
- 상위 레이아웃 조합

### `src/components/archive`

- 도메인 화면 조합
- 대시보드, 탐색기, 상세, 리뷰, 편집기

### `src/components/layout`

- 앱 셸, 내비게이션, 공통 레이아웃

### `src/components/ui`

- 카드, 배지, 섹션 헤더, 평점 표시 등 재사용 UI

### `src/lib/archive`

- 타입
- 카테고리 메타데이터
- 시드 데이터
- 필터링/정렬/검색 유틸리티
- 브라우저 저장소 계층
- 앱 상태 컨텍스트

## Why This Structure Works

- App Router와 잘 맞는다.
- 화면 코드와 도메인 로직이 분리된다.
- Mock 저장소에서 Supabase 저장소로 교체할 때 `lib/archive` 중심으로 바꾸면 된다.
- 컴포넌트 재사용 범위가 명확하다.
