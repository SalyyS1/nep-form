# Homepage typography and paired mockup refinement

Status: DONE_WITH_CONCERNS — implementation frozen; browser/build verification owned by controller and browser peer.

## Delivered

- Ribbon reads all 15 entries from `shared/builtin-font-catalog.mjs`; every specimen uses the actual corresponding local font, with Vietnamese sample and visible family name.
- One CSS marquee moves right to left continuously over two equal groups; duplicate group hidden from assistive technology. GSAP no longer controls ribbon transforms.
- Pause control plus automatic pause on hover, keyboard focus, document hidden, below 12% visibility, or reduced motion. Reduced motion exposes the full first group through native horizontal scrolling.
- Explicit resume clears the current hover/focus pause flags once, so activating Play starts immediately while its control remains under the pointer or keyboard focus. Subsequent hover/focus entry pauses normally; hidden/offscreen/reduced-motion guards remain active.
- Replaced the pinned one-garment sequence with two simultaneously visible garments: front medium print / back large print. The same genuine template on each side supports direct print-size comparison; copy states this. Studio still supports editing each face independently.
- Six editable catalog templates shown: Tuyên ngôn riêng, Chậm một nhịp, Sau giờ tan ca, Hôm nay làm mèo, Hoa dại vẫn nở, Cuối tuần đi trốn.
- Autoplay every 6 seconds; visible named selectors, previous/next, pause/resume. Manual selection pauses autoplay; manual controls work with reduced motion.
- Existing `renderShirtSvg`, catalog layers and `useBuiltinDesignFonts` provide actual garment assets, vector art and embedded font CSS. First UI-font template remains visible during font loading. Catalog layer IDs unique per face and layer.
- Preserved hero tilt/parallax, color and side controls, process/editorial motion, route cleanup. Removed pinned story timeline and eased hero fragments with power3 instead of elastic.
- Homepage copy now concrete: “Tự thiết kế áo. In theo ý bạn.” / “Xem mẫu in ở cả hai mặt áo.” Generic Studio CTA does not imply a selected template was automatically applied.

## Files

- `src/features/storefront/home-page.tsx`
- `src/features/storefront/home-designs.ts`
- `src/features/storefront/home-type-ribbon.tsx`
- `src/features/storefront/home-design-showcase.tsx` (new)
- `src/features/storefront/use-home-playback.ts` (new)
- `src/features/storefront/use-home-motion.ts`
- `src/features/storefront/use-expressive-home-motion.ts`
- `src/styles/expressive-home.css`
- `src/styles/home-design-showcase.css` (new)

## Verification and cost

- Read actual catalog/runtime/renderer/Studio contract and frontend skill + motion craft; no new dependencies, generated images, saved drafts or environment changes.
- Measured six cached front/back SVG URI pairs through the actual renderer after registering all 9 needed embedded fonts: 3,789,684 characters total; pairs range 447,085–708,599 characters. Only two active garment images in DOM. Initial fallback pair adds about 447 KB of cached strings. Not a network payload count; bundler font assets remain separately cached.
- No test or server ownership taken from browser peer. Controller owns build/lint; browser peer owns desktop/mobile/reduced-motion/autoplay/route checks and rendered critique.
- No background processes started.

## Browser selectors

- `.home-type-ribbon[data-playing]`, `.home-type-track`, `.home-type-group`, `.home-type-specimen[data-font]`, `.home-type-word`, `.home-type-font-name`.
- Ribbon accessible buttons: “Dừng dải phông chữ” / “Chạy dải phông chữ”.
- `.home-design-showcase[data-template][data-playing]`, `.home-design-front img`, `.home-design-back img`, `.home-design-selectors button[aria-pressed]`.
- Garment controls: “Mẫu áo trước”, “Mẫu áo tiếp theo”, “Dừng đổi mẫu áo” / “Tự động đổi mẫu áo”. Hover/focus intentionally pauses automatic motion; explicit Play resumes immediately even while its button retains hover/focus.

## Concerns

- Visual scores and live behavior remain unverified by this worker until browser peer report. Existing unused `.custom-story-*` rules remain in shared `custom-home.css`; their DOM and JS owners were removed and the rules do not affect new components.
- No current Studio template URL contract; CTA intentionally opens Studio with its existing draft behavior and template library.

Unresolved questions: none.
