import { gsap } from 'gsap';
import type { ScrollTrigger } from 'gsap/ScrollTrigger';

export function animateExpressiveHome(scope: HTMLElement, finePointer: boolean) {
  const select = gsap.utils.selector(scope);
  const hero = select('.custom-hero-visual')[0] as HTMLElement;
  const tilt = select('.custom-hero-tilt')[0];
  const halo = select('.home-fabric-halo')[0];
  const toX = gsap.quickTo(tilt, 'rotationY', { duration: 1.2, ease: 'power3.out' });
  const toY = gsap.quickTo(tilt, 'rotationX', { duration: 1.2, ease: 'power3.out' });
  function move(event: PointerEvent) {
    const box = hero.getBoundingClientRect();
    toX(((event.clientX - box.left) / box.width - .5) * 18);
    toY(-((event.clientY - box.top) / box.height - .5) * 12);
  }
  function reset() { toX(0); toY(0); }
  if (finePointer) { hero.addEventListener('pointermove', move); hero.addEventListener('pointerleave', reset); }
  gsap.from(select('.home-print-fragment'), { y: 65, rotation: 0, scale: .72, opacity: 0, stagger: .14, duration: 1.3, delay: .45, ease: 'power3.out', clearProps: 'opacity' });
  gsap.to(halo, { yPercent: 15, rotation: 24, scale: 1.25, ease: 'none', scrollTrigger: { trigger: select('.custom-hero')[0], start: 'top top', end: 'bottom top', scrub: 1 } });
  gsap.to(select('.home-print-fragment'), { y: -110, rotation: index => index % 2 ? 13 : -16, stagger: .08, ease: 'none', scrollTrigger: { trigger: select('.custom-hero')[0], start: 'top top', end: 'bottom top', scrub: 1 } });
  gsap.utils.toArray<HTMLElement>(select('.custom-process-row')).forEach(row => {
    gsap.fromTo(row, { x: 35, opacity: .35 }, { x: 0, opacity: 1, duration: .75, ease: 'power3.out', scrollTrigger: { trigger: row, start: 'top 88%', toggleActions: 'play none none reverse' } });
  });
  gsap.fromTo(select('.custom-editorial-copy > *'), { y: 45, opacity: .3 }, { y: 0, opacity: 1, stagger: .1, duration: .95, ease: 'power3.out', scrollTrigger: { trigger: select('.custom-editorial-copy')[0], start: 'top 80%', toggleActions: 'play none none reverse' } });
  const progress = select('.home-scroll-meter span')[0];
  gsap.to(progress, { scaleX: 1, ease: 'none', scrollTrigger: { trigger: scope, start: 'top top', end: 'bottom bottom', scrub: .25, onUpdate: (self: ScrollTrigger) => { scope.dataset.pageProgress = self.progress.toFixed(3); } } });
  return () => { hero.removeEventListener('pointermove', move); hero.removeEventListener('pointerleave', reset); };
}
