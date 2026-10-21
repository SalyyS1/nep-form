# Custom Studio backend

Status: DONE

Implemented immutable owner-scoped design records, private safe SVG previews/artwork, PNG/JPEG/WebP signature and decoded 2 MB budget validation, finite bounded geometry and 20 layers/face. Blank designs save; adding to cart requires visible artwork. Added versioned admin pricing with conflicts/audit. Bootstrap reprices custom cart lines from stored design/current base/current pricing; checkout verifies design-aware quote, snapshots price and design, checks aggregate variant stock, retains atomic idempotency/cancellation.

Added custom-classic/custom-oversize demo bases and SVG images; original 24 catalog products preserved. Existing database catalog migration seeds only missing custom bases and does not overwrite admin changes. Product editor preserves/editable isCustomBase.

Validation: npm test, 14/14 pass. Four custom integration tests cover ownership/persistence/escaping, raster budget and safe inputs, price changes/stale quotes/snapshots/idempotency, multiple designs sharing stock and cancellation. Applied ak-backend-development and ak-code-review for implementation/self-review. No live database or server started/modified by this worker.

Unresolved questions: none.

Integration follow-up: design records snapshot colorHex; private previews keep the original shirt color after palette edits/deletion and restart. Legacy records fall back to current palette. Focused custom tests 4/4 pass. Hidden=false remains the consistent artwork/pricing visibility rule, including opacity=0.

Review fixes: raster validation now fully decodes with sharp before persistence, enforcing 16 million pixels/image, 8192 px/axis, one page and 2 MB aggregate encoded sources. Decode occurs sequentially outside synchronous SQLite transactions; sale/variant state rechecked inside commit. All API routes are awaited. Valid PNG/JPEG/WebP, malformed JPEG/WebP, extreme dimensions and concurrent cart additions covered. Design list projects only lightweight metadata in SQLite with offset/limit pagination (default 12, max 50), hasMore/nextOffset; full artwork retrieved only by ID. SVG CSP permits bundled data fonts. Latest npm test: 16/16 pass.
