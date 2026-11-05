'use client';
import { useState, useTransition } from 'react';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
import { Check, X } from 'lucide-react';
import { useI18n } from '../layout/I18nProvider';
import { trackOrder, type TrackView } from '@/app/actions/shop';
import { cx, formatDate, formatMoney, toLatinDigits } from '@/lib/utils';

const STEPS = ['pending', 'confirmed', 'shipped', 'delivered'] as const;

export function OrderTimeline({ status, history }: { status: string; history: { status: string; at: string }[] }) {
  const { t, locale } = useI18n();
  if (status === 'cancelled') return <p className="flex items-center gap-2 text-sm text-[#ff9a9d]"><X size={16} />{t.order.statuses.cancelled}</p>;
  const current = STEPS.indexOf(status as (typeof STEPS)[number]);
  return (
    <ol className="grid grid-cols-4">
      {STEPS.map((s, i) => {
        const done = i <= current;
        const at = history.find((h) => h.status === s)?.at;
        return (
          <li key={s} className="relative text-center" aria-current={i === current ? 'step' : undefined}>
            {i > 0 && <span className={cx('absolute end-1/2 top-[13px] h-px w-full', i <= current ? 'bg-white' : 'bg-line')} />}
            <span className={cx('relative mx-auto flex size-7 items-center justify-center rounded-full border', done ? 'border-white bg-white text-black' : 'border-line-strong bg-ink')}>{done && <Check size={13} />}</span>
            <p className={cx('mt-2 text-[11px] md:text-xs', !done && 'text-muted')}>{t.order.statuses[s]}</p>
            {at && <p className="mt-0.5 hidden text-[10px] text-muted sm:block">{formatDate(at, locale)}</p>}
          </li>
        );
      })}
    </ol>
  );
}

export function TrackForm() {
  const { t, locale } = useI18n();
  const sp = useSearchParams();
  const [number, setNumber] = useState(sp.get('number') ?? '');
  const [phone, setPhone] = useState('');
  const [order, setOrder] = useState<TrackView | null>(null);
  const [error, setError] = useState<'notFound' | 'rate' | null>(null);
  const [pending, start] = useTransition();
  return (
    <>
      <form className="mt-8 grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end" onSubmit={(e) => { e.preventDefault(); start(async () => { const r = await trackOrder(toLatinDigits(number), phone); if (r.ok) { setOrder(r.order); setError(null); } else { setOrder(null); setError(r.error); } }); }}>
        <div><label className="label" htmlFor="tr-n">{t.track.number}</label><input id="tr-n" className="field uppercase" dir="ltr" required placeholder={t.track.numberPlaceholder} value={number} onChange={(e) => setNumber(e.target.value)} /></div>
        <div><label className="label" htmlFor="tr-p">{t.track.phone}</label><input id="tr-p" className="field" dir="ltr" required type="tel" inputMode="tel" placeholder="01xxxxxxxxx" value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
        <button className="btn btn-primary" disabled={pending}>{t.track.submit}</button>
      </form>
      {error && <p className="error-text mt-5" role="alert">{error === 'rate' ? t.track.rate : t.track.notFound}</p>}
      {order && (
        <section className="mt-10 border-t border-line pt-8" aria-live="polite">
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <p className="latin-wide !tracking-[.14em]" dir="ltr">{order.number}</p>
            <p className="text-muted">{t.track.placed}: {formatDate(order.createdAt, locale)}</p>
          </div>
          <div className="mt-8"><OrderTimeline status={order.status} history={order.history} /></div>
          <ul className="mt-8 space-y-3 border-t border-line pt-6">
            {order.items.map((i, idx) => (
              <li key={idx} className="flex items-center gap-3 text-sm">
                <div className="relative h-16 w-[52px] flex-none bg-surface"><Image src={i.image} alt="" fill sizes="52px" quality={70} className="object-cover" /></div>
                <span className="min-w-0 flex-1">{locale === 'ar' ? i.nameAr : i.nameEn}<span className="block text-xs text-muted">{locale === 'ar' ? i.colorAr : i.colorEn}{i.size !== 'ONE' ? ` / ${i.size}` : ''} × {i.qty}</span></span>
              </li>
            ))}
          </ul>
          <p className="mt-5 flex justify-between border-t border-line pt-4"><span className="text-muted">{t.cart.total}</span><span>{formatMoney(order.total, locale)}</span></p>
        </section>
      )}
    </>
  );
}
