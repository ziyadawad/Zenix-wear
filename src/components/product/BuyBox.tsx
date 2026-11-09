'use client';
import { useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Heart, Minus, Plus, Ruler, X } from 'lucide-react';
import { fill, useI18n } from '../layout/I18nProvider';
import { useProductState } from './ProductClient';
import { buildCartItem, Price } from './ProductCard';
import { Stars } from '../home/ReviewsSlider';
import { addToCart, cartUi, toggleWish, track, useWishlist } from '@/lib/client/store';
import { submitStockAlert } from '@/app/actions/shop';
import { cx, discountPercent, effectivePrice, formatMoney, pName, sizesOf, stockOf, whatsappLink } from '@/lib/utils';

export function BuyBox() {
  const { t, locale, lp } = useI18n();
  const { product: p, colorId, setColorId, size, setSize } = useProductState();
  const router = useRouter();
  const wish = useWishlist();
  const [qty, setQty] = useState(1);
  const [needSize, setNeedSize] = useState(false);
  const [guide, setGuide] = useState(false);
  const [stickyOn, setStickyOn] = useState(false);
  const ctaRef = useRef<HTMLDivElement>(null);

  const color = p.colors.find((c) => c.id === colorId) ?? p.colors[0];
  const sizes = sizesOf(p);
  const oneSize = sizes.length === 1 && sizes[0] === 'ONE';
  const chosen = oneSize ? 'ONE' : size;
  const stock = chosen ? stockOf(p, color.id, chosen) : null;
  const soldOutChoice = chosen != null && stock === 0;
  const wished = wish.includes(p.id);
  const name = pName(p, locale);
  const pct = discountPercent(p);

  useEffect(() => { setQty(1); }, [chosen, colorId]);
  useEffect(() => {
    const el = ctaRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setStickyOn(!e.isIntersecting && e.boundingClientRect.top < 0), { threshold: 0 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  // Lift the WhatsApp button above the sticky bar while it shows.
  useEffect(() => {
    document.documentElement.style.setProperty('--float-extra', stickyOn && window.innerWidth < 1024 ? '72px' : '0px');
    return () => { document.documentElement.style.removeProperty('--float-extra'); };
  }, [stickyOn]);

  const requireSize = () => {
    if (chosen) return true;
    setNeedSize(true);
    document.getElementById('size-group')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return false;
  };
  const add = () => {
    if (!requireSize() || !stock) return false;
    addToCart(buildCartItem(p, color.id, chosen!, Math.min(qty, stock)));
    track('AddToCart', { id: p.id, name: p.nameEn, value: effectivePrice(p) * qty });
    return true;
  };
  const whatsapp = whatsappLink(fill(t.product.whatsappMessage, {
    name, color: locale === 'ar' ? color.nameAr : color.nameEn, size: chosen ?? '-', qty,
    url: typeof window !== 'undefined' ? window.location.href.split('?')[0] : '',
  }));

  return (
    <div>
      <div className="flex items-start justify-between gap-3">
        <h1 className="display text-[clamp(1.5rem,2.6vw,2.4rem)]">{name}</h1>
        <button className="icon-btn -me-3 -mt-1 flex-none" aria-pressed={wished} aria-label={wished ? t.shop.removeWish : t.shop.addWish} onClick={() => toggleWish(p.id)}><Heart size={21} strokeWidth={1.25} fill={wished ? '#fff' : 'none'} /></button>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1">
        <Price p={p} className="text-lg" />
        {pct > 0 && <span className="bg-white px-1.5 py-0.5 text-[11px] font-medium text-black">{pct}% {t.product.off}</span>}
      </div>
      {p.reviewCount > 0 && (
        <a href="#reviews" className="mt-1 inline-flex min-h-11 items-center gap-2 text-xs text-muted hover:text-white"><Stars value={p.rating} /><span>({p.reviewCount})</span></a>
      )}

      {/* Colour */}
      <div className="mt-7">
        <p className="mb-2 text-[13px]"><span className="text-muted">{t.product.color}: </span>{locale === 'ar' ? color.nameAr : color.nameEn}</p>
        <div className="-ms-1.5 flex flex-wrap" role="radiogroup" aria-label={t.product.color}>
          {p.colors.map((c) => (
            <button key={c.id} role="radio" aria-checked={c.id === color.id} aria-label={locale === 'ar' ? c.nameAr : c.nameEn} onClick={() => setColorId(c.id)} className="flex size-11 items-center justify-center">
              <span className={cx('size-7 rounded-full border transition-shadow', c.id === color.id ? 'border-white ring-1 ring-white ring-offset-2 ring-offset-ink' : 'border-line-strong')} style={{ background: c.hex }} />
            </button>
          ))}
        </div>
      </div>

      {/* Size */}
      {!oneSize && (
        <div className="mt-5" id="size-group">
          <div className="mb-2 flex items-center justify-between">
            <p className={cx('text-[13px]', needSize && !chosen ? 'text-[#ff7b7f]' : 'text-muted')} id="size-label">{needSize && !chosen ? t.product.selectSize : t.product.size}{chosen ? <span className="text-white">: {chosen}</span> : null}</p>
            <button className="-my-2 inline-flex min-h-11 items-center gap-1.5 text-[13px] underline-offset-4 hover:underline" onClick={() => setGuide(true)}><Ruler size={14} strokeWidth={1.25} />{t.product.sizeGuide}</button>
          </div>
          <div className="grid grid-cols-4 gap-1.5 xs:grid-cols-5 sm:grid-cols-7" role="radiogroup" aria-labelledby="size-label" dir="ltr">
            {sizes.map((s) => {
              const out = stockOf(p, color.id, s) === 0;
              const on = chosen === s;
              return (
                <button key={s} role="radio" aria-checked={on} aria-label={`${s}${out ? `, ${t.shop.soldOut}` : ''}`} onClick={() => { setSize(s); setNeedSize(false); }}
                  className={cx('relative h-12 overflow-hidden border text-[13px] transition-colors', on ? 'border-white bg-white text-black' : 'border-line-strong hover:border-white', out && (on ? 'text-black/50' : 'text-muted/70'))}>
                  {s}
                  {out && <span aria-hidden="true" className={cx('absolute left-1/2 top-1/2 h-px w-[130%] -translate-x-1/2 -translate-y-1/2 -rotate-[22deg]', on ? 'bg-black/50' : 'bg-white/35')} />}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {stock != null && stock > 0 && stock <= 5 && (
        <p className="mt-3 flex items-center gap-2 text-[13px] text-silver" role="status"><span className="size-1.5 rounded-full bg-danger" />{fill(t.product.lowStock, { n: locale === 'ar' ? new Intl.NumberFormat('ar-EG').format(stock) : stock })}</p>
      )}

      {soldOutChoice ? (
        <NotifyMe key={`${color.id}${chosen}`} colorId={color.id} size={chosen!} />
      ) : (
        <div ref={ctaRef}>
          <div className="mt-5 flex gap-2">
            <div className="flex h-[52px] flex-none items-center border border-line-strong" role="group" aria-label={t.product.quantity}>
              <button className="flex size-11 items-center justify-center disabled:opacity-30" aria-label={t.product.decrease} disabled={qty <= 1} onClick={() => setQty((q) => q - 1)}><Minus size={14} /></button>
              <span className="w-6 text-center text-sm" aria-live="polite">{qty}</span>
              <button className="flex size-11 items-center justify-center disabled:opacity-30" aria-label={t.product.increase} disabled={stock != null && qty >= stock} onClick={() => setQty((q) => Math.min(q + 1, 20))}><Plus size={14} /></button>
            </div>
            <button className="btn btn-primary min-w-0 flex-1 !px-3" onClick={() => { if (add()) cartUi.set(true); }}>{t.product.addToCart}</button>
          </div>
          <button className="btn btn-ghost mt-2 w-full" onClick={() => { if (add()) router.push(lp('/checkout')); }}>{t.product.buyNow}</button>
        </div>
      )}
      <a href={whatsapp} target="_blank" rel="noopener noreferrer" className="btn btn-whatsapp mt-2 w-full">
        <svg viewBox="0 0 24 24" width="17" height="17" fill="currentColor" aria-hidden="true"><path d="M12 2C6.500 2 2 6.500 2 12c0 1.800.500 3.500 1.300 5L2 22l5.100-1.300c1.400.8 3.100 1.300 4.900 1.300 5.500 0 10-4.500 10-10S17.500 2 12 2zm5.500 12.400c-.3-.1-1.700-.8-2-.9-.3-.1-.5-.1-.7.1-.2.3-.8 1-.9 1.200-.2.2-.3.2-.6.1-.3-.1-1.200-.5-2.300-1.400-.9-.8-1.400-1.700-1.600-2-.2-.3 0-.5.1-.6l.4-.5.3-.5c.1-.2 0-.4 0-.5-.1-.1-.7-1.600-.9-2.200-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.400s1 2.800 1.200 3c.1.2 2 3.100 4.900 4.300 2.300 1 2.800.8 3.400.7.6-.1 1.700-.7 1.900-1.400.2-.7.2-1.200.2-1.400-.1-.1-.3-.2-.6-.3z" /></svg>
        {t.product.whatsapp}
      </a>

      {/* Sticky add-to-cart on mobile */}
      {stickyOn && !soldOutChoice && (
        <div className="fixed inset-x-0 z-40 flex items-center gap-3 border-t border-line bg-black/95 px-4 py-2.5 backdrop-blur lg:hidden" style={{ bottom: 'var(--bottom-nav)', animation: 'sheetIn .3s ease both' }}>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs text-muted">{name}{chosen && chosen !== 'ONE' ? ` · ${chosen}` : ''}</p>
            <p className="text-sm">{formatMoney(effectivePrice(p), locale)}</p>
          </div>
          <button className="btn btn-primary !min-h-11 flex-none !px-5" onClick={() => { if (add()) cartUi.set(true); }}>{chosen ? t.product.addToCart : t.product.selectSize}</button>
        </div>
      )}

      {guide && <SizeGuide onClose={() => setGuide(false)} />}
    </div>
  );
}

function NotifyMe({ colorId, size }: { colorId: string; size: string }) {
  const { t } = useI18n();
  const { product } = useProductState();
  const [v, setV] = useState('');
  const [state, setState] = useState<'idle' | 'done' | 'bad'>('idle');
  const [pending, start] = useTransition();
  if (state === 'done') return <p className="mt-5 border border-line p-4 text-center text-sm text-silver" role="status">{t.product.notifyDone}</p>;
  return (
    <form className="mt-5" onSubmit={(e) => { e.preventDefault(); start(async () => { const r = await submitStockAlert({ productId: product.id, colorId, size, contact: v }); setState(r.ok ? 'done' : 'bad'); }); }}>
      <p className="mb-3 text-[13px] text-muted">{t.product.soldOutVariant}</p>
      <div className="flex gap-2">
        <input className="field" required dir="ltr" aria-label={t.product.notifyPlaceholder} placeholder={t.product.notifyPlaceholder} value={v} onChange={(e) => setV(e.target.value)} aria-invalid={state === 'bad'} />
        <button className="btn btn-primary flex-none !px-5" disabled={pending}>{t.product.notifySend}</button>
      </div>
      <p className="mt-2 text-xs text-muted">{t.product.notifyMe}</p>
      {state === 'bad' && <p className="error-text" role="alert">{t.product.notifyInvalid}</p>}
    </form>
  );
}

const TABLES: Record<string, { cols: ('chest' | 'length' | 'shoulder' | 'waist' | 'inseam' | 'footLabel')[]; rows: Record<string, (number | string)[]> }> = {
  regular: { cols: ['chest', 'length', 'shoulder'], rows: { XS: [92, 66, 42], S: [98, 69, 44], M: [104, 71, 46], L: [110, 73, 48], XL: [116, 75, 50], XXL: [122, 77, 52], '3XL': [128, 79, 54] } },
  compression: { cols: ['chest', 'length', 'shoulder'], rows: { XS: [84, 62, 39], S: [90, 64, 41], M: [96, 66, 43], L: [102, 68, 45], XL: [108, 70, 47], XXL: [114, 72, 49], '3XL': [120, 74, 51] } },
  sleeveless: { cols: ['chest', 'length'], rows: { XS: [92, 68], S: [98, 70], M: [104, 72], L: [110, 74], XL: [116, 76], XXL: [122, 78], '3XL': [128, 80] } },
};

function SizeGuide({ onClose }: { onClose: () => void }) {
  const { t, locale } = useI18n();
  const { product: p } = useProductState();
  const key = p.category === 'sleeveless' ? 'sleeveless' : (p.fit ?? 'regular');
  const table = TABLES[key] ?? TABLES.regular;
  const sizes = sizesOf(p).filter((s) => table.rows[s]);
  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [onClose]);
  return (
    <>
      <div className="scrim" onClick={onClose} aria-hidden="true" />
      <div className="dialog" role="dialog" aria-modal="true" aria-labelledby="sg-t">
        <div className="flex items-center justify-between border-b border-line px-5 py-2">
          <h2 id="sg-t" className="display text-lg">{t.product.sizeGuideTitle}</h2>
          <button className="icon-btn -me-3" aria-label={t.nav.close} onClick={onClose} autoFocus><X size={22} strokeWidth={1.25} /></button>
        </div>
        <div className="p-5">
          <p className="text-sm text-muted">{t.product.sizeGuideIntro}</p>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-center text-sm">
              <thead><tr className="border-b border-line-strong"><th scope="col" className="py-2.5 text-start font-medium">{t.product.size}</th>{table.cols.map((c) => <th key={c} scope="col" className="py-2.5 font-medium">{t.product[c]}</th>)}</tr></thead>
              <tbody>
                {sizes.map((s) => (
                  <tr key={s} className="border-b border-line"><th scope="row" className="py-2.5 text-start font-normal">{s}</th>{table.rows[s].map((v, i) => <td key={i} className="py-2.5 text-muted" dir="ltr">{v}</td>)}</tr>
                ))}
              </tbody>
            </table>
          </div>
          {(p.fitAr || p.fitEn) && <p className="mt-5 border border-line p-4 text-sm leading-[1.8]"><span className="text-muted">{t.product.fitTip}: </span>{locale === 'ar' ? p.fitAr : p.fitEn}</p>}
        </div>
      </div>
    </>
  );
}
