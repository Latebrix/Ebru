import { useGSAP } from '@gsap/react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Flower } from '../brand/Mark.tsx';
import { LINKS } from '../links.ts';
import { reducedMotion } from '../ink/quality.ts';
import { gsap, revealCopy, revealTitle } from '../site/motion.ts';
import { Devices } from '../site/sections/Platforms.tsx';
import { LinkButton } from '../site/ui/Button.tsx';
import { detect, LINKS_BY_PLATFORM, ORDER, type Platform } from './platforms.ts';

type Lang = 'en' | 'ar';

const WORDS = {
  en: {
    switch: 'العربية',
    home: 'ebru, the website',
    eyebrow: 'Get ebru',
    title: 'ebru, on every screen.',
    lead: 'The same board, the same team and the same Kalem on your phone, your laptop and the web. Sign in with the email your team invited, and every drop lands in the same picture.',
    mine: 'This device',
    soon: 'Coming soon',
    invite: 'ebru opens by invitation for now.',
    ask: 'No invitation yet? Ask to try ebru',
    names: { android: 'Android', ios: 'iPhone & iPad', mac: 'Mac', windows: 'Windows', web: 'Web' },
    ready: {
      android: 'Join the test on Google Play, then install ebru from Play. Updates arrive on their own.',
      ios: 'From the App Store.',
      mac: 'Signed and notarized, straight from us.',
      windows: 'Signed, straight from us.',
      web: 'Works today in any modern browser. Nothing to install.',
    },
    waiting: {
      android: 'The Google Play test opens soon. Until then, ebru works in your phone’s browser.',
      ios: 'On its way to the App Store. Until then, open ebru in Safari and add it to your Home Screen.',
      mac: 'On its way. Until then, ebru works in your browser.',
      windows: 'On its way. Until then, ebru works in your browser.',
      web: '',
    },
    go: { android: 'Join the test', ios: 'Get it on the App Store', mac: 'Download for Mac', windows: 'Download for Windows', web: 'Open ebru' },
    browser: 'Open in the browser',
  },
  ar: {
    switch: 'English',
    home: 'موقع ebru',
    eyebrow: 'احصل على ebru',
    title: 'ebru على كل شاشة.',
    lead: 'اللوحة نفسها، والفريق نفسه، وقلم نفسه على هاتفك وحاسوبك وعلى الويب. ادخل بالبريد الذي دعاك به فريقك، فتقع كل قطرة في الصورة نفسها.',
    mine: 'هذا الجهاز',
    soon: 'قريبًا',
    invite: 'الدخول إلى ebru بالدعوة حاليًا.',
    ask: 'لا توجد دعوة بعد؟ اطلب الدخول',
    names: { android: 'أندرويد', ios: 'آيفون وآيباد', mac: 'ماك', windows: 'ويندوز', web: 'الويب' },
    ready: {
      android: 'انضم إلى الاختبار على Google Play، ثم ثبّت ebru من Play. تصلك التحديثات تلقائيًا.',
      ios: 'من App Store.',
      mac: 'موقّع ومعتمد من Apple، منّا مباشرة.',
      windows: 'موقّع، منّا مباشرة.',
      web: 'يعمل اليوم في أي متصفح حديث، دون تثبيت شيء.',
    },
    waiting: {
      android: 'يفتح اختبار Google Play قريبًا. حتى ذلك الحين، يعمل ebru في متصفح هاتفك.',
      ios: 'في طريقه إلى App Store. حتى ذلك الحين، افتح ebru في Safari وأضفه إلى الشاشة الرئيسية.',
      mac: 'في الطريق. حتى ذلك الحين، يعمل ebru في متصفحك.',
      windows: 'في الطريق. حتى ذلك الحين، يعمل ebru في متصفحك.',
      web: '',
    },
    go: { android: 'انضم إلى الاختبار', ios: 'احصل عليه من App Store', mac: 'نزّل لماك', windows: 'نزّل لويندوز', web: 'افتح ebru' },
    browser: 'افتحه في المتصفح',
  },
} as const;

function startingLang(): Lang {
  try {
    const saved = localStorage.getItem('ebru.lang');
    if (saved === 'en' || saved === 'ar') return saved;
  } catch {
    //private mode: the browser's language decides
  }
  return navigator.language.toLowerCase().startsWith('ar') ? 'ar' : 'en';
}

/**
 * Getting ebru, in the website's own language: the blue water, the devices over one shared picture, and every platform
 * as a line of large type. The visitor's own device comes first; a platform without its store link yet says so plainly
 * and offers the web app, which works today. No link is ever invented.
 */
export function Download() {
  const root = useRef<HTMLElement>(null);
  const [lang, setLang] = useState<Lang>(startingLang);
  const w = WORDS[lang];
  const mine = useMemo(detect, []);
  const order = useMemo(() => [mine, ...ORDER.filter((p) => p !== mine)], [mine]);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    try {
      localStorage.setItem('ebru.lang', lang);
    } catch {
      //the choice still holds until the page closes
    }
  }, [lang]);

  useGSAP(
    () => {
      if (reducedMotion()) return;
      const q = gsap.utils.selector(root);
      revealTitle(q('.platforms-title')[0], q('.platforms-head')[0]);
      revealCopy(q('.platforms-head .lead, .dl-eyebrow'), q('.platforms-head')[0]);
      gsap.from(q('.dl-row'), { y: 40, opacity: 0, stagger: 0.08, duration: 0.9, ease: 'expo.out', scrollTrigger: { trigger: q('.dl-rows')[0], start: 'top 88%' } });
    },
    { scope: root, dependencies: [lang], revertOnUpdate: true },
  );

  const row = (p: Platform) => {
    const href = LINKS_BY_PLATFORM[p];
    return (
      <li key={p} className="dl-row" data-mine={p === mine || undefined} data-soon={!href || undefined}>
        <h2 className="display dl-name">
          {w.names[p]}
          {p === mine && <span className="dl-mine">{w.mine}</span>}
        </h2>
        <div className="dl-act">
          {!href && <span className="dl-soon">{w.soon}</span>}
          <p>{href ? w.ready[p] : w.waiting[p]}</p>
          {href ? (
            <LinkButton href={href} tone={p === mine ? 'solid' : 'line'} rel={p === 'web' ? undefined : 'noopener'}>
              {w.go[p]}
            </LinkButton>
          ) : (
            <LinkButton href={LINKS.app} tone={p === mine ? 'solid' : 'line'}>
              {w.browser}
            </LinkButton>
          )}
        </div>
      </li>
    );
  };

  return (
    <main className="platforms dl" ref={root} data-nav="dark">
      <header className="dl-top">
        <a className="dl-mark" href={LINKS.site} aria-label={w.home}>
          <Flower />
        </a>
        <button type="button" className="dl-lang" onClick={() => setLang(lang === 'en' ? 'ar' : 'en')} lang={lang === 'en' ? 'ar' : 'en'}>
          {w.switch}
        </button>
      </header>
      <div className="platforms-in">
        <div className="platforms-head">
          <div>
            <p className="dl-eyebrow">{w.eyebrow}</p>
            <h1 className="display h-xl platforms-title" key={lang}>
              {w.title}
            </h1>
          </div>
          <p className="lead">{w.lead}</p>
        </div>
        <Devices />
        <ol className="dl-rows">{order.map(row)}</ol>
        <p className="dl-invite">
          {w.invite} <a href={`${LINKS.site}request-access`}>{w.ask}</a>
        </p>
      </div>
    </main>
  );
}
