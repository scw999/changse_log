# 창세록 Internal Ingestion Spec

## 목적

이 문서는 창세봇이 `창세록`에 승인된 structured payload를 저장할 때 따르는 실제 호출 규격입니다.

현재 메인 원칙:

- rough note 수집은 창세봇이 담당
- 사용자 승인 후에만 API 호출
- 창세록은 최종 저장소와 편집 UI 역할
- internal API는 trusted writer 전용

## 엔드포인트

- `POST /api/internal/archive-ingest`

예:

- 로컬: `http://localhost:3000/api/internal/archive-ingest`
- 배포: `https://changselog.vercel.app/api/internal/archive-ingest`

## 인증

둘 중 하나를 사용합니다.

### 1. Bearer token

```http
Authorization: Bearer <INTERNAL_INGEST_SECRET>
```

### 2. Custom header

```http
x-internal-ingest-secret: <INTERNAL_INGEST_SECRET>
```

권장:

- Bearer token 방식 사용

## 호출 규칙

### 반드시 지킬 것

- 사용자가 승인한 뒤에만 호출
- `category`, `subcategory`, `title`, `body`는 비워두지 않기
- `source_type`는 기본적으로 `assistant`
- 날짜는 `YYYY-MM-DD`
- `tags`는 짧고 명확하게

### 권장 규칙

- `summary`는 1~2문장으로 짧게
- `importance`는 1~5
- 세부 필드는 category에 맞는 객체만 보냄
- 모르는 값은 억지로 채우지 말고 생략

## 공통 Payload

```json
{
  "title": "string",
  "body": "string",
  "category": "thoughts | words | content | places | activities",
  "subcategory": "string",
  "tags": ["string"],
  "summary": "string",
  "notes": "string",
  "importance": 3,
  "event_date": "2026-03-13",
  "source_type": "assistant",
  "metadata": {
    "channel": "telegram",
    "approved_by_user": true
  }
}
```

## 공통 필드 설명

- `title`
  - 기록 제목
- `body`
  - 구조화된 본문
- `category`
  - 상위 분류
- `subcategory`
  - 세부 분류
- `tags`
  - 검색/분류용 태그
- `summary`
  - 리스트와 카드에서 바로 읽히는 요약
- `notes`
  - 추가 운영 메모
- `importance`
  - 1~5
- `event_date`
  - 사건/경험이 일어난 날짜
- `source_type`
  - 기본값 `assistant`
- `metadata`
  - ingestion context를 남길 때 사용

## Category별 템플릿

### 1. Thoughts

```json
{
  "title": "요즘 반복되는 생각 메모",
  "body": "최근 며칠 동안 같은 유형의 피로가 반복되고 있다...",
  "category": "thoughts",
  "subcategory": "메모",
  "tags": ["회고", "패턴", "컨디션"],
  "summary": "반복되는 피로 패턴에 대한 메모",
  "importance": 4,
  "event_date": "2026-03-13",
  "source_type": "assistant",
  "thought": {
    "thoughtType": "메모",
    "oneLineThought": "피로는 일정 문제보다 회복 리듬 문제일 수 있다.",
    "expandedNote": "최근의 피로는 단순히 바쁨 때문이 아니라...",
    "actionNeeded": true,
    "worthRevisiting": true
  }
}
```

### 2. Words

```json
{
  "title": "단어 기록: 잔향",
  "body": "무언가가 끝난 뒤에 오래 남는 기분을 표현할 때 자주 쓰고 싶은 단어.",
  "category": "words",
  "subcategory": "어휘",
  "tags": ["단어", "표현", "감각"],
  "summary": "끝난 뒤에도 오래 남는 감각을 표현하는 단어",
  "importance": 3,
  "event_date": "2026-03-13",
  "source_type": "assistant",
  "word": {
    "term": "잔향",
    "meaning": "무언가가 지난 뒤에도 오래 남는 느낌",
    "example": "그 카페의 공기에는 오후의 잔향이 남아 있었다.",
    "whySaved": "장소와 콘텐츠 리뷰 표현으로 자주 쓰고 싶어서"
  }
}
```

### 3. Content

```json
{
  "title": "콘텐츠 기록: Past Lives",
  "body": "관계의 시간성과 감정의 결을 조용하게 붙잡는 영화였다.",
  "category": "content",
  "subcategory": "영화",
  "tags": ["영화", "관계", "여운"],
  "summary": "시간과 관계의 잔향이 오래 남는 영화",
  "importance": 5,
  "event_date": "2026-03-13",
  "source_type": "assistant",
  "content": {
    "contentType": "영화",
    "titleOriginal": "Past Lives",
    "rating": 4.5,
    "oneLineReview": "관계의 여운을 아주 조용하게 붙잡는 영화",
    "memorablePoints": ["대화의 여백", "시간의 거리감"],
    "weakPoints": [],
    "memorableQuote": "",
    "revisitIntent": "yes"
  }
}
```

### 4. Places

```json
{
  "title": "성수 브런치 기록",
  "body": "성수에서 브런치를 먹었는데 잠봉뵈르가 좋았고 다시 갈 만했다.",
  "category": "places",
  "subcategory": "카페",
  "tags": ["성수", "브런치", "재방문"],
  "summary": "성수에서 다시 가고 싶은 브런치 장소",
  "importance": 4,
  "event_date": "2026-03-13",
  "source_type": "assistant",
  "place": {
    "placeName": "오르에르 성수",
    "area": "성수",
    "address": "",
    "placeType": "카페",
    "visitDate": "2026-03-13",
    "rating": 4.5,
    "oneLineReview": "잠봉뵈르가 좋고 다시 갈 만한 브런치 장소",
    "revisitIntent": "yes",
    "withWhom": "수연",
    "atmosphereNote": "",
    "priceNote": ""
  }
}
```

### 5. Activities

```json
{
  "title": "반포 저녁 러닝",
  "body": "초반엔 몸이 무거웠지만 중반부터 호흡이 안정됐고 기록보다 컨디션 정리에 가까운 러닝이었다.",
  "category": "activities",
  "subcategory": "러닝",
  "tags": ["러닝", "반포", "컨디션"],
  "summary": "기록 경쟁보다 컨디션 정리에 가까운 저녁 러닝",
  "importance": 4,
  "event_date": "2026-03-13",
  "source_type": "assistant",
  "activity": {
    "activityType": "러닝",
    "location": "반포한강공원",
    "distanceKm": 6.2,
    "durationMinutes": 39,
    "difficulty": 3,
    "satisfactionRating": 4.5,
    "physicalConditionNote": "초반엔 무거웠지만 후반은 안정적이었다.",
    "summary": "몸보다 호흡 정리에 가까운 러닝"
  }
}
```

## 최소 권장 규격

창세봇이 항상 완전한 세부 필드를 채울 필요는 없습니다.

최소한 아래만 있으면 저장 가능합니다.

```json
{
  "title": "간단 메모",
  "body": "정리된 본문",
  "category": "thoughts",
  "subcategory": "메모",
  "summary": "짧은 요약"
}
```

## 창세봇 운영 규칙

### 저장 전 체크

- 사용자가 명시적으로 승인했는가
- category가 분명한가
- title이 지나치게 길거나 모호하지 않은가
- summary가 카드에 바로 보일 만큼 읽기 쉬운가

### 저장 시 권장

- `source_type = assistant`
- `metadata.channel = telegram`
- `metadata.approved_by_user = true`
- `metadata.approved_at` 기록

예:

```json
{
  "metadata": {
    "channel": "telegram",
    "approved_by_user": true,
    "approved_at": "2026-03-13T01:30:00+09:00"
  }
}
```

## 에러 처리 규칙

- `401`
  - secret 불일치
- `400`
  - payload 형식 오류 또는 저장 실패
- `503`
  - 서버 환경 변수 미설정

창세봇 쪽에서는 실패 시:

- 원문과 구조화 payload를 보관
- 재시도 가능하게 로그 남김
- 사용자에게 “저장 실패, 다시 시도 예정” 정도만 간단히 안내

## 권장 다음 단계

- category별 생성 규칙을 창세봇 prompt에 반영
- 승인 후 바로 internal API 호출
- 실패 시 재시도 큐 또는 운영 로그 추가
