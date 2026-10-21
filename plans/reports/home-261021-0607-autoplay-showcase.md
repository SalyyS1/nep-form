# Compact automatic shirt showcase

Status: DONE — source frozen for browser verification.

## Delivered

- Desktop (1024px and above): title, explanation and Studio CTA occupy the left column; both front/back shirts occupy the right column in the same grid row. Garment stage capped at 470px; expected complete section around 650px at 1440px rather than the previous tall selection section.
- Tablet/mobile: title above; two faces remain side by side.
- Automatic loop advances every 3800ms, with simultaneous 650ms opacity crossfade between six stacked scenes. Garments stay in their fixed positions instead of remounting an entering pair.
- Removed the six selection tiles and ordinary previous/next controls. Small noninteractive progress segments, current name/category and pause control remain.
- Reduced motion defaults static through the controller-owned playback hook. Explicit “Bật chuyển động mẫu áo” enables automatic motion; “Mẫu áo tiếp theo” provides manual viewing independently.
- Preserved actual renderer, all six existing templates, embedded font loading and honest Studio CTA. Shared `.home-motion-toggle` styling retained for the font ribbon.

## Owned files

- `src/features/storefront/home-design-showcase.tsx`
- `src/styles/home-design-showcase.css`

## Verification

- Read current implementation, shared playback contract and accepted `plans/261021-0607-autoplay-showcase/plan.md`.
- Scoped ESLint on `home-design-showcase.tsx` passed.
- No background process, deploy, environment edit or shared-file edit. Controller owns global build/lint; browser peer owns layout/motion/regression checks and screenshots.
- Six paired preview strings remain approximately 3.79MB in total. Twelve scene images are now mounted to permit smooth decoded crossfades; inactive scenes use `aria-hidden=true`, opacity zero and no interactive descendants. The loading fallback adds one cached pair of approximately 447KB in strings.
- CSS allows the user-enabled reduced-motion crossfade using a targeted override of the site's global reduced-motion transition reset. System preference still starts static.

## Browser contract

- `.home-design-showcase[data-template][data-playing][data-motion]`.
- `.home-design-heading` and `.home-design-visual` are left/right desktop grid siblings.
- `.home-design-scene[data-scene]`: six persistent scenes; one `.is-active` with `aria-hidden=false`.
- Active images: `.home-design-scene.is-active .home-design-front img` and `.home-design-scene.is-active .home-design-back img`.
- `.home-design-progress`: six noninteractive segments; `.is-current` tracks index.
- Normal pause/resume labels: “Dừng đổi mẫu áo” / “Tự động đổi mẫu áo”. Reduced initial opt-in: “Bật chuyển động mẫu áo”. Reduced manual control: “Mẫu áo tiếp theo”.
- No hover or focus handlers attached by this component. Stationary pointer must not stop autoplay; controller-owned hook supplies visibility/hidden/system preference policy.

Unresolved questions: none.
