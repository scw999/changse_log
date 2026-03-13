# 창세록 Internal Ingestion Spec

이 문서는 trusted assistant가 창세록에 기록을 생성, 검색, 최근 조회, 수정, 삭제, 이미지 첨부할 때 사용하는 internal API 규격입니다.

## 인증

다음 둘 중 하나를 사용합니다.

```http
Authorization: Bearer <INTERNAL_INGEST_SECRET>
```

또는

```http
x-internal-ingest-secret: <INTERNAL_INGEST_SECRET>
```

권장 방식은 Bearer token입니다.

## 공통 원칙

- 사용자 승인 후에만 호출합니다.
- owner id는 payload로 보내지 않습니다.
- 서버가 `ALLOWED_ADMIN_EMAIL` 기준으로 owner를 찾아 owner-scoped 작업만 수행합니다.
- 다른 사용자 데이터에 대한 검색/조회/수정/삭제/write는 허용하지 않습니다.

## 1. Create

- `POST /api/internal/archive-ingest`

최소 예시:

```json
{
  "title": "간단 메모",
  "body": "정리된 본문",
  "category": "thoughts",
  "subcategory": "메모",
  "summary": "짧은 요약"
}
```

## 2. Search

- `POST /api/internal/archive-records/search`

예시:

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

## 3. Recent

- `GET /api/internal/archive-records/recent?limit=10`

용도:

- “방금 저장한 거”
- “최근 영화”
- “어제 올린 장소”

정렬:

- `updated_at desc`
- `created_at desc`

## 4. Patch

- `PATCH /api/internal/archive-records/[id]`

지원 필드:

- `title`
- `body`
- `category`
- `subcategory`
- `tags`
- `summary`
- `notes`
- `event_date`
- `importance`
- `details`
- `thought`
- `word`
- `content`
- `place`
- `activity`

영화 제목 교정 예시:

```json
{
  "title": "영화 기록: 스픽 노 이블",
  "content": {
    "originalTitle": "Speak No Evil"
  }
}
```

참고:

- assistant가 `content.originalTitle` 로 보내도 서버가 `titleOriginal` 과 호환되게 정규화합니다.

## 5. Delete

- `DELETE /api/internal/archive-records/[id]`

응답 예시:

```json
{
  "ok": true,
  "deleted": {
    "id": "record-id",
    "title": "테스트 메모"
  }
}
```

삭제 동작:

1. owner-scoped record 확인
2. 연결된 image row 조회
3. `record-images` bucket object 삭제
4. `archive_record_images` row 삭제
5. `archive_records` row 삭제

## 6. Image Attach

- `POST /api/internal/archive-records/[id]/images`

요청 형식:

- `multipart/form-data`

필수:

- `file`

선택:

- `caption`
- `alt_text`
- `sort_order`

예시:

```bash
curl -X POST https://changselog.vercel.app/api/internal/archive-records/<record-id>/images \
  -H "Authorization: Bearer <INTERNAL_INGEST_SECRET>" \
  -F "file=@/path/to/image.jpg" \
  -F "caption=기록용 사진" \
  -F "alt_text=기록 상세 이미지" \
  -F "sort_order=0"
```

## 실전 Search -> Patch

사용자 요청:

> 스픽 노 모어로 된 영화 기록 찾아서 제목을 스픽 노 이블로 바꾸고 원제를 Speak No Evil로 수정해

처리 순서:

1. `POST /api/internal/archive-records/search`
2. 결과에서 record id 확인
3. `PATCH /api/internal/archive-records/[id]`

## 실전 Search -> Delete

테스트 기록 삭제 예시:

1. `POST /api/internal/archive-records/search`
   - query: `internal ingest test`
2. 결과에서 record id 확인
3. `DELETE /api/internal/archive-records/[id]`

## 상태 코드

- `200`: 성공
- `400`: payload 오류
- `401`: secret 불일치
- `404`: record 없음 또는 owner 불일치
- `503`: 서버 환경 변수 미설정
