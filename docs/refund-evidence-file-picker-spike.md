# Refund Evidence Real File Picker Spike

Date: 2026-07-01
Scope: active React Native app under `frontend/` and refund evidence APIs under `backend/microservices/order-service/`.

## Current State

- `frontend/src/screens/RefundEvidenceScreen.js` uses three hard-coded mock evidence choices for image, video, and PDF-like document metadata.
- Backend upload intent and evidence metadata APIs already exist:
  - `POST /orders/refunds/:id/evidence/upload-intent`
  - `POST /orders/refunds/:id/evidence`
- The local upload intent can validate MIME type and file size and return a mock object contract.
- Real OSS/COS/S3 signing and upload are intentionally not implemented until storage credentials and policy are provided.

## Recommendation

Use a document-picker-first approach, then optionally add a camera/gallery shortcut later.

Recommended library path:

1. `react-native-document-picker` for image, video, and document selection.
2. Keep selected file data normalized in app code as `{ uri, name, type, size, category }`.
3. Reuse the current backend upload intent contract before uploading bytes.
4. Upload bytes directly to the returned signed URL only after object storage signing is implemented.
5. Submit evidence metadata only after upload succeeds.

Why this path:

- It covers images, videos, and documents with one dependency.
- It avoids committing to a camera/gallery-specific UX before storage and compliance policies are final.
- Android permission handling is narrower with the system picker than with direct media-library access.

Alternatives considered:

- `react-native-image-picker`: better for camera/gallery shortcuts, but does not cover PDF/document evidence by itself.
- Custom native module: not justified for the current minimum launch path.
- Expo document picker: only appropriate if the app moves to Expo-managed dependencies, which it currently does not.

## Proposed User Flow

1. Customer opens after-sales evidence screen from a refundable order.
2. Customer enters refund reason and optional evidence description.
3. Customer taps `Add evidence` and chooses a local file through the system picker.
4. The app validates basic client-side constraints before any network request:
   - MIME type is allowed.
   - Size is under backend max file size.
   - File has a name and URI.
5. The app calls upload intent with file name, MIME type, and size.
6. When real storage signing exists, the app uploads the selected file to `uploadUrl` with the expected method and headers.
7. The app submits metadata through `addRefundEvidence`, including public URL, object key, content type, size, and checksum when available.
8. The screen shows pending scan status and tells the customer the evidence is awaiting review.

## Upload State Machine

Use explicit local state instead of a single `submitting` boolean:

- `idle`: no active network work.
- `picking`: system picker is open.
- `creating_refund`: refund request is being created or reused.
- `requesting_upload_intent`: upload contract is being requested.
- `uploading_file`: real object upload is in progress. This remains disabled in mock mode.
- `submitting_metadata`: evidence metadata is being attached to the refund.
- `submitted`: evidence metadata was recorded.
- `failed`: user can retry from the last safe point.

Retry rules:

- If refund creation succeeds but upload intent fails, reuse the existing refund id.
- If upload intent succeeds but real file upload fails, request a new upload intent on retry unless the storage provider confirms the previous signed URL is still usable.
- If file upload succeeds but metadata submit fails, retry metadata submission with the same object key.
- Never show a completed upload until metadata submission succeeds.

## Android Permission Notes

With Android system document picking, the first implementation should avoid broad storage permissions where possible.

Minimum checks before release:

- Verify Android 13+ media permission behavior on Xiaomi/Redmi devices.
- Verify URI access works after picker returns, including `content://` URIs.
- Do not request `MANAGE_EXTERNAL_STORAGE`.
- Keep privacy policy wording aligned with selected evidence file access.
- Confirm whether camera capture is in scope; if yes, add a separate permission review for camera and temporary file storage.

## Backend Contract Expectations

The frontend should not guess storage paths. Backend remains source of truth for:

- Provider name.
- Object key.
- Public URL or CDN URL.
- Signed upload URL.
- HTTP method.
- Required headers.
- Expiration time.
- Accepted MIME types and size limits.

Real upload is blocked until these are implemented for the selected storage provider.

## Implementation Steps When Approved

1. Fix the current `RefundEvidenceScreen.js` text encoding and Chinese copy baseline so future UI work is readable.
2. Add the picker dependency and run native install/sync steps.
3. Add a small `normalizePickedEvidenceFile` helper with unit tests for name, MIME type, size, and category mapping.
4. Replace `SAMPLE_FILES` with picker-driven state while keeping mock upload mode functional.
5. Add client-side validation using the same MIME/size defaults documented in `.env.example`.
6. Add upload state labels and retry actions.
7. Keep the byte upload branch disabled or mock-only until real object storage signing is implemented.
8. Re-run frontend evidence tests, lint, and Android bundle generation.

## User-Provided Inputs Needed For Real Upload

- Object storage provider: OSS, COS, S3, or compatible service.
- Bucket, region, endpoint, access key, and secret key.
- Public CDN/base URL policy.
- Allowed MIME type list and max file size.
- Whether customer camera capture is required for first launch.
- Privacy policy wording for local file access and evidence retention.

## Acceptance Criteria

Before replacing the mock flow, the implementation must prove:

- Existing mock evidence flow still works without storage credentials.
- Real picker returns normalized metadata for image, video, and PDF/document files.
- Oversized and unsupported files are rejected before upload intent requests.
- Upload intent failures do not create duplicate refund requests unnecessarily.
- Metadata submission records backend evidence fields currently shown in merchant/admin refund detail.
- Android bundle generation succeeds.
