import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Check } from 'lucide-react';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { getOrderForConfirmation } from '@/app/actions/shop';
import { getShippingRates } from '@/lib/catalog';
import type { Locale } from '@/lib/types';
import { formatMoney, whatsappLink } from '@/lib/utils';

export const metadata: Metadata = { title: 'Order', robots: { index: false } };
export const dynamic = 'force-dynamic';

export default async function OrderPage({ params, searchParams }: { params: Promise<{ locale: Locale; number: string }>; searchParams: Promise<{ t?: string; pay?: string }> }) {
  const { locale, number } = await params;
  const sp = await searchParams;
  const t = getDictionary(locale);
  const o = await getOrderForConfirmation(number, sp.t);
  if (!o) notFound();
  const rates = await getShippingRates();
  const gov = rates.find((r) => r.id === o.governorate);
  const lp = (p: string) => `/${locale}${p}`;
  const methodLabel = { cod: t.checkout.cod, instapay: t.checkout.instapay, wallet: t.checkout.wallet, card: t.checkout.card }[o.paymentMethod];
  const wa = whatsappLink(t.order.whatsappMessage.replace('{number}', o.number).replace('{total}', formatMoney(o.total, locale)));
  return (
    <div className="container-zx mx-auto max-w-[760px] py-12 md:py-20">
      <div className="text-center">
        <span className="mx-auto flex size-14 items-center justify-center rounded-full border border-success text-success"><Check size={24} strokeWidth={1.25} /></span>
        <h1 className="display mt-6 text-[clamp(1.8rem,4vw,3rem)]">{t.order.thanks.replace('{name}', o.name.split(' ')[0])}</h1>
        <p className="mt-3 text-muted">{t.order.received}</p>
        <div className="mx-auto mt-7 w-fit border border-line-strong px-8 py-4">
          <p className="eyebrow">{t.order.number}</p>
          <p className="latin-wide mt-2 text-lg" dir="ltr">{o.number}</p>
        </div>
      </div>
      {sp.pay === 'failed' && <p role="alert" className="mt-6 border border-danger/50 p-4 text-center text-sm text-[#ff9a9d]">{t.checkout.errors.card}</p>}
      {o.paymentProof && <p className="mt-6 text-center text-sm text-silver">{t.order.proofNote}</p>}
      {o.paymentMethod === 'card' && sp.pay !== 'failed' && <p className="mt-6 text-center text-sm text-silver">{o.paymentStatus === 'paid' ? t.order.paid : t.order.cardPending}</p>}
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <a href={wa} target="_blank" rel="noopener noreferrer" className="btn btn-primary flex-1">{t.order.confirmWhatsapp}</a>
        <Link href={lp(`/track-order?number=${o.number}`)} className="btn btn-ghost flex-1">{t.order.track}</Link>
      </div>
      <section className="mt-12 border-t border-line pt-8" aria-labelledby="ord-i">
        <h2 id="ord-i" className="eyebrow mb-5">{t.order.items}</h2>
        <ul className="space-y-4">
          {o.items.map((i) => (
            <li key={`${i.productId}${i.colorId}${i.size}`} className="flex gap-4">
              <div className="relative h-24 w-[76px] flex-none bg-surface"><Image src={i.image} alt="" fill sizes="76px" quality={70} className="object-cover" /></div>
              <div className="min-w-0 flex-1 text-sm">
                <p>{locale === 'ar' ? i.nameAr : i.nameEn}</p>
                <p className="mt-1 text-xs text-muted">{locale === 'ar' ? i.colorAr : i.colorEn}{i.size !== 'ONE' ? ` / ${i.size}` : ''} × {i.qty}</p>
              </div>
              <p className="flex-none text-sm">{formatMoney(i.price * i.qty, locale)}</p>
            </li>
          ))}
        </ul>
        <dl className="mt-6 space-y-2.5 border-t border-line pt-5 text-sm">
          <div className="flex justify-between"><dt className="text-muted">{t.cart.subtotal}</dt><dd>{formatMoney(o.subtotal, locale)}</dd></div>
          {o.discount > 0 && <div className="flex justify-between"><dt className="text-muted">{t.cart.discount}</dt><dd>-{formatMoney(o.discount, locale)}</dd></div>}
          <div className="flex justify-between"><dt className="text-muted">{t.cart.shipping}</dt><dd>{o.shipping === 0 ? t.cart.free : formatMoney(o.shipping, locale)}</dd></div>
          <div className="flex justify-between border-t border-line pt-3 text-base"><dt>{t.cart.total}</dt><dd>{formatMoney(o.total, locale)}</dd></div>
        </dl>
      </section>
      <section className="mt-8 grid gap-6 border-t border-line pt-8 text-sm sm:grid-cols-2">
        <div><h2 className="eyebrow mb-3">{t.order.deliverTo}</h2><p className="leading-[1.9] text-[#c8c8c8]">{o.name}<br /><span dir="ltr">{o.phone}</span><br />{o.address}, {o.city}<br />{gov ? (locale === 'ar' ? gov.nameAr : gov.nameEn) : o.governorate}</p></div>
        <div><h2 className="eyebrow mb-3">{t.order.paymentMethod}</h2><p className="text-[#c8c8c8]">{methodLabel}</p></div>
      </section>
      <div className="mt-10 text-center"><Link href={lp('/shop')} className="link-underline text-sm text-muted">{t.order.keepShopping}</Link></div>
    </div>
  );
}
