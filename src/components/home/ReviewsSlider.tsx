'use client';
import Image from 'next/image';
import { useI18n, fill } from '../layout/I18nProvider';
import { CarouselShell } from '../product/CarouselShell';
import type { Review } from '@/lib/types';

export function Stars({ value, size = 13 }: { value: number; size?: number }) {
  const { t } = useI18n();
  return (
    <span role="img" aria-label={fill(t.common.stars, { n: value.toFixed(1).replace(/\.0$/, '') })} className="inline-flex gap-0.5" dir="ltr">
      {[1, 2, 3, 4, 5].map((i) => (
        <svg key={i} width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
          <defs><linearGradient id={`star${i}${Math.round(value * 10)}`}><stop offset={`${Math.min(1, Math.max(0, value - i + 1)) * 100}%`} stopColor="#e8e8e8" /><stop offset="0" stopColor="#3a3a3a" /></linearGradient></defs>
          <path d="M12 2.500l2.900 6.300 6.900.800-5.100 4.700 1.400 6.800L12 17.700l-6.100 3.400 1.400-6.800L2.200 9.600l6.900-.800z" fill={`url(#star${i}${Math.round(value * 10)})`} />
        </svg>
      ))}
    </span>
  );
}

export function ReviewsSlider({ reviews }: { reviews: Review[] }) {
  const { t } = useI18n();
  return (
    <CarouselShell ariaLabel={t.home.reviews}>
      {reviews.map((r) => (
        <figure key={r.id} className="flex w-[82vw] max-w-[440px] flex-col border border-line bg-surface sm:w-[46vw] lg:w-[31vw]">
          {r.image && <div className="relative aspect-[5/4] overflow-hidden bg-raised"><Image src={r.image} alt="" fill loading="lazy" sizes="(min-width:1024px) 31vw, 82vw" quality={70} className="object-cover object-top" /></div>}
          <div className="flex flex-1 flex-col p-5 md:p-7">
            <Stars value={r.rating} />
            <blockquote className="mt-4 flex-1 text-sm leading-[1.9] text-[#d8d8d8]">{r.body}</blockquote>
            <figcaption className="mt-5 flex items-center justify-between gap-3 text-xs text-muted">
              <span>{r.name}{r.city ? ` · ${r.city}` : ''}</span>
              {r.isDemo && <span className="border border-line px-1.5 py-0.5 text-[10px]">{t.home.sample}</span>}
            </figcaption>
          </div>
        </figure>
      ))}
    </CarouselShell>
  );
}
