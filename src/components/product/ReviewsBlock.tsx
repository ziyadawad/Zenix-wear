'use client';
import { useState, useTransition } from 'react';
import { Star } from 'lucide-react';
import { useI18n } from '../layout/I18nProvider';
import { Stars } from '../home/ReviewsSlider';
import { submitReview } from '@/app/actions/shop';
import type { Review } from '@/lib/types';
import { formatDate } from '@/lib/utils';

export function ReviewsBlock({ productId, reviews, rating, count }: { productId: string; reviews: Review[]; rating: number; count: number }) {
  const { t, locale } = useI18n();
  const [open, setOpen] = useState(false);
  const [v, setV] = useState({ name: '', city: '', body: '', rating: 5 });
  const [state, setState] = useState<'idle' | 'sent' | 'error'>('idle');
  const [pending, start] = useTransition();
  return (
    <section id="reviews" className="container-zx scroll-mt-24 pt-14 md:pt-24" aria-labelledby="rev-t">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-line pb-6">
        <div>
          <h2 id="rev-t" className="display h-section">{t.product.reviews}</h2>
          {count > 0 && <p className="mt-3 flex items-center gap-2 text-sm text-muted"><Stars value={rating} /> {rating.toFixed(1)} ({count})</p>}
        </div>
        <button className="btn btn-ghost !min-h-11" onClick={() => setOpen((o) => !o)} aria-expanded={open}>{t.product.writeReview}</button>
      </div>
      {open && (state === 'sent' ? (
        <p role="status" className="mt-6 border border-line p-5 text-center text-sm text-silver">{t.product.reviewThanks}</p>
      ) : (
        <form className="mt-6 grid max-w-[640px] gap-4" onSubmit={(e) => { e.preventDefault(); start(async () => { const r = await submitReview({ productId, name: v.name, city: v.city, rating: v.rating, body: v.body }); setState(r.ok ? 'sent' : 'error'); }); }}>
          <fieldset>
            <legend className="label">{t.product.reviewRating}</legend>
            <div className="-ms-2 flex" dir="ltr">
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} type="button" aria-label={`${n}`} aria-pressed={v.rating === n} onClick={() => setV({ ...v, rating: n })} className="flex size-11 items-center justify-center"><Star size={22} strokeWidth={1} fill={n <= v.rating ? '#e8e8e8' : 'none'} /></button>
              ))}
            </div>
          </fieldset>
          <div className="grid gap-4 sm:grid-cols-2">
            <div><label className="label" htmlFor="r-n">{t.product.reviewName}</label><input id="r-n" className="field" required minLength={2} maxLength={60} value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} /></div>
            <div><label className="label" htmlFor="r-c">{t.product.reviewCity}</label><input id="r-c" className="field" maxLength={60} value={v.city} onChange={(e) => setV({ ...v, city: e.target.value })} /></div>
          </div>
          <div><label className="label" htmlFor="r-b">{t.product.reviewBody}</label><textarea id="r-b" className="field min-h-[120px]" required minLength={5} maxLength={1000} value={v.body} onChange={(e) => setV({ ...v, body: e.target.value })} /></div>
          {state === 'error' && <p className="error-text" role="alert">{t.product.reviewError}</p>}
          <button className="btn btn-primary sm:w-fit" disabled={pending}>{t.product.reviewSubmit}</button>
        </form>
      ))}
      {reviews.length === 0 ? (
        !open && <p className="py-8 text-sm text-muted">{t.product.noReviews}</p>
      ) : (
        <ul className="grid gap-x-10 md:grid-cols-2">
          {reviews.map((r) => (
            <li key={r.id} className="border-b border-line py-6">
              <div className="flex items-center justify-between gap-3">
                <Stars value={r.rating} />
                <time className="text-xs text-muted" dateTime={r.createdAt}>{formatDate(r.createdAt, locale)}</time>
              </div>
              <p className="mt-3 text-sm leading-[1.9] text-[#d8d8d8]">{r.body}</p>
              <p className="mt-3 flex items-center gap-3 text-xs text-muted">{r.name}{r.city ? ` · ${r.city}` : ''}{r.isDemo && <span className="border border-line px-1.5 py-0.5 text-[10px]">{t.home.sample}</span>}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
