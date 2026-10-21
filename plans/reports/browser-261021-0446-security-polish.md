# Browser verification: security and Vietnamese copy

Status: DONE

Environment: Windows PowerShell; Node 24; Python 3.12 with installed Python Playwright; headless Microsoft Edge; Asia/Saigon, 2026-10-21. Work context `C:/Users/Salyyy/Documents/Codex/2026-10-19/t`. Read the `ak-web-testing` skill and final copy report. No frontend/runtime changes by this worker.

## Browser test changes

- `tests/browser/account-polish.spec.py`: verification success heading now exactly `Email đã được xác minh.`; rest of email-token, checkout gate, keyboard, media and support assertions preserved.
- `tests/browser/custom-studio.spec.py`: pricing-save confirmation now matches actual copy `Đã lưu bảng giá. Giỏ hàng dùng giá mới; đơn đã đặt giữ nguyên giá.`; underlying order, design and pricing checks retained.
- `tests/browser/hosted-postgres.spec.py`: login heading `Đăng nhập.`, dashboard `Tổng quan cửa hàng`, server-storage footer `Dữ liệu lưu trên máy chủ`. Studio stage retains actual region `Bản xem trước áo`; `Xem trước hai mặt áo` names the preview dialog, not that region. File handed back frozen to controller before its hosted CSP additions/run.
- `tests/browser/support-popup.spec.py`: hidden-tab assertion now checks all `/api/support` requests (messages, read and badge) with diagnostic request details. Unrelated bootstrap reconciliation is outside this conversation-polling assertion.

## Executed local journeys

All commands below pass against temporary fixture databases; configured email is captured locally without sending provider requests.

| Command | Verified behavior |
|---|---|
| `python tests/browser/account-polish.spec.py` | Auth keyboard focus, registration confirmation, queued verification and token removal, verified checkout gate, support history, admin upload/reorder/save, mail status |
| `python tests/browser/support-popup.spec.py` | Guest return path, native dialog focus/Escape, draft preservation, real send/history, single polling owner, hidden-tab support pause, 320/375/768 sizing |
| `python tests/browser/voucher-picker.spec.py` | Explicit admin visibility/default privacy, eligibility conditions and real savings, manual hidden code, no accidental form submit, stale offer/response handling, same-code recovery after quote failure, modal/mobile, real COD order snapshot |
| `python tests/browser/custom-studio.spec.py` | Text/drag/undo/redo/rotation/layer controls/upload/two faces, SVG download, login draft/save/reopen, custom cart, COD checkout, admin pricing and private artwork, 375/768/1440 sizing |

Controller separately reported hosted PostgreSQL browser PASS including production CSP/no-inline and local fonts. This worker did not run that production journey or the full server suite.

## Initial failures and resolution

- Account journey initially failed on old heading `Đúng email, đúng bạn.`. Actual browser showed `Email đã được xác minh.`; updated only exact heading selector and reran successfully.
- Support initially failed its blanket assertion that no network requests occur while hidden. Diagnostic rerun identified only `GET /api/bootstrap`, with no support request. Source separately gates support polling on `document.hidden`. Scoped assertion to support network behavior, retaining checks for reads and messages; full journey passed.
- Controller initially identified hosted Studio region mismatch and changed storage copy; corrected against `studio-page.tsx`/`admin-page.tsx` before final handoff. No product behavior modified to satisfy tests.
- Normal `taskkill` could not stop the console-less Vite Node process on Windows; OS returned that force was required. Forced termination then succeeded for the exact owned PID only.

## Process and data cleanup

- Checked ports before starting. Owned UI command: `node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 5173 --strictPort`, PID 24036, exec session 43876, work context above. Stopped after tests; process session completed.
- API fixtures used ports 3012 (account), 3011 (support), 3016 (voucher) and 3003 (Studio). Existing Python subprocess handles track each fixture PID and terminate in `finally`; no fixture shared a port with another process. Temporary SQLite/mail capture directories cleaned by fixtures.
- Final listener check for 5173/3012/3011/3016/3003 returned no listeners. No private environment file read by worker; no live shop DB, mail service or deployment mutation.
- Existing Studio/voucher scripts wrote their normal screenshots in `outputs/` and `work/voucher-picker-browser/`. These are test artifacts, not product changes.

Unresolved questions: none.
