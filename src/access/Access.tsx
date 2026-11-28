import { useEffect, useMemo, useRef, useState } from 'react';
import { Flower } from '../brand/Mark.tsx';
import { LINKS } from '../links.ts';
import { sendRequest, SendError } from './send.ts';

type Lang = 'en' | 'ar';

const WORDS = {
  en: {
    switch: 'العربية',
    eyebrow: 'Ask to try ebru',
    title: 'ebru opens by invitation, for now.',
    lead: 'Tell us about your team. We read every request, and invite teams as ebru grows. Already have a teammate on ebru? Ask them to invite you from their project: it is instant.',
    name: 'Your name',
    email: 'Your email',
    emailHint: 'Your invitation comes here, and you will sign in with it.',
    school: 'University or school',
    optional: 'optional',
    team: 'How many people in your team?',
    why: 'What will you use ebru for?',
    whyHint: 'A course, a project, a deadline: a sentence is enough.',
    send: 'Ask for an invitation',
    sending: 'Sending',
    done: 'We have your request.',
    doneLine: 'We will write to {email} when your invitation is ready. Nothing else will be sent to it.',
    again: 'Back to ebru',
    privacy: 'We keep your request only to answer it: your name, email and what you wrote. No newsletter, no sharing.',
    offline: 'We could not reach our server. Check your connection and try again.',
    busy: 'Many people are asking right now. Please try again in an hour.',
    server: 'Our server had a problem. Please try again in a moment.',
    refused: 'Something here is not right yet:',
    nameMissing: 'Write your name.',
    emailWrong: 'This does not look like an email address.',
    sample: 'Want to see it first? Open the sample board',
    home: 'ebru, the website',
  },
  ar: {
    switch: 'English',
    eyebrow: 'اطلب الدخول إلى ebru',
    title: 'الدخول إلى ebru بالدعوة حاليًا.',
    lead: 'أخبرنا عن فريقك. نقرأ كل طلب، وندعو الفرق كلما كبر ebru. لديك زميل على ebru بالفعل؟ اطلب منه أن يدعوك من مشروعه: يحدث ذلك فورًا.',
    name: 'اسمك',
    email: 'بريدك الإلكتروني',
    emailHint: 'تصلك الدعوة عليه، وتدخل به.',
    school: 'الجامعة أو المدرسة',
    optional: 'اختياري',
    team: 'كم شخصًا في فريقك؟',
    why: 'فيمَ ستستخدم ebru؟',
    whyHint: 'مادة، أو مشروع، أو موعد تسليم: تكفي جملة واحدة.',
    send: 'اطلب دعوة',
    sending: 'جارٍ الإرسال',
    done: 'وصلنا طلبك.',
    doneLine: 'سنراسلك على {email} عندما تجهز دعوتك. لن نرسل إليه شيئًا غير ذلك.',
    again: 'العودة إلى ebru',
    privacy: 'نحتفظ بطلبك فقط لنرد عليه: اسمك وبريدك وما كتبته. لا نشرات بريدية، ولا مشاركة مع أحد.',
    offline: 'تعذّر الوصول إلى خادمنا. تحقق من اتصالك وحاول مجددًا.',
    busy: 'كثيرون يطلبون الآن. حاول مجددًا بعد ساعة من فضلك.',
    server: 'حدثت مشكلة في خادمنا. حاول مجددًا بعد لحظة.',
    refused: 'هناك ما يحتاج إلى تصحيح:',
    nameMissing: 'اكتب اسمك.',
    emailWrong: 'لا يبدو هذا بريدًا إلكترونيًا.',
    sample: 'تريد أن تراه أولًا؟ افتح اللوحة التجريبية',
    home: 'موقع ebru',
  },
} as const;

const SIZES = [2, 3, 4, 5, 6, 7, 8];

function startingLang(): Lang {
  try {
    const saved = localStorage.getItem('ebru.lang');
    if (saved === 'en' || saved === 'ar') return saved;
  } catch {
    // Private mode: the browser's language decides.
  }
  return navigator.language.toLowerCase().startsWith('ar') ? 'ar' : 'en';
}

/**
 * Asking to try ebru, for people without an invitation: name, email, school, team size and a sentence, sent to ebru's
 * admins. The button shows its own loading bar until the server answers; problems appear right above it.
 */
export function Access() {
  const [lang, setLang] = useState<Lang>(startingLang);
  const w = WORDS[lang];
  const shown = useMemo(() => Date.now(), []);
  const [form, setForm] = useState({ name: '', email: '', school: '', team: 4, why: '', website: '' });
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState('');
  const [fields, setFields] = useState<Record<string, string>>({});
  const [sent, setSent] = useState('');
  const heading = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    try {
      localStorage.setItem('ebru.lang', lang);
    } catch {
      // The choice still holds until the page closes.
    }
  }, [lang]);

  useEffect(() => {
    if (sent) heading.current?.focus();
  }, [sent]);

  const send = async () => {
    const own: Record<string, string> = {};
    if (!form.name.trim()) own.name = w.nameMissing;
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) own.email = w.emailWrong;
    setFields(own);
    setProblem('');
    if (Object.keys(own).length) return;
    setBusy(true);
    try {
      await sendRequest({ ...form, name: form.name.trim(), email: form.email.trim(), school: form.school.trim(), why: form.why.trim(), lang, shown });
      setSent(form.email.trim());
    } catch (e) {
      const err = e instanceof SendError ? e : new SendError('server');
      if (err.kind === 'refused') {
        setFields(err.fields);
        setProblem(w.refused);
      } else setProblem(w[err.kind]);
    }
    setBusy(false);
  };

  return (
    <main className="ac">
      <header className="ac-top">
        <a className="ac-mark" href={LINKS.site} aria-label={w.home}>
          <Flower />
        </a>
        <button type="button" className="ac-lang" onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')}>
          {w.switch}
        </button>
      </header>

      <section className="ac-body">
        <div className="ac-words">
          <p className="ac-eyebrow">{w.eyebrow}</p>
          <h1 ref={heading} tabIndex={-1}>
            {sent ? w.done : w.title}
          </h1>
          <p className="ac-lead">{sent ? w.doneLine.replace('{email}', sent) : w.lead}</p>
          {sent && (
            <a className="ac-button" href={LINKS.site}>
              {w.again}
            </a>
          )}
        </div>

        {!sent && (
          <form
            className="ac-form"
            noValidate
            onSubmit={(e) => {
              e.preventDefault();
              void send();
            }}
          >
            <label className="ac-field">
              <span>{w.name}</span>
              <input dir="auto" autoComplete="name" maxLength={80} required value={form.name} aria-invalid={Boolean(fields.name)} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              {fields.name && <small className="ac-problem">{fields.name}</small>}
            </label>
            <label className="ac-field">
              <span>{w.email}</span>
              <input type="email" dir="ltr" autoComplete="email" maxLength={254} required value={form.email} aria-invalid={Boolean(fields.email)} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              {fields.email ? <small className="ac-problem">{fields.email}</small> : <small>{w.emailHint}</small>}
            </label>
            <label className="ac-field">
              <span>
                {w.school} <em>{w.optional}</em>
              </span>
              <input dir="auto" autoComplete="organization" maxLength={120} value={form.school} onChange={(e) => setForm({ ...form, school: e.target.value })} />
            </label>
            <fieldset className="ac-field">
              <legend>{w.team}</legend>
              <div className="ac-sizes" role="radiogroup" aria-label={w.team}>
                {SIZES.map((n) => (
                  <button key={n} type="button" role="radio" aria-checked={form.team === n} onClick={() => setForm({ ...form, team: n })}>
                    {n === 8 ? '8+' : n}
                  </button>
                ))}
              </div>
            </fieldset>
            <label className="ac-field">
              <span>
                {w.why} <em>{w.optional}</em>
              </span>
              <textarea dir="auto" rows={3} maxLength={500} value={form.why} onChange={(e) => setForm({ ...form, why: e.target.value })} />
              {fields.why ? <small className="ac-problem">{fields.why}</small> : <small>{w.whyHint}</small>}
            </label>
            <label className="ac-trap" aria-hidden="true">
              Website
              <input tabIndex={-1} autoComplete="off" value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} />
            </label>
            {problem && (
              <p className="ac-note" role="alert">
                {problem}
              </p>
            )}
            <button type="submit" className="ac-button" disabled={busy} aria-busy={busy || undefined}>
              <span>{busy ? w.sending : w.send}</span>
            </button>
            <p className="ac-fine">{w.privacy}</p>
            <a className="ac-sample" href={`${LINKS.app}#/demo`}>
              {w.sample}
            </a>
          </form>
        )}
      </section>
    </main>
  );
}
