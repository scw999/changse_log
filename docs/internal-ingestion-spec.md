# 창세록 Internal Ingestion Spec

trusted assistant는 아래 순서로 창세록과 상호작용합니다.

1. 필요하면 search/recent로 record id 찾기
2. create 또는 patch 또는 delete 실행
3. 필요하면 이미지 첨부
4. 필요하면 이미지 메타데이터 보정

## 인증

```http
Authorization: Bearer <INTERNAL_INGEST_SECRET>
```

또는

```http
x-internal-ingest-secret: <INTERNAL_INGEST_SECRET>
```

## 공통 원칙

- owner id는 직접 보내지 않습니다.
- 서버가 `ALLOWED_ADMIN_EMAIL` 기준 owner를 찾아 owner-scoped 작업만 수행합니다.
- public write/read 용도가 아닙니다.

## Search

- `POST /api/internal/archive-records/search`

예시:

```json
{
  "query": "스픽 노 모어",
  "category": "content",
  "limit": 10
}
```

검색 범위:

- `title`
- `summary`
- `body`
- `tags`
- `details.content.titleOriginal`
- `details.content.originalTitle`

## Recent

- `GET /api/internal/archive-records/recent?limit=10`

정렬:

- `updated_at desc`
- `created_at desc`

## Patch

- `PATCH /api/internal/archive-records/[id]`

영화 제목 교정 예시:

```json
{
  "title": "영화 기록: 스픽 노 이블",
  "content": {
    "originalTitle": "Speak No Evil"
  }
}
```

## Delete

- `DELETE /api/internal/archive-records/[id]`

동작:

1. owner-scoped record 확인
2. 연결된 이미지 storage object 삭제
3. image metadata row 삭제
4. record 삭제

## Image Attach

- `POST /api/internal/archive-records/[id]/images`

폼 필드:

- `file`
- `caption`
- `alt_text`
- `sort_order`

## Image Metadata Patch

- `PATCH /api/internal/archive-records/[id]/images/[imageId]`

지원 필드:

- `caption`
- `alt_text`
- `sort_order`
- `is_primary`

예시:

```json
{
  "caption": "영화 포스터",
  "alt_text": "스픽 노 이블 포스터",
  "is_primary": true
}
```

대표 이미지 규칙:

- 별도 DB 컬럼 없이 가장 앞 `sort_order` 이미지를 대표 이미지로 간주합니다.
- `is_primary: true` 는 해당 이미지를 맨 앞으로 재배치합니다.

## 상태 코드

- `200`: 성공
- `400`: payload 오류
- `401`: secret 불일치
- `404`: 대상 없음 또는 owner 불일치
- `503`: 환경 변수 미설정
