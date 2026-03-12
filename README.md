# 창세록

창세록은 개인용 삶의 기록 아카이브입니다.  
웹앱은 브라우징, 수정, 리뷰를 담당하고, 승인된 구조화 기록은 trusted internal API를 통해 안전하게 저장할 수 있습니다.

현재 지원하는 입력 흐름은 다음과 같습니다.

1. 웹 관리자에서 직접 기록 생성/수정
2. 창세봇 같은 trusted assistant가 internal API로 기록 생성
3. trusted assistant가 internal API로 기존 기록 수정
4. 웹 관리자 또는 trusted assistant가 기록에 이미지를 첨부

## 기술 스택

- Next.js 16 App Router
- TypeScript
- Tailwind CSS v4
- Supabase Auth / Database / Storage
- Vercel

## 필수 환경 변수

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

보안상 중요한 점:

- `SUPABASE_SERVICE_ROLE_KEY` 는 서버 전용입니다.
- `INTERNAL_INGEST_SECRET` 는 trusted assistant만 알아야 합니다.
- 위 두 값에는 절대 `NEXT_PUBLIC_` 를 붙이면 안 됩니다.

## 관리자 접근 제어

- `/admin` 및 관리자 편집 기능은 `ALLOWED_ADMIN_EMAIL` 과 로그인 이메일이 일치할 때만 허용됩니다.
- 일치하지 않으면 접근 거부 페이지로 이동합니다.
- 데이터 레벨에서는 Supabase RLS가 계속 owner 기준으로 보호합니다.

## 로컬 실행

```bash
npm install
npm run dev
```

PowerShell에서 실행 정책 문제로 `npm` 이 막히면:

```powershell
cmd /c npm install
cmd /c npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000) 을 엽니다.

## Supabase 설정

### 1. SQL 실행

Supabase SQL Editor에서 [schema.sql](C:/Users/scw99/Documents/development/changselog/supabase/schema.sql) 을 실행합니다.

이 스키마는 다음을 포함합니다.

- `archive_records`
- `archive_record_images`
- `telegram_identities`
- `inbox_messages`
- `draft_records`
- `draft_events`
- private bucket `record-images`
- owner 기반 RLS 정책

### 2. 인증 URL 설정

Supabase Dashboard -> `Authentication` -> `URL Configuration`

- `Site URL`
  - `https://your-vercel-domain.vercel.app`
- `Redirect URLs`
  - `https://your-vercel-domain.vercel.app/auth/callback`
  - `http://localhost:3000/auth/callback`

### 3. Storage 버킷

이미지 업로드는 private bucket `record-images` 를 사용합니다.  
웹과 internal API 모두 이 버킷에 업로드하고, UI에서는 signed URL로 렌더링합니다.

## Internal Assistant API

### 1. 새 기록 생성

- `POST /api/internal/archive-ingest`

용도:

- 승인된 assistant payload를 새 기록으로 저장

인증:

- `Authorization: Bearer <INTERNAL_INGEST_SECRET>`
- 또는 `x-internal-ingest-secret: <INTERNAL_INGEST_SECRET>`

### 2. 기존 기록 수정

- `PATCH /api/internal/archive-records/[id]`

용도:

- assistant가 기존 기록을 안전하게 보정
- 제목 수정
- 원제 수정
- 요약, 태그, 메모, 상세 필드 일부 수정

특징:

- owner를 요청에서 받지 않습니다.
- 서버가 `ALLOWED_ADMIN_EMAIL` 기준 owner를 찾아서 해당 owner 기록만 수정합니다.
- 다른 owner 데이터는 수정할 수 없습니다.

실사용 예시:

```json
{
  "title": "영화 기록: 스픽 노 이블",
  "content": {
    "titleOriginal": "Speak No Evil"
  }
}
```

### 3. 기록 이미지 첨부

- `POST /api/internal/archive-records/[id]/images`

용도:

- assistant가 특정 기록에 이미지를 첨부

요청 형식:

- `multipart/form-data`
- 필수: `file`
- 선택: `caption`, `alt_text`, `sort_order`

서버 동작:

1. internal secret 검증
2. owner 소유 기록인지 확인
3. Supabase Storage `record-images` 업로드
4. `archive_record_images` 메타데이터 row 생성
5. signed URL 반환

## 웹 관리자 이미지 업로드

관리자 편집기에서 각 기록별로:

- 여러 이미지 업로드
- 이미지 미리보기 확인
- 캡션 수정
- 대체 텍스트 수정
- 순서 변경
- 이미지 제거

가 가능합니다.

저장 방식:

- 파일: Supabase Storage
- 메타데이터: `archive_record_images`
- 렌더링: signed URL

## PowerShell 테스트 예시

### 새 기록 생성

```powershell
$headers = @{
  Authorization = "Bearer <INTERNAL_INGEST_SECRET>"
  "Content-Type" = "application/json"
}

$body = @"
{
  "title": "테스트 메모",
  "body": "assistant ingest 테스트 기록입니다.",
  "category": "thoughts",
  "subcategory": "메모",
  "tags": ["test", "assistant"],
  "summary": "assistant ingest test",
  "importance": 3,
  "event_date": "2026-03-13",
  "source_type": "assistant"
}
"@

Invoke-RestMethod `
  -Method Post `
  -Uri "https://changselog.vercel.app/api/internal/archive-ingest" `
  -Headers $headers `
  -Body $body
```

### 기존 기록 수정

```powershell
$headers = @{
  Authorization = "Bearer <INTERNAL_INGEST_SECRET>"
  "Content-Type" = "application/json"
}

$body = @"
{
  "title": "영화 기록: 스픽 노 이블",
  "content": {
    "titleOriginal": "Speak No Evil"
  }
}
"@

Invoke-RestMethod `
  -Method Patch `
  -Uri "https://changselog.vercel.app/api/internal/archive-records/<record-id>" `
  -Headers $headers `
  -Body $body
```

### 기록 이미지 첨부

```powershell
$secret = "<INTERNAL_INGEST_SECRET>"
$filePath = "C:\path\to\image.jpg"

curl.exe -X POST "https://changselog.vercel.app/api/internal/archive-records/<record-id>/images" `
  -H "Authorization: Bearer $secret" `
  -F "file=@$filePath" `
  -F "caption=기록용 사진" `
  -F "alt_text=기록 상세 이미지" `
  -F "sort_order=0"
```

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

권장:

- `Production`, `Preview`, `Development` 모두 설정

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
