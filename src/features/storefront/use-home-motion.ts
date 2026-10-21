import { useEffect, type RefObject } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { animateExpressiveHome } from './use-expressive-home-motion';

gsap.registerPlugin(ScrollTrigger);
export function useHomeMotion(root: RefObject<HTMLDivElement | null>) {
  useEffect(() => {
    const media = gsap.matchMedia();
    media.add('(prefers-reduced-motion: no-preference)', () => {
      const scope = root.current; if (!scope) return;
      const select = gsap.utils.selector(scope);
      const cleanupExpressive = animateExpressiveHome(scope, window.matchMedia('(hover: hover) and (pointer: fine)').matches);
      gsap.timeline({ defaults: { ease: 'power3.out', duration: .85 } })
        .from(select('.custom-hero-copy > *'), { y: 22, opacity: .6, stagger: .055, clearProps: 'transform,opacity' })
        .from(select('.custom-hero-visual'), { y: 44, rotation: 3, opacity: .55, clearProps: 'transform,opacity' }, .12);
      gsap.to(select('.custom-hero-float'), { y: -95, rotation: 7, scale: 1.12, ease: 'none', scrollTrigger: { trigger: select('.custom-hero')[0], start: 'top top', end: 'bottom top', scrub: .65, invalidateOnRefresh: true } });
      gsap.utils.toArray<HTMLElement>(select('.custom-process-row')).forEach(row => {
        gsap.from(row.querySelector('.custom-process-line'), { scaleX: 0, transformOrigin: 'left', duration: .85, ease: 'power3.out', scrollTrigger: { trigger: row, start: 'top 85%', once: true } });
        gsap.from(row.querySelector('h3'), { y: 20, opacity: .55, duration: .75, clearProps: 'transform,opacity', scrollTrigger: { trigger: row, start: 'top 88%', once: true } });
      });
      gsap.fromTo(select('.custom-editorial-photo img'), { scale: 1.18, yPercent: -6 }, { scale: 1, yPercent: 6, ease: 'none', scrollTrigger: { trigger: select('.custom-editorial')[0], start: 'top bottom', end: 'bottom top', scrub: .75, invalidateOnRefresh: true } });
      gsap.from(select('.custom-readywear .product-card'), { y: 70, rotation: 1.5, opacity: .7, stagger: .09, duration: .9, ease: 'power3.out', clearProps: 'transform,opacity', scrollTrigger: { trigger: select('.custom-readywear .product-grid')[0], start: 'top 90%', once: true } });
      let live = true;
      void document.fonts.ready.then(() => { if (live) ScrollTrigger.refresh(); });
      return () => { live = false; cleanupExpressive(); };
    }, root);
    return () => media.revert();
  }, [root]);
}
