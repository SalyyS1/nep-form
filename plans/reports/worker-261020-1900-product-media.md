# Product media delivery

Status: DONE

Implemented admin multi-file image upload, HTTPS image links, bounded Pinterest import, previews, primary-image selection, reordering and removal. Existing product images remain in editor state. Save waits for uploads; image controls lock during save. Failed uploads retain successfully uploaded files and show errors.

Persistence uses existing store kind `media`, with normalized WebP bytes stored as base64. Public `GET /api/media/:id` returns immutable WebP bytes. Admin `POST /api/admin/media` accepts exactly one of `{ dataUrl }` or `{ url }`. Product validation accepts existing `/images/` assets, managed media URLs and direct HTTPS URLs; retained legacy HTTP URLs remain editable. Managed media IDs must exist. Uploaded photos are public/shared among administrators; creator recorded in audit. Removing a photo from a product removes its reference, not the stored media record.

Limits: 15 images/product; 4,000,000 bytes/file; 6,000,000-byte JSON request cap; 16 million input pixels; 6,000 px/edge; output at most 2,400 px/edge. Static PNG/JPEG/WebP/GIF/AVIF only; full Sharp decoding, no SVG or animated images. Metadata stripped by normalization.

Pinterest import accepts `pinterest.com`, `www.pinterest.com`, `pin.it` and `i.pinimg.com`. Fetches use HTTPS, allowlisted redirects, validated public IPv4 DNS answers pinned to the TLS socket, four redirects, ten-second overall deadline, 512 KB page and 4 MB image limits. Metadata must identify an `i.pinimg.com` image. Pinterest pages blocked by the upstream site or without metadata show a fallback instruction to upload a file/direct image URL. Arbitrary webpages are not imported. Other HTTPS image links are stored directly without backend fetching.

Controller integrations verified in current workspace: `mediaRoute` and `MEDIA_BODY_LIMIT` in `server/index.mjs`; `validateProductMedia` after product validation in `server/admin.mjs`.

Validation: `node --test tests/server/product-media.test.mjs tests/server/admin-products.test.mjs` — 9/9 pass. Covers authorization, malformed/base64/oversize/pixel/truncated-image rejection, SQLite persistence/reopen/public WebP, missing managed IDs, unsafe URL/DNS and redirects, socket DNS pinning, response caps/type/timeouts, actual HTTP upload over 1 MB and rejection over 6 MB. `npx tsc -b --pretty false` and scoped ESLint passed; direct TypeScript rerun after final UI save lock passed. No production/database access. Temporary test servers stopped; two earlier failed teardown processes explicitly cleaned up after Windows refused graceful termination.

Unresolved questions: none.
