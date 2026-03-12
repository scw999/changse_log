# 창세록

창세록은 생각, 단어, 콘텐츠, 장소, 활동을 구조화해 저장하고 다시 탐색하는 개인 아카이브 웹앱입니다.  
현재 운영 방향은 `private personal archive + trusted assistant ingestion` 입니다.

## 현재 방향

- 웹앱: browsing, editing, filtering, review
- 창세봇: rough note 정리와 승인 확인
- internal API: 승인된 structured payload를 안전하게 저장

즉 초기 메인 입력 흐름은 다음과 같습니다.

1. 사용자가 창세봇과 대화
2. 창세봇이 내용을 구조화
3. 사용자가 채팅에서 승인
4. 창세봇이 창세록 internal API 호출
5. 창세록이 Supabase에 저장
6. 웹앱에서 조회/수정/리뷰

## Tech Stack

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

### 핵심 보안 변수

- `ALLOWED_ADMIN_EMAIL`
  - 관리자 브라우저 접근 허용 이메일
- `SUPABASE_SERVICE_ROLE_KEY`
  - 서버 전용 DB 쓰기 권한
- `INTERNAL_INGEST_SECRET`
  - 창세봇이 internal API를 호출할 때 쓰는 비밀키

`SUPABASE_SERVICE_ROLE_KEY` 와 `INTERNAL_INGEST_SECRET` 는 절대 `NEXT_PUBLIC_` 로 노출하면 안 됩니다.

## 관리자 접근

- 로그인한 사용자 이메일과 `ALLOWED_ADMIN_EMAIL` 이 정확히 일치할 때만 `/admin` 접근 가능
- 일치하지 않으면 접근 거부 페이지로 이동
- Supabase RLS는 그대로 유지되어 사용자별 데이터는 DB 레벨에서도 분리

## 로컬 실행

```bash
npm install
npm run dev
```

PowerShell에서 `npm.ps1` 정책 오류가 나면:

```powershell
cmd /c npm install
cmd /c npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000) 을 엽니다.

## Supabase 설정

### 1. SQL 실행

Supabase SQL Editor에서 [schema.sql](C:/Users/scw99/Documents/development/changselog/supabase/schema.sql) 을 실행합니다.

생성/업데이트되는 주요 대상:

- `archive_records`
- `archive_record_images`
- `telegram_identities`
- `inbox_messages`
- `draft_records`
- `draft_events`
- private bucket `record-images`

### 2. Email Auth 활성화

Supabase Dashboard에서 Email 로그인 제공자가 켜져 있는지 확인합니다.

### 3. URL Configuration

`Authentication -> URL Configuration`

- `Site URL`
  - 배포 주소
- `Redirect URLs`
  - `https://your-vercel-domain.vercel.app/auth/callback`
  - `http://localhost:3000/auth/callback`

## Internal Ingestion API

### 엔드포인트

- `POST /api/internal/archive-ingest`

### 인증 방식

둘 중 하나로 secret을 보낼 수 있습니다.

1. `Authorization: Bearer <INTERNAL_INGEST_SECRET>`
2. `x-internal-ingest-secret: <INTERNAL_INGEST_SECRET>`

### 동작

- POST만 허용
- secret 불일치 시 401
- payload shape 검증
- `ALLOWED_ADMIN_EMAIL` 에 해당하는 owner를 찾아 저장
- `archive_records.source_type = assistant`
- `details.ingestion.method = internal_api`

### 지원 필드

- `title`
- `body`
- `category`
- `subcategory`
- `tags`
- `summary`
- `notes`
- `importance`
- `event_date`
- `source_type`
- `metadata`
- 타입별 옵션 필드
  - `thought`
  - `word`
  - `content`
  - `place`
  - `activity`

### 예시 payload

```json
{
  "title": "성수 브런치 메모",
  "body": "오늘 성수에서 브런치를 먹었는데 잠봉뵈르가 좋았고 다시 갈 만했다.",
  "category": "places",
  "subcategory": "카페",
  "tags": ["성수", "브런치", "재방문"],
  "summary": "성수 브런치 장소 메모",
  "importance": 4,
  "event_date": "2026-03-13",
  "source_type": "assistant",
  "place": {
    "placeName": "오르에르 성수",
    "area": "성수",
    "placeType": "카페",
    "rating": 4.5,
    "oneLineReview": "잠봉뵈르가 좋고 다시 갈 만한 브런치 장소",
    "revisitIntent": "yes",
    "withWhom": "수연"
  },
  "metadata": {
    "conversation": "telegram-assistant",
    "approved_by_user": true
  }
}
```

### 로컬 테스트 예시

PowerShell:

```powershell
$headers = @{
  Authorization = "Bearer <INTERNAL_INGEST_SECRET>"
  "Content-Type" = "application/json"
}

$body = @"
{
  "title": "테스트 메모",
  "body": "내부 저장 API 테스트",
  "category": "thoughts",
  "subcategory": "메모",
  "tags": ["test"],
  "summary": "internal ingest test",
  "importance": 3,
  "source_type": "assistant"
}
"@

Invoke-RestMethod `
  -Method Post `
  -Uri "http://localhost:3000/api/internal/archive-ingest" `
  -Headers $headers `
  -Body $body
```

## Telegram 관련

Telegram bot/webhook MVP 골격도 저장소에 포함되어 있지만, 현재 메인 제품 방향은 `창세봇 -> internal API 저장` 입니다.  
즉 Telegram bot은 향후 별도 입력 채널이 필요할 때 확장용으로 두고, 지금은 internal ingestion이 우선입니다.

## Vercel 배포

### 1. GitHub 저장소 연결

- 저장소: [scw999/changse_log](https://github.com/scw999/changse_log)

### 2. 환경 변수 추가

Vercel Project Settings -> Environment Variables 에 아래 값을 추가합니다.

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `ALLOWED_ADMIN_EMAIL`
- `INTERNAL_INGEST_SECRET`
- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_WEBHOOK_SECRET`
- `TELEGRAM_BOT_USERNAME`

권장:
- `Production`, `Preview`, `Development` 전부 설정

### 3. Redeploy

환경 변수를 바꾼 뒤에는 최신 배포를 다시 `Redeploy` 합니다.

## 검증

```bash
npm run lint
npm run build
```

## 문서

- [정보 구조](C:/Users/scw99/Documents/development/changselog/docs/information-architecture.md)
- [데이터베이스 스키마](C:/Users/scw99/Documents/development/changselog/docs/database-schema.md)
- [폴더 구조](C:/Users/scw99/Documents/development/changselog/docs/folder-structure.md)
