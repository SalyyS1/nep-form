# Shared Studio contract

Project root C:/Users/Salyyy/Documents/Codex/2026-10-19/t. All APIs /api; shared native ESM at shared/custom-core.mjs with declarations. Main owns shared module, workers may import and report needed adjustments. See shared/custom-types.ts for exact types.

DesignProject: version:1, name, productId, color (color name), size, faces: {front:DesignFace,back:DesignFace}; face {area:'small'|'medium'|'large', layers:DesignLayer[]}. Layer {id,kind:'text'|'shape'|'image',x,y,width,height,rotation,fill,opacity,text?,fontFamily?,fontWeight?,shape?,src?,hidden?,locked?}. Coordinates 300x360. Fonts Be Vietnam Pro, serif, monospace. Shapes star,heart,flower,bolt,smile,circle. Raster PNG/JPEG/WebP data URLs only; no remote URLs/SVG uploads. Max 20 layers per face, total decoded images 2MB. Hidden layers do not incur cost.

CustomPricing {version,text,shape,image,areas:{small,medium,large},extraLayer}. All VND nonnegative integers. Per visible face: MAX content type fee + area fee + extraLayer * (visible layer count-1). No layers = no printing charge. Sum both faces + base product price. Defaults text35000 shape55000 image65000, areas0/25000/45000, extraLayer8000. calculateCustomPrice(project,basePrice,pricing) returns {basePrice,surcharge,unitPrice,lines:{face,label,amount}[]}. DEFAULT_PRICING, SHAPES, renderShirtSvg(project,colorHex,face='front'), renderArtworkSvg(project,face), svgDataUrl(svg) exported by shared module. Safe SVG generation escapes all input.

Products: seed two isCustomBase:true demo blanks (custom-classic, custom-oversize); keep all existing24. Bootstrap products contains all. Home/catalog filter !isCustomBase. Bootstrap customPricing supplied.

GET /api/custom/pricing public => {pricing}.
GET /api/custom/designs?offset=0&limit=12 auth => {designs:DesignListRecord[],hasMore:boolean,nextOffset:number|null}. List metadata project has name/productId/color/size only; no faces or image payloads. Full project fetched by ID below. This endpoint is new in this local revision; all consumers use this final contract before delivery. Limit maximum50; offset pagination newest first.
GET /api/custom/designs/:id auth owner or admin => {design:DesignRecord}; full project. DesignRecord snapshots colorHex for stable previews after product edits.
POST /api/custom/designs {project} auth => {design:DesignRecord}; creates immutable record every time. Record {id,userId,project,createdAt}.
GET /api/custom/designs/:id/preview/front or /back => SVG shirt. /artwork/front or /back => flat SVG artwork, download. Owner/admin authenticated.
POST /api/custom/cart {project,quantity} auth => {ok:true}; saves immutable design then new cart line with custom summary. Always new line, no merge by variant.
GET/PATCH /api/admin/custom-pricing => {pricing}; PATCH {pricing,expectedVersion} admin with version conflict.

CartItem.custom optional CustomSummary {designId,name,unitPrice,surcharge,lines:{face,label,amount}[],faces:('front'|'back')[]}. Cart serialization recalculates current price using saved project/current pricing/base product. OrderItem.custom snapshot same summary (immutable values at order). Preview URL /api/custom/designs/{designId}/preview/{front|back}; artwork analogous. Order quote items include optional designId for custom lines on client and server. Server disallows missing custom metadata bypass via normal cart route for custom blanks. Aggregate stock for same variant across custom lines before deduction. Preserve idempotency and cancellation stock restoration.

Studio route /thiet-ke (outside store layout); query ?ban-thiet-ke=id loads saved project. Anonymous design allowed, draft localStorage; save/add sends user to /dang-nhap?tiep=/thiet-ke after persisting draft. Checkout account required as before.
Account /tai-khoan/thiet-ke. Admin /quan-tri/gia-custom. Demo price label near editor total and admin. Render front/back preview on cart/order/admin, show cost breakdown, admin download artwork. Do not trust client price.
