'use client';
import Image from 'next/image';
import { useI18n } from '../layout/I18nProvider';
import { OrderTimeline } from './TrackForm';
import type { Order } from '@/lib/types';
import { formatDate, formatMoney } from '@/lib/utils';

export function OrderCard({ order: o }: { order: Order }) {
  const { t, locale } = useI18n();
  return (
    <li className="border border-line bg-surface p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <span className="latin-wide !tracking-[.12em] text-[13px]" dir="ltr">{o.number}</span>
        <span className="text-muted">{formatDate(o.createdAt, locale)} · {formatMoney(o.total, locale)}</span>
      </div>
      <div className="mt-6"><OrderTimeline status={o.status} history={o.history} /></div>
      <div className="mt-5 flex gap-2 overflow-x-auto no-scrollbar">
        {o.items.map((i, idx) => <div key={idx} className="relative h-16 w-[52px] flex-none bg-raised"><Image src={i.image} alt={locale === 'ar' ? i.nameAr : i.nameEn} fill sizes="52px" quality={70} className="object-cover" /></div>)}
      </div>
    </li>
  );
}
