# changse_log

changse_log is a private personal archive for structured life records.

- Web app: browse, filter, review, and edit
- Trusted assistant APIs: create, search, recent lookup, update, delete, and image attachment
- Data and files: Supabase Postgres + private Storage bucket

## Environment Variables

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
ALLOWED_ADMIN_EMAIL=you@example.com
ALLOWED_VIEWER_EMAILS=you@example.com,friend@example.com
INTERNAL_INGEST_SECRET=replace-with-a-long-random-secret
TELEGRAM_BOT_TOKEN=123456:telegram-bot-token
TELEGRAM_WEBHOOK_SECRET=replace-with-random-secret
TELEGRAM_BOT_USERNAME=your_bot_username
```

## Private Access

This app is not public.

- `ALLOWED_VIEWER_EMAILS`: only these emails can open the archive
- `ALLOWED_ADMIN_EMAIL`: only this email can access admin/editing and owner-scoped assistant writes

Supabase auth session cookies keep users signed in between visits until the session expires or they sign out.

## Supabase Setup

Run [schema.sql](C:/Users/scw99/Documents/development/changselog/supabase/schema.sql) in the Supabase SQL Editor.

This creates:

- `archive_records`
- `archive_record_images`
- private bucket `record-images`
- owner-scoped RLS policies
- helper columns such as `updated_at`
- `archive_record_images.is_primary` for representative image selection

## Representative Image Model

Gallery order and representative image are separate.

- Gallery order uses `sort_order`
- Representative image uses `archive_record_images.is_primary`
- Cards and thumbnails use:
  1. the image with `is_primary = true`
  2. otherwise the first image by gallery order
  3. otherwise no image

Important:

- setting a representative image does not move it to the front
- existing records still work because they safely fall back to the first image

## Web Image Behavior

- Admin can upload multiple images per record
- Admin can edit caption and alt text
- Admin can reorder gallery images
- Admin can choose a representative image independently
- Detail page images open in a larger lightbox viewer

## Internal APIs

All internal assistant routes require:

```http
Authorization: Bearer <INTERNAL_INGEST_SECRET>
```

or:

```http
x-internal-ingest-secret: <INTERNAL_INGEST_SECRET>
```

Available routes:

- `POST /api/internal/archive-ingest`
- `POST /api/internal/archive-records/search`
- `GET /api/internal/archive-records/recent?limit=10`
- `PATCH /api/internal/archive-records/[id]`
- `DELETE /api/internal/archive-records/[id]`
- `POST /api/internal/archive-records/[id]/images`
- `PATCH /api/internal/archive-records/[id]/images/[imageId]`

### Internal Search Example

Search by Korean title:

```bash
curl -X POST https://changselog.vercel.app/api/internal/archive-records/search \
  -H "Authorization: Bearer <INTERNAL_INGEST_SECRET>" \
  -H "Content-Type: application/json" \
  -d '{"query":"스픽 노 모어","category":"content","limit":10}'
```

Search by original title:

```bash
curl -X POST https://changselog.vercel.app/api/internal/archive-records/search \
  -H "Authorization: Bearer <INTERNAL_INGEST_SECRET>" \
  -H "Content-Type: application/json" \
  -d '{"query":"Speak No Evil","category":"content","limit":10}'
```

### Patch Found Record Example

```bash
curl -X PATCH https://changselog.vercel.app/api/internal/archive-records/<record-id> \
  -H "Authorization: Bearer <INTERNAL_INGEST_SECRET>" \
  -H "Content-Type: application/json" \
  -d '{"title":"영화 기록: 스픽 노 이블","content":{"originalTitle":"Speak No Evil"}}'
```

### Patch Image Metadata Example

This updates representative image without changing gallery order:

```bash
curl -X PATCH https://changselog.vercel.app/api/internal/archive-records/<record-id>/images/<image-id> \
  -H "Authorization: Bearer <INTERNAL_INGEST_SECRET>" \
  -H "Content-Type: application/json" \
  -d '{"caption":"자전거 두 대 있는 사진","is_primary":true}'
```

Expected response:

```json
{
  "ok": true,
  "image": {
    "id": "image-id",
    "recordId": "record-id",
    "caption": "자전거 두 대 있는 사진",
    "altText": "",
    "sortOrder": 2,
    "isPrimary": true
  }
}
```

## Local Development

```bash
npm install
npm run dev
```

If PowerShell blocks `npm` scripts:

```powershell
cmd /c npm install
cmd /c npm run dev
```

## Verification

```bash
npm run lint
npm run build
```

## Docs

- [Information Architecture](C:/Users/scw99/Documents/development/changselog/docs/information-architecture.md)
- [Database Schema](C:/Users/scw99/Documents/development/changselog/docs/database-schema.md)
- [Internal Ingestion Spec](C:/Users/scw99/Documents/development/changselog/docs/internal-ingestion-spec.md)
- [Folder Structure](C:/Users/scw99/Documents/development/changselog/docs/folder-structure.md)
