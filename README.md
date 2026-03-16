# 창세록 (changse_log)

구조화된 개인 기록 아카이브. 생각, 단어, 콘텐츠, 장소, 활동을 체계적으로 저장하고 탐색한다.

- **웹앱**: 기록 탐색, 필터링, 리뷰, 편집
- **창세봇 / Assistant API**: 기록 생성, 검색, 조회, 수정, 삭제, 이미지 첨부
- **데이터**: Supabase Postgres + private Storage 버킷

---

*changse_log is a private personal archive for structured life records.*

- *Web app: browse, filter, review, and edit*
- *Trusted assistant APIs: create, search, recent lookup, update, delete, and image attachment*
- *Data and files: Supabase Postgres + private Storage bucket*

## Environment Variables

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

## 비공개 접근 (Private Access)

이 앱은 비공개입니다.

- `ALLOWED_VIEWER_EMAILS`: 이 이메일만 아카이브 열람 가능
- `ALLOWED_ADMIN_EMAIL`: 이 이메일만 관리자 편집 및 창세봇 기록 저장 가능

Supabase 인증 세션 쿠키로 로그인 상태가 유지됩니다.

## Supabase 설정

Supabase SQL Editor에서 [schema.sql](supabase/schema.sql)을 실행합니다.

생성되는 항목:

- `archive_records`
- `archive_record_images`
- private 버킷 `record-images`
- owner 기준 RLS 정책
- `updated_at` 등 헬퍼 컬럼
- `archive_record_images.is_primary` 대표 이미지 선택

## 대표 이미지 모델

갤러리 순서와 대표 이미지는 독립적입니다.

- 갤러리 순서: `sort_order`
- 대표 이미지: `archive_record_images.is_primary`
- 카드/썸네일 표시 우선순위:
  1. `is_primary = true`인 이미지
  2. 갤러리 순서 첫 번째 이미지
  3. 이미지 없음

참고:

- 대표 이미지 설정은 갤러리 순서를 변경하지 않음
- 기존 기록은 첫 번째 이미지로 자동 폴백

## 웹 이미지 기능

- 기록당 다중 이미지 업로드
- 캡션, 대체 텍스트 편집
- 갤러리 이미지 순서 변경
- 대표 이미지 독립 선택
- 상세 페이지 라이트박스 뷰어

## Internal API (창세봇 연동)

모든 내부 API 라우트는 다음 인증이 필요합니다:

```http
Authorization: Bearer <INTERNAL_INGEST_SECRET>
```

or:

```http
x-internal-ingest-secret: <INTERNAL_INGEST_SECRET>
```

사용 가능한 라우트:

- `POST /api/internal/archive-ingest`
- `POST /api/internal/archive-records/search`
- `GET /api/internal/archive-records/recent?limit=10`
- `PATCH /api/internal/archive-records/[id]`
- `DELETE /api/internal/archive-records/[id]`
- `POST /api/internal/archive-records/[id]/images`
- `PATCH /api/internal/archive-records/[id]/images/[imageId]`

### 검색 예시

한국어 제목으로 검색:

```bash
curl -X POST https://changselog.vercel.app/api/internal/archive-records/search \
  -H "Authorization: Bearer <INTERNAL_INGEST_SECRET>" \
  -H "Content-Type: application/json" \
  -d '{"query":"스픽 노 모어","category":"content","limit":10}'
```

원제로 검색:

```bash
curl -X POST https://changselog.vercel.app/api/internal/archive-records/search \
  -H "Authorization: Bearer <INTERNAL_INGEST_SECRET>" \
  -H "Content-Type: application/json" \
  -d '{"query":"Speak No Evil","category":"content","limit":10}'
```

### 기록 수정 예시

```bash
curl -X PATCH https://changselog.vercel.app/api/internal/archive-records/<record-id> \
  -H "Authorization: Bearer <INTERNAL_INGEST_SECRET>" \
  -H "Content-Type: application/json" \
  -d '{"title":"영화 기록: 스픽 노 이블","content":{"originalTitle":"Speak No Evil"}}'
```

### 이미지 메타데이터 수정 예시

갤러리 순서는 유지하면서 대표 이미지를 변경:

```bash
curl -X PATCH https://changselog.vercel.app/api/internal/archive-records/<record-id>/images/<image-id> \
  -H "Authorization: Bearer <INTERNAL_INGEST_SECRET>" \
  -H "Content-Type: application/json" \
  -d '{"caption":"자전거 두 대 있는 사진","is_primary":true}'
```

응답 예시:

```json
{
  "ok": true,
  "image": {
    "id": "image-id",
    "recordId": "record-id",
    "caption": "자전거 두 대 있는 사진",
    "altText": "",
    "sortOrder": 2,
    "isPrimary": true
  }
}
```

## 로컬 개발

```bash
npm install
npm run dev
```

PowerShell에서 `npm` 스크립트가 차단될 경우:

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

- [정보 구조 (Information Architecture)](docs/information-architecture.md)
- [데이터베이스 스키마 (Database Schema)](docs/database-schema.md)
- [Internal Ingestion 스펙](docs/internal-ingestion-spec.md)
- [폴더 구조 (Folder Structure)](docs/folder-structure.md)
