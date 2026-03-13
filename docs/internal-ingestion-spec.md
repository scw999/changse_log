# Internal Ingestion Spec

Trusted assistant flow for changse_log:

1. search or inspect recent records when an id is unknown
2. create, patch, or delete a record
3. attach images if needed
4. patch image metadata if needed

## Auth

```http
Authorization: Bearer <INTERNAL_INGEST_SECRET>
```

or

```http
x-internal-ingest-secret: <INTERNAL_INGEST_SECRET>
```

## Shared Rules

- Do not send `owner_id`
- Server resolves the owner from `ALLOWED_ADMIN_EMAIL`
- All operations remain owner-scoped
- Public writes are never allowed

## Search

- `POST /api/internal/archive-records/search`

Example:

```json
{
  "query": "스픽 노 모어",
  "category": "content",
  "limit": 10
}
```

Search fields:

- `title`
- `summary`
- `body`
- `tags`
- `details.content.titleOriginal`
- `details.content.originalTitle`

## Recent

- `GET /api/internal/archive-records/recent?limit=10`

Sort:

- `updated_at desc`
- `created_at desc`

## Create

- `POST /api/internal/archive-ingest`

## Patch Record

- `PATCH /api/internal/archive-records/[id]`

Movie correction example:

```json
{
  "title": "영화 기록: 스픽 노 이블",
  "content": {
    "originalTitle": "Speak No Evil"
  }
}
```

## Delete Record

- `DELETE /api/internal/archive-records/[id]`

Behavior:

1. verify owner-scoped record
2. remove linked storage objects
3. remove image metadata rows
4. remove the record row

## Attach Image

- `POST /api/internal/archive-records/[id]/images`

Form fields:

- `file`
- `caption`
- `alt_text`
- `sort_order`
- `is_primary`

If `is_primary=true`, the uploaded image becomes the representative image. This does not change gallery order unless `sort_order` is also set.

## Patch Image Metadata

- `PATCH /api/internal/archive-records/[id]/images/[imageId]`

Supported fields:

- `caption`
- `alt_text`
- `sort_order`
- `is_primary`

Representative image and gallery order are independent:

- `sort_order` changes gallery position
- `is_primary` changes thumbnail / representative selection
- setting `is_primary=true` does not force `sort_order=0`

Example:

```json
{
  "caption": "자전거 두 대 있는 사진",
  "is_primary": true
}
```

Expected effect:

- gallery order stays the same
- the chosen image becomes the representative thumbnail

## Status Codes

- `200`: success
- `400`: invalid payload or failed write
- `401`: secret mismatch
- `404`: record/image not found within owner scope
- `503`: required environment is missing
