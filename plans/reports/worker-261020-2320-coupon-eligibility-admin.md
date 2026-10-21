# Coupon eligibility admin

Status: DONE

Changes:
- `src/features/admin/promotion-editor.tsx`: first-order checkbox, explanatory pending/unpaid/cancelled policy, minimum total quantity (1–10,000), legacy false/1 defaults; both fields included in save payload.
- Quota presets map existing limits: global once = usageLimit 1/perUserLimit null; customer once = usageLimit null/perUserLimit 1. Opposing limits cleared; custom preserves both; manual edits infer preset.
- Existing schedule, minimum spend, cancellation returns, edit values and concurrency protection retained.
- `src/features/admin/admin-promotions.tsx`: conditional first-order and minimum quantity badges.
- `src/features/admin/admin-promotions.css`: compact wrapping restriction badges and condition help styling; existing mobile form grid retained.

Verification:
- `npx eslint src/features/admin/promotion-editor.tsx src/features/admin/admin-promotions.tsx`: pass, exit 0.
- `npm run typecheck`: pass, exit 0.
- Reviewed saved fields/defaults and preset transitions in source. Browser peer received exact labels/options for integrated journey verification; no server started, no shop promotions created.
- Git diff unavailable because workspace has no Git metadata.

Unresolved questions: none.
