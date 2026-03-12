# 창세록

창세록은 생각, 단어, 콘텐츠, 장소, 활동을 구조화해 저장하고 다시 탐색하는 개인 아카이브 웹앱입니다.  
현재 단계는 `private personal admin app`에 집중하며, 관리자 접근은 하나의 허용 이메일로 제한됩니다.

## Tech Stack

- Next.js 16 App Router
- TypeScript
- Tailwind CSS v4
- Supabase Auth / Database / Storage
- Vercel

## 현재 구현 범위

- 대시보드, 최근 기록, 생각, 단어, 콘텐츠, 장소, 활동, 리뷰
- 기록 상세 보기
- 관리자 기록 생성 / 수정 / 삭제
- Supabase Storage 이미지 업로드
- 이메일 매직 링크 로그인
- 허용 이메일 기반 관리자 접근 제한
- Telegram 연동을 위한 준비 테이블

## 필수 환경 변수

로컬 `.env.local`과 Vercel 환경 변수에 아래 값을 넣어야 합니다.

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
ALLOWED_ADMIN_EMAIL=you@example.com
TELEGRAM_BOT_TOKEN=123456:telegram-bot-token
TELEGRAM_WEBHOOK_SECRET=replace-with-random-secret
TELEGRAM_BOT_USERNAME=your_bot_username
```

### `ALLOWED_ADMIN_EMAIL` 동작 방식

- 로그인한 사용자 이메일과 `ALLOWED_ADMIN_EMAIL`이 정확히 일치할 때만 `/admin`에 접근할 수 있습니다.
- 일치하지 않으면 `접근 거부` 페이지로 이동합니다.
- Supabase RLS는 그대로 유지되어, DB 레벨에서도 각 사용자 데이터가 분리됩니다.

## 로컬 실행

```bash
npm install
npm run dev
```

PowerShell에서 `npm.ps1` 정책 오류가 나면 아래처럼 실행합니다.

```powershell
cmd /c npm install
cmd /c npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000) 을 엽니다.

## 로그인 흐름

1. `/login`에서 이메일 입력
2. Supabase가 매직 링크 메일 전송
3. 링크 클릭 시 `/auth/callback`으로 복귀
4. 세션 교환 성공 시 `/admin` 또는 요청한 `next` 경로로 이동

### 콜백 오류 처리

아래 같은 상황은 로그인 페이지로 다시 돌려보내고, 친절한 재시도 메시지를 보여줍니다.

- 링크 만료
- 이미 사용한 링크
- 잘못된 링크
- 코드 누락
- 세션 교환 실패

권장 설정:

- Supabase `Site URL`
  - `https://your-vercel-domain.vercel.app`
- Supabase `Redirect URLs`
  - `https://your-vercel-domain.vercel.app/auth/callback`
  - `http://localhost:3000/auth/callback`

## Supabase 설정

### 1. SQL 실행

Supabase SQL Editor에서 아래 파일을 실행합니다.

- [supabase/schema.sql](C:/Users/scw99/Documents/development/changselog/supabase/schema.sql)

이 파일은 아래를 만듭니다.

- `archive_records`
- `archive_record_images`
- `telegram_identities`
- `inbox_messages`
- `draft_records`
- private bucket `record-images`
- 각 테이블과 Storage에 대한 owner 기반 RLS 정책

### 2. Email Auth 활성화

Supabase Dashboard에서 Email 로그인 제공자가 켜져 있는지 확인합니다.

### 3. URL Configuration

`Authentication` -> `URL Configuration`에서 아래 값을 설정합니다.

- `Site URL`
  - 배포 주소
- `Redirect URLs`
  - 배포 콜백 주소
  - 로컬 콜백 주소

## Telegram 준비 테이블

이제 Telegram ingestion MVP 골격이 저장소에 포함되어 있습니다.  
아직 OpenAI 구조화나 복잡한 대화형 수정은 넣지 않았고, private personal workflow 기준의 최소 흐름만 구현했습니다.

- `telegram_identities`
  - 앱 사용자와 Telegram 사용자를 연결
- `inbox_messages`
  - Telegram 원문 메시지 저장
- `draft_records`
  - 창세봇이 구조화한 승인 전 초안 저장
- `draft_events`
  - 승인 / 취소 / 수정 요청 같은 상태 이력 저장

이 구조를 바탕으로 다음 단계에서 아래 흐름을 붙일 수 있습니다.

- Telegram 메시지 수신
- 원문 저장
- 구조화 초안 생성
- 사용자 승인
- 최종 `archive_records` 반영

## Telegram MVP 설정

### 필요한 환경 변수

- `SUPABASE_SERVICE_ROLE_KEY`
  - webhook/API route가 server-side write를 할 때 사용
- `TELEGRAM_BOT_TOKEN`
  - Telegram bot API 호출용
- `TELEGRAM_WEBHOOK_SECRET`
  - `X-Telegram-Bot-Api-Secret-Token` 검증용
- `TELEGRAM_BOT_USERNAME`
  - 관리자 화면에서 deep link 생성용, 선택값이지만 있으면 편합니다

### 구현된 엔드포인트

- `POST /api/telegram/webhook`
  - Telegram update 수신
  - secret token 검증
  - `/start link_<token>` 연결 처리
  - verified Telegram 계정의 rough note 저장
  - draft 생성 및 approve/revise/reject 버튼 응답
- `POST /api/telegram/verify`
  - 관리자 화면에서 Telegram 연결 링크 생성

### 운영 흐름

1. `/admin/telegram` 에서 연결 링크 생성
2. Telegram에서 링크 열기 또는 `/start link_<token>` 전송
3. 본인 계정 verified 처리
4. 메모 전송
5. raw inbox 저장 -> draft 생성 -> Telegram 승인 버튼 전송
6. 승인된 draft만 `archive_records`로 저장

### Telegram webhook 설정 예시

Telegram bot webhook은 Telegram 쪽에서 아래처럼 등록합니다.

```bash
curl -X POST "https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/setWebhook" \
  -H "Content-Type: application/json" \
  -d "{\"url\":\"https://your-vercel-domain.vercel.app/api/telegram/webhook\",\"secret_token\":\"<TELEGRAM_WEBHOOK_SECRET>\"}"
```

설정 후에는 `/admin/telegram` 에서 연결 상태와 최근 inbox/draft를 확인할 수 있습니다.

## Vercel 배포

### 1. GitHub 저장소 연결

Vercel에서 GitHub 저장소를 연결합니다.

- 저장소: [scw999/changse_log](https://github.com/scw999/changse_log)

### 2. 환경 변수 추가

Vercel Project Settings -> Environment Variables에 아래 값을 추가합니다.

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `ALLOWED_ADMIN_EMAIL`

`Production`, `Preview`, `Development` 환경에 모두 넣는 것을 권장합니다.

### 3. Build / Deploy

기본 설정으로 배포 가능합니다.

- Install Command: `npm install`
- Build Command: `npm run build`

CLI 예시:

```bash
npx vercel deploy
```

프로덕션 배포:

```bash
npx vercel deploy --prod
```

## 검증

```bash
npm run lint
npm run build
```

## 문서

- [정보 구조](C:/Users/scw99/Documents/development/changselog/docs/information-architecture.md)
- [데이터베이스 스키마](C:/Users/scw99/Documents/development/changselog/docs/database-schema.md)
- [폴더 구조](C:/Users/scw99/Documents/development/changselog/docs/folder-structure.md)
