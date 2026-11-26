import { useCallback, useEffect, useState } from 'react';
import { SoftHint } from '../ink/SoftHint.tsx';
import { ScrollTrigger, startScroll } from './motion.ts';
import { Footer } from './sections/Footer.tsx';
import { FullSet } from './sections/FullSet.tsx';
import { Guard } from './sections/Guard.tsx';
import { Hands } from './sections/Hands.tsx';
import { Hero } from './sections/Hero.tsx';
import { Manifesto } from './sections/Manifesto.tsx';
import { Kalem } from './sections/Kalem.tsx';
import { Platforms } from './sections/Platforms.tsx';
import { Proof } from './sections/Proof.tsx';
import { Rubric } from './sections/Rubric.tsx';
import { Nav } from './ui/Nav.tsx';

export function Site() {
  const [poured, setPoured] = useState(false);
  const onPour = useCallback(() => setPoured(true), []);

  useEffect(() => {
    const stop = startScroll();
    void document.fonts.ready.then(() => ScrollTrigger.refresh());
    return stop;
  }, []);

  return (
    <>
      <Nav show={poured} />
      <main>
        <Hero onPour={onPour} />
        <Manifesto />
        <FullSet />
        <Hands />
        <Proof />
        <Rubric />
        <Guard />
        <Kalem />
        <Platforms />
      </main>
      <Footer />
      <SoftHint />
    </>
  );
}
