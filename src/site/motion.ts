import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import Lenis from 'lenis';
import { reducedMotion } from '../ink/quality.ts';

gsap.registerPlugin(ScrollTrigger, SplitText);
gsap.defaults({ ease: 'expo.out', duration: 1 });

export { gsap, ScrollTrigger, SplitText };

/** Where the page is, and its speed in viewport heights per second, smoothed. Drives everything that hangs or floats. */
export const scroll = { y: 0, velocity: 0 };

let lenis: Lenis | null = null;

export function startScroll(): () => void {
  const still = reducedMotion();
  let last = window.scrollY;
  const tick = (time: number, deltaMs: number) => {
    lenis?.raf(time * 1000);
    const dt = Math.max(0.008, deltaMs / 1000);
    scroll.y = window.scrollY;
    const raw = (scroll.y - last) / window.innerHeight / dt;
    last = scroll.y;
    const blend = 1 - Math.exp(-dt * 9);
    scroll.velocity += (Math.max(-6, Math.min(6, raw)) - scroll.velocity) * blend;
  };
  if (!still) {
    lenis = new Lenis({ lerp: 0.11, wheelMultiplier: 1, anchors: { offset: 0, duration: 1.6 } });
    lenis.on('scroll', ScrollTrigger.update);
  }
  gsap.ticker.add(tick);
  gsap.ticker.lagSmoothing(0);
  return () => {
    gsap.ticker.remove(tick);
    lenis?.destroy();
    lenis = null;
  };
}

export function scrollTo(target: string | number, options: { duration?: number } = {}) {
  // A section opens with a seam that still shows the colour of the one above: land past it.
  const section = typeof target === 'string' ? document.querySelector(target) : null;
  const seam = section?.querySelector<HTMLElement>(':scope > .comb-edge.is-flow')?.offsetHeight ?? 0;
  const top = section ? section.getBoundingClientRect().top + window.scrollY + seam * 0.9 : Number(target);
  if (lenis) lenis.scrollTo(top, { duration: options.duration ?? 1.8, easing: (t) => 1 - Math.pow(1 - t, 4) });
  else window.scrollTo(0, top);
}

/**
 * Letters rise out of their line when the headline scrolls into view. The markup goes back to
 * plain text afterwards, so it wraps normally on resize.
 */
export function revealTitle(target: Element | null, trigger: Element | null, start = 'top 82%') {
  if (!target || !trigger || reducedMotion()) return;
  const split = new SplitText(target, { type: 'lines,chars', linesClass: 'mask-line', mask: 'lines' });
  gsap.from(split.chars, {
    yPercent: 118,
    rotate: 6,
    transformOrigin: '0% 100%',
    stagger: 0.018,
    duration: 1.1,
    scrollTrigger: { trigger, start, once: true },
    onComplete: () => split.revert(),
  });
}

/** Supporting copy fades up behind the headline. */
export function revealCopy(targets: gsap.TweenTarget, trigger: Element | null, start = 'top 78%', delay = 0.2) {
  if (!trigger || reducedMotion()) return;
  gsap.from(targets, { y: 28, opacity: 0, stagger: 0.1, duration: 1, delay, clearProps: 'transform,opacity', scrollTrigger: { trigger, start, once: true } });
}

export function holdScroll(hold: boolean) {
  if (!lenis) return;
  if (hold) lenis.stop();
  else lenis.start();
}
