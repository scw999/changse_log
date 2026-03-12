# 창세록

창세록은 생각, 단어, 콘텐츠, 장소, 활동을 구조화해서 저장하고 다시 탐색하는 개인 아카이브 앱입니다.

현재 상태는 다음 두 층으로 구성됩니다.

- 비로그인 상태: 로컬 시드 데이터 기반 탐색
- 로그인 상태: Supabase Auth + Database + Storage 기반 개인 아카이브 편집

## Tech Stack

- Next.js 16 App Router
- TypeScript
- Tailwind CSS v4
- Supabase Auth / Database / Storage
- Vercel 배포

## 현재 구현 범위

- 대시보드
- 최근 기록
- 생각 / 단어 / 콘텐츠 / 장소 / 활동
- 리뷰 화면
- 기록 상세
- 보호된 관리자 편집기
- 이메일 매직 링크 로그인
- Supabase Storage 이미지 업로드

## 주요 특징

- 구조화된 개인 기록 저장 모델
- 카테고리 / 태그 / 지역 / 평점 / 중요도 필터링
- 제목 / 본문 / 요약 / 태그 / 장소 / 단어 기준 검색
- 5점 만점, 0.5 단위 평점 표시
- 모바일 친화적인 아카이브 UI
- 관리자 페이지 로그인 보호
- 기록별 이미지 업로드 및 상세 표시

## 정보 구조 문서

- [정보 구조](./docs/information-architecture.md)
- [데이터베이스 스키마](./docs/database-schema.md)
- [폴더 구조](./docs/folder-structure.md)

## 로컬 실행

```bash
npm install
npm run dev
```

PowerShell 실행 정책 때문에 `npm` 이 막히면 아래처럼 실행합니다.

```powershell
cmd /c npm install
cmd /c npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000) 을 열면 됩니다.

## 환경 변수

`.env.local` 예시:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

커밋용 예시는 [.env.example](./.env.example) 에 있습니다.

## Supabase 설정

1. Supabase SQL Editor에서 [schema.sql](./supabase/schema.sql) 을 실행합니다.
2. 이메일 로그인(Auth > Providers > Email)이 활성화되어 있는지 확인합니다.
3. 필요하면 [seed.sql](./supabase/seed.sql) 의 안내대로 본인 계정 id로 예시 레코드를 넣습니다.

### 현재 Supabase 구조

- `archive_records`
- `archive_record_images`
- private bucket `record-images`
- owner 기반 RLS
- Storage 경로 첫 폴더를 `auth.uid()` 로 강제

## 로그인 방식

- `/login` 에서 이메일 입력
- Supabase가 매직 링크 전송
- 링크 클릭 후 `/auth/callback` 으로 복귀
- 로그인 사용자는 `/admin` 접근 가능

## 이미지 업로드 방식

- 관리자 화면에서 기록별 이미지 업로드
- 파일은 Supabase Storage `record-images` 버킷에 저장
- 메타데이터는 `archive_record_images` 테이블에 저장
- 상세 페이지에서 signed URL로 렌더링

## 로컬 시드 데이터

비로그인 상태에서는 `src/lib/archive/mock-data.ts` 의 시드 데이터가 브라우저 저장소에 적재되어 탐색용으로 보입니다.

- 로컬 저장소 키: `changselog.archive.records.v1`
- 로그인하면 Supabase 개인 기록이 우선 사용됩니다.

## 검증

```bash
npm run lint
npm run build
```

## Vercel 배포

1. 저장소를 Vercel에 연결합니다.
2. 환경 변수 `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` 를 추가합니다.
3. 기본 Build Command `npm run build` 를 사용합니다.

Vercel CLI로 preview 배포:

```bash
npx vercel deploy -y
```
