# 창세록 Database Schema

## 현재 구조

창세록은 지금 단계에서 `private personal admin app`을 기준으로 설계되어 있습니다.  
웹앱은 개인 아카이브 탐색과 관리자 편집에 집중하고, Supabase는 인증, 데이터 저장, 이미지 저장을 담당합니다.

핵심 원칙은 세 가지입니다.

- 모든 아카이브 데이터는 `owner_id` 기준으로 분리합니다.
- 관리자 접근은 앱 레벨에서 `ALLOWED_ADMIN_EMAIL`로 한 번 더 제한합니다.
- 향후 Telegram 수집 흐름을 붙일 수 있도록 초안용 테이블을 미리 준비합니다.

## 핵심 테이블

### `archive_records`

개인 기록의 메인 테이블입니다.

- 공통 필드와 분류 필드를 저장합니다.
- 생각, 단어, 콘텐츠, 장소, 활동 데이터를 하나의 흐름으로 다룹니다.
- 세부 타입별 데이터는 `details jsonb`에 저장합니다.

주요 컬럼:

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

기록별 이미지 메타데이터 테이블입니다.

- 실제 파일은 Supabase Storage에 저장합니다.
- DB에는 파일 경로, 캡션, 정렬 순서만 저장합니다.

주요 컬럼:

- `id uuid primary key`
- `record_id uuid references archive_records(id)`
- `owner_id uuid references auth.users(id)`
- `storage_path text unique`
- `caption text`
- `alt_text text`
- `sort_order integer`
- `created_at timestamptz`

## Telegram 준비 테이블

아직 Telegram bot / webhook은 구현하지 않았지만, 다음 단계 준비를 위해 아래 테이블을 추가했습니다.

### `telegram_identities`

앱 사용자와 Telegram 사용자를 연결합니다.

- `owner_id`와 `telegram_user_id`를 매핑합니다.
- 검증 여부와 연결 상태를 관리합니다.

주요 컬럼:

- `owner_id uuid`
- `telegram_user_id bigint`
- `telegram_username text`
- `telegram_chat_id bigint`
- `status text`
- `verified_at timestamptz`

### `inbox_messages`

Telegram에서 들어온 원문 메시지를 저장합니다.

- 러프 노트를 그대로 저장합니다.
- 나중에 OpenAI 구조화 처리 전 원본 기록 보관소로 씁니다.

주요 컬럼:

- `owner_id uuid`
- `telegram_identity_id uuid`
- `source_type text`
- `external_message_id text`
- `raw_text text`
- `attachments jsonb`
- `received_at timestamptz`
- `processed_at timestamptz`
- `status text`
- `metadata jsonb`

### `draft_records`

창세봇이 구조화한 초안 기록을 저장합니다.

- 아직 최종 저장 전 상태를 관리합니다.
- 사용자 승인 후 `archive_records`로 반영할 수 있게 준비합니다.

주요 컬럼:

- `owner_id uuid`
- `inbox_message_id uuid`
- `archive_record_id uuid`
- `status text`
- `category text`
- `subcategory text`
- `title text`
- `body text`
- `summary text`
- `tags text[]`
- `structured_payload jsonb`
- `assistant_note text`

## Storage

- 버킷 이름: `record-images`
- 권장 경로: `user_id/record_id/file-name`
- 버킷 공개 여부: `private`
- 상세 화면 렌더링: signed URL 사용

## 보안 모델

### 앱 레벨

- `/admin`은 로그인만으로는 부족합니다.
- `ALLOWED_ADMIN_EMAIL`과 로그인 사용자 이메일이 일치할 때만 관리자 편집이 허용됩니다.
- 일치하지 않으면 접근 거부 페이지로 이동합니다.

### DB 레벨

- `archive_records`
- `archive_record_images`
- `telegram_identities`
- `inbox_messages`
- `draft_records`

위 테이블은 모두 RLS가 켜져 있습니다.

- 로그인한 사용자는 자기 `owner_id` 데이터만 조회/수정/삭제할 수 있습니다.
- Storage도 `auth.uid()` 기준 경로만 접근할 수 있습니다.

## 이 구조를 선택한 이유

- 지금은 개인 관리자 앱이 우선이므로 인증과 권한 모델을 단순하게 유지합니다.
- 현재 UI는 하나의 통합 기록 모델로 충분히 빠르게 탐색할 수 있습니다.
- Telegram 입력 흐름을 붙일 때도 현재 스키마를 크게 깨지 않고 확장할 수 있습니다.
