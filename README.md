# 창세록

창세록은 개인용 삶의 기록 아카이브입니다.

- 웹앱: 탐색, 수정, 리뷰
- trusted assistant: internal API를 통한 생성, 검색, 최근 조회, 수정, 삭제, 이미지 첨부
- 저장소: Supabase Database + Storage

## 현재 입력 흐름

1. 웹 관리자에서 직접 기록 생성/수정
2. assistant가 새 기록 저장
3. assistant가 기존 기록 검색/최근 조회
4. assistant가 기존 기록 수정/삭제
5. 웹 관리자와 assistant가 모두 기록 이미지를 다룸

## 환경 변수

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
ALLOWED_ADMIN_EMAIL=you@example.com
ALLOWED_VIEWER_EMAILS=you@example.com,friend@example.com
INTERNAL_INGEST_SECRET=replace-with-a-long-random-secret
TELEGRAM_BOT_TOKEN=123456:telegram-bot-token
TELEGRAM_WEBHOOK_SECRET=replace-with-random-secret
TELEGRAM_BOT_USERNAME=your_bot_username
```

## Supabase 설정

Supabase SQL Editor에서 [schema.sql](C:/Users/scw99/Documents/development/changselog/supabase/schema.sql) 을 실행합니다.

포함 항목:

- `archive_records`
- `archive_record_images`
- private bucket `record-images`
- owner 기반 RLS
- `archive_records.updated_at` 자동 갱신

## Private Access

창세록은 공개 사이트가 아니라 allowlist 기반 private archive입니다.

- `ALLOWED_VIEWER_EMAILS`
  - 열람 가능한 이메일 목록
  - 쉼표로 여러 주소 지정 가능
- `ALLOWED_ADMIN_EMAIL`
  - 관리자 편집 권한 이메일
  - viewer 목록에도 자동 포함됩니다

동작 방식:

1. 허용된 이메일만 로그인 후 앱 열람 가능
2. 허용되지 않은 이메일은 `access-denied` 로 이동
3. Supabase 세션 쿠키가 유지되므로 한 번 로그인하면 계속 볼 수 있음

배포 후 환경 변수를 바꾸면 Vercel에서 `Redeploy` 해야 합니다.

## 이미지 동작 방식

대표 이미지 전용 컬럼을 추가하지 않고, 가장 앞 순서의 이미지를 대표 이미지로 간주합니다.

대표 이미지 선택 규칙:

1. 사용자가 대표 이미지로 지정한 이미지
2. 명시적 지정이 없으면 sort order가 가장 앞선 이미지
3. 이미지가 없으면 썸네일 없음

이 방식 덕분에 기존 record도 migration 없이 바로 동작합니다.

## 웹 UI 이미지 기능

- 상세 페이지에서 이미지 클릭 시 큰 화면으로 보기
- 닫기 버튼
- `Esc` 닫기
- 배경 클릭 닫기
- 여러 이미지면 이전/다음 이동
- record card와 recent/list card에서 대표 이미지 썸네일 표시
- 관리자에서 대표 이미지 지정 가능

## Internal API

모든 internal route는 아래 방식으로 인증합니다.

```http
Authorization: Bearer <INTERNAL_INGEST_SECRET>
```

또는:

```http
x-internal-ingest-secret: <INTERNAL_INGEST_SECRET>
```

### 기록 생성

- `POST /api/internal/archive-ingest`

### 기록 검색

- `POST /api/internal/archive-records/search`

### 최근 기록 조회

- `GET /api/internal/archive-records/recent?limit=10`

### 기록 수정

- `PATCH /api/internal/archive-records/[id]`

### 기록 삭제

- `DELETE /api/internal/archive-records/[id]`

### 기록 이미지 첨부

- `POST /api/internal/archive-records/[id]/images`

### 기록 이미지 메타데이터 수정

- `PATCH /api/internal/archive-records/[id]/images/[imageId]`

지원 필드:

- `caption`
- `alt_text`
- `sort_order`
- `is_primary`

`is_primary: true` 는 내부적으로 해당 이미지를 첫 순서로 재배치해서 대표 이미지로 만듭니다.

## Internal image patch 예시

```bash
curl -X PATCH https://changselog.vercel.app/api/internal/archive-records/<record-id>/images/<image-id> \
  -H "Authorization: Bearer <INTERNAL_INGEST_SECRET>" \
  -H "Content-Type: application/json" \
  -d '{"caption":"영화 포스터","alt_text":"스픽 노 이블 포스터","is_primary":true}'
```

응답 예시:

```json
{
  "ok": true,
  "image": {
    "id": "image-id",
    "recordId": "record-id",
    "caption": "영화 포스터",
    "altText": "스픽 노 이블 포스터",
    "sortOrder": 0,
    "isPrimary": true
  }
}
```

## 로컬 실행

```bash
npm install
npm run dev
```

PowerShell에서 `npm` 이 막히면:

```powershell
cmd /c npm install
cmd /c npm run dev
```

## 검증

```bash
npm run lint
npm run build
```

## 문서

- [정보 구조](C:/Users/scw99/Documents/development/changselog/docs/information-architecture.md)
- [데이터베이스 스키마](C:/Users/scw99/Documents/development/changselog/docs/database-schema.md)
- [Internal Ingestion Spec](C:/Users/scw99/Documents/development/changselog/docs/internal-ingestion-spec.md)
- [폴더 구조](C:/Users/scw99/Documents/development/changselog/docs/folder-structure.md)
