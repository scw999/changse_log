# 창세록 Database Schema Proposal

## Current Practical Schema

Phase 2부터는 실제 앱 저장소를 Supabase로 연결한다. MVP의 핵심은 빠른 CRUD, 이미지 업로드, 개인 데이터 보호이므로 아래 구조를 채택한다.

## Core Tables

### `archive_records`

- 공통 메타데이터와 카테고리별 상세 JSON을 함께 저장
- `owner_id` 기반으로 개인 데이터 분리
- 현재 UI는 전체 레코드를 가져온 뒤 클라이언트에서 필터링한다

핵심 컬럼:

- `id uuid primary key`
- `owner_id uuid references auth.users(id)`
- `title text`
- `body text`
- `category text`
- `subcategory text`
- `tags text[]`
- `created_at timestamptz`
- `event_date date`
- `importance smallint`
- `source_type text`
- `summary text`
- `notes text`
- `details jsonb`

### `archive_record_images`

- 한 기록에 여러 이미지를 연결하는 테이블
- 실제 파일은 Supabase Storage에 저장하고, DB에는 경로와 메타데이터만 둔다

핵심 컬럼:

- `id uuid primary key`
- `record_id uuid references archive_records(id)`
- `owner_id uuid references auth.users(id)`
- `storage_path text unique`
- `caption text`
- `alt_text text`
- `sort_order integer`
- `created_at timestamptz`

## Storage

- 버킷 이름: `record-images`
- 권장 경로: `user_id/record_id/file-name`
- 버킷은 `private`
- 화면 렌더링은 signed URL 사용

## Security Model

- `archive_records`와 `archive_record_images`는 모두 RLS 활성화
- 로그인한 사용자만 자기 레코드 CRUD 가능
- Storage도 첫 폴더가 `auth.uid()` 인 경로만 접근 가능

## Why This Shape

- Phase 1의 구조화된 타입 모델을 유지하면서 구현 복잡도를 과도하게 올리지 않는다
- 이미지 기능을 빠르게 붙일 수 있다
- 향후 필요하면 `details jsonb`를 세부 정규화 테이블로 분리할 수 있다
