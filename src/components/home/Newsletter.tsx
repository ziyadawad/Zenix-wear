'use client';
import { useState, useTransition } from 'react';
import { useI18n } from '../layout/I18nProvider';
import { subscribeNewsletter } from '@/app/actions/shop';

export function Newsletter() {
  const { t } = useI18n();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const [pending, start] = useTransition();
  return (
    <section className="bg-paper py-16 text-black md:py-24" aria-labelledby="news-h">
      <div className="container-zx mx-auto max-w-[760px] text-center" data-reveal>
        <h2 id="news-h" className="display text-[clamp(1.8rem,4vw,3.2rem)]">{t.home.newsletterTitle}</h2>
        <p className="mt-3 text-[#3d3d3d]">{t.home.newsletterText}</p>
        {code ? (
          <div className="mt-8" role="status">
            <p className="text-sm text-[#3d3d3d]">{t.home.newsletterThanks}</p>
            <p className="latin-wide mt-3 text-xl" dir="ltr">{code}</p>
            <p className="mt-3 text-sm text-[#3d3d3d]">{t.home.newsletterCopy}</p>
          </div>
        ) : (
          <form
            className="mx-auto mt-8 flex max-w-[520px] flex-col gap-2 sm:flex-row"
            onSubmit={(e) => {
              e.preventDefault();
              start(async () => {
                const r = await subscribeNewsletter(email);
                if (r.ok && r.code) { setCode(r.code); setError(false); } else setError(true);
              });
            }}
          >
            <input type="email" required autoComplete="email" dir="ltr" value={email} onChange={(e) => setEmail(e.target.value)} aria-label={t.home.emailPlaceholder} placeholder={t.home.emailPlaceholder} aria-invalid={error}
              className="min-h-[52px] flex-1 rounded-xs border border-black/30 bg-transparent px-4 text-base text-black outline-none placeholder:text-[#595959] focus:border-black rtl:placeholder:text-right" />
            <button disabled={pending} className="btn min-w-[120px] bg-black text-white hover:bg-[#222]">{t.home.join}</button>
          </form>
        )}
        {error && <p className="mt-3 text-sm text-[#b3261e]" role="alert">{t.home.newsletterError}</p>}
      </div>
    </section>
  );
}
