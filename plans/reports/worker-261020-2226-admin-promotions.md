# Admin SALE and coupons

Status: DONE

Implemented `/quan-tri/khuyen-mai` in desktop/mobile admin navigation. Search and status filters cover active, scheduled, expired, exhausted and disabled coupons. List shows amount, minimum order, cap, Vietnam time window and total/per-customer usage. Responsive cards reuse admin styling.

Create/edit drawer supports percentage or fixed amount, minimum subtotal, optional percentage cap, optional start/end, optional total/per-customer limits, enabled checkbox. Describes one code/order, stacking after SALE, excluding shipping, cancellation restoring usage. Uses API errors/busy states. A version conflict preserves typed values and blocks saving until reopening refreshed data. Create duplicate-code conflict permits code correction.

Product editor preserves images/variants and adds optional SALE price and start/end. Validates positive whole VND below base price and ordered dates. Clearing SALE sends `salePrice:null,saleStartsAt:null,saleEndsAt:null`.

`vietnam-date-time.ts` explicitly converts wall-clock input with UTC+7 and displays Asia/Ho_Chi_Minh; independent of browser timezone.

## API contracts

- GET `/api/admin/promotions` => `{promotions:Promotion[]}`.
- POST `/api/admin/promotions` => fields `{code,label,type,value,minSubtotal,maxDiscount,startsAt,endsAt,usageLimit,perUserLimit,isActive}`. Code trimmed/uppercase. Empty optional caps/limits/dates => null. Fixed-amount coupons send maxDiscount:null. No examples auto-created.
- PATCH `/api/admin/promotions/:id` => same fields plus `expectedVersion` from loaded promotion. Response body unused; list refreshed after save.
- Product POST/PATCH now includes `salePrice,saleStartsAt,saleEndsAt`; existing expectedVersion behavior preserved.
- No delete request; checkbox saves isActive:false.

## Ownership and validation

Changed admin-product-editor.tsx, admin-page.tsx; added admin-promotions.tsx, promotion-editor.tsx, admin-promotions.css, vietnam-date-time.ts. No shared store, types, server, existing admin.css or production data edited.

Passed `npx tsc --noEmit` and scoped ESLint for five TS/TSX files. Node assertions verified date round-trip, optional null, invalid day rejection and displayed Vietnam time under UTC, America/New_York and Asia/Tokyo. Runtime browser checks left to controller's integrated test pass. Root README absent as supplied by controller; read development rules and existing design/API docs, applied frontend development skill.

Unresolved questions: none.
