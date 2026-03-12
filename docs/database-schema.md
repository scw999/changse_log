# 창세록 Database Schema

## 현재 구조

창세록은 지금 단계에서 `private personal archive + trusted assistant ingestion` 구조를 기준으로 설계되어 있습니다.

- 웹앱은 browsing, editing, filtering, review에 집중합니다.
- 창세봇은 rough note를 정리하고 승인받은 뒤 internal API로 저장합니다.
- Supabase는 인증, 데이터 저장, 이미지 저장, 보안 경계를 담당합니다.

핵심 원칙은 네 가지입니다.

- 모든 기록은 `owner_id` 기준으로 분리합니다.
- 관리자 브라우저 접근은 `ALLOWED_ADMIN_EMAIL`로 제한합니다.
- assistant-driven 저장은 `INTERNAL_INGEST_SECRET`으로 보호된 internal API를 통해서만 허용합니다.
- Telegram 관련 스키마는 남겨두되, 현재 메인 입력 흐름은 internal API 중심으로 둡니다.

## 핵심 테이블

### `archive_records`

개인 기록의 메인 테이블입니다.

- 생각, 단어, 콘텐츠, 장소, 활동을 하나의 통합 레코드 모델로 다룹니다.
- 세부 타입별 데이터는 `details jsonb`에 저장합니다.
- assistant 저장분은 `source_type = 'assistant'` 로 기록합니다.
- internal API로 저장된 경우 `details.ingestion.method = 'internal_api'` 메타데이터를 넣습니다.

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

## Assistant Ingestion

현재 제품 방향에서 중요한 것은 draft chat approval 이후의 trusted write 입니다.

### Internal API 저장 원칙

- 엔드포인트: `POST /api/internal/archive-ingest`
- 인증: `INTERNAL_INGEST_SECRET`
- owner 결정: 요청 본문이 아니라 서버가 `ALLOWED_ADMIN_EMAIL` 기준으로 직접 조회
- write 권한: server-side `SUPABASE_SERVICE_ROLE_KEY`

즉, 외부 호출자는 payload만 보내고 `owner_id` 는 서버가 강제합니다.

## Telegram 준비 테이블

Telegram bot/webhook 확장을 위해 아래 테이블을 유지합니다.

### `telegram_identities`

앱 사용자와 Telegram 사용자를 연결합니다.

주요 컬럼:

- `owner_id uuid`
- `telegram_user_id bigint`
- `telegram_username text`
- `telegram_first_name text`
- `telegram_last_name text`
- `telegram_chat_id bigint`
- `status text`
- `verification_token text`
- `verified_at timestamptz`
- `last_seen_at timestamptz`

### `inbox_messages`

Telegram에서 들어온 원문 메시지를 저장합니다.

주요 컬럼:

- `owner_id uuid`
- `telegram_identity_id uuid`
- `telegram_update_id bigint`
- `telegram_message_id bigint`
- `telegram_chat_id bigint`
- `source_type text`
- `external_message_id text`
- `raw_text text`
- `message_type text`
- `attachments jsonb`
- `received_at timestamptz`
- `processed_at timestamptz`
- `status text`
- `error_message text`
- `metadata jsonb`

### `draft_records`

Telegram 또는 assistant 구조화 초안을 저장합니다.

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
- `revision_note text`

### `draft_events`

초안 승인/반려/수정 요청 이력을 남깁니다.

주요 컬럼:

- `draft_record_id uuid`
- `actor_type text`
- `event_type text`
- `payload jsonb`
- `created_at timestamptz`

## Storage

- 버킷 이름: `record-images`
- 권장 경로: `user_id/record_id/file-name`
- 버킷 공개 여부: `private`
- 상세 화면 렌더링: signed URL 사용

## 보안 모델

### 앱 레벨

- `/admin` 은 허용된 이메일만 접근할 수 있습니다.
- 접근 제어는 `ALLOWED_ADMIN_EMAIL` 기준으로 동작합니다.
- 창세봇 저장 경로는 브라우저 UI가 아니라 internal API를 통해서만 열립니다.

### API 레벨

- `/api/internal/archive-ingest` 는 POST만 허용합니다.
- `Authorization: Bearer <INTERNAL_INGEST_SECRET>` 또는 `x-internal-ingest-secret` 이 필요합니다.
- secret이 맞아도 `owner_id` 는 요청자가 지정할 수 없습니다.

### DB 레벨

아래 테이블은 모두 RLS가 켜져 있습니다.

- `archive_records`
- `archive_record_images`
- `telegram_identities`
- `inbox_messages`
- `draft_records`
- `draft_events`

로그인 사용자는 자기 `owner_id` 데이터만 브라우저에서 조회/수정할 수 있습니다.

### 서버 레벨

- service role key는 server-only 입니다.
- 브라우저로 노출되는 `NEXT_PUBLIC_*` 변수와 분리합니다.
- internal ingest secret은 assistant system에만 배포합니다.

## 이 구조를 선택한 이유

- 현재 목표는 private personal workflow를 빠르게 안정화하는 것입니다.
- 별도 Telegram bot 입력보다 assistant-driven internal API가 훨씬 단순하고 안전합니다.
- 웹앱은 계속 최종 저장소이자 편집 UI로 유지할 수 있습니다.
- 나중에 필요하면 Telegram bot 흐름도 같은 스키마 위에 확장할 수 있습니다.
