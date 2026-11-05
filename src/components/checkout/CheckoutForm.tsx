'use client';
import { useEffect, useRef, useState, useTransition } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Banknote, Check, Copy, CreditCard, Smartphone, Upload, Zap } from 'lucide-react';
import { fill, useI18n } from '../layout/I18nProvider';
import { promoMessage } from './CartPageView';
import { cartSubtotal, clearCart, promoStore, track, useCart, usePromo } from '@/lib/client/store';
import { getQuote, submitCheckout, type CheckoutField } from '@/app/actions/shop';
import type { Quote } from '@/lib/orders';
import type { PaymentMethod, ShippingRate } from '@/lib/types';
import { cx, formatMoney, isEgPhone, pName } from '@/lib/utils';
import { compressImage } from '@/lib/client/image';

interface Address { id: string; name: string; phone: string; governorate: string; city: string; address: string }
type Props = {
  config: { instapayHandle: string; walletNumber: string; cardEnabled: boolean };
  rates: ShippingRate[];
  user: { name: string; email: string; phone: string } | null;
  addresses: Address[];
};

export function CheckoutForm({ config, rates, user, addresses }: Props) {
  const { t, locale, lp } = useI18n();
  const c = t.checkout;
  const router = useRouter();
  const items = useCart();
  const promo = usePromo();
  const [v, setV] = useState({
    name: addresses[0]?.name ?? user?.name ?? '', phone: addresses[0]?.phone ?? user?.phone ?? '', altPhone: '', email: user?.email ?? '',
    governorate: addresses[0]?.governorate ?? '', city: addresses[0]?.city ?? '', address: addresses[0]?.address ?? '', notes: '',
  });
  const [method, setMethod] = useState<PaymentMethod>('cod');
  const [proof, setProof] = useState<File | null>(null);
  const [proofUrl, setProofUrl] = useState<string | null>(null);
  const [errors, setErrors] = useState<Partial<Record<CheckoutField, boolean>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [code, setCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [placing, setPlacing] = useState(false);
  const [, start] = useTransition();
  const placed = useRef(false);

  const key = items.map((i) => `${i.productId}${i.colorId}${i.size}x${i.qty}`).join(',');
  useEffect(() => { setCode(promo); }, [promo]);
  useEffect(() => {
    if (!items.length) return;
    let live = true;
    start(async () => {
      const q = await getQuote(items.map(({ productId, colorId, size, qty }) => ({ productId, colorId, size, qty })), { promo, governorate: v.governorate, phone: isEgPhone(v.phone) ? v.phone : undefined });
      if (live) setQuote(q);
    });
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, promo, v.governorate, isEgPhone(v.phone) ? v.phone : '']);
  useEffect(() => () => { if (proofUrl) URL.revokeObjectURL(proofUrl); }, [proofUrl]);

  if (!items.length && !placed.current) {
    return (
      <div className="container-zx flex min-h-[60vh] flex-col items-center justify-center text-center">
        <h1 className="display text-[clamp(1.8rem,4vw,3rem)]">{c.title}</h1>
        <p className="mt-4 text-muted">{t.cart.empty}</p>
        <Link href={lp('/shop/t-shirts')} className="btn btn-primary mt-6">{t.home.shopTshirts}</Link>
      </div>
    );
  }

  const set = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setV({ ...v, [k]: e.target.value });
    if (errors[k as CheckoutField]) setErrors({ ...errors, [k]: false });
  };
  const field = (k: 'name' | 'phone' | 'altPhone' | 'email' | 'city' | 'address', label: string, extra: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <div>
      <label className="label" htmlFor={`co-${k}`}>{label}</label>
      <input id={`co-${k}`} className="field" value={v[k]} onChange={set(k)} aria-invalid={!!errors[k]} aria-describedby={errors[k] ? `co-${k}-e` : undefined} {...extra} />
      {errors[k] && <p id={`co-${k}-e`} className="error-text" role="alert">{c.errors[k]}</p>}
    </div>
  );

  const validate = () => {
    const e: Partial<Record<CheckoutField, boolean>> = {};
    if (v.name.trim().length < 3) e.name = true;
    if (!isEgPhone(v.phone)) e.phone = true;
    if (v.altPhone && !isEgPhone(v.altPhone)) e.altPhone = true;
    if (v.email && !/^\S+@\S+\.\S+$/.test(v.email)) e.email = true;
    if (!v.governorate) e.governorate = true;
    if (v.city.trim().length < 2) e.city = true;
    if (v.address.trim().length < 8) e.address = true;
    if ((method === 'instapay' || method === 'wallet') && !proof) e.proof = true;
    setErrors(e);
    const first = Object.keys(e)[0];
    if (first) document.getElementById(`co-${first}`)?.focus();
    return !first;
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!validate()) return;
    setPlacing(true);
    const fd = new FormData();
    Object.entries(v).forEach(([k, val]) => fd.set(k, val));
    fd.set('paymentMethod', method);
    fd.set('promo', promo);
    fd.set('locale', locale);
    fd.set('lines', JSON.stringify(items.map(({ productId, colorId, size, qty }) => ({ productId, colorId, size, qty }))));
    if (proof && (method === 'instapay' || method === 'wallet')) fd.set('proof', proof);
    try {
      const r = await submitCheckout(fd);
      if (r.ok) {
        placed.current = true;
        track('Purchase', { value: r.total, ids: items.map((i) => i.productId) });
        clearCart();
        promoStore.set('');
        if (r.redirect.startsWith('http')) window.location.href = r.redirect;
        else router.push(r.redirect);
        return;
      }
      if (r.fields) {
        setErrors(r.fields);
        const first = Object.keys(r.fields)[0];
        document.getElementById(`co-${first}`)?.focus();
      } else if (r.error === 'stock') setFormError(fill(c.errors.stock, { name: r.detail ?? '' }));
      else setFormError(c.errors[r.error ?? 'server']);
    } catch {
      setFormError(c.errors.server);
    }
    setPlacing(false);
  };

  const subtotal = quote?.subtotal ?? cartSubtotal(items);
  const discount = quote?.discount ?? 0;
  const shipping = quote?.shipping ?? null;
  const total = subtotal - discount + (shipping ?? 0);
  const promoErr = promoMessage(quote, t, locale);
  const copyValue = method === 'instapay' ? config.instapayHandle : config.walletNumber;

  const methods: { id: PaymentMethod; label: string; hint: string; icon: typeof Banknote }[] = [
    { id: 'cod', label: c.cod, hint: c.codHint, icon: Banknote },
    { id: 'instapay', label: c.instapay, hint: c.instapayHint, icon: Zap },
    { id: 'wallet', label: c.wallet, hint: c.walletHint, icon: Smartphone },
    ...(config.cardEnabled ? [{ id: 'card' as const, label: c.card, hint: c.cardHint, icon: CreditCard }] : []),
  ];

  return (
    <form onSubmit={submit} noValidate className="container-zx py-8 md:py-14">
      <h1 className="display text-[clamp(1.8rem,4vw,3rem)]">{c.title}</h1>
      {!user && <p className="mt-2 text-sm text-muted">{c.guest}</p>}
      <div className="mt-8 grid gap-10 lg:grid-cols-[1.4fr_1fr] xl:gap-20">
        <div className="space-y-10">
          <section aria-labelledby="co-contact" className="space-y-4">
            <h2 id="co-contact" className="eyebrow border-b border-line pb-3">{c.contact}</h2>
            {addresses.length > 0 && (
              <div>
                <label className="label" htmlFor="co-saved">{c.savedAddress}</label>
                <select id="co-saved" className="field" onChange={(e) => { const a = addresses.find((x) => x.id === e.target.value); if (a) setV({ ...v, name: a.name, phone: a.phone, governorate: a.governorate, city: a.city, address: a.address }); else setV({ ...v, governorate: '', city: '', address: '' }); }}>
                  {addresses.map((a) => <option key={a.id} value={a.id}>{a.address}, {a.city}</option>)}
                  <option value="">{c.newAddress}</option>
                </select>
              </div>
            )}
            {field('name', c.name, { autoComplete: 'name', required: true })}
            <div className="grid gap-4 sm:grid-cols-2">
              {field('phone', c.phone, { type: 'tel', inputMode: 'tel', autoComplete: 'tel-national', dir: 'ltr', placeholder: '01xxxxxxxxx', required: true })}
              {field('altPhone', c.altPhone, { type: 'tel', inputMode: 'tel', dir: 'ltr', placeholder: '01xxxxxxxxx' })}
            </div>
            {field('email', c.email, { type: 'email', inputMode: 'email', autoComplete: 'email', dir: 'ltr' })}
          </section>

          <section aria-labelledby="co-delivery" className="space-y-4">
            <h2 id="co-delivery" className="eyebrow border-b border-line pb-3">{c.delivery}</h2>
            <div>
              <label className="label" htmlFor="co-governorate">{c.governorate}</label>
              <select id="co-governorate" className="field" value={v.governorate} onChange={set('governorate')} aria-invalid={!!errors.governorate} required>
                <option value="">{c.selectGov}</option>
                {rates.map((r) => <option key={r.id} value={r.id}>{locale === 'ar' ? r.nameAr : r.nameEn}</option>)}
              </select>
              {errors.governorate && <p className="error-text" role="alert">{c.errors.governorate}</p>}
            </div>
            {field('city', c.city, { autoComplete: 'address-level2', required: true })}
            {field('address', c.address, { autoComplete: 'street-address', placeholder: c.addressHint, required: true })}
            <div>
              <label className="label" htmlFor="co-notes">{c.notes}</label>
              <textarea id="co-notes" className="field min-h-[90px]" value={v.notes} onChange={set('notes')} maxLength={300} />
            </div>
          </section>

          <section aria-labelledby="co-payment">
            <h2 id="co-payment" className="eyebrow mb-4 border-b border-line pb-3">{c.payment}</h2>
            <div className="space-y-2" role="radiogroup" aria-labelledby="co-payment">
              {methods.map((m) => (
                <div key={m.id} className={cx('border transition-colors', method === m.id ? 'border-white' : 'border-line')}>
                  <label className="flex min-h-16 cursor-pointer items-center gap-4 px-4 py-3">
                    <input type="radio" name="paymentMethod" className="peer sr-only" checked={method === m.id} onChange={() => setMethod(m.id)} />
                    <span className={cx('flex size-[18px] flex-none items-center justify-center rounded-full border peer-focus-visible:outline peer-focus-visible:outline-1 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-white', method === m.id ? 'border-white' : 'border-line-strong')}>{method === m.id && <span className="size-2 rounded-full bg-white" />}</span>
                    <m.icon size={20} strokeWidth={1.25} className="flex-none text-silver" />
                    <span className="min-w-0 text-sm">{m.label}<span className="mt-0.5 block text-xs text-muted">{m.hint}</span></span>
                  </label>
                  {method === m.id && (m.id === 'instapay' || m.id === 'wallet') && (
                    <div className="border-t border-line p-4">
                      <p className="text-[13px] text-muted">{fill(c.sendTo, { amount: formatMoney(total, locale) })}</p>
                      <div className="mt-2 flex items-center justify-between gap-3 bg-surface px-3 py-1">
                        <span className="latin-wide min-w-0 truncate text-[13px] !tracking-[.08em]" dir="ltr">{copyValue}</span>
                        <button type="button" className="inline-flex min-h-11 flex-none items-center gap-1.5 text-xs" onClick={async () => { try { await navigator.clipboard.writeText(copyValue); setCopied(true); setTimeout(() => setCopied(false), 1800); } catch { /* clipboard blocked */ } }}>
                          {copied ? <Check size={14} /> : <Copy size={14} strokeWidth={1.25} />}{copied ? c.copied : c.copy}
                        </button>
                      </div>
                      <label htmlFor="co-proof" className="btn btn-ghost mt-3 w-full cursor-pointer"><Upload size={16} strokeWidth={1.25} />{proof ? c.uploadChange : c.upload}</label>
                      <input id="co-proof" type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={async (e) => {
                        const f = e.target.files?.[0];
                        if (!f) return;
                        const small = await compressImage(f);
                        setProof(small);
                        setProofUrl(URL.createObjectURL(small));
                        setErrors({ ...errors, proof: false, proofType: false });
                      }} />
                      {proofUrl && <div className="relative mt-3 h-32 w-24 overflow-hidden border border-line"><Image src={proofUrl} alt="" fill unoptimized className="object-cover" /></div>}
                      {errors.proof && <p className="error-text" role="alert">{c.errors.proof}</p>}
                      {errors.proofType && <p className="error-text" role="alert">{c.errors.proofType}</p>}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        </div>

        <aside className="h-fit border border-line bg-surface p-5 md:p-7 lg:sticky lg:top-[calc(var(--hh)+24px)]" aria-labelledby="co-sum">
          <h2 id="co-sum" className="eyebrow mb-4">{c.summary}</h2>
          <ul className="space-y-4">
            {items.map((i) => (
              <li key={`${i.productId}${i.colorId}${i.size}`} className="flex gap-3">
                <div className="relative h-20 w-16 flex-none bg-raised">
                  <Image src={i.image} alt="" fill sizes="64px" quality={70} className="object-cover" />
                  <span className="absolute -end-1.5 -top-1.5 flex size-5 items-center justify-center rounded-full bg-white text-[10px] font-medium text-black">{i.qty}</span>
                </div>
                <div className="min-w-0 flex-1 text-[13px]">
                  <p className="leading-snug">{pName(i, locale)}</p>
                  <p className="mt-0.5 text-xs text-muted">{locale === 'ar' ? i.colorAr : i.colorEn}{i.size !== 'ONE' ? ` / ${i.size}` : ''}</p>
                </div>
                <p className="flex-none text-[13px]">{formatMoney(i.price * i.qty, locale)}</p>
              </li>
            ))}
          </ul>
          <div className="mt-5 flex gap-2 border-t border-line pt-5">
            <input className="field !min-h-11 !py-1 uppercase" dir="ltr" aria-label={t.cart.promo} placeholder={t.cart.promo} value={code} onChange={(e) => setCode(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); promoStore.set(code.trim().toUpperCase()); } }} />
            <button type="button" className="btn btn-ghost !min-h-11 !px-4 flex-none" onClick={() => promoStore.set(code.trim().toUpperCase())}>{t.cart.applyPromo}</button>
          </div>
          {promoErr && <p className="error-text" role="alert">{promoErr}</p>}
          {quote?.promoCode && <p className="mt-2 text-[13px] text-success" role="status">{t.cart.promoApplied}: {quote.promoCode}</p>}
          <dl className="mt-5 space-y-2.5 text-sm">
            <div className="flex justify-between"><dt className="text-muted">{t.cart.subtotal}</dt><dd>{formatMoney(subtotal, locale)}</dd></div>
            {discount > 0 && <div className="flex justify-between"><dt className="text-muted">{t.cart.discount}</dt><dd>-{formatMoney(discount, locale)}</dd></div>}
            <div className="flex justify-between"><dt className="text-muted">{t.cart.shipping}</dt><dd>{shipping == null ? <span className="text-muted">{c.shippingPending}</span> : shipping === 0 ? t.cart.free : formatMoney(shipping, locale)}</dd></div>
            <div className="flex justify-between border-t border-line pt-3 text-base"><dt>{t.cart.total}</dt><dd>{formatMoney(total, locale)}</dd></div>
          </dl>
          {formError && <p className="error-text mt-4 border border-danger/50 p-3" role="alert">{formError}</p>}
          <button className="btn btn-primary mt-5 w-full" disabled={placing}>{placing ? c.placing : c.placeOrder}</button>
          <p className="mt-3 text-center text-xs text-muted">{c.secure}</p>
        </aside>
      </div>
    </form>
  );
}
