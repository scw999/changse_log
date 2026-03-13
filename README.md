# 창세록

창세록은 개인용 삶의 기록 아카이브입니다.

- 웹앱: 브라우징, 수정, 리뷰
- trusted assistant: internal API를 통한 생성, 검색, 수정, 이미지 첨부
- 저장소: Supabase Database + Storage

## 현재 지원하는 입력 흐름

1. 웹 관리자에서 직접 기록 생성/수정
2. assistant가 `POST /api/internal/archive-ingest` 로 새 기록 저장
3. assistant가 `POST /api/internal/archive-records/search` 로 기존 기록 검색
4. assistant가 `GET /api/internal/archive-records/recent` 로 최근 기록 조회
5. assistant가 `PATCH /api/internal/archive-records/[id]` 로 기존 기록 수정
6. assistant가 `DELETE /api/internal/archive-records/[id]` 로 잘못된 기록 삭제
7. 웹 관리자 또는 assistant가 기록에 이미지 첨부

## 기술 스택

- Next.js 16 App Router
- TypeScript
- Tailwind CSS v4
- Supabase Auth / Database / Storage
- Vercel

## 환경 변수

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
ALLOWED_ADMIN_EMAIL=you@example.com
INTERNAL_INGEST_SECRET=replace-with-a-long-random-secret
TELEGRAM_BOT_TOKEN=123456:telegram-bot-token
TELEGRAM_WEBHOOK_SECRET=replace-with-random-secret
TELEGRAM_BOT_USERNAME=your_bot_username
```

주의:

- `SUPABASE_SERVICE_ROLE_KEY` 는 서버 전용입니다.
- `INTERNAL_INGEST_SECRET` 는 trusted assistant만 알아야 합니다.
- 위 두 값에는 `NEXT_PUBLIC_` 를 붙이면 안 됩니다.

## 관리자 접근 제어

- `/admin` 은 `ALLOWED_ADMIN_EMAIL` 과 로그인 이메일이 일치할 때만 접근 가능합니다.
- 데이터 레벨에서는 Supabase RLS가 owner 기준으로 계속 보호합니다.

## 로컬 실행

```bash
npm install
npm run dev
```

PowerShell에서 `npm` 실행 정책 오류가 나면:

```powershell
cmd /c npm install
cmd /c npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000) 을 엽니다.

## Supabase 설정

### 1. SQL 실행

Supabase SQL Editor에서 [schema.sql](C:/Users/scw99/Documents/development/changselog/supabase/schema.sql) 을 실행합니다.

포함 항목:

- `archive_records`
- `archive_record_images`
- `telegram_identities`
- `inbox_messages`
- `draft_records`
- `draft_events`
- private bucket `record-images`
- owner 기반 RLS
- `archive_records.updated_at` 자동 갱신 트리거

### 2. Auth URL 설정

Supabase Dashboard -> `Authentication` -> `URL Configuration`

- `Site URL`
  - `https://your-vercel-domain.vercel.app`
- `Redirect URLs`
  - `https://your-vercel-domain.vercel.app/auth/callback`
  - `http://localhost:3000/auth/callback`

### 3. Storage 버킷

이미지는 private bucket `record-images` 에 저장됩니다.  
UI 렌더링은 signed URL을 사용합니다.

## Internal Assistant API

모든 internal route는 아래 방식 중 하나로 인증합니다.

```http
Authorization: Bearer <INTERNAL_INGEST_SECRET>
```

또는

```http
x-internal-ingest-secret: <INTERNAL_INGEST_SECRET>
```

### 1. 새 기록 생성

- `POST /api/internal/archive-ingest`

### 2. 기존 기록 검색

- `POST /api/internal/archive-records/search`

요청 예시:

```json
{
  "query": "스픽 노 모어",
  "category": "content",
  "limit": 10
}
```

검색 대상:

- `title`
- `summary`
- `body`
- `tags`
- `details.content.titleOriginal`
- `details.content.originalTitle`

응답 예시:

```json
{
  "ok": true,
  "results": [
    {
      "id": "record-id",
      "title": "영화 기록: 스픽 노 모어",
      "summary": "불편한 긴장감을 남긴 영화 기록",
      "category": "content",
      "subcategory": "영화",
      "event_date": "2026-03-12",
      "created_at": "2026-03-12T10:00:00.000Z",
      "updated_at": "2026-03-12T10:00:00.000Z",
      "source_type": "assistant",
      "details": {
        "content": {
          "originalTitle": "Speak No Evil"
        }
      }
    }
  ]
}
```

### 3. 최근 기록 조회

- `GET /api/internal/archive-records/recent?limit=10`

용도:

- “방금 저장한 거”
- “어제 올린 영화”
- “최근 장소 기록”

같은 요청에서 최근 기록 후보를 빠르게 좁히기

### 4. 기존 기록 수정

- `PATCH /api/internal/archive-records/[id]`

실사용 예시:

```json
{
  "title": "영화 기록: 스픽 노 이블",
  "content": {
    "originalTitle": "Speak No Evil"
  }
}
```

이 patch는 내부적으로 `content.originalTitle` 을 `content.titleOriginal` 로도 정규화해서 저장합니다.

### 5. 기록 이미지 첨부

- `POST /api/internal/archive-records/[id]/images`

요청 형식:

- `multipart/form-data`
- 필수: `file`
- 선택: `caption`, `alt_text`, `sort_order`

### 6. 기존 기록 삭제

- `DELETE /api/internal/archive-records/[id]`

용도:

- 잘못 저장된 assistant 테스트 기록 제거
- 제목/요약 확인 후 명시적 삭제

응답 예시:

```json
{
  "ok": true,
  "deleted": {
    "id": "ba782563-85ee-491c-b49e-8e548d8eccab",
    "title": "테스트 메모"
  }
}
```

삭제 동작:

1. owner 소유 record 확인
2. 연결된 `archive_record_images` 조회
3. `record-images` bucket object 삭제
4. image metadata row 삭제
5. `archive_records` row 삭제

## Search -> Patch 예시

assistant가 이런 요청을 받았다고 가정합니다.

> 스픽 노 모어로 된 영화 기록 찾아서 제목을 스픽 노 이블로 바꾸고 원제를 Speak No Evil로 수정해

처리 순서:

1. `POST /api/internal/archive-records/search`
2. 결과에서 record id 확인
3. `PATCH /api/internal/archive-records/[id]`

PowerShell 예시:

```powershell
$headers = @{
  Authorization = "Bearer <INTERNAL_INGEST_SECRET>"
  "Content-Type" = "application/json"
}

$searchBody = @"
{
  "query": "스픽 노 모어",
  "category": "content",
  "limit": 10
}
"@

$search = Invoke-RestMethod `
  -Method Post `
  -Uri "https://changselog.vercel.app/api/internal/archive-records/search" `
  -Headers $headers `
  -Body $searchBody

$recordId = $search.results[0].id

$patchBody = @"
{
  "title": "영화 기록: 스픽 노 이블",
  "content": {
    "originalTitle": "Speak No Evil"
  }
}
"@

Invoke-RestMethod `
  -Method Patch `
  -Uri "https://changselog.vercel.app/api/internal/archive-records/$recordId" `
  -Headers $headers `
  -Body $patchBody
```

## curl 예시

### 한글 제목으로 검색

```bash
curl -X POST https://changselog.vercel.app/api/internal/archive-records/search \
  -H "Authorization: Bearer <INTERNAL_INGEST_SECRET>" \
  -H "Content-Type: application/json" \
  -d '{"query":"스픽 노 모어","category":"content","limit":10}'
```

### 원제로 검색

```bash
curl -X POST https://changselog.vercel.app/api/internal/archive-records/search \
  -H "Authorization: Bearer <INTERNAL_INGEST_SECRET>" \
  -H "Content-Type: application/json" \
  -d '{"query":"Speak No Evil","category":"content","limit":10}'
```

### 찾은 기록 patch

```bash
curl -X PATCH https://changselog.vercel.app/api/internal/archive-records/<record-id> \
  -H "Authorization: Bearer <INTERNAL_INGEST_SECRET>" \
  -H "Content-Type: application/json" \
  -d '{"title":"영화 기록: 스픽 노 이블","content":{"originalTitle":"Speak No Evil"}}'
```

### 찾은 기록 delete

```bash
curl -X DELETE https://changselog.vercel.app/api/internal/archive-records/<record-id> \
  -H "Authorization: Bearer <INTERNAL_INGEST_SECRET>"
```

## 웹 관리자 이미지 업로드

관리자 편집기에서 기록별로:

- 여러 이미지 업로드
- 캡션 수정
- 대체 텍스트 수정
- 순서 변경
- 이미지 삭제

를 할 수 있습니다.

저장 방식:

- 파일: Supabase Storage
- 메타데이터: `archive_record_images`
- 렌더링: signed URL

## Vercel 배포

### 1. 환경 변수 추가

Vercel Project Settings -> Environment Variables

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `ALLOWED_ADMIN_EMAIL`
- `INTERNAL_INGEST_SECRET`
- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_WEBHOOK_SECRET`
- `TELEGRAM_BOT_USERNAME`

### 2. 재배포

환경 변수를 바꾼 뒤에는 최신 배포를 `Redeploy` 합니다.

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
