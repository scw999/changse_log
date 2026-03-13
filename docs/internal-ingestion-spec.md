# 창세록 Internal Ingestion Spec

이 문서는 trusted assistant가 창세록에 기록을 생성, 검색, 최근 조회, 수정, 이미지 첨부할 때 사용하는 서버 API 규격입니다.

## 목적

창세록의 trusted assistant flow는 다음 순서를 기준으로 합니다.

1. 사용자 승인 완료
2. assistant가 기존 기록을 검색하거나 최근 기록을 조회
3. 필요한 경우 record id를 확보
4. assistant가 create 또는 patch 실행
5. 필요하면 이미지 첨부

이 API는 public write 용도가 아니라 owner 전용 trusted path입니다.

## 인증

다음 둘 중 하나를 사용합니다.

### Bearer token

```http
Authorization: Bearer <INTERNAL_INGEST_SECRET>
```

### Custom header

```http
x-internal-ingest-secret: <INTERNAL_INGEST_SECRET>
```

권장 방식은 Bearer token입니다.

## 공통 규칙

- 사용자 승인 후에만 호출합니다.
- owner id는 payload로 보내지 않습니다.
- 서버가 `ALLOWED_ADMIN_EMAIL` 기준으로 owner를 찾아서 owner-scoped 작업만 수행합니다.
- 다른 owner 데이터에 대한 검색/조회/수정/write는 허용하지 않습니다.

## 1. 새 기록 생성

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

## 2. 기존 기록 검색

- `POST /api/internal/archive-records/search`

요청:

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

응답:

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

## 3. 최근 기록 조회

- `GET /api/internal/archive-records/recent?limit=10`

용도:

- “방금 저장한 거”
- “어제 올린 영화”
- “최근 장소 찾아줘”

정렬:

- `updated_at desc`
- `created_at desc`

## 4. 기존 기록 수정

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

실제 수정 예시:

```json
{
  "title": "영화 기록: 스픽 노 이블",
  "content": {
    "originalTitle": "Speak No Evil"
  }
}
```

참고:

- assistant가 `content.originalTitle` 로 보내도 서버가 `titleOriginal` 형식과 호환되게 정규화합니다.

## 5. 기록 이미지 첨부

- `POST /api/internal/archive-records/[id]/images`

요청 형식:

- `multipart/form-data`

필수 필드:

- `file`

선택 필드:

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

## 실전 Search -> Patch 플로우

사용자 요청:

> 스픽 노 모어로 된 영화 기록 찾아서 제목을 스픽 노 이블로 바꾸고 원제를 Speak No Evil로 수정해

assistant 처리:

1. `POST /api/internal/archive-records/search`
   - query: `스픽 노 모어`
   - category: `content`
2. 결과에서 가장 적절한 `id` 확인
3. `PATCH /api/internal/archive-records/[id]`
   - `title = "영화 기록: 스픽 노 이블"`
   - `content.originalTitle = "Speak No Evil"`

## 응답 및 오류

예상 상태 코드:

- `200`
  - 성공
- `400`
  - payload 형식 오류
- `401`
  - secret 불일치
- `404`
  - 대상 record 없음 또는 owner 불일치
- `503`
  - 서버 환경 변수 미설정

assistant 쪽 권장 처리:

- `400` 이면 payload 확인
- `401` 이면 secret 또는 배포 환경 확인
- `404` 이면 검색 결과/record id 재확인
- `503` 이면 운영 환경 변수 확인
