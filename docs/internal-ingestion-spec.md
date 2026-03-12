# 창세록 Internal Ingestion Spec

이 문서는 창세봇 같은 trusted assistant가 창세록에 기록을 생성, 수정, 이미지 첨부할 때 사용하는 서버 API 규격입니다.

## 목적

창세록의 입력 채널은 이제 두 가지입니다.

1. 웹 관리자 직접 입력
2. trusted assistant가 승인된 payload를 internal API로 저장

이 API는 public write 용도가 아니라, owner 전용 assistant workflow를 위한 trusted path입니다.

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
- `source_type` 은 기본적으로 `assistant` 를 사용합니다.
- owner id는 payload로 보내지 않습니다.
- 서버가 `ALLOWED_ADMIN_EMAIL` 기준으로 owner를 찾아 저장합니다.
- 다른 owner 데이터에 대한 write는 허용하지 않습니다.

## 1. 새 기록 생성

- `POST /api/internal/archive-ingest`

### 최소 payload

```json
{
  "title": "간단 메모",
  "body": "정리된 본문",
  "category": "thoughts",
  "subcategory": "메모",
  "summary": "짧은 요약"
}
```

### 권장 payload

```json
{
  "title": "성수 브런치 기록",
  "body": "성수에서 브런치를 먹었고 분위기와 메뉴 인상이 좋았다.",
  "category": "places",
  "subcategory": "카페",
  "tags": ["성수", "브런치", "재방문"],
  "summary": "다시 가고 싶은 성수 브런치 장소",
  "importance": 4,
  "event_date": "2026-03-13",
  "source_type": "assistant",
  "place": {
    "placeName": "오르에르 성수",
    "area": "성수",
    "placeType": "카페",
    "visitDate": "2026-03-13",
    "rating": 4.5,
    "oneLineReview": "분위기와 메뉴 모두 만족스러운 브런치 장소",
    "revisitIntent": "yes",
    "withWhom": "수연"
  },
  "metadata": {
    "channel": "assistant",
    "approved_by_user": true
  }
}
```

## 2. 기존 기록 수정

- `PATCH /api/internal/archive-records/[id]`

assistant가 기존 기록을 보정할 때 사용합니다.

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

### 실제 수정 예시

영화 기록의 한글 제목과 원제를 바로잡는 경우:

```json
{
  "title": "영화 기록: 스픽 노 이블",
  "content": {
    "titleOriginal": "Speak No Evil"
  }
}
```

### 동작 원칙

- 기록 id가 존재해야 합니다.
- 해당 기록이 owner 소유여야 합니다.
- patch payload는 부분 수정으로 적용됩니다.
- 서버는 `details.ingestion` 에 internal update 메타데이터를 남깁니다.

## 3. 기록 이미지 첨부

- `POST /api/internal/archive-records/[id]/images`

assistant가 나중에 특정 기록에 이미지를 연결해야 할 때 사용합니다.

### 요청 형식

- `multipart/form-data`

필수 필드:

- `file`

선택 필드:

- `caption`
- `alt_text`
- `sort_order`

### 예시

```bash
curl -X POST https://changselog.vercel.app/api/internal/archive-records/<record-id>/images \
  -H "Authorization: Bearer <INTERNAL_INGEST_SECRET>" \
  -F "file=@/path/to/image.jpg" \
  -F "caption=기록용 사진" \
  -F "alt_text=기록 상세 이미지" \
  -F "sort_order=0"
```

### 서버 동작

1. internal secret 검증
2. 대상 record가 owner 소유인지 확인
3. Supabase Storage `record-images` 업로드
4. `archive_record_images` row 저장
5. signed URL 포함 응답 반환

## 웹 관리자 이미지 업로드와의 관계

이미지 모델은 웹과 assistant가 공용으로 사용합니다.

- 웹 관리자 업로드
  - 관리자가 직접 여러 이미지를 업로드
  - 캡션, 대체 텍스트, 순서 수정 가능
- assistant 업로드
  - internal image attach API를 통해 같은 모델에 저장

공통 저장 위치:

- 파일: Supabase Storage `record-images`
- 메타데이터: `archive_record_images`

## 권장 assistant 운영 규칙

- 기록 생성 전에는 가능한 한 title, category, summary를 명확히 정리합니다.
- 수정 API는 승인된 correction에만 사용합니다.
- 이미지 첨부는 record id가 확정된 후 호출합니다.
- 대체 텍스트는 가능하면 짧고 설명적으로 작성합니다.
- assistant가 확신 없는 필드는 억지로 채우지 말고 생략합니다.

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

- `400` 이면 payload를 재확인
- `401` 이면 secret 또는 배포 환경 확인
- `404` 이면 record id 확인
- `503` 이면 운영 환경 변수 상태 확인
