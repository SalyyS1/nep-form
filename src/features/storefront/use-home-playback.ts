import { useEffect, useRef, useState } from 'react';

/** Viewing a showcase must keep it playing, including beneath a stationary pointer. */
export function useHomePlayback() {
  const ref = useRef<HTMLElement>(null);
  const [paused, setPaused] = useState(false);
  const [visible, setVisible] = useState(false);
  const [hidden, setHidden] = useState(() => document.hidden);
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting && entry.intersectionRatio >= .02), { threshold: [0, .02] });
    observer.observe(node);
    const visibility = () => setHidden(document.hidden);
    document.addEventListener('visibilitychange', visibility);
    return () => { observer.disconnect(); document.removeEventListener('visibilitychange', visibility); };
  }, []);
  return {
    ref, paused, setPaused,
    playing: !paused && visible && !hidden,
  };
}
