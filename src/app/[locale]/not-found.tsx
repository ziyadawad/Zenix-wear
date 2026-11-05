'use client';
import Image from 'next/image';
import Link from 'next/link';
import { useI18n } from '@/components/layout/I18nProvider';

export default function NotFound() {
  const { t, lp } = useI18n();
  return (
    <section className="container-zx flex min-h-[78svh] flex-col items-center justify-center py-20 text-center">
      <div className="relative w-[min(60vw,260px)]" style={{ perspective: 900 }} dir="ltr">
        <Image src="/brand/z-ring.webp" alt="" width={694} height={427} className="orbit-ring absolute inset-0 h-auto w-full opacity-60" />
        <Image src="/brand/z-only.webp" alt="" width={694} height={427} className="orbit-z relative h-auto w-full" />
      </div>
      <p className="latin-wide mt-10 text-xs text-muted" dir="ltr">404</p>
      <h1 className="display mt-4 text-[clamp(2rem,5vw,3.6rem)]">{t.notFound.title}</h1>
      <p className="mt-4 max-w-[44ch] text-muted">{t.notFound.text}</p>
      <div className="mt-9 flex w-full max-w-[460px] flex-col gap-3 sm:flex-row">
        <Link href={lp('/')} className="btn btn-primary flex-1">{t.notFound.home}</Link>
        <Link href={lp('/shop/t-shirts')} className="btn btn-ghost flex-1">{t.notFound.shop}</Link>
      </div>
    </section>
  );
}
