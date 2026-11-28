import { useEffect, useMemo, useState } from 'react';
import { Flower } from '../brand/Mark.tsx';
import { LINKS } from '../links.ts';
import { detect, LINKS_BY_PLATFORM, ORDER, type Platform } from './platforms.ts';

type Lang = 'en' | 'ar';

const WORDS = {
  en: {
    switch: 'العربية',
    home: 'ebru, the website',
    eyebrow: 'Get ebru',
    title: 'ebru, on every screen you work on.',
    lead: 'The same board, the same team and the same Kalem on your phone, your laptop and the web. Sign in with the email your team invited.',
    yours: 'For this device',
    others: 'On your other devices',
    soon: 'Coming soon',
    invite: 'ebru opens by invitation for now.',
    ask: 'No invitation yet? Ask to try ebru',
    names: { android: 'Android', ios: 'iPhone and iPad', mac: 'Mac', windows: 'Windows', web: 'The web' },
    lines: {
      android: 'Join the test on Google Play, then install ebru from Play like any app. Updates arrive on their own.',
      ios: 'ebru for iPhone and iPad is on its way to the App Store.',
      mac: 'ebru for Mac is on its way.',
      windows: 'ebru for Windows is on its way.',
      web: 'Works today in any modern browser, nothing to install.',
    },
    actions: {
      android: 'Join the test on Google Play',
      ios: 'Open the App Store',
      mac: 'Download for Mac',
      windows: 'Download for Windows',
      web: 'Open ebru in the browser',
    },
    soonLines: {
      android: 'The Google Play test opens soon. Until then, ebru works in your phone’s browser.',
      ios: 'Until then, ebru works in Safari: open it and add it to your Home Screen.',
      mac: 'Until then, ebru works in your browser.',
      windows: 'Until then, ebru works in your browser.',
      web: '',
    },
  },
  ar: {
    switch: 'English',
    home: 'موقع ebru',
    eyebrow: 'احصل على ebru',
    title: 'ebru على كل شاشة تعمل عليها.',
    lead: 'اللوحة نفسها، والفريق نفسه، وقلم نفسه على هاتفك وحاسوبك وعلى الويب. ادخل بالبريد الذي دعاك به فريقك.',
    yours: 'لهذا الجهاز',
    others: 'على أجهزتك الأخرى',
    soon: 'قريبًا',
    invite: 'الدخول إلى ebru بالدعوة حاليًا.',
    ask: 'لا توجد دعوة بعد؟ اطلب الدخول إلى ebru',
    names: { android: 'أندرويد', ios: 'آيفون وآيباد', mac: 'ماك', windows: 'ويندوز', web: 'الويب' },
    lines: {
      android: 'انضم إلى الاختبار على Google Play، ثم ثبّت ebru من Play مثل أي تطبيق. تصلك التحديثات تلقائيًا.',
      ios: 'ebru لآيفون وآيباد في طريقه إلى App Store.',
      mac: 'ebru لماك في الطريق.',
      windows: 'ebru لويندوز في الطريق.',
      web: 'يعمل اليوم في أي متصفح حديث، دون تثبيت شيء.',
    },
    actions: {
      android: 'انضم إلى الاختبار على Google Play',
      ios: 'افتح App Store',
      mac: 'نزّل لماك',
      windows: 'نزّل لويندوز',
      web: 'افتح ebru في المتصفح',
    },
    soonLines: {
      android: 'يفتح اختبار Google Play قريبًا. حتى ذلك الحين، يعمل ebru في متصفح هاتفك.',
      ios: 'حتى ذلك الحين، يعمل ebru في Safari: افتحه وأضفه إلى الشاشة الرئيسية.',
      mac: 'حتى ذلك الحين، يعمل ebru في متصفحك.',
      windows: 'حتى ذلك الحين، يعمل ebru في متصفحك.',
      web: '',
    },
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

/** One platform: what it is, how to get it, or that it is coming and what works until then. */
function Card({ platform, lang, first }: { platform: Platform; lang: Lang; first: boolean }) {
  const w = WORDS[lang];
  const href = LINKS_BY_PLATFORM[platform];
  return (
    <li className="dl-card" data-first={first || undefined} data-soon={!href || undefined}>
      <div className="dl-head">
        <h3>{w.names[platform]}</h3>
        {!href && <span className="dl-soon">{w.soon}</span>}
      </div>
      <p>{href ? w.lines[platform] : w.soonLines[platform] || w.lines[platform]}</p>
      {href ? (
        <a className="dl-button" href={href} rel={platform === 'web' ? undefined : 'noopener'}>
          {w.actions[platform]}
        </a>
      ) : (
        <a className="dl-button dl-quiet" href={LINKS.app}>
          {w.actions.web}
        </a>
      )}
    </li>
  );
}

/** Getting ebru: the visitor's own platform first, then the others, each with a real link or a plain "coming soon". */
export function Download() {
  const [lang, setLang] = useState<Lang>(startingLang);
  const w = WORDS[lang];
  const mine = useMemo(detect, []);
  const others = ORDER.filter((p) => p !== mine);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    try {
      localStorage.setItem('ebru.lang', lang);
    } catch {
      //the choice still holds until the page closes
    }
  }, [lang]);

  return (
    <main className="dl">
      <header className="dl-top">
        <a className="dl-mark" href={LINKS.site} aria-label={w.home}>
          <Flower />
        </a>
        <button type="button" className="dl-lang" onClick={() => setLang(lang === 'en' ? 'ar' : 'en')} lang={lang === 'en' ? 'ar' : 'en'}>
          {w.switch}
        </button>
      </header>
      <section className="dl-body">
        <div className="dl-words">
          <p className="dl-eyebrow">{w.eyebrow}</p>
          <h1>{w.title}</h1>
          <p className="dl-lead">{w.lead}</p>
          <p className="dl-invite">
            {w.invite} <a href={`${LINKS.site}request-access`}>{w.ask}</a>
          </p>
        </div>
        <div className="dl-lists">
          <h2 className="dl-label">{w.yours}</h2>
          <ul className="dl-cards">
            <Card platform={mine} lang={lang} first />
          </ul>
          <h2 className="dl-label">{w.others}</h2>
          <ul className="dl-cards dl-grid">
            {others.map((p) => (
              <Card key={p} platform={p} lang={lang} first={false} />
            ))}
          </ul>
        </div>
      </section>
    </main>
  );
}
