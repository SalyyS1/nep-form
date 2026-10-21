Status: DONE_WITH_CONCERNS

Summary: Storefront uses shared active sale pricing for cards, product details, ordinary cart lines/totals, price filters/sorting, and Studio garment pricing. Original prices appear struck only while sale is active; card/detail percentage badges use the same shared helper. Printing surcharge remains separate; home inherits ProductCard.

Changed files:
- src/components/product-price.tsx (new)
- src/styles/product-pricing.css (new)
- src/components/product-card.tsx
- src/features/storefront/product-page.tsx
- src/features/storefront/catalog-page.tsx
- src/features/checkout/cart-page.tsx
- src/features/studio/studio-page.tsx
- src/lib/store-context.tsx

Validation: npm run typecheck passed; targeted ESLint for all seven touched TS/TSX files passed. No Git metadata exists in workspace. Browser verification pending controller runtime coordination; port 5173 was not listening during inspection. No background processes started.

Integration: Checkout/order/admin/server remain controller/other-worker owned. Current custom cart totals use server custom.unitPrice, so bootstrap custom-summary must calculate current garment price plus unchanged printing surcharge. Historical order snapshots stay unchanged. Existing products without sale metadata retain their prices.

Concerns: Time boundaries evaluate on render. Idle pages do not have a sale-boundary timer; controller notified for decision. useCartTotal retains existing memoization on cart/data.

Unresolved questions: None required to integrate.
